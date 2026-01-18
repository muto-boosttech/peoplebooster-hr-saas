import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { prisma } from '../models';
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  mfaVerifySchema,
  mfaDisableSchema,
  mfaLoginVerifySchema,
  formatZodError,
} from '../validators/auth.validator';
import { getClientIp, getUserAgent } from '../middlewares/auth.middleware';

/**
 * 認証コントローラー
 */
export class AuthController {
  /**
   * ログイン
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const { email, password, rememberMe } = validation.data;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // ログイン処理
      const result = await authService.login(
        email,
        password,
        rememberMe,
        ipAddress,
        userAgent
      );

      // MFAが必要な場合
      if (result.requiresMfa) {
        res.status(200).json({
          success: true,
          data: {
            requiresMfa: true,
            mfaToken: result.mfaToken,
            user: {
              id: result.user.id,
              email: result.user.email,
              nickname: result.user.nickname,
              mfaEnabled: result.user.mfaEnabled,
            },
          },
        });
        return;
      }

      // 通常ログイン成功
      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました';
      res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message,
        },
      });
    }
  }

  /**
   * MFAログイン検証
   * POST /api/auth/mfa/login-verify
   */
  async mfaLoginVerify(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = mfaLoginVerifySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const { mfaToken, code } = validation.data;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // MFA検証
      const result = await authService.verifyMfaLogin(
        mfaToken,
        code,
        false, // rememberMe
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MFA検証に失敗しました';
      res.status(401).json({
        success: false,
        error: {
          code: 'MFA_VERIFICATION_FAILED',
          message,
        },
      });
    }
  }

  /**
   * ログアウト
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = logoutSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const { refreshToken } = validation.data;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        });
        return;
      }

      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // ログアウト処理
      await authService.logout(userId, refreshToken, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: {
          message: 'ログアウトしました',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログアウトに失敗しました';
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message,
        },
      });
    }
  }

  /**
   * トークンリフレッシュ
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = refreshTokenSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const { refreshToken } = validation.data;

      // トークンリフレッシュ処理
      const tokens = await authService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        data: {
          tokens,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'トークンリフレッシュに失敗しました';
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message,
        },
      });
    }
  }

  /**
   * パスワードリセット要求
   * POST /api/auth/password/forgot
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = forgotPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const { email } = validation.data;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // パスワードリセット要求処理
      const message = await authService.requestPasswordReset(email, ipAddress, userAgent);

      // セキュリティのため、常に成功レスポンスを返す
      res.status(200).json({
        success: true,
        data: {
          message,
        },
      });
    } catch (error) {
      // エラーでも成功レスポンスを返す（セキュリティ）
      res.status(200).json({
        success: true,
        data: {
          message: 'パスワードリセットメールを送信しました（登録されている場合）',
        },
      });
    }
  }

  /**
   * パスワードリセット実行
   * POST /api/auth/password/reset
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = resetPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const { token, password } = validation.data;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // パスワードリセット処理
      await authService.resetPassword(token, password, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: {
          message: 'パスワードをリセットしました',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'パスワードリセットに失敗しました';
      res.status(400).json({
        success: false,
        error: {
          code: 'RESET_FAILED',
          message,
        },
      });
    }
  }

  /**
   * パスワード変更
   * POST /api/auth/password/change
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        });
        return;
      }

      const { currentPassword, newPassword } = validation.data;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // パスワード変更処理
      await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        data: {
          message: 'パスワードを変更しました',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'パスワード変更に失敗しました';
      res.status(400).json({
        success: false,
        error: {
          code: 'CHANGE_PASSWORD_FAILED',
          message,
        },
      });
    }
  }

  /**
   * MFAセットアップ
   * POST /api/auth/mfa/setup
   */
  async mfaSetup(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        });
        return;
      }

      // MFAセットアップ処理
      const result = await authService.setupMfa(userId);

      res.status(200).json({
        success: true,
        data: {
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl,
          backupCodes: result.backupCodes,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MFAセットアップに失敗しました';
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_SETUP_FAILED',
          message,
        },
      });
    }
  }

  /**
   * MFA検証（セットアップ完了）
   * POST /api/auth/mfa/verify
   */
  async mfaVerify(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = mfaVerifySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        });
        return;
      }

      const { code } = validation.data;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // MFA検証処理
      await authService.verifyMfaSetup(userId, code, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: {
          message: 'MFAを有効化しました',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MFA検証に失敗しました';
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_VERIFY_FAILED',
          message,
        },
      });
    }
  }

  /**
   * MFA無効化
   * POST /api/auth/mfa/disable
   */
  async mfaDisable(req: Request, res: Response): Promise<void> {
    try {
      // バリデーション
      const validation = mfaDisableSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '入力内容に誤りがあります',
            details: formatZodError(validation.error),
          },
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        });
        return;
      }

      const { code, password } = validation.data;
      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      // MFA無効化処理
      await authService.disableMfa(userId, code, password, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: {
          message: 'MFAを無効化しました',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MFA無効化に失敗しました';
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_DISABLE_FAILED',
          message,
        },
      });
    }
  }

  /**
   * 現在のユーザー情報取得
   * GET /api/auth/me
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        });
        return;
      }

      // ユーザー情報取得
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          nickname: true,
          fullName: true,
          role: true,
          companyId: true,
          departmentId: true,
          age: true,
          gender: true,
          isActive: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ユーザー情報の取得に失敗しました';
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_USER_FAILED',
          message,
        },
      });
    }
  }
}

// シングルトンインスタンス
export const authController = new AuthController();
