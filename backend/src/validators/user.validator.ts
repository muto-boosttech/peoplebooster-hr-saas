import { z } from 'zod';
import { UserRole, SubUserPermission, Gender } from '@prisma/client';

/**
 * パスワードバリデーション
 * 8文字以上、大小英字・数字・記号を含む
 */
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .max(128, 'パスワードは128文字以下で入力してください')
  .regex(/[a-z]/, 'パスワードには小文字を含めてください')
  .regex(/[A-Z]/, 'パスワードには大文字を含めてください')
  .regex(/[0-9]/, 'パスワードには数字を含めてください')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'パスワードには記号を含めてください');

/**
 * メールアドレスバリデーション
 */
export const emailSchema = z
  .string()
  .email('有効なメールアドレスを入力してください')
  .max(255, 'メールアドレスは255文字以下で入力してください')
  .transform((val) => val.toLowerCase().trim());

/**
 * ニックネームバリデーション
 */
export const nicknameSchema = z
  .string()
  .min(1, 'ニックネームは必須です')
  .max(100, 'ニックネームは100文字以下で入力してください')
  .transform((val) => val.trim());

/**
 * フルネームバリデーション
 */
export const fullNameSchema = z
  .string()
  .max(100, '氏名は100文字以下で入力してください')
  .transform((val) => val.trim())
  .optional()
  .nullable();

/**
 * UUIDバリデーション
 */
export const uuidSchema = z.string().uuid('有効なIDを入力してください');

/**
 * ロールバリデーション
 */
export const roleSchema = z.nativeEnum(UserRole, {
  errorMap: () => ({ message: '有効なロールを選択してください' }),
});

/**
 * サブユーザー権限バリデーション
 */
export const subUserPermissionSchema = z.nativeEnum(SubUserPermission, {
  errorMap: () => ({ message: '有効な権限を選択してください' }),
});

/**
 * 性別バリデーション
 */
export const genderSchema = z.nativeEnum(Gender, {
  errorMap: () => ({ message: '有効な性別を選択してください' }),
}).optional().nullable();

/**
 * 年齢バリデーション
 */
export const ageSchema = z
  .number()
  .int('年齢は整数で入力してください')
  .min(0, '年齢は0以上で入力してください')
  .max(150, '年齢は150以下で入力してください')
  .optional()
  .nullable();

// ========================================
// リクエストスキーマ
// ========================================

/**
 * ユーザー一覧取得クエリパラメータ
 */
export const getUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
  role: z
    .string()
    .optional()
    .transform((val) => (val ? (val as UserRole) : undefined))
    .pipe(roleSchema.optional()),
  companyId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  search: z.string().max(100).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  sortBy: z
    .enum(['createdAt', 'email', 'nickname', 'lastLoginAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;

/**
 * ユーザー作成リクエスト
 */
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
  fullName: fullNameSchema,
  role: roleSchema,
  companyId: uuidSchema.optional().nullable(),
  departmentId: uuidSchema.optional().nullable(),
  age: ageSchema,
  gender: genderSchema,
  sendInvitationEmail: z.boolean().optional().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * ユーザー更新リクエスト
 */
export const updateUserSchema = z.object({
  nickname: nicknameSchema.optional(),
  fullName: fullNameSchema,
  departmentId: uuidSchema.optional().nullable(),
  age: ageSchema,
  gender: genderSchema,
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * ロール変更リクエスト
 */
export const changeRoleSchema = z.object({
  newRole: roleSchema,
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

/**
 * サブユーザー作成リクエスト
 */
export const createSubUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(), // オプション: 自動生成も可能
  nickname: nicknameSchema.optional(),
  permission: subUserPermissionSchema,
  sendInvitationEmail: z.boolean().optional().default(true),
});

export type CreateSubUserInput = z.infer<typeof createSubUserSchema>;

/**
 * ユーザーIDパラメータ
 */
export const userIdParamSchema = z.object({
  id: uuidSchema,
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;

/**
 * 一括ユーザー作成リクエスト（CSVインポート用）
 */
export const bulkCreateUsersSchema = z.object({
  users: z.array(
    z.object({
      email: emailSchema,
      nickname: nicknameSchema,
      fullName: fullNameSchema,
      role: roleSchema.optional().default(UserRole.COMPANY_USER),
      departmentId: uuidSchema.optional().nullable(),
    })
  ).min(1, '少なくとも1人のユーザーを指定してください').max(100, '一度に作成できるユーザーは100人までです'),
  companyId: uuidSchema.optional(),
  sendInvitationEmail: z.boolean().optional().default(true),
});

export type BulkCreateUsersInput = z.infer<typeof bulkCreateUsersSchema>;

/**
 * ユーザー検索リクエスト
 */
export const searchUsersSchema = z.object({
  query: z.string().min(1).max(100),
  companyId: uuidSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;

/**
 * ユーザーアクティブ状態変更リクエスト
 */
export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});

export type ToggleActiveInput = z.infer<typeof toggleActiveSchema>;

// ========================================
// レスポンススキーマ
// ========================================

/**
 * ユーザーレスポンス（パスワード除く）
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nickname: z.string(),
  fullName: z.string().nullable(),
  role: roleSchema,
  companyId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  parentUserId: z.string().uuid().nullable(),
  subUserPermission: subUserPermissionSchema.nullable(),
  age: z.number().nullable(),
  gender: genderSchema,
  isActive: z.boolean(),
  mfaEnabled: z.boolean(),
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // リレーション
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable().optional(),
  department: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable().optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/**
 * ユーザー一覧レスポンス
 */
export const usersListResponseSchema = z.object({
  users: z.array(userResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type UsersListResponse = z.infer<typeof usersListResponseSchema>;
