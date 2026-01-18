import { z } from 'zod';

/**
 * 個人レポート生成リクエストスキーマ
 */
export const generateIndividualReportSchema = z.object({
  includeDetail: z.boolean().optional().default(true),
  includePotential: z.boolean().optional().default(true),
  includeSimilarity: z.boolean().optional().default(false),
  companyLogo: z.boolean().optional().default(false),
});

export type GenerateIndividualReportInput = z.infer<typeof generateIndividualReportSchema>;

/**
 * 候補者サマリーレポート生成リクエストスキーマ
 */
export const generateCandidateSummaryReportSchema = z.object({
  includeComments: z.boolean().optional().default(true),
  includeInterviews: z.boolean().optional().default(true),
  includeDiagnosis: z.boolean().optional().default(true),
});

export type GenerateCandidateSummaryReportInput = z.infer<typeof generateCandidateSummaryReportSchema>;

/**
 * 組織レポート生成リクエストスキーマ
 */
export const generateOrganizationReportSchema = z.object({
  departmentId: z.string().uuid().optional(),
  includeIndividualScores: z.boolean().optional().default(false),
});

export type GenerateOrganizationReportInput = z.infer<typeof generateOrganizationReportSchema>;

/**
 * 採用サマリーレポート生成リクエストスキーマ
 */
export const generateRecruitmentSummaryReportSchema = z.object({
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  includeDetails: z.boolean().optional().default(false),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: '開始日は終了日以前である必要があります' }
);

export type GenerateRecruitmentSummaryReportInput = z.infer<typeof generateRecruitmentSummaryReportSchema>;

/**
 * CSVエクスポートクエリスキーマ
 */
export const exportCsvQuerySchema = z.object({
  type: z.enum(['diagnosis', 'candidates', 'interviews']),
  companyId: z.string().uuid(),
  startDate: z.string().transform((val) => new Date(val)).optional(),
  endDate: z.string().transform((val) => new Date(val)).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: '開始日は終了日以前である必要があります' }
);

export type ExportCsvQueryInput = z.infer<typeof exportCsvQuerySchema>;

/**
 * エクスポートタイプの表示名
 */
export const EXPORT_TYPE_DISPLAY_NAMES: Record<string, string> = {
  diagnosis: '診断結果',
  candidates: '候補者',
  interviews: '面接',
};
