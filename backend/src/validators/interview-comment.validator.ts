import { z } from 'zod';

/**
 * 面接コメント一覧取得クエリ
 */
export const getInterviewCommentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'interviewDate', 'rating']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetInterviewCommentsQuery = z.infer<typeof getInterviewCommentsQuerySchema>;

/**
 * 面接コメント作成
 */
export const createInterviewCommentSchema = z.object({
  interviewDate: z.string().datetime({ message: '有効な日時形式で入力してください' }),
  comment: z.string().min(1, 'コメントは必須です').max(5000, 'コメントは5000文字以内で入力してください'),
  rating: z.number().int().min(1, '評価は1以上で入力してください').max(5, '評価は5以下で入力してください'),
  tags: z.array(z.string().max(50)).max(10).optional(),
  triggerBrushUp: z.boolean().optional().default(false),
});

export type CreateInterviewCommentInput = z.infer<typeof createInterviewCommentSchema>;

/**
 * 面接コメント更新
 */
export const updateInterviewCommentSchema = z.object({
  interviewDate: z.string().datetime({ message: '有効な日時形式で入力してください' }).optional(),
  comment: z.string().min(1, 'コメントは必須です').max(5000, 'コメントは5000文字以内で入力してください').optional(),
  rating: z.number().int().min(1, '評価は1以上で入力してください').max(5, '評価は5以下で入力してください').optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type UpdateInterviewCommentInput = z.infer<typeof updateInterviewCommentSchema>;

/**
 * 評価の表示名
 */
export const RATING_DISPLAY_NAMES: Record<number, string> = {
  1: '不合格',
  2: '要検討',
  3: '普通',
  4: '良好',
  5: '優秀',
};

/**
 * 評価の色
 */
export const RATING_COLORS: Record<number, string> = {
  1: 'red',
  2: 'orange',
  3: 'yellow',
  4: 'green',
  5: 'blue',
};
