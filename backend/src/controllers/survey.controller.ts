import { Request, Response } from 'express';
import { surveyService } from '../services/survey.service';
import {
  getQuestionsQuerySchema,
  submitAnswersSchema,
  completeSurveySchema,
} from '../validators/survey.validator';
import { AuthUser } from '../types/auth.types';

// ========================================
// 診断設問コントローラー
// ========================================

class SurveyController {
  /**
   * 設問一覧取得
   * GET /api/survey/questions
   */
  async getQuestions(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // クエリパラメータのバリデーション
      const validationResult = getQuestionsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            details: validationResult.error.errors,
          },
        });
        return;
      }

      const { page } = validationResult.data;

      const result = await surveyService.getQuestions(page, currentUser);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('Error in getQuestions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '設問の取得に失敗しました',
        },
      });
    }
  }

  /**
   * 回答送信
   * POST /api/survey/answers
   */
  async submitAnswers(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // リクエストボディのバリデーション
      const validationResult = submitAnswersSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            details: validationResult.error.errors,
          },
        });
        return;
      }

      const result = await surveyService.submitAnswers(validationResult.data, currentUser);

      if (!result.success) {
        const statusCode = result.error?.code === 'INVALID_QUESTIONS' ? 400 : 500;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      // 信頼性に問題がある場合は警告を含める
      const response: {
        success: boolean;
        data: typeof result.data;
        warning?: {
          code: string;
          message: string;
          issues: string[];
        };
      } = {
        success: true,
        data: result.data,
      };

      if (result.data && !result.data.reliability.isReliable) {
        response.warning = {
          code: 'RELIABILITY_WARNING',
          message: '回答パターンに注意が必要です',
          issues: result.data.reliability.issues,
        };
      }

      res.json(response);
    } catch (error) {
      console.error('Error in submitAnswers:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '回答の保存に失敗しました',
        },
      });
    }
  }

  /**
   * 回答進捗取得
   * GET /api/survey/progress
   */
  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      const result = await surveyService.getProgress(currentUser);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('Error in getProgress:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '進捗の取得に失敗しました',
        },
      });
    }
  }

  /**
   * 診断完了
   * POST /api/survey/complete
   */
  async completeSurvey(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // リクエストボディのバリデーション
      const validationResult = completeSurveySchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            details: validationResult.error.errors,
          },
        });
        return;
      }

      const result = await surveyService.completeSurvey(validationResult.data, currentUser);

      if (!result.success) {
        const statusCode = result.error?.code === 'INCOMPLETE_SURVEY' ? 400 : 500;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: '診断が完了しました',
      });
    } catch (error) {
      console.error('Error in completeSurvey:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '診断結果の計算に失敗しました',
        },
      });
    }
  }
}

// シングルトンインスタンス
export const surveyController = new SurveyController();
