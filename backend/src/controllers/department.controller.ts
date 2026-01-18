import { Request, Response } from 'express';
import { AuthUser } from '../types/auth.types';
import { departmentService } from '../services/department.service';
import {
  getDepartmentsQuerySchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  assignUsersToDepartmentSchema,
} from '../validators/company.validator';
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
 * 部門コントローラー
 */
export class DepartmentController {
  /**
   * GET /api/companies/:companyId/departments
   * 部門一覧取得（階層構造）
   */
  async getDepartments(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { companyId } = req.params;

      // クエリパラメータのバリデーション
      const queryResult = getDepartmentsQuerySchema.safeParse(req.query);
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

      const result = await departmentService.getDepartments(
        companyId,
        queryResult.data,
        currentUser
      );

      if (!result.success) {
        const statusCode =
          result.error?.code === 'NOT_FOUND' ? 404 :
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
      console.error('Error in getDepartments:', error);
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
   * GET /api/departments/:id
   * 部門詳細取得
   */
  async getDepartmentById(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await departmentService.getDepartmentById(id, currentUser);

      if (!result.success) {
        const statusCode =
          result.error?.code === 'NOT_FOUND' ? 404 :
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
      console.error('Error in getDepartmentById:', error);
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
   * POST /api/companies/:companyId/departments
   * 部門作成
   */
  async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { companyId } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = createDepartmentSchema.safeParse(req.body);
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

      const result = await departmentService.createDepartment(
        companyId,
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode =
          result.error?.code === 'NOT_FOUND' ? 404 :
          result.error?.code === 'FORBIDDEN' ? 403 :
          result.error?.code === 'DUPLICATE_NAME' ? 409 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: '部門を作成しました',
      });
    } catch (error) {
      console.error('Error in createDepartment:', error);
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
   * PUT /api/departments/:id
   * 部門更新
   */
  async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = updateDepartmentSchema.safeParse(req.body);
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

      const result = await departmentService.updateDepartment(
        id,
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode =
          result.error?.code === 'NOT_FOUND' ? 404 :
          result.error?.code === 'FORBIDDEN' ? 403 :
          result.error?.code === 'DUPLICATE_NAME' ? 409 :
          result.error?.code === 'CIRCULAR_REFERENCE' ? 400 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: '部門情報を更新しました',
      });
    } catch (error) {
      console.error('Error in updateDepartment:', error);
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
   * DELETE /api/departments/:id
   * 部門削除
   */
  async deleteDepartment(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await departmentService.deleteDepartment(
        id,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode =
          result.error?.code === 'NOT_FOUND' ? 404 :
          result.error?.code === 'FORBIDDEN' ? 403 :
          result.error?.code === 'HAS_USERS' ? 400 :
          result.error?.code === 'HAS_CHILDREN' ? 400 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: '部門を削除しました',
      });
    } catch (error) {
      console.error('Error in deleteDepartment:', error);
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
   * PUT /api/departments/:id/users
   * ユーザーを部門に割り当て
   */
  async assignUsersToDepartment(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = assignUsersToDepartmentSchema.safeParse(req.body);
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

      const result = await departmentService.assignUsersToDepartment(
        id,
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode =
          result.error?.code === 'NOT_FOUND' ? 404 :
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
        message: `${result.data?.assigned}人のユーザーを部門に割り当てました`,
      });
    } catch (error) {
      console.error('Error in assignUsersToDepartment:', error);
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
export const departmentController = new DepartmentController();
