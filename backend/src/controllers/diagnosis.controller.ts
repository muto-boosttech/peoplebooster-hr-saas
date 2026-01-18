import { Request, Response, NextFunction } from 'express';
import { diagnosisService } from '../services/diagnosis.service';
import { prisma } from '../models';
import { AuthenticatedRequest } from '../types/auth.types';

/**
 * 診断結果コントローラー
 */
class DiagnosisController {
  /**
   * 診断結果を取得
   * GET /api/diagnosis/:userId
   */
  async getDiagnosisResult(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      // 診断結果を取得
      const result = await diagnosisService.getDiagnosisResult(userId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DIAGNOSIS_NOT_FOUND',
            message: '診断結果が見つかりません',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        meta: {
          disclaimer: 'この診断結果は参考情報です。採用や人事評価の唯一の判断基準として使用しないでください。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 診断結果の詳細を取得
   * GET /api/diagnosis/:userId/detail
   */
  async getDiagnosisDetail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      // 診断結果の詳細を取得
      const result = await diagnosisService.getDiagnosisDetail(userId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DIAGNOSIS_NOT_FOUND',
            message: '診断結果が見つかりません',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        meta: {
          disclaimer: 'この診断結果は参考情報です。採用や人事評価の唯一の判断基準として使用しないでください。',
          aiNotice: 'タイプ別解説はAIによる一般的な傾向に基づいています。個人差があることをご理解ください。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 活躍可能性スコアを取得
   * GET /api/diagnosis/:userId/potential
   */
  async getPotentialScores(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      // 活躍可能性スコアを取得
      const scores = await diagnosisService.getPotentialScores(userId);

      if (scores.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'POTENTIAL_SCORES_NOT_FOUND',
            message: '活躍可能性スコアが見つかりません。診断を完了してください。',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          scores,
        },
        meta: {
          disclaimer: '活躍可能性スコアは参考情報です。実際の適性は経験やスキル、環境など多くの要因に影響されます。',
          aiNotice: 'このスコアはAIによる推定であり、採用や配置の唯一の判断基準として使用しないでください。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 類似メンバーを取得
   * GET /api/diagnosis/:userId/similarity
   */
  async getSimilarMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { minSimilarity = '70', limit = '10' } = req.query;

      // 対象ユーザーの企業IDを取得
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!targetUser || !targetUser.companyId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        });
        return;
      }

      // リクエストユーザーが同一企業かチェック
      const currentUser = req.user!;
      if (currentUser.role !== 'SYSTEM_ADMIN' && currentUser.companyId !== targetUser.companyId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '同一企業のメンバーのみ閲覧できます',
          },
        });
        return;
      }

      // 類似メンバーを取得
      const result = await diagnosisService.getSimilarMembers(
        userId,
        targetUser.companyId,
        parseInt(minSimilarity as string, 10),
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: result,
        meta: {
          disclaimer: '類似度はBigFive性格特性に基づいて計算されています。実際の相性や協働のしやすさは他の要因にも影響されます。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 診断履歴を取得
   * GET /api/diagnosis/:userId/history
   */
  async getDiagnosisHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = '10' } = req.query;

      const history = await diagnosisService.getDiagnosisHistory(
        userId,
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: {
          history,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ブラッシュアップ履歴を取得
   * GET /api/diagnosis/:userId/brushup-history
   */
  async getBrushUpHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const history = await diagnosisService.getBrushUpHistory(userId);

      res.json({
        success: true,
        data: {
          history,
        },
        meta: {
          description: 'ブラッシュアップ履歴は、外部診断やフィードバックに基づいて診断結果が更新された記録です。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 外部診断結果を取得
   * GET /api/diagnosis/:userId/external
   */
  async getExternalDiagnosis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const externalDiagnoses = await diagnosisService.getExternalDiagnosis(userId);

      res.json({
        success: true,
        data: {
          externalDiagnoses,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 企業の診断統計を取得
   * GET /api/diagnosis/company/:companyId/stats
   */
  async getCompanyDiagnosisStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { companyId } = req.params;

      // 権限チェック
      const currentUser = req.user!;
      if (currentUser.role !== 'SYSTEM_ADMIN' && currentUser.companyId !== companyId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'この企業の統計情報にアクセスする権限がありません',
          },
        });
        return;
      }

      const stats = await diagnosisService.getCompanyDiagnosisStats(companyId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 自分の診断結果を取得
   * GET /api/diagnosis/me
   */
  async getMyDiagnosisResult(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await diagnosisService.getDiagnosisResult(userId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DIAGNOSIS_NOT_FOUND',
            message: '診断結果が見つかりません。診断を完了してください。',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 自分の診断結果詳細を取得
   * GET /api/diagnosis/me/detail
   */
  async getMyDiagnosisDetail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await diagnosisService.getDiagnosisDetail(userId);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DIAGNOSIS_NOT_FOUND',
            message: '診断結果が見つかりません。診断を完了してください。',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        meta: {
          disclaimer: 'この診断結果は参考情報です。',
          aiNotice: 'タイプ別解説はAIによる一般的な傾向に基づいています。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 自分の活躍可能性スコアを取得
   * GET /api/diagnosis/me/potential
   */
  async getMyPotentialScores(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const scores = await diagnosisService.getPotentialScores(userId);

      if (scores.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'POTENTIAL_SCORES_NOT_FOUND',
            message: '活躍可能性スコアが見つかりません。診断を完了してください。',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          scores,
        },
        meta: {
          disclaimer: '活躍可能性スコアは参考情報です。',
          aiNotice: 'このスコアはAIによる推定です。',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 自分の類似メンバーを取得
   * GET /api/diagnosis/me/similarity
   */
  async getMySimilarMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = req.user!;
      const { minSimilarity = '70', limit = '10' } = req.query;

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_COMPANY',
            message: '企業に所属していないため、類似メンバーを取得できません',
          },
        });
        return;
      }

      const result = await diagnosisService.getSimilarMembers(
        currentUser.id,
        currentUser.companyId,
        parseInt(minSimilarity as string, 10),
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: result,
        meta: {
          disclaimer: '類似度はBigFive性格特性に基づいて計算されています。',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const diagnosisController = new DiagnosisController();
