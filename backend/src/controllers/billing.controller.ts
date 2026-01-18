import { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service';
import { stripeService } from '../services/stripe.service';
import { AuthenticatedUser } from '../types/auth.types';
import {
  createPaymentMethodSchema,
  createSetupIntentSchema,
} from '../validators/billing.validator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
 * 企業管理者向け請求コントローラー
 */
class BillingController {
  /**
   * 現在のプラン情報と利用状況を取得
   * GET /api/billing/plan
   */
  async getPlanInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      const planInfo = await billingService.getCompanyPlanInfo(currentUser.companyId);

      res.json({
        success: true,
        data: planInfo,
      });
    } catch (error: any) {
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
   * 自社の請求書一覧を取得
   * GET /api/billing/invoices
   */
  async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const result = await billingService.getCompanyInvoices(
        currentUser.companyId,
        page,
        limit
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * 請求書詳細を取得
   * GET /api/billing/invoices/:id
   */
  async getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      const invoice = await billingService.getInvoice(id);

      // 自社の請求書かチェック
      if (invoice.companyId !== currentUser.companyId) {
        res.status(403).json({
          success: false,
          error: 'この請求書へのアクセス権限がありません',
        });
        return;
      }

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
   * 請求書PDFをダウンロード
   * GET /api/billing/invoices/:id/pdf
   */
  async downloadInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      const pdfUrl = await billingService.getInvoicePdfUrl(id, currentUser.companyId);

      res.json({
        success: true,
        data: {
          pdfUrl,
        },
      });
    } catch (error: any) {
      if (error.message === '請求書が見つかりません') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message.includes('アクセス権限')) {
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
   * 支払い方法一覧を取得
   * GET /api/billing/payment-methods
   */
  async listPaymentMethods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      const paymentMethods = await stripeService.listPaymentMethods(currentUser.companyId);

      res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * SetupIntentを作成（カード登録用）
   * POST /api/billing/setup-intent
   */
  async createSetupIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      // 会社情報を取得
      const company = await prisma.company.findUnique({
        where: { id: currentUser.companyId },
      });

      if (!company) {
        res.status(404).json({
          success: false,
          error: '会社が見つかりません',
        });
        return;
      }

      // Stripe顧客を作成または取得
      const customer = await stripeService.createOrGetCustomer(
        currentUser.companyId,
        currentUser.email,
        company.name
      );

      // SetupIntentを作成
      const setupIntent = await stripeService.createSetupIntent(customer.customerId);

      res.json({
        success: true,
        data: {
          clientSecret: setupIntent.clientSecret,
          setupIntentId: setupIntent.setupIntentId,
          customerId: customer.customerId,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * 支払い方法を登録
   * POST /api/billing/payment-methods
   */
  async createPaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createPaymentMethodSchema.parse(req.body);
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      // 会社情報を取得
      const company = await prisma.company.findUnique({
        where: { id: currentUser.companyId },
      });

      if (!company) {
        res.status(404).json({
          success: false,
          error: '会社が見つかりません',
        });
        return;
      }

      // Stripe顧客を取得
      const customerId = await stripeService.getCustomerIdByCompany(currentUser.companyId);

      if (!customerId) {
        res.status(400).json({
          success: false,
          error: 'Stripe顧客が見つかりません。先にSetupIntentを作成してください。',
        });
        return;
      }

      // 支払い方法をアタッチ
      const paymentMethod = await stripeService.attachPaymentMethod(
        currentUser.companyId,
        customerId,
        input.paymentMethodId,
        input.setAsDefault
      );

      res.status(201).json({
        success: true,
        data: paymentMethod,
        message: '支払い方法を登録しました',
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
   * 支払い方法を削除
   * DELETE /api/billing/payment-methods/:id
   */
  async deletePaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      // 支払い方法を取得して所有権を確認
      const paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id },
      });

      if (!paymentMethod) {
        res.status(404).json({
          success: false,
          error: '支払い方法が見つかりません',
        });
        return;
      }

      if (paymentMethod.companyId !== currentUser.companyId) {
        res.status(403).json({
          success: false,
          error: 'この支払い方法へのアクセス権限がありません',
        });
        return;
      }

      await stripeService.detachPaymentMethod(id);

      res.json({
        success: true,
        message: '支払い方法を削除しました',
      });
    } catch (error: any) {
      if (error.message === '支払い方法が見つかりません') {
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
   * デフォルト支払い方法を設定
   * PUT /api/billing/payment-methods/:id/default
   */
  async setDefaultPaymentMethod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = toAuthenticatedUser(req.user);

      if (!currentUser.companyId) {
        res.status(400).json({
          success: false,
          error: '会社に所属していません',
        });
        return;
      }

      await stripeService.setDefaultPaymentMethod(currentUser.companyId, id);

      res.json({
        success: true,
        message: 'デフォルト支払い方法を設定しました',
      });
    } catch (error: any) {
      if (error.message === '支払い方法が見つかりません') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }
}

export const billingController = new BillingController();
