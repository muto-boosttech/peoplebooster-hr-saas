import { z } from 'zod';

/**
 * 面接タイプ
 */
export const InterviewType = z.enum(['PHONE', 'VIDEO', 'ONSITE']);
export type InterviewTypeType = z.infer<typeof InterviewType>;

/**
 * 面接ステータス
 */
export const InterviewStatus = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
export type InterviewStatusType = z.infer<typeof InterviewStatus>;

/**
 * 面接一覧取得クエリ
 */
export const getInterviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  candidateId: z.string().uuid().optional(),
  interviewerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  type: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  sortBy: z.enum(['scheduledAt', 'createdAt', 'status']).default('scheduledAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type GetInterviewsQuery = z.infer<typeof getInterviewsQuerySchema>;

/**
 * カレンダー取得クエリ
 */
export const getInterviewCalendarQuerySchema = z.object({
  startDate: z.string().datetime({ message: '有効な日時形式で入力してください' }),
  endDate: z.string().datetime({ message: '有効な日時形式で入力してください' }),
  view: z.enum(['day', 'week', 'month']).default('week'),
  interviewerId: z.string().uuid().optional(),
});

export type GetInterviewCalendarQuery = z.infer<typeof getInterviewCalendarQuerySchema>;

/**
 * 面接作成
 */
export const createInterviewSchema = z.object({
  candidateId: z.string().uuid({ message: '有効な候補者IDを入力してください' }),
  interviewerId: z.string().uuid({ message: '有効な面接官IDを入力してください' }),
  scheduledAt: z.string().datetime({ message: '有効な日時形式で入力してください' }),
  duration: z.number().int().min(15, '面接時間は15分以上で入力してください').max(480, '面接時間は8時間以内で入力してください').default(60),
  type: InterviewType.default('VIDEO'),
  location: z.string().max(500).nullable().optional(),
  meetingUrl: z.string().url({ message: '有効なURLを入力してください' }).max(500).nullable().optional(),
  notes: z.string().max(2000).optional(),
  sendNotification: z.boolean().default(true),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;

/**
 * 面接更新
 */
export const updateInterviewSchema = z.object({
  interviewerId: z.string().uuid({ message: '有効な面接官IDを入力してください' }).optional(),
  scheduledAt: z.string().datetime({ message: '有効な日時形式で入力してください' }).optional(),
  duration: z.number().int().min(15, '面接時間は15分以上で入力してください').max(480, '面接時間は8時間以内で入力してください').optional(),
  type: InterviewType.optional(),
  location: z.string().max(500).nullable().optional(),
  meetingUrl: z.string().url({ message: '有効なURLを入力してください' }).max(500).nullable().optional(),
  notes: z.string().max(2000).optional(),
  sendNotification: z.boolean().default(true),
});

export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;

/**
 * 面接ステータス更新
 */
export const updateInterviewStatusSchema = z.object({
  status: z.enum(['COMPLETED', 'CANCELLED', 'NO_SHOW'], {
    errorMap: () => ({ message: 'ステータスはCOMPLETED、CANCELLED、NO_SHOWのいずれかを指定してください' }),
  }),
  note: z.string().max(1000).optional(),
});

export type UpdateInterviewStatusInput = z.infer<typeof updateInterviewStatusSchema>;

/**
 * 面接タイプの表示名
 */
export const INTERVIEW_TYPE_DISPLAY_NAMES: Record<InterviewTypeType, string> = {
  PHONE: '電話面接',
  VIDEO: 'ビデオ面接',
  ONSITE: '対面面接',
};

/**
 * 面接ステータスの表示名
 */
export const INTERVIEW_STATUS_DISPLAY_NAMES: Record<InterviewStatusType, string> = {
  SCHEDULED: '予定',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
  NO_SHOW: '欠席',
};

/**
 * ステータス遷移ルール
 */
export const INTERVIEW_STATUS_TRANSITIONS: Record<InterviewStatusType, InterviewStatusType[]> = {
  SCHEDULED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [], // 完了後は変更不可
  CANCELLED: [], // キャンセル後は変更不可
  NO_SHOW: [], // 欠席後は変更不可
};

/**
 * ステータス遷移が有効かチェック
 */
export function isValidInterviewStatusTransition(
  currentStatus: InterviewStatusType,
  newStatus: InterviewStatusType
): boolean {
  if (currentStatus === newStatus) {
    return false;
  }
  const allowedTransitions = INTERVIEW_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}
