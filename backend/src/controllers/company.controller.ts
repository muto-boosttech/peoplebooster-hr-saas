import { Request, Response } from 'express';
import { AuthUser } from '../types/auth.types';
import { companyService } from '../services/company.service';
import {
  getCompaniesQuerySchema,
  createCompanySchema,
  updateCompanySchema,
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
 * 企業コントローラー
 */
export class CompanyController {
  /**
   * GET /api/companies
   * 企業一覧取得
   */
  async getCompanies(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // クエリパラメータのバリデーション
      const queryResult = getCompaniesQuerySchema.safeParse(req.query);
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

      const result = await companyService.getCompanies(queryResult.data, currentUser);

      if (!result.success) {
        const statusCode = result.error?.code === 'FORBIDDEN' ? 403 : 400;
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
      console.error('Error in getCompanies:', error);
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
   * GET /api/companies/:id
   * 企業詳細取得
   */
  async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await companyService.getCompanyById(id, currentUser);

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
      console.error('Error in getCompanyById:', error);
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
   * POST /api/companies
   * 企業作成
   */
  async createCompany(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;

      // リクエストボディのバリデーション
      const bodyResult = createCompanySchema.safeParse(req.body);
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

      const result = await companyService.createCompany(
        bodyResult.data,
        currentUser,
        getIpAddress(req),
        getUserAgent(req)
      );

      if (!result.success) {
        const statusCode =
          result.error?.code === 'FORBIDDEN' ? 403 :
          result.error?.code === 'EMAIL_EXISTS' ? 409 :
          result.error?.code === 'INVALID_PLAN' ? 400 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: '企業を作成しました',
      });
    } catch (error) {
      console.error('Error in createCompany:', error);
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
   * PUT /api/companies/:id
   * 企業更新
   */
  async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      // リクエストボディのバリデーション
      const bodyResult = updateCompanySchema.safeParse(req.body);
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

      const result = await companyService.updateCompany(
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
        message: '企業情報を更新しました',
      });
    } catch (error) {
      console.error('Error in updateCompany:', error);
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
   * DELETE /api/companies/:id
   * 企業削除（論理削除）
   */
  async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await companyService.deleteCompany(
        id,
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
        message: '企業を削除しました',
      });
    } catch (error) {
      console.error('Error in deleteCompany:', error);
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
   * GET /api/companies/:id/stats
   * 企業統計取得
   */
  async getCompanyStats(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as AuthUser;
      const { id } = req.params;

      const result = await companyService.getCompanyStats(id, currentUser);

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
      console.error('Error in getCompanyStats:', error);
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
export const companyController = new CompanyController();
