import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ========================================
// レート制限設定
// ========================================

/**
 * ログイン用レート制限
 * 15分間に5回まで
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // IPアドレスとメールアドレスの組み合わせでレート制限
    const email = req.body?.email || 'unknown';
    return `${req.ip}-${email}`;
  },
});

/**
 * パスワードリセット用レート制限
 * 1時間に3回まで
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'パスワードリセット要求が上限に達しました。1時間後に再試行してください。',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * MFA用レート制限
 * 5分間に10回まで
 */
const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分
  max: 10,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'MFA検証の試行回数が上限に達しました。5分後に再試行してください。',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 一般API用レート制限
 * 1分間に60回まで
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 60,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'リクエスト数が上限に達しました。しばらくしてから再試行してください。',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========================================
// 認証不要エンドポイント
// ========================================

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: ログイン
 *     description: メールアドレスとパスワードで認証し、アクセストークンとリフレッシュトークンを取得
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@peoplebooster.com
 *               password:
 *                 type: string
 *                 example: Admin123!@#
 *               rememberMe:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: ログイン成功（MFA必要な場合はmfaToken返却）
 *       401:
 *         description: 認証失敗
 *       429:
 *         description: レート制限超過
 */
router.post('/login', loginLimiter, (req, res) => authController.login(req, res));

/**
 * @openapi
 * /auth/mfa/login-verify:
 *   post:
 *     tags:
 *       - Authentication
 *       - MFA
 *     summary: MFAログイン検証
 *     description: ログイン時のMFA検証を実行
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mfaToken
 *               - code
 *             properties:
 *               mfaToken:
 *                 type: string
 *                 description: ログイン時に取得したMFAトークン
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 description: 認証アプリの6桁コード
 *     responses:
 *       200:
 *         description: MFA検証成功
 *       401:
 *         description: MFA検証失敗
 */
router.post('/mfa/login-verify', mfaLimiter, (req, res) => authController.mfaLoginVerify(req, res));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: トークンリフレッシュ
 *     description: リフレッシュトークンを使用して新しいアクセストークンを取得
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: トークンリフレッシュ成功
 *       401:
 *         description: リフレッシュトークン無効
 */
router.post('/refresh', generalLimiter, (req, res) => authController.refreshToken(req, res));

/**
 * @openapi
 * /auth/password/forgot:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: パスワードリセット要求
 *     description: パスワードリセットメールを送信
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: リセットメール送信（セキュリティのため常に成功）
 */
router.post('/password/forgot', passwordResetLimiter, (req, res) => authController.forgotPassword(req, res));

/**
 * @openapi
 * /auth/password/reset:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: パスワードリセット実行
 *     description: リセットトークンを使用してパスワードを変更
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: パスワードリセット成功
 *       400:
 *         description: トークン無効またはバリデーションエラー
 */
router.post('/password/reset', passwordResetLimiter, (req, res) => authController.resetPassword(req, res));

// ========================================
// 認証必要エンドポイント
// ========================================

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: ログアウト
 *     description: リフレッシュトークンを無効化してログアウト
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: ログアウト成功
 *       401:
 *         description: 認証エラー
 */
router.post('/logout', authenticate, generalLimiter, (req, res) => authController.logout(req, res));

/**
 * @openapi
 * /auth/password/change:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: パスワード変更
 *     description: 現在のパスワードを確認して新しいパスワードに変更
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: パスワード変更成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 */
router.post('/password/change', authenticate, generalLimiter, (req, res) => authController.changePassword(req, res));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: 現在のユーザー情報取得
 *     description: 認証済みユーザーの詳細情報を取得
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ユーザー情報取得成功
 *       401:
 *         description: 認証エラー
 */
router.get('/me', authenticate, generalLimiter, (req, res) => authController.getCurrentUser(req, res));

// ========================================
// MFA関連エンドポイント（認証必要）
// ========================================

/**
 * @openapi
 * /auth/mfa/setup:
 *   post:
 *     tags:
 *       - MFA
 *     summary: MFAセットアップ
 *     description: TOTP認証のセットアップを開始（QRコードとバックアップコードを取得）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: セットアップ情報取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                     qrCodeUrl:
 *                       type: string
 *                       description: Base64エンコードされたQRコード画像
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: 認証エラー
 */
router.post('/mfa/setup', authenticate, mfaLimiter, (req, res) => authController.mfaSetup(req, res));

/**
 * @openapi
 * /auth/mfa/verify:
 *   post:
 *     tags:
 *       - MFA
 *     summary: MFA検証（セットアップ完了）
 *     description: セットアップ時のTOTPコードを検証してMFAを有効化
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *     responses:
 *       200:
 *         description: MFA有効化成功
 *       400:
 *         description: コード検証失敗
 *       401:
 *         description: 認証エラー
 */
router.post('/mfa/verify', authenticate, mfaLimiter, (req, res) => authController.mfaVerify(req, res));

/**
 * @openapi
 * /auth/mfa/disable:
 *   post:
 *     tags:
 *       - MFA
 *     summary: MFA無効化
 *     description: MFAを無効化（企業管理者以上は無効化不可）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - password
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: MFA無効化成功
 *       400:
 *         description: 検証失敗またはロールにより無効化不可
 *       401:
 *         description: 認証エラー
 */
router.post('/mfa/disable', authenticate, mfaLimiter, (req, res) => authController.mfaDisable(req, res));

export default router;
