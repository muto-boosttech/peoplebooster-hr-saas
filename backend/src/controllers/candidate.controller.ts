import { Request, Response, NextFunction } from 'express';
import { candidateService } from '../services/candidate.service';
import {
  getCandidatesQuerySchema,
  createCandidateFromUserSchema,
  createCandidateWithNewUserSchema,
  updateCandidateSchema,
  updateCandidateStatusSchema,
  assignCandidateSchema,
  bulkUpdateStatusSchema,
  bulkAssignSchema,
  addTagsSchema,
  removeTagsSchema,
  STATUS_TRANSITIONS,
  STATUS_DISPLAY_NAMES,
} from '../validators/candidate.validator';
import { AuthenticatedUser } from '../types/auth.types';

// ユーザー情報をAuthenticatedUserに変換するヘルパー
function getAuthenticatedUser(req: Request): AuthenticatedUser {
  const user = req.user;
  if (!user) {
    throw new Error('認証が必要です');
  }
  return {
    id: user.userId,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    departmentId: user.departmentId,
  };
}

class CandidateController {
  /**
   * 候補者一覧を取得
   * GET /api/candidates
   */
  async getCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const query = getCandidatesQuerySchema.parse(req.query);
      const result = await candidateService.getCandidates(query, authUser);

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
   * 候補者詳細を取得
   * GET /api/candidates/:id
   */
  async getCandidateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const { id } = req.params;
      const candidate = await candidateService.getCandidateById(id, authUser);

      if (!candidate) {
        res.status(404).json({
          success: false,
          error: '候補者が見つかりません',
        });
        return;
      }

      res.json({
        success: true,
        data: candidate,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 候補者を作成
   * POST /api/candidates
   */
  async createCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      let result;

      // userIdが含まれている場合は既存ユーザーから作成
      if (req.body.userId) {
        const input = createCandidateFromUserSchema.parse(req.body);
        result = await candidateService.createCandidateFromUser(input, authUser);
      } else {
        // 新規ユーザーと共に作成
        const input = createCandidateWithNewUserSchema.parse(req.body);
        result = await candidateService.createCandidateWithNewUser(input, authUser);
      }

      res.status(201).json({
        success: true,
        data: result,
        message: '候補者を作成しました',
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
      if (error.message.includes('既に') || error.message.includes('見つかりません')) {
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
   * 候補者を更新
   * PUT /api/candidates/:id
   */
  async updateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const { id } = req.params;
      const input = updateCandidateSchema.parse(req.body);
      const result = await candidateService.updateCandidate(id, input, authUser);

      res.json({
        success: true,
        data: result,
        message: '候補者を更新しました',
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
   * ステータスを更新
   * PUT /api/candidates/:id/status
   */
  async updateCandidateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const { id } = req.params;
      const input = updateCandidateStatusSchema.parse(req.body);
      const result = await candidateService.updateCandidateStatus(id, input, authUser);

      res.json({
        success: true,
        data: result,
        message: `ステータスを「${result.statusDisplayName}」に変更しました`,
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
   * 担当者を割り当て
   * PUT /api/candidates/:id/assign
   */
  async assignCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const { id } = req.params;
      const input = assignCandidateSchema.parse(req.body);
      const result = await candidateService.assignCandidate(id, input, authUser);

      res.json({
        success: true,
        data: result,
        message: input.assignedTo ? '担当者を割り当てました' : '担当者の割り当てを解除しました',
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
   * 候補者を削除（論理削除）
   * DELETE /api/candidates/:id
   */
  async deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const { id } = req.params;
      await candidateService.deleteCandidate(id, authUser);

      res.json({
        success: true,
        message: '候補者を削除しました',
      });
    } catch (error: any) {
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
   * 一括ステータス更新
   * PUT /api/candidates/bulk/status
   */
  async bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const input = bulkUpdateStatusSchema.parse(req.body);
      const result = await candidateService.bulkUpdateStatus(input, authUser);

      res.json({
        success: true,
        data: result,
        message: `${result.success.length}件のステータスを更新しました`,
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
   * 一括担当者割り当て
   * PUT /api/candidates/bulk/assign
   */
  async bulkAssign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const input = bulkAssignSchema.parse(req.body);
      const result = await candidateService.bulkAssign(input, authUser);

      res.json({
        success: true,
        data: result,
        message: `${result.success.length}件の担当者を更新しました`,
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
   * タグを追加
   * POST /api/candidates/:id/tags
   */
  async addTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const { id } = req.params;
      const input = addTagsSchema.parse(req.body);
      const result = await candidateService.addTags(id, input, authUser);

      res.json({
        success: true,
        data: result,
        message: 'タグを追加しました',
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
   * タグを削除
   * DELETE /api/candidates/:id/tags
   */
  async removeTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const { id } = req.params;
      const input = removeTagsSchema.parse(req.body);
      const result = await candidateService.removeTags(id, input, authUser);

      res.json({
        success: true,
        data: result,
        message: 'タグを削除しました',
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
   * 統計情報を取得
   * GET /api/candidates/statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getAuthenticatedUser(req);
      const result = await candidateService.getStatistics(authUser);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ステータス遷移ルールを取得
   * GET /api/candidates/status-transitions
   */
  async getStatusTransitions(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        transitions: STATUS_TRANSITIONS,
        displayNames: STATUS_DISPLAY_NAMES,
      },
    });
  }
}

export const candidateController = new CandidateController();
