import { Request, Response, NextFunction } from 'express';
import { interviewCommentService } from '../services/interview-comment.service';
import {
  getInterviewCommentsQuerySchema,
  createInterviewCommentSchema,
  updateInterviewCommentSchema,
} from '../validators/interview-comment.validator';
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
 * 面接コメントコントローラー
 */
class InterviewCommentController {
  /**
   * 候補者の面接コメント一覧を取得
   * GET /api/candidates/:candidateId/comments
   */
  async getCommentsByCandidateId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { candidateId } = req.params;
      const query = getInterviewCommentsQuerySchema.parse(req.query);
      const user = toAuthenticatedUser(req.user);

      const result = await interviewCommentService.getCommentsByCandidateId(candidateId, query, user);

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
   * 面接コメント詳細を取得
   * GET /api/comments/:id
   */
  async getCommentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = toAuthenticatedUser(req.user);

      const comment = await interviewCommentService.getCommentById(id, user);

      if (!comment) {
        res.status(404).json({
          success: false,
          error: 'コメントが見つかりません',
        });
        return;
      }

      res.json({
        success: true,
        data: comment,
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
   * 面接コメントを作成
   * POST /api/candidates/:candidateId/comments
   */
  async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { candidateId } = req.params;
      const input = createInterviewCommentSchema.parse(req.body);
      const user = toAuthenticatedUser(req.user);

      const comment = await interviewCommentService.createComment(candidateId, input, user);

      res.status(201).json({
        success: true,
        data: comment,
        message: '面接コメントを作成しました',
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
      next(error);
    }
  }

  /**
   * 面接コメントを更新
   * PUT /api/comments/:id
   */
  async updateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = updateInterviewCommentSchema.parse(req.body);
      const user = toAuthenticatedUser(req.user);

      const comment = await interviewCommentService.updateComment(id, input, user);

      res.json({
        success: true,
        data: comment,
        message: '面接コメントを更新しました',
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
   * 面接コメントを削除
   * DELETE /api/comments/:id
   */
  async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = toAuthenticatedUser(req.user);

      await interviewCommentService.deleteComment(id, user);

      res.json({
        success: true,
        message: '面接コメントを削除しました',
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

export const interviewCommentController = new InterviewCommentController();
