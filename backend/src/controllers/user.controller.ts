import { Request, Response } from 'express';
import { AuthUser } from '../types/auth.types';
import { userService } from '../services/user.service';
import {
  getUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  changeRoleSchema,
  createSubUserSchema,
  toggleActiveSchema,
  bulkCreateUsersSchema,
} from '../validators/user.validator';
import { ZodError } from 'zod';

/**
 * リクエストからIPアドレスを取得
 */
function getIpAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * リクエストからUser-Agentを取得
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Zodエラーをフォーマット
 */
function formatZodError(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * ユーザーコントローラー
 */
export class UserController {
  /**
   * GET /api/users
   * ユーザー一覧取得
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // クエリパラメータのバリデーション
      const queryResult = getUsersQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'クエリパラメータが不正です',
            details: formatZodError(queryResult.error),
          },
        });
        return;
      }

      const result = await userService.getUsers(queryResult.data, currentUser);

      if (!result.success) {
        res.status(400).json({
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
      console.error('Error in getUsers:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * GET /api/users/:id
   * ユーザー詳細取得
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await userService.getUserById(id, currentUser);

      if (!result.success) {
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
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
      console.error('Error in getUserById:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * POST /api/users
   * ユーザー作成
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // リクエストボディのバリデーション
      const bodyResult = createUserSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストデータが不正です',
            details: formatZodError(bodyResult.error),
          },
        });
        return;
      }

      const result = await userService.createUser(
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'EMAIL_EXISTS' ? 409 :
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'ユーザーを作成しました',
      });
    } catch (error) {
      console.error('Error in createUser:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * PUT /api/users/:id
   * ユーザー更新
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = updateUserSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストデータが不正です',
            details: formatZodError(bodyResult.error),
          },
        });
        return;
      }

      const result = await userService.updateUser(
        id,
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'ユーザー情報を更新しました',
      });
    } catch (error) {
      console.error('Error in updateUser:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * DELETE /api/users/:id
   * ユーザー削除（論理削除）
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await userService.deleteUser(
        id,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'ユーザーを削除しました',
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * PUT /api/users/:id/role
   * ロール変更
   */
  async changeRole(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = changeRoleSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストデータが不正です',
            details: formatZodError(bodyResult.error),
          },
        });
        return;
      }

      const result = await userService.changeRole(
        id,
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'ロールを変更しました',
      });
    } catch (error) {
      console.error('Error in changeRole:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * POST /api/users/:id/sub-users
   * サブユーザー作成
   */
  async createSubUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = createSubUserSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストデータが不正です',
            details: formatZodError(bodyResult.error),
          },
        });
        return;
      }

      const result = await userService.createSubUser(
        id,
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'EMAIL_EXISTS' ? 409 :
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'サブユーザーを作成しました',
      });
    } catch (error) {
      console.error('Error in createSubUser:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * GET /api/users/:id/sub-users
   * サブユーザー一覧取得
   */
  async getSubUsers(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await userService.getSubUsers(id, currentUser);

      if (!result.success) {
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
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
      console.error('Error in getSubUsers:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * POST /api/users/bulk
   * 一括ユーザー作成
   */
  async bulkCreateUsers(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // リクエストボディのバリデーション
      const bodyResult = bulkCreateUsersSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストデータが不正です',
            details: formatZodError(bodyResult.error),
          },
        });
        return;
      }

      const result = await userService.bulkCreateUsers(
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: `${result.data?.created}件のユーザーを作成しました`,
      });
    } catch (error) {
      console.error('Error in bulkCreateUsers:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * PUT /api/users/:id/active
   * アクティブ状態の切り替え
   */
  async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = toggleActiveSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストデータが不正です',
            details: formatZodError(bodyResult.error),
          },
        });
        return;
      }

      const result = await userService.toggleActive(
        id,
        bodyResult.data.isActive,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'FORBIDDEN' ? 403 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: result.data?.isActive ? 'ユーザーを有効化しました' : 'ユーザーを無効化しました',
      });
    } catch (error) {
      console.error('Error in toggleActive:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }

  /**
   * GET /api/users/me
   * 現在のユーザー情報取得
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      const result = await userService.getUserById(currentUser.userId, currentUser);

      if (!result.success) {
        res.status(404).json({
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
      console.error('Error in getCurrentUser:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      });
    }
  }
}

// シングルトンインスタンス
export const userController = new UserController();
