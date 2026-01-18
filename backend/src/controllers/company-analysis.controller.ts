import { Response, NextFunction } from 'express';
import { companyAnalysisService } from '../services/company-analysis.service';
import { AuthenticatedRequest } from '../types/auth.types';
import { prisma } from '../models';

/**
 * 企業傾向分析コントローラー
 */
class CompanyAnalysisController {
  /**
   * 権限チェック（SYSTEM_ADMINまたは該当企業管理者）
   */
  private async checkAccess(req: AuthenticatedRequest, companyId: string): Promise<boolean> {
    const user = req.user!;
    if (user.role === 'SYSTEM_ADMIN') return true;
    if (user.role === 'COMPANY_ADMIN' && user.companyId === companyId) return true;
    return false;
  }

  /**
   * 概要分析を取得
   * GET /api/companies/:companyId/analysis/overview
   */
  async getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      // 権限チェック
      if (!await this.checkAccess(req, companyId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の分析データにアクセスする権限がありません',
          },
        });
        return;
      }

      // 企業存在チェック
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true },
      });

      if (!company) {
        res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: '企業が見つかりません',
          },
        });
        return;
      }

      const overview = await companyAnalysisService.getOverview(companyId);

      res.json({
        success: true,
        data: {
          companyId,
          companyName: company.name,
          ...overview,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 思考パターン分析を取得
   * GET /api/companies/:companyId/analysis/thinking-pattern
   */
  async getThinkingPatternAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!await this.checkAccess(req, companyId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の分析データにアクセスする権限がありません',
          },
        });
        return;
      }

      const analysis = await companyAnalysisService.getThinkingPatternAnalysis(companyId);

      res.json({
        success: true,
        data: analysis,
        meta: {
          description: '思考パターン（RASE）は、リーダー・アナリスト・サポーター・エネルギッシュの4タイプで構成されます。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 行動パターン分析を取得
   * GET /api/companies/:companyId/analysis/behavior-pattern
   */
  async getBehaviorPatternAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!await this.checkAccess(req, companyId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の分析データにアクセスする権限がありません',
          },
        });
        return;
      }

      const analysis = await companyAnalysisService.getBehaviorPatternAnalysis(companyId);

      res.json({
        success: true,
        data: analysis,
        meta: {
          description: '行動パターンは、効率・友好・知識・体裁・挑戦の5軸で構成されます。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * BigFive分析を取得
   * GET /api/companies/:companyId/analysis/big-five
   */
  async getBigFiveAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!await this.checkAccess(req, companyId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の分析データにアクセスする権限がありません',
          },
        });
        return;
      }

      const analysis = await companyAnalysisService.getBigFiveAnalysis(companyId);

      res.json({
        success: true,
        data: analysis,
        meta: {
          description: 'BigFiveは、外向性・神経症傾向・開放性・協調性・誠実性の5因子で構成される性格特性モデルです。',
          benchmarkNote: 'ベンチマーク平均は偏差値50を基準としています。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 部門別分析を取得
   * GET /api/companies/:companyId/analysis/by-department
   */
  async getDepartmentAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;
      const { departmentId } = req.query;

      if (!await this.checkAccess(req, companyId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の分析データにアクセスする権限がありません',
          },
        });
        return;
      }

      const analysis = await companyAnalysisService.getDepartmentAnalysis(
        companyId,
        departmentId as string | undefined
      );

      res.json({
        success: true,
        data: analysis,
        meta: {
          description: '部門別の性格特性傾向を比較分析しています。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * タイプ分布を取得
   * GET /api/companies/:companyId/analysis/type-distribution
   */
  async getTypeDistribution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!await this.checkAccess(req, companyId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の分析データにアクセスする権限がありません',
          },
        });
        return;
      }

      const distribution = await companyAnalysisService.getTypeDistribution(companyId);

      res.json({
        success: true,
        data: distribution,
        meta: {
          description: 'タイプは外向性と開放性の組み合わせで4タイプに分類されます。',
          types: {
            EE: '情熱的リーダー型 - 外向的で変化を好む',
            EI: '実行力重視型 - 外向的で安定を好む',
            IE: '思索的クリエイター型 - 内向的で変化を好む',
            II: '分析的専門家型 - 内向的で安定を好む',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * キャッシュを無効化
   * POST /api/companies/:companyId/analysis/invalidate-cache
   */
  async invalidateCache(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      // SYSTEM_ADMINのみ
      if (req.user!.role !== 'SYSTEM_ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この操作はシステム管理者のみ実行できます',
          },
        });
        return;
      }

      await companyAnalysisService.invalidateCompanyCache(companyId);

      res.json({
        success: true,
        message: 'キャッシュを無効化しました',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 全分析データを一括取得
   * GET /api/companies/:companyId/analysis/all
   */
  async getAllAnalysis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!await this.checkAccess(req, companyId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の分析データにアクセスする権限がありません',
          },
        });
        return;
      }

      // 企業情報取得
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true },
      });

      if (!company) {
        res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: '企業が見つかりません',
          },
        });
        return;
      }

      // 並列で全分析データを取得
      const [overview, thinkingPattern, behaviorPattern, bigFive, typeDistribution, departmentAnalysis] =
        await Promise.all([
          companyAnalysisService.getOverview(companyId),
          companyAnalysisService.getThinkingPatternAnalysis(companyId),
          companyAnalysisService.getBehaviorPatternAnalysis(companyId),
          companyAnalysisService.getBigFiveAnalysis(companyId),
          companyAnalysisService.getTypeDistribution(companyId),
          companyAnalysisService.getDepartmentAnalysis(companyId),
        ]);

      res.json({
        success: true,
        data: {
          companyId,
          companyName: company.name,
          overview,
          thinkingPattern,
          behaviorPattern,
          bigFive,
          typeDistribution,
          departmentAnalysis,
        },
        meta: {
          generatedAt: new Date().toISOString(),
          cacheInfo: 'データは1時間キャッシュされます。新しい診断完了時に自動更新されます。',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const companyAnalysisController = new CompanyAnalysisController();
