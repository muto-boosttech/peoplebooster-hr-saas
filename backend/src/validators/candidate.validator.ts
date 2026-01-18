import { z } from 'zod';

// 候補者ステータス
export const CandidateStatus = z.enum([
  'UNTOUCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'DOCUMENT_SCREENING',
  'FIRST_INTERVIEW',
  'SECOND_INTERVIEW',
  'FINAL_INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
  'ON_HOLD',
]);

export type CandidateStatusType = z.infer<typeof CandidateStatus>;

// 候補者一覧取得クエリ
export const getCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  appliedPosition: z.string().optional(),
  search: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  sortBy: z.enum(['createdAt', 'status', 'appliedPosition', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetCandidatesQuery = z.infer<typeof getCandidatesQuerySchema>;

// 候補者作成（既存ユーザーを候補者に）
export const createCandidateFromUserSchema = z.object({
  userId: z.string().uuid(),
  appliedPosition: z.string().min(1).max(200),
  source: z.string().min(1).max(200).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  notes: z.string().max(5000).optional(),
  assignedTo: z.string().uuid().optional(),
});

export type CreateCandidateFromUserInput = z.infer<typeof createCandidateFromUserSchema>;

// 候補者作成（新規ユーザーと共に）
export const createCandidateWithNewUserSchema = z.object({
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(255)
    .transform((val) => val.toLowerCase()),
  fullName: z.string().min(1).max(100),
  nickname: z.string().min(1).max(100).optional(),
  appliedPosition: z.string().min(1).max(200),
  source: z.string().min(1).max(200).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  notes: z.string().max(5000).optional(),
  assignedTo: z.string().uuid().optional(),
});

export type CreateCandidateWithNewUserInput = z.infer<typeof createCandidateWithNewUserSchema>;

// 候補者作成（統合スキーマ）
export const createCandidateSchema = z.union([
  createCandidateFromUserSchema,
  createCandidateWithNewUserSchema,
]);

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

// 候補者更新
export const updateCandidateSchema = z.object({
  appliedPosition: z.string().min(1).max(200).optional(),
  source: z.string().min(1).max(200).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  notes: z.string().max(5000).optional(),
});

export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;

// ステータス更新
export const updateCandidateStatusSchema = z.object({
  status: CandidateStatus,
  note: z.string().max(1000).optional(), // ステータス変更理由
});

export type UpdateCandidateStatusInput = z.infer<typeof updateCandidateStatusSchema>;

// 担当者割り当て
export const assignCandidateSchema = z.object({
  assignedTo: z.string().uuid().nullable(),
});

export type AssignCandidateInput = z.infer<typeof assignCandidateSchema>;

// 一括ステータス更新
export const bulkUpdateStatusSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1).max(100),
  status: CandidateStatus,
  note: z.string().max(1000).optional(),
});

export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;

// 一括担当者割り当て
export const bulkAssignSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1).max(100),
  assignedTo: z.string().uuid().nullable(),
});

export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;

// タグ追加
export const addTagsSchema = z.object({
  tags: z.array(z.string().max(50)).min(1).max(10),
});

export type AddTagsInput = z.infer<typeof addTagsSchema>;

// タグ削除
export const removeTagsSchema = z.object({
  tags: z.array(z.string().max(50)).min(1).max(10),
});

export type RemoveTagsInput = z.infer<typeof removeTagsSchema>;

// ステータス遷移ルール
export const STATUS_TRANSITIONS: Record<CandidateStatusType, CandidateStatusType[]> = {
  UNTOUCHED: ['IN_PROGRESS', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  IN_PROGRESS: ['COMPLETED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  COMPLETED: ['DOCUMENT_SCREENING', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  DOCUMENT_SCREENING: ['FIRST_INTERVIEW', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  FIRST_INTERVIEW: ['SECOND_INTERVIEW', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  SECOND_INTERVIEW: ['FINAL_INTERVIEW', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  FINAL_INTERVIEW: ['OFFER', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  OFFER: ['HIRED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
  HIRED: ['ON_HOLD'], // 採用後は基本的に変更不可
  REJECTED: ['ON_HOLD'], // 不採用は基本的に変更不可
  WITHDRAWN: ['ON_HOLD'], // 辞退は基本的に変更不可
  ON_HOLD: [], // ON_HOLDからは任意のステータスに復帰可能（特別処理）
};

// ステータス遷移が有効かチェック
export function isValidStatusTransition(
  currentStatus: CandidateStatusType,
  newStatus: CandidateStatusType,
  previousStatus?: CandidateStatusType
): boolean {
  // 同じステータスへの遷移は無効
  if (currentStatus === newStatus) {
    return false;
  }

  // ON_HOLDからの復帰は、前のステータスに戻る場合のみ許可
  if (currentStatus === 'ON_HOLD') {
    // 前のステータスが記録されていれば、そこに戻ることを許可
    // または、任意のステータスに遷移を許可（ビジネス要件による）
    return previousStatus ? newStatus === previousStatus : true;
  }

  // 通常の遷移チェック
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

// ステータスの表示名
export const STATUS_DISPLAY_NAMES: Record<CandidateStatusType, string> = {
  UNTOUCHED: '未対応',
  IN_PROGRESS: '対応中',
  COMPLETED: '診断完了',
  DOCUMENT_SCREENING: '書類選考',
  FIRST_INTERVIEW: '一次面接',
  SECOND_INTERVIEW: '二次面接',
  FINAL_INTERVIEW: '最終面接',
  OFFER: '内定',
  HIRED: '採用',
  REJECTED: '不採用',
  WITHDRAWN: '辞退',
  ON_HOLD: '保留',
};

// ステータスの順序（進捗表示用）
export const STATUS_ORDER: CandidateStatusType[] = [
  'UNTOUCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'DOCUMENT_SCREENING',
  'FIRST_INTERVIEW',
  'SECOND_INTERVIEW',
  'FINAL_INTERVIEW',
  'OFFER',
  'HIRED',
];

// 終了ステータス
export const TERMINAL_STATUSES: CandidateStatusType[] = ['HIRED', 'REJECTED', 'WITHDRAWN'];

// アクティブステータス（選考中）
export const ACTIVE_STATUSES: CandidateStatusType[] = [
  'UNTOUCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'DOCUMENT_SCREENING',
  'FIRST_INTERVIEW',
  'SECOND_INTERVIEW',
  'FINAL_INTERVIEW',
  'OFFER',
  'ON_HOLD',
];
