import { z } from 'zod';

// ========================================
// 企業関連バリデーションスキーマ
// ========================================

/**
 * 企業一覧取得クエリスキーマ
 */
export const getCompaniesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  search: z.string().max(255).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  planId: z.string().uuid().optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'contractStartDate', 'contractEndDate'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type GetCompaniesQuery = z.infer<typeof getCompaniesQuerySchema>;

/**
 * 企業作成スキーマ
 */
export const createCompanySchema = z.object({
  name: z
    .string()
    .min(1, '企業名は必須です')
    .max(255, '企業名は255文字以内で入力してください'),
  logoUrl: z
    .string()
    .url('有効なURLを入力してください')
    .max(500)
    .optional()
    .nullable(),
  planId: z.string().uuid('有効なプランIDを指定してください'),
  contractStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
    .transform((val) => new Date(val)),
  contractEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
    .transform((val) => new Date(val)),
  // 企業管理者同時作成オプション
  createAdmin: z.boolean().optional().default(false),
  adminEmail: z.string().email('有効なメールアドレスを入力してください').optional(),
  adminNickname: z.string().max(100).optional(),
  adminFullName: z.string().max(100).optional(),
}).refine(
  (data) => {
    if (data.createAdmin && !data.adminEmail) {
      return false;
    }
    return true;
  },
  {
    message: '企業管理者を作成する場合はメールアドレスが必要です',
    path: ['adminEmail'],
  }
).refine(
  (data) => {
    return data.contractEndDate > data.contractStartDate;
  },
  {
    message: '契約終了日は契約開始日より後の日付を指定してください',
    path: ['contractEndDate'],
  }
);

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

/**
 * 企業更新スキーマ
 */
export const updateCompanySchema = z.object({
  name: z
    .string()
    .min(1, '企業名は必須です')
    .max(255, '企業名は255文字以内で入力してください')
    .optional(),
  logoUrl: z
    .string()
    .url('有効なURLを入力してください')
    .max(500)
    .optional()
    .nullable(),
  planId: z.string().uuid('有効なプランIDを指定してください').optional(),
  contractStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
    .transform((val) => new Date(val))
    .optional(),
  contractEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
    .transform((val) => new Date(val))
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ========================================
// 部門関連バリデーションスキーマ
// ========================================

/**
 * 部門一覧取得クエリスキーマ
 */
export const getDepartmentsQuerySchema = z.object({
  includeUsers: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  flat: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type GetDepartmentsQuery = z.infer<typeof getDepartmentsQuerySchema>;

/**
 * 部門作成スキーマ
 */
export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(1, '部門名は必須です')
    .max(100, '部門名は100文字以内で入力してください'),
  parentDepartmentId: z
    .string()
    .uuid('有効な親部門IDを指定してください')
    .optional()
    .nullable(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

/**
 * 部門更新スキーマ
 */
export const updateDepartmentSchema = z.object({
  name: z
    .string()
    .min(1, '部門名は必須です')
    .max(100, '部門名は100文字以内で入力してください')
    .optional(),
  parentDepartmentId: z
    .string()
    .uuid('有効な親部門IDを指定してください')
    .optional()
    .nullable(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

/**
 * ユーザー部門割り当てスキーマ
 */
export const assignUsersToDepartmentSchema = z.object({
  userIds: z
    .array(z.string().uuid('有効なユーザーIDを指定してください'))
    .min(1, '少なくとも1人のユーザーを指定してください')
    .max(100, '一度に割り当てられるユーザーは100人までです'),
});

export type AssignUsersToDepartmentInput = z.infer<typeof assignUsersToDepartmentSchema>;

/**
 * 部門ユーザー削除スキーマ
 */
export const removeUsersFromDepartmentSchema = z.object({
  userIds: z
    .array(z.string().uuid('有効なユーザーIDを指定してください'))
    .min(1, '少なくとも1人のユーザーを指定してください'),
});

export type RemoveUsersFromDepartmentInput = z.infer<typeof removeUsersFromDepartmentSchema>;
