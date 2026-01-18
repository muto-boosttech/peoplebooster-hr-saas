import { Request, Response, NextFunction } from 'express';
import { reportGenerationService } from '../services/report-generation.service';
import {
  generateIndividualReportSchema,
  generateCandidateSummaryReportSchema,
  generateOrganizationReportSchema,
  generateRecruitmentSummaryReportSchema,
  exportCsvQuerySchema,
} from '../validators/report.validator';
import { AuthenticatedUser } from '../types/auth.types';

/**
 * AuthUserをAuthenticatedUserに変換
 */
function toAuthenticatedUser(user: Express.Request['user']): AuthenticatedUser {
  return {
    id: user!.userId,
    email: user!.email,
    role: user!.role,
    companyId: user!.companyId,
    departmentId: user!.departmentId,
  };
}

/**
 * レポートコントローラー
 */
class ReportController {
  /**
   * 個人診断レポートを生成
   * POST /api/reports/individual/:userId
   */
  async generateIndividualReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const input = generateIndividualReportSchema.parse(req.body);
      const currentUser = toAuthenticatedUser(req.user);

      // companyLogoオプションはCOMPANY_ADMIN以上のみ使用可能
      if (input.companyLogo && !['SYSTEM_ADMIN', 'COMPANY_ADMIN'].includes(currentUser.role)) {
        input.companyLogo = false;
      }

      const result = await reportGenerationService.generateIndividualReport(
        userId,
        input,
        currentUser
      );

      res.json({
        success: true,
        data: {
          url: result.signedUrl,
          expiresAt: result.expiresAt,
          key: result.key,
        },
        message: '個人診断レポートを生成しました',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'バリデーションエラー',
          details: error.errors,
        });
        return;
      }
      if (error.message.includes('見つかりません')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * 候補者評価サマリーレポートを生成
   * POST /api/reports/candidate-summary/:candidateId
   */
  async generateCandidateSummaryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { candidateId } = req.params;
      generateCandidateSummaryReportSchema.parse(req.body); // バリデーションのみ
      const currentUser = toAuthenticatedUser(req.user);

      const result = await reportGenerationService.generateCandidateSummaryReport(
        candidateId,
        currentUser
      );

      res.json({
        success: true,
        data: {
          url: result.signedUrl,
          expiresAt: result.expiresAt,
          key: result.key,
        },
        message: '候補者評価サマリーレポートを生成しました',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'バリデーションエラー',
          details: error.errors,
        });
        return;
      }
      if (error.message.includes('見つかりません')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * 組織傾向分析レポートを生成
   * POST /api/reports/organization/:companyId
   */
  async generateOrganizationReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const input = generateOrganizationReportSchema.parse({
        ...req.body,
        ...req.query,
      });
      const currentUser = toAuthenticatedUser(req.user);

      const result = await reportGenerationService.generateOrganizationReport(
        companyId,
        input,
        currentUser
      );

      res.json({
        success: true,
        data: {
          url: result.signedUrl,
          expiresAt: result.expiresAt,
          key: result.key,
        },
        message: '組織傾向分析レポートを生成しました',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'バリデーションエラー',
          details: error.errors,
        });
        return;
      }
      if (error.message.includes('見つかりません')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * 採用活動サマリーレポートを生成
   * POST /api/reports/recruitment-summary/:companyId
   */
  async generateRecruitmentSummaryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const input = generateRecruitmentSummaryReportSchema.parse({
        ...req.body,
        ...req.query,
      });
      const currentUser = toAuthenticatedUser(req.user);

      const result = await reportGenerationService.generateRecruitmentSummaryReport(
        companyId,
        input as { startDate: Date; endDate: Date; includeDetails?: boolean },
        currentUser
      );

      res.json({
        success: true,
        data: {
          url: result.signedUrl,
          expiresAt: result.expiresAt,
          key: result.key,
        },
        message: '採用活動サマリーレポートを生成しました',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'バリデーションエラー',
          details: error.errors,
        });
        return;
      }
      if (error.message.includes('見つかりません')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * CSVエクスポート
   * GET /api/reports/export/csv
   */
  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = exportCsvQuerySchema.parse(req.query);
      const currentUser = toAuthenticatedUser(req.user);

      const { csv, filename } = await reportGenerationService.exportCsv(
        input as { type: 'diagnosis' | 'candidates' | 'interviews'; companyId: string; startDate?: Date; endDate?: Date },
        currentUser
      );

      // CSVファイルとしてダウンロード
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'バリデーションエラー',
          details: error.errors,
        });
        return;
      }
      if (error.message.includes('権限がありません')) {
        res.status(403).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('無効な')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
}

export const reportController = new ReportController();
