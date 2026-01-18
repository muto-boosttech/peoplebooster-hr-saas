import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../models';
import { redisClient } from '../config/redis';
import { config } from '../config';
import { AuditAction, UserRole } from '@prisma/client';
import type { User } from '@prisma/client';

// 定数
const BCRYPT_COST = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY_REMEMBER = '90d';
const PASSWORD_RESET_TOKEN_EXPIRY = 60 * 60; // 1時間（秒）
const MFA_TOKEN_EXPIRY = 5 * 60; // 5分（秒）
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCKOUT_DURATION = 15 * 60; // 15分（秒）

// 型定義
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MfaSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface LoginResult {
  user: Omit<User, 'passwordHash' | 'mfaSecret'>;
  tokens?: AuthTokens;
  requiresMfa?: boolean;
  mfaToken?: string;
}

/**
 * 認証サービスクラス
 */
export class AuthService {
  /**
   * ログイン処理
   */
  async login(
    email: string,
    password: string,
    rememberMe: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    // ログイン試行制限チェック
    const isLocked = await this.checkLoginLockout(email);
    if (isLocked) {
      throw new Error('ログイン試行回数が上限に達しました。15分後に再試行してください。');
    }

    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
      },
    });

    if (!user) {
      await this.incrementLoginAttempts(email);
      await this.recordAuditLog(null, AuditAction.LOGIN_FAILED, 'User', null, null, { email, reason: 'User not found' }, ipAddress, userAgent);
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // アカウント有効性チェック
    if (!user.isActive) {
      await this.recordAuditLog(user.id, AuditAction.LOGIN_FAILED, 'User', user.id, null, { reason: 'Account inactive' }, ipAddress, userAgent);
      throw new Error('アカウントが無効化されています');
    }

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.incrementLoginAttempts(email);
      await this.recordAuditLog(user.id, AuditAction.LOGIN_FAILED, 'User', user.id, null, { reason: 'Invalid password' }, ipAddress, userAgent);
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // ログイン試行回数リセット
    await this.resetLoginAttempts(email);

    // MFA必須チェック（企業管理者以上）
    const requiresMfa = this.isMfaRequired(user.role);
    
    // 開発環境ではMFAをスキップ（SKIP_MFA環境変数で制御）
    const skipMfa = process.env.SKIP_MFA === 'true' || process.env.NODE_ENV === 'development';
    
    // MFAが有効な場合（ただし開発環境ではスキップ可能）
    if (user.mfaEnabled && user.mfaSecret && !skipMfa) {
      const mfaToken = await this.generateMfaToken(user.id);
      return {
        user: this.sanitizeUser(user),
        requiresMfa: true,
        mfaToken,
      };
    }

    // MFAが必須だが未設定の場合（開発環境ではスキップ）
    if (requiresMfa && !user.mfaEnabled && !skipMfa) {
      const mfaToken = await this.generateMfaToken(user.id);
      return {
        user: this.sanitizeUser(user),
        requiresMfa: true,
        mfaToken,
      };
    }

    // トークン発行
    const tokens = await this.generateTokens(user, rememberMe);

    // 最終ログイン日時更新
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 監査ログ記録
    await this.recordAuditLog(user.id, AuditAction.LOGIN, 'User', user.id, null, { rememberMe }, ipAddress, userAgent);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * MFAログイン検証
   */
  async verifyMfaLogin(
    mfaToken: string,
    code: string,
    rememberMe: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    // MFAトークンからユーザーID取得
    const userId = await redisClient.get(`mfa_token:${mfaToken}`);
    if (!userId) {
      throw new Error('MFAトークンが無効または期限切れです');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // MFA未設定の場合（セットアップが必要）
    if (!user.mfaSecret) {
      throw new Error('MFAのセットアップが必要です');
    }

    // TOTPコード検証
    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      await this.recordAuditLog(user.id, AuditAction.LOGIN_FAILED, 'User', user.id, null, { reason: 'Invalid MFA code' }, ipAddress, userAgent);
      throw new Error('認証コードが正しくありません');
    }

    // MFAトークン削除
    await redisClient.del(`mfa_token:${mfaToken}`);

    // トークン発行
    const tokens = await this.generateTokens(user, rememberMe);

    // 最終ログイン日時更新
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 監査ログ記録
    await this.recordAuditLog(user.id, AuditAction.LOGIN, 'User', user.id, null, { mfaVerified: true }, ipAddress, userAgent);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * ログアウト処理
   */
  async logout(
    userId: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // リフレッシュトークン無効化
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    // Redisからセッション削除
    await redisClient.del(`session:${userId}`);

    // 監査ログ記録
    await this.recordAuditLog(userId, AuditAction.LOGOUT, 'User', userId, null, null, ipAddress, userAgent);
  }

  /**
   * トークンリフレッシュ
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // リフレッシュトークン検証
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;
    } catch {
      throw new Error('リフレッシュトークンが無効です');
    }

    // データベースでトークン確認
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('リフレッシュトークンが無効または期限切れです');
    }

    const user = storedToken.user;

    // 古いリフレッシュトークン削除（ローテーション）
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // 新しいトークン発行
    const tokens = await this.generateTokens(user, false);

    return tokens;
  }

  /**
   * パスワードリセット要求
   */
  async requestPasswordReset(
    email: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // ユーザーが存在しなくても成功レスポンスを返す（セキュリティ）
    if (!user) {
      return 'パスワードリセットメールを送信しました（登録されている場合）';
    }

    // リセットトークン生成
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Redisに保存
    await redisClient.setex(
      `password_reset:${hashedToken}`,
      PASSWORD_RESET_TOKEN_EXPIRY,
      user.id
    );

    // 監査ログ記録
    await this.recordAuditLog(user.id, AuditAction.PASSWORD_RESET, 'User', user.id, null, { requested: true }, ipAddress, userAgent);

    // TODO: メール送信サービスを呼び出す
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    console.log(`Password reset token for ${email}: ${resetToken}`);

    return 'パスワードリセットメールを送信しました';
  }

  /**
   * パスワードリセット実行
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // トークンからユーザーID取得
    const userId = await redisClient.get(`password_reset:${hashedToken}`);
    if (!userId) {
      throw new Error('リセットトークンが無効または期限切れです');
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    // パスワード更新
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // トークン削除
    await redisClient.del(`password_reset:${hashedToken}`);

    // 既存のリフレッシュトークンを全て無効化
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // 監査ログ記録
    await this.recordAuditLog(userId, AuditAction.PASSWORD_RESET, 'User', userId, null, { completed: true }, ipAddress, userAgent);
  }

  /**
   * パスワード変更
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // 現在のパスワード検証
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('現在のパスワードが正しくありません');
    }

    // 新しいパスワードハッシュ化
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    // パスワード更新
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 監査ログ記録
    await this.recordAuditLog(userId, AuditAction.PASSWORD_CHANGE, 'User', userId, null, null, ipAddress, userAgent);
  }

  /**
   * MFAセットアップ
   */
  async setupMfa(userId: string): Promise<MfaSetupResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    if (user.mfaEnabled) {
      throw new Error('MFAは既に有効化されています');
    }

    // TOTP秘密鍵生成
    const secret = authenticator.generateSecret();

    // QRコードURL生成
    const otpauth = authenticator.keyuri(user.email, 'PeopleBooster', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // バックアップコード生成
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // 一時的にRedisに保存（検証後にDBに保存）
    await redisClient.setex(
      `mfa_setup:${userId}`,
      MFA_TOKEN_EXPIRY,
      JSON.stringify({ secret, backupCodes })
    );

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * MFA検証（セットアップ完了）
   */
  async verifyMfaSetup(
    userId: string,
    code: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    // 一時保存データ取得
    const setupData = await redisClient.get(`mfa_setup:${userId}`);
    if (!setupData) {
      throw new Error('MFAセットアップセッションが期限切れです');
    }

    const { secret, backupCodes } = JSON.parse(setupData);

    // TOTPコード検証
    const isValid = authenticator.verify({
      token: code,
      secret,
    });

    if (!isValid) {
      throw new Error('認証コードが正しくありません');
    }

    // DBに保存
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });

    // 一時データ削除
    await redisClient.del(`mfa_setup:${userId}`);

    // バックアップコードをRedisに保存
    await redisClient.set(
      `mfa_backup:${userId}`,
      JSON.stringify(backupCodes)
    );

    // 監査ログ記録
    await this.recordAuditLog(userId, AuditAction.MFA_ENABLE, 'User', userId, null, null, ipAddress, userAgent);
  }

  /**
   * MFA無効化
   */
  async disableMfa(
    userId: string,
    code: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new Error('MFAは有効化されていません');
    }

    // MFA必須チェック
    if (this.isMfaRequired(user.role)) {
      throw new Error('このロールではMFAを無効化できません');
    }

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('パスワードが正しくありません');
    }

    // TOTPコード検証
    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new Error('認証コードが正しくありません');
    }

    // MFA無効化
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // バックアップコード削除
    await redisClient.del(`mfa_backup:${userId}`);

    // 監査ログ記録
    await this.recordAuditLog(userId, AuditAction.MFA_DISABLE, 'User', userId, null, null, ipAddress, userAgent);
  }

  /**
   * アクセストークン検証
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch {
      throw new Error('アクセストークンが無効です');
    }
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * トークン生成
   */
  private async generateTokens(user: User, rememberMe: boolean): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    // アクセストークン生成
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // リフレッシュトークン生成
    const refreshTokenExpiry = rememberMe ? REFRESH_TOKEN_EXPIRY_REMEMBER : REFRESH_TOKEN_EXPIRY;
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: refreshTokenExpiry,
    });

    // リフレッシュトークンをDBに保存
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 90 : 30));

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // セッション情報をRedisに保存（Redisが利用可能な場合のみ）
    if (redisClient) {
      try {
        await redisClient.setex(
          `session:${user.id}`,
          rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
          JSON.stringify({
            userId: user.id,
            email: user.email,
            role: user.role,
            loginAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.warn('Redis unavailable for session storage:', error);
      }
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1時間（秒）
    };
  }

  /**
   * MFAトークン生成
   */
  private async generateMfaToken(userId: string): Promise<string> {
    const mfaToken = crypto.randomBytes(32).toString('hex');
    // Redisが利用できない場合はトークンのみ返す
    if (redisClient) {
      await redisClient.setex(`mfa_token:${mfaToken}`, MFA_TOKEN_EXPIRY, userId);
    }
    return mfaToken;
  }

  /**
   * ログイン試行制限チェック
   */
  private async checkLoginLockout(email: string): Promise<boolean> {
    // Redisが利用できない場合はロックアウトをスキップ
    if (!redisClient) {
      return false;
    }
    try {
      const attempts = await redisClient.get(`login_attempts:${email}`);
      if (attempts && parseInt(attempts) >= LOGIN_ATTEMPT_LIMIT) {
        const ttl = await redisClient.ttl(`login_attempts:${email}`);
        if (ttl > 0) {
          return true;
        }
      }
      return false;
    } catch (error) {
      // Redisが利用できない場合はロックアウトをスキップ
      console.warn('Redis unavailable for login lockout check:', error);
      return false;
    }
  }

  /**
   * ログイン試行回数インクリメント
   */
  private async incrementLoginAttempts(email: string): Promise<void> {
    // Redisが利用できない場合はスキップ
    if (!redisClient) {
      return;
    }
    try {
      const key = `login_attempts:${email}`;
      const attempts = await redisClient.incr(key);
      if (attempts === 1) {
        await redisClient.expire(key, LOGIN_LOCKOUT_DURATION);
      }
    } catch (error) {
      // Redisが利用できない場合はスキップ
      console.warn('Redis unavailable for login attempts:', error);
    }
  }

  /**
   * ログイン試行回数リセット
   */
  private async resetLoginAttempts(email: string): Promise<void> {
    // Redisが利用できない場合はスキップ
    if (!redisClient) {
      return;
    }
    try {
      await redisClient.del(`login_attempts:${email}`);
    } catch (error) {
      // Redisが利用できない場合はスキップ
      console.warn('Redis unavailable for reset login attempts:', error);
    }
  }

  /**
   * MFA必須判定
   */
  private isMfaRequired(role: UserRole): boolean {
    return role === UserRole.SYSTEM_ADMIN || role === UserRole.COMPANY_ADMIN;
  }

  /**
   * ユーザー情報のサニタイズ
   */
  private sanitizeUser(user: User & { company?: { id: string; name: string } | null }): Omit<User, 'passwordHash' | 'mfaSecret'> {
    const { passwordHash, mfaSecret, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * 監査ログ記録
   */
  private async recordAuditLog(
    userId: string | null,
    action: AuditAction,
    entityType: string,
    entityId: string | null,
    previousData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          previousData: previousData ?? undefined,
          newData: newData ?? undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to record audit log:', error);
    }
  }
}

// シングルトンインスタンス
export const authService = new AuthService();
