import { z } from 'zod';

/**
 * パスワードバリデーション
 * - 8文字以上
 * - 大文字を含む
 * - 小文字を含む
 * - 数字を含む
 * - 記号を含む
 */
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上である必要があります')
  .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
  .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
  .regex(/[0-9]/, 'パスワードには数字を含める必要があります')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'パスワードには記号を含める必要があります');

/**
 * メールアドレスバリデーション
 */
export const emailSchema = z
  .string()
  .email('有効なメールアドレスを入力してください')
  .max(255, 'メールアドレスは255文字以内である必要があります')
  .transform((email) => email.toLowerCase().trim());

/**
 * ログインリクエストスキーマ
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'パスワードを入力してください'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * ログアウトリクエストスキーマ
 */
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'リフレッシュトークンが必要です'),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

/**
 * トークンリフレッシュリクエストスキーマ
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'リフレッシュトークンが必要です'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * パスワードリセット要求スキーマ
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * パスワードリセット実行スキーマ
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'リセットトークンが必要です'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * パスワード変更スキーマ
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: '新しいパスワードは現在のパスワードと異なる必要があります',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * MFAセットアップスキーマ
 */
export const mfaSetupSchema = z.object({
  // セットアップ時は特に入力不要
});

export type MfaSetupInput = z.infer<typeof mfaSetupSchema>;

/**
 * MFA検証スキーマ
 */
export const mfaVerifySchema = z.object({
  code: z
    .string()
    .length(6, 'コードは6桁である必要があります')
    .regex(/^\d+$/, 'コードは数字のみである必要があります'),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

/**
 * MFA無効化スキーマ
 */
export const mfaDisableSchema = z.object({
  code: z
    .string()
    .length(6, 'コードは6桁である必要があります')
    .regex(/^\d+$/, 'コードは数字のみである必要があります'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;

/**
 * MFAログイン検証スキーマ（ログイン時のMFA検証用）
 */
export const mfaLoginVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFAトークンが必要です'),
  code: z
    .string()
    .length(6, 'コードは6桁である必要があります')
    .regex(/^\d+$/, 'コードは数字のみである必要があります'),
});

export type MfaLoginVerifyInput = z.infer<typeof mfaLoginVerifySchema>;

/**
 * ユーザー登録スキーマ（将来の拡張用）
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
  nickname: z
    .string()
    .min(1, 'ニックネームを入力してください')
    .max(100, 'ニックネームは100文字以内である必要があります'),
  fullName: z
    .string()
    .max(100, '氏名は100文字以内である必要があります')
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * バリデーションエラーをフォーマット
 */
export function formatZodError(error: z.ZodError): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    formattedErrors[path].push(issue.message);
  }
  
  return formattedErrors;
}
