import { Request, Response, NextFunction } from 'express';
import { externalDiagnosisService } from '../services/external-diagnosis.service';
import {
  validateMBTIDiagnosis,
  validateAnimalFortuneDiagnosis,
  validateGetExternalDiagnosisQuery,
  validateDeleteExternalDiagnosisParams,
} from '../validators/external-diagnosis.validator';
import { AuthenticatedRequest } from '../types/auth.types';
import { ExternalDiagnosisType } from '@prisma/client';

/**
 * MBTI診断を登録/更新
 * POST /api/external-diagnosis/mbti
 */
export const createMBTIDiagnosis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // バリデーション
    const validation = validateMBTIDiagnosis(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: validation.error.errors,
      });
    }

    const { diagnosis, brushUpResult } = await externalDiagnosisService.createOrUpdateMBTIDiagnosis(
      userId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      data: {
        diagnosis,
        brushUp: brushUpResult,
      },
      message: 'MBTI診断を登録しました',
      // AIガードレール: 参考情報ラベル
      notice: {
        type: 'info',
        message: 'MBTI診断結果は性格診断の補助情報として活用されます。採用判断の唯一の基準として使用しないでください。',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 動物占い診断を登録/更新
 * POST /api/external-diagnosis/animal-fortune
 */
export const createAnimalFortuneDiagnosis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // バリデーション
    const validation = validateAnimalFortuneDiagnosis(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: validation.error.errors,
      });
    }

    const { diagnosis, brushUpResult } = await externalDiagnosisService.createOrUpdateAnimalFortuneDiagnosis(
      userId,
      validation.data
    );

    return res.status(201).json({
      success: true,
      data: {
        diagnosis,
        brushUp: brushUpResult,
      },
      message: '動物占い診断を登録しました',
      // AIガードレール: 参考情報ラベル
      notice: {
        type: 'info',
        message: '動物占い診断結果は性格診断の補助情報として活用されます。科学的根拠は限定的であることをご理解ください。',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 外部診断一覧を取得
 * GET /api/external-diagnosis
 */
export const getExternalDiagnoses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUser = req.user!;

    // バリデーション
    const validation = validateGetExternalDiagnosisQuery(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: validation.error.errors,
      });
    }

    const { userId, type } = validation.data;

    // 権限チェック: 他のユーザーの診断を見る場合は管理者権限が必要
    let targetUserId = currentUser.id;
    if (userId && userId !== currentUser.id) {
      if (currentUser.role !== 'SYSTEM_ADMIN' && currentUser.role !== 'COMPANY_ADMIN') {
        return res.status(403).json({
          success: false,
          error: '他のユーザーの外部診断を閲覧する権限がありません',
        });
      }
      targetUserId = userId;
    }

    const diagnoses = await externalDiagnosisService.getExternalDiagnoses(
      targetUserId,
      type as ExternalDiagnosisType | undefined
    );

    return res.json({
      success: true,
      data: diagnoses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 外部診断を削除
 * DELETE /api/external-diagnosis/:id
 */
export const deleteExternalDiagnosis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // バリデーション
    const validation = validateDeleteExternalDiagnosisParams(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: validation.error.errors,
      });
    }

    await externalDiagnosisService.deleteExternalDiagnosis(userId, validation.data.id);

    return res.json({
      success: true,
      message: '外部診断を削除しました',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '外部診断が見つかりません') {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      if (error.message === 'この外部診断を削除する権限がありません') {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }
    }
    next(error);
  }
};

/**
 * MBTIと診断結果の整合性をチェック
 * GET /api/external-diagnosis/mbti/consistency
 */
export const checkMBTIConsistency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const result = await externalDiagnosisService.checkMBTIConsistency(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'MBTI診断または性格診断結果が見つかりません',
      });
    }

    return res.json({
      success: true,
      data: result,
      // AIガードレール: 整合性チェックの説明
      notice: {
        type: 'info',
        message: '整合性スコアは、MBTI診断と性格診断の結果がどの程度一致しているかを示します。不一致がある場合でも、どちらかが間違っているわけではありません。',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 動物占いと診断結果の整合性をチェック
 * GET /api/external-diagnosis/animal-fortune/consistency
 */
export const checkAnimalConsistency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const result = await externalDiagnosisService.checkAnimalConsistency(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '動物占い診断または性格診断結果が見つかりません',
      });
    }

    return res.json({
      success: true,
      data: result,
      // AIガードレール: 整合性チェックの説明
      notice: {
        type: 'info',
        message: '動物占いは科学的根拠が限定的なため、整合性スコアは参考程度にご覧ください。',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ブラッシュアップ履歴を取得
 * GET /api/external-diagnosis/brush-up-history
 */
export const getBrushUpHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    const history = await externalDiagnosisService.getBrushUpHistory(userId);

    return res.json({
      success: true,
      data: history,
      // AIガードレール: ブラッシュアップの説明
      notice: {
        type: 'info',
        message: 'ブラッシュアップ履歴は、外部診断や面接コメントに基づいて診断結果がどのように更新されたかを示します。すべての更新は監査ログに記録されています。',
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createMBTIDiagnosis,
  createAnimalFortuneDiagnosis,
  getExternalDiagnoses,
  deleteExternalDiagnosis,
  checkMBTIConsistency,
  checkAnimalConsistency,
  getBrushUpHistory,
};
