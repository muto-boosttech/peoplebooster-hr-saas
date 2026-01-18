import { z } from 'zod';
import { MBTI_TYPES, ANIMAL_CHARACTERS, ANIMAL_COLORS } from '../services/mbti-mapping.service';

/**
 * MBTI 16タイプのバリデーション
 */
const mbtiTypeSchema = z.enum(MBTI_TYPES, {
  errorMap: () => ({
    message: `MBTIタイプは ${MBTI_TYPES.join(', ')} のいずれかである必要があります`,
  }),
});

/**
 * MBTI指標のバリデーション（0-100の整数）
 */
const mbtiIndicatorSchema = z.number()
  .int('指標値は整数である必要があります')
  .min(0, '指標値は0以上である必要があります')
  .max(100, '指標値は100以下である必要があります');

/**
 * MBTI指標オブジェクトのバリデーション
 */
const mbtiIndicatorsSchema = z.object({
  E_I: mbtiIndicatorSchema.optional(),
  S_N: mbtiIndicatorSchema.optional(),
  T_F: mbtiIndicatorSchema.optional(),
  J_P: mbtiIndicatorSchema.optional(),
}).optional();

/**
 * MBTI診断登録リクエストのバリデーション
 */
export const createMBTIDiagnosisSchema = z.object({
  type: mbtiTypeSchema,
  indicators: mbtiIndicatorsSchema,
  sourceUrl: z.string()
    .url('有効なURLを入力してください')
    .max(500, 'URLは500文字以内である必要があります')
    .optional()
    .nullable(),
  diagnosedAt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
    .optional()
    .nullable()
    .transform((val) => val ? new Date(val) : null),
});

export type CreateMBTIDiagnosisInput = z.infer<typeof createMBTIDiagnosisSchema>;

/**
 * 動物占いキャラクターのバリデーション
 */
const animalCharacterSchema = z.enum(ANIMAL_CHARACTERS as unknown as [string, ...string[]], {
  errorMap: () => ({
    message: `動物キャラクターは ${ANIMAL_CHARACTERS.join(', ')} のいずれかである必要があります`,
  }),
});

/**
 * 動物占いカラーのバリデーション
 */
const animalColorSchema = z.enum(ANIMAL_COLORS as unknown as [string, ...string[]], {
  errorMap: () => ({
    message: `カラーは ${ANIMAL_COLORS.join(', ')} のいずれかである必要があります`,
  }),
}).optional().nullable();

/**
 * 動物占い診断登録リクエストのバリデーション
 */
export const createAnimalFortuneDiagnosisSchema = z.object({
  animal: animalCharacterSchema,
  color: animalColorSchema,
  detail60: z.string()
    .max(100, '60分類の詳細は100文字以内である必要があります')
    .optional()
    .nullable(),
  sourceUrl: z.string()
    .url('有効なURLを入力してください')
    .max(500, 'URLは500文字以内である必要があります')
    .optional()
    .nullable(),
  diagnosedAt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください')
    .optional()
    .nullable()
    .transform((val) => val ? new Date(val) : null),
});

export type CreateAnimalFortuneDiagnosisInput = z.infer<typeof createAnimalFortuneDiagnosisSchema>;

/**
 * 外部診断一覧取得クエリのバリデーション
 */
export const getExternalDiagnosisQuerySchema = z.object({
  userId: z.string().uuid('有効なユーザーIDを指定してください').optional(),
  type: z.enum(['MBTI', 'ANIMAL_FORTUNE']).optional(),
});

export type GetExternalDiagnosisQuery = z.infer<typeof getExternalDiagnosisQuerySchema>;

/**
 * 外部診断削除パラメータのバリデーション
 */
export const deleteExternalDiagnosisParamsSchema = z.object({
  id: z.string().uuid('有効な外部診断IDを指定してください'),
});

export type DeleteExternalDiagnosisParams = z.infer<typeof deleteExternalDiagnosisParamsSchema>;

/**
 * バリデーションヘルパー関数
 */
export const validateMBTIDiagnosis = (data: unknown) => {
  return createMBTIDiagnosisSchema.safeParse(data);
};

export const validateAnimalFortuneDiagnosis = (data: unknown) => {
  return createAnimalFortuneDiagnosisSchema.safeParse(data);
};

export const validateGetExternalDiagnosisQuery = (data: unknown) => {
  return getExternalDiagnosisQuerySchema.safeParse(data);
};

export const validateDeleteExternalDiagnosisParams = (data: unknown) => {
  return deleteExternalDiagnosisParamsSchema.safeParse(data);
};
