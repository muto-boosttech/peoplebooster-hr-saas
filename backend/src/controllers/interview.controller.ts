import { Request, Response, NextFunction } from 'express';
import { interviewService } from '../services/interview.service';
import {
  getInterviewsQuerySchema,
  getInterviewCalendarQuerySchema,
  createInterviewSchema,
  updateInterviewSchema,
  updateInterviewStatusSchema,
} from '../validators/interview.validator';
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
 * 面接スケジュールコントローラー
 */
class InterviewController {
  /**
   * 面接一覧を取得
   * GET /api/interviews
   */
  async getInterviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = getInterviewsQuerySchema.parse(req.query);
      const user = toAuthenticatedUser(req.user);

      const result = await interviewService.getInterviews(query, user);

      res.json({
        success: true,
        data: result,
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
      next(error);
    }
  }

  /**
   * カレンダー形式で面接を取得
   * GET /api/interviews/calendar
   */
  async getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = getInterviewCalendarQuerySchema.parse(req.query);
      const user = toAuthenticatedUser(req.user);

      const result = await interviewService.getCalendar(query, user);

      res.json({
        success: true,
        data: result,
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
      next(error);
    }
  }

  /**
   * 面接詳細を取得
   * GET /api/interviews/:id
   */
  async getInterviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = toAuthenticatedUser(req.user);

      const interview = await interviewService.getInterviewById(id, user);

      if (!interview) {
        res.status(404).json({
          success: false,
          error: '面接が見つかりません',
        });
        return;
      }

      res.json({
        success: true,
        data: interview,
      });
    } catch (error: any) {
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
   * 面接を作成
   * POST /api/interviews
   */
  async createInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createInterviewSchema.parse(req.body);
      const user = toAuthenticatedUser(req.user);

      const interview = await interviewService.createInterview(input, user);

      res.status(201).json({
        success: true,
        data: interview,
        message: '面接をスケジュールしました',
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
      if (error.message.includes('重複しています')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * 面接を更新
   * PUT /api/interviews/:id
   */
  async updateInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = updateInterviewSchema.parse(req.body);
      const user = toAuthenticatedUser(req.user);

      const interview = await interviewService.updateInterview(id, input, user);

      res.json({
        success: true,
        data: interview,
        message: '面接スケジュールを更新しました',
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
      if (error.message.includes('重複しています')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('予定状態の面接のみ')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * 面接ステータスを更新
   * PUT /api/interviews/:id/status
   */
  async updateInterviewStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = updateInterviewStatusSchema.parse(req.body);
      const user = toAuthenticatedUser(req.user);

      const interview = await interviewService.updateInterviewStatus(id, input, user);

      res.json({
        success: true,
        data: interview,
        message: '面接ステータスを更新しました',
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
      if (error.message.includes('変更することはできません')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * 面接を削除（キャンセル扱い）
   * DELETE /api/interviews/:id
   */
  async deleteInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = toAuthenticatedUser(req.user);

      await interviewService.deleteInterview(id, user);

      res.json({
        success: true,
        message: '面接をキャンセルしました',
      });
    } catch (error: any) {
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
}

export const interviewController = new InterviewController();
