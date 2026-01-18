import { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service';
import { AuthenticatedUser } from '../types/auth.types';
import {
  listInvoicesQuerySchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  sendInvoiceSchema,
  revenueReportQuerySchema,
} from '../validators/billing.validator';

/**
 * AuthUserをAuthenticatedUserに変換
 */
function toAuthenticatedUser(user: any): AuthenticatedUser {
  return {
    id: user.userId || user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId || null,
    departmentId: user.departmentId || null,
  };
}

/**
 * システム管理者向け請求コントローラー
 */
class AdminBillingController {
  /**
   * 請求書一覧を取得
   * GET /api/admin/invoices
   */
  async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = listInvoicesQuerySchema.parse(req.query);

      const result = await billingService.listInvoices({
        companyId: input.companyId,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        page: input.page,
        limit: input.limit,
      });

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
   * 請求書詳細を取得
   * GET /api/admin/invoices/:id
   */
  async getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await billingService.getInvoice(id);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error: any) {
      if (error.message === '請求書が見つかりません') {
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
   * 請求書を作成
   * POST /api/admin/invoices
   */
  async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createInvoiceSchema.parse(req.body);
      const currentUser = toAuthenticatedUser(req.user);

      const result = await billingService.createInvoice(input, currentUser);

      res.status(201).json({
        success: true,
        data: result,
        message: '請求書を作成しました',
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
      if (error.message === '会社が見つかりません') {
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
   * 請求書を更新
   * PUT /api/admin/invoices/:id
   */
  async updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = updateInvoiceSchema.parse(req.body);
      const currentUser = toAuthenticatedUser(req.user);

      await billingService.updateInvoice(id, input, currentUser);

      res.json({
        success: true,
        message: '請求書を更新しました',
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
      if (error.message === '請求書が見つかりません') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('下書き状態')) {
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
   * 請求書を送信
   * PUT /api/admin/invoices/:id/send
   */
  async sendInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = sendInvoiceSchema.parse(req.body);
      const currentUser = toAuthenticatedUser(req.user);

      const result = await billingService.sendInvoice(id, input, currentUser);

      res.json({
        success: true,
        data: result,
        message: '請求書を送信しました',
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
      if (error.message === '請求書が見つかりません') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('下書き状態')) {
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
   * 請求書ステータスを更新
   * PUT /api/admin/invoices/:id/status
   */
  async updateInvoiceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = updateInvoiceStatusSchema.parse(req.body);
      const currentUser = toAuthenticatedUser(req.user);

      await billingService.updateInvoiceStatus(id, input, currentUser);

      res.json({
        success: true,
        message: '請求書ステータスを更新しました',
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
      if (error.message === '請求書が見つかりません') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('遷移は許可されていません')) {
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
   * 請求書をキャンセル
   * DELETE /api/admin/invoices/:id
   */
  async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = toAuthenticatedUser(req.user);

      await billingService.cancelInvoice(id, currentUser);

      res.json({
        success: true,
        message: '請求書をキャンセルしました',
      });
    } catch (error: any) {
      if (error.message === '請求書が見つかりません') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('キャンセルできません')) {
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
   * 売上レポートを取得
   * GET /api/admin/revenue-report
   */
  async getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = revenueReportQuerySchema.parse(req.query);

      const report = await billingService.generateRevenueReport({
        period: input.period,
        year: input.year,
        month: input.month,
      });

      res.json({
        success: true,
        data: report,
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
}

export const adminBillingController = new AdminBillingController();
