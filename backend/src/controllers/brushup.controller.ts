import { Request, Response, NextFunction } from 'express';
import { aiBrushUpService } from '../services/ai-brushup.service';
import { AuthenticatedRequest } from '../types/auth.types';

/**
 * 手動ブラッシュアップを実行
 * POST /api/diagnosis/:userId/brushup
 */
export const executeBrushUp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const executorId = req.user!.id;

    const result = await aiBrushUpService.manualBrushUp(userId, executorId);

    if (!result.success && !result.skipped) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    if (result.skipped) {
      res.status(200).json({
        success: true,
        skipped: true,
        message: result.skipReason,
        confidence: result.confidence,
        riskFlags: result.riskFlags,
        aiReasoning: result.aiReasoning,
        _meta: {
          disclaimer: 'この診断結果は参考情報です。採用や人事評価の唯一の判断基準として使用しないでください。',
          aiNotice: 'AIによる分析結果は一般的な傾向に基づいています。個人差があることをご理解ください。',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        diagnosisResultId: result.diagnosisResultId,
        brushUpHistoryId: result.brushUpHistoryId,
        version: result.version,
        changes: result.changes,
        aiReasoning: result.aiReasoning,
        confidence: result.confidence,
        riskFlags: result.riskFlags,
      },
      _meta: {
        disclaimer: 'この診断結果は参考情報です。採用や人事評価の唯一の判断基準として使用しないでください。',
        aiNotice: 'AIによる分析結果は一般的な傾向に基づいています。個人差があることをご理解ください。',
        evidenceLabel: '参考情報',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ブラッシュアップ履歴を取得
 * GET /api/diagnosis/:userId/brushup-history
 */
export const getBrushUpHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const history = await aiBrushUpService.getBrushUpHistory(userId);

    res.status(200).json({
      success: true,
      data: {
        history,
        totalCount: history.length,
      },
      _meta: {
        disclaimer: 'この診断結果は参考情報です。採用や人事評価の唯一の判断基準として使用しないでください。',
        aiNotice: 'ブラッシュアップ履歴はAIによる調整の記録です。すべての変更は監査ログに記録されています。',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * バージョン間の差分詳細を取得
 * GET /api/diagnosis/:userId/brushup-history/:historyId/diff
 */
export const getBrushUpDiff = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { historyId } = req.params;

    const diff = await aiBrushUpService.getVersionDiff(historyId);

    if (!diff) {
      res.status(404).json({
        success: false,
        error: 'ブラッシュアップ履歴が見つかりません',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        version: diff.version,
        previousVersion: diff.previousVersion,
        changes: diff.changes,
        triggerType: diff.triggerType,
        aiReasoning: diff.aiReasoning,
        confidence: diff.confidence,
        riskFlags: diff.riskFlags,
        createdAt: diff.createdAt,
      },
      _meta: {
        disclaimer: 'この診断結果は参考情報です。採用や人事評価の唯一の判断基準として使用しないでください。',
        aiNotice: 'AIによる調整の詳細です。信頼度とリスクフラグを確認してください。',
        evidenceLabel: '参考情報',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 自分のブラッシュアップ履歴を取得
 * GET /api/diagnosis/me/brushup-history
 */
export const getMyBrushUpHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const history = await aiBrushUpService.getBrushUpHistory(userId);

    res.status(200).json({
      success: true,
      data: {
        history,
        totalCount: history.length,
      },
      _meta: {
        disclaimer: 'この診断結果は参考情報です。採用や人事評価の唯一の判断基準として使用しないでください。',
        aiNotice: 'ブラッシュアップ履歴はAIによる調整の記録です。すべての変更は監査ログに記録されています。',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const brushUpController = {
  executeBrushUp,
  getBrushUpHistory,
  getBrushUpDiff,
  getMyBrushUpHistory,
};
