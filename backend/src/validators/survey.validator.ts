import { z } from 'zod';

// ========================================
// 設問取得クエリ
// ========================================

export const getQuestionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).max(3)),
});

export type GetQuestionsQuery = z.infer<typeof getQuestionsQuerySchema>;

// ========================================
// 回答送信
// ========================================

export const answerSchema = z.object({
  questionId: z.string().uuid('設問IDはUUID形式である必要があります'),
  score: z
    .number()
    .int('スコアは整数である必要があります')
    .min(1, 'スコアは1以上である必要があります')
    .max(7, 'スコアは7以下である必要があります'),
});

export const submitAnswersSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, 'ページ番号は1以上である必要があります')
    .max(3, 'ページ番号は3以下である必要があります'),
  answers: z
    .array(answerSchema)
    .min(30, '30問全ての回答が必要です')
    .max(30, '30問全ての回答が必要です'),
});

export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;

// ========================================
// 診断完了
// ========================================

export const completeSurveySchema = z.object({
  nickname: z
    .string()
    .min(1, 'ニックネームは必須です')
    .max(100, 'ニックネームは100文字以内で入力してください')
    .optional(),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以内で入力してください')
    .optional(),
  currentJob: z
    .string()
    .max(100, '現在の職種は100文字以内で入力してください')
    .optional(),
});

export type CompleteSurveyInput = z.infer<typeof completeSurveySchema>;

// ========================================
// 管理者用: 設問管理
// ========================================

export const createQuestionSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .max(3),
  orderNumber: z
    .number()
    .int()
    .min(1)
    .max(30),
  questionText: z
    .string()
    .min(1, '設問テキストは必須です')
    .max(500, '設問テキストは500文字以内で入力してください'),
  category: z.enum([
    'EXTRAVERSION',
    'OPENNESS',
    'AGREEABLENESS',
    'CONSCIENTIOUSNESS',
    'NEUROTICISM',
    'THINKING',
    'BEHAVIOR',
  ]),
  isReverse: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = createQuestionSchema.partial();

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

// ========================================
// 回答信頼性チェック用
// ========================================

export interface AnswerReliabilityResult {
  isReliable: boolean;
  issues: string[];
  details: {
    straightLining: boolean;
    extremeResponses: number;
    inconsistentPairs: number;
    responseTime?: number;
  };
}
