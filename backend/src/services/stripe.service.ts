import Stripe from 'stripe';
import { PrismaClient, PaymentMethodType } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

// Stripe初期化（環境変数から取得）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

/**
 * Stripe顧客情報
 */
export interface StripeCustomerInfo {
  customerId: string;
  email: string;
  name: string;
}

/**
 * 支払い方法情報
 */
export interface PaymentMethodInfo {
  id: string;
  stripePaymentMethodId: string;
  type: PaymentMethodType;
  last4: string | null;
  brand: string | null;
  isDefault: boolean;
}

/**
 * 請求書作成オプション
 */
export interface CreateInvoiceOptions {
  customerId: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  dueDate: Date;
  metadata?: Record<string, string>;
}

/**
 * Stripeサービス
 * Stripe APIとの連携を管理
 */
class StripeService {
  /**
   * Stripe顧客を作成または取得
   */
  async createOrGetCustomer(
    companyId: string,
    email: string,
    name: string
  ): Promise<StripeCustomerInfo> {
    // 会社情報を取得
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('会社が見つかりません');
    }

    // メタデータでcompanyIdを検索して既存顧客を探す
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      return {
        customerId: customer.id,
        email: customer.email || email,
        name: customer.name || name,
      };
    }

    // 新規顧客を作成
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        companyId,
        companyName: company.name,
      },
    });

    return {
      customerId: customer.id,
      email: customer.email || email,
      name: customer.name || name,
    };
  }

  /**
   * Stripe顧客IDを取得（メタデータから検索）
   */
  async getCustomerIdByCompany(companyId: string): Promise<string | null> {
    const customers = await stripe.customers.search({
      query: `metadata['companyId']:'${companyId}'`,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    return null;
  }

  /**
   * SetupIntentを作成（カード登録用）
   */
  async createSetupIntent(customerId: string): Promise<{
    clientSecret: string;
    setupIntentId: string;
  }> {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return {
      clientSecret: setupIntent.client_secret || '',
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * 支払い方法を登録
   */
  async attachPaymentMethod(
    companyId: string,
    customerId: string,
    paymentMethodId: string,
    setAsDefault: boolean = false
  ): Promise<PaymentMethodInfo> {
    // Stripeに支払い方法をアタッチ
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // デフォルトに設定する場合
    if (setAsDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // 既存のデフォルトを解除
      await prisma.paymentMethod.updateMany({
        where: {
          companyId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // カード情報を取得
    const card = paymentMethod.card;

    // DBに保存
    const savedPaymentMethod = await prisma.paymentMethod.create({
      data: {
        companyId,
        type: PaymentMethodType.CREDIT_CARD,
        stripePaymentMethodId: paymentMethodId,
        last4: card?.last4 || null,
        brand: card?.brand || null,
        isDefault: setAsDefault,
      },
    });

    return {
      id: savedPaymentMethod.id,
      stripePaymentMethodId: paymentMethodId,
      type: savedPaymentMethod.type,
      last4: savedPaymentMethod.last4,
      brand: savedPaymentMethod.brand,
      isDefault: savedPaymentMethod.isDefault,
    };
  }

  /**
   * 支払い方法を削除
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    // DBから取得
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new Error('支払い方法が見つかりません');
    }

    // Stripeから削除
    if (paymentMethod.stripePaymentMethodId) {
      await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
    }

    // DBから削除
    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });
  }

  /**
   * 支払い方法一覧を取得
   */
  async listPaymentMethods(companyId: string): Promise<PaymentMethodInfo[]> {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { companyId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return paymentMethods.map((pm) => ({
      id: pm.id,
      stripePaymentMethodId: pm.stripePaymentMethodId || '',
      type: pm.type,
      last4: pm.last4,
      brand: pm.brand,
      isDefault: pm.isDefault,
    }));
  }

  /**
   * デフォルト支払い方法を設定
   */
  async setDefaultPaymentMethod(
    companyId: string,
    paymentMethodId: string
  ): Promise<void> {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.companyId !== companyId) {
      throw new Error('支払い方法が見つかりません');
    }

    // Stripe顧客のデフォルトを更新
    const customerId = await this.getCustomerIdByCompany(companyId);
    if (customerId && paymentMethod.stripePaymentMethodId) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.stripePaymentMethodId,
        },
      });
    }

    // 既存のデフォルトを解除
    await prisma.paymentMethod.updateMany({
      where: {
        companyId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // 新しいデフォルトを設定
    await prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });
  }

  /**
   * Stripe請求書を作成
   */
  async createStripeInvoice(options: CreateInvoiceOptions): Promise<{
    stripeInvoiceId: string;
    hostedInvoiceUrl: string | null;
    pdfUrl: string | null;
  }> {
    // 請求書を作成
    const invoice = await stripe.invoices.create({
      customer: options.customerId,
      collection_method: 'send_invoice',
      days_until_due: Math.ceil(
        (options.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      metadata: options.metadata,
    });

    // 明細行を追加
    for (const item of options.lineItems) {
      await stripe.invoiceItems.create({
        customer: options.customerId,
        invoice: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_amount: Math.round(item.unitPrice),
        currency: 'jpy',
      });
    }

    // 請求書を確定
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    return {
      stripeInvoiceId: finalizedInvoice.id,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
      pdfUrl: finalizedInvoice.invoice_pdf,
    };
  }

  /**
   * Stripe請求書を送信
   */
  async sendStripeInvoice(stripeInvoiceId: string): Promise<void> {
    await stripe.invoices.sendInvoice(stripeInvoiceId);
  }

  /**
   * Stripe請求書をキャンセル
   */
  async voidStripeInvoice(stripeInvoiceId: string): Promise<void> {
    await stripe.invoices.voidInvoice(stripeInvoiceId);
  }

  /**
   * Stripe請求書を取得
   */
  async getStripeInvoice(stripeInvoiceId: string): Promise<Stripe.Invoice> {
    return stripe.invoices.retrieve(stripeInvoiceId);
  }

  /**
   * Webhookイベントを検証
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Webhookイベントを処理
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        // サブスクリプション更新の処理（必要に応じて実装）
        break;
      case 'payment_method.attached':
        // 支払い方法アタッチの処理（必要に応じて実装）
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * 請求書支払い完了を処理
   */
  private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    // DBの請求書を更新
    const invoice = await prisma.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          pdfUrl: stripeInvoice.invoice_pdf,
        },
      });

      // 監査ログを記録
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: invoice.id,
          newData: {
            event: 'invoice.paid',
            stripeInvoiceId: stripeInvoice.id,
            amountPaid: stripeInvoice.amount_paid,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'stripe-webhook',
        },
      });
    }
  }

  /**
   * 請求書支払い失敗を処理
   */
  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    // DBの請求書を更新
    const invoice = await prisma.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      // 監査ログを記録
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: invoice.id,
          newData: {
            event: 'invoice.payment_failed',
            stripeInvoiceId: stripeInvoice.id,
            failureMessage: stripeInvoice.last_finalization_error?.message,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'stripe-webhook',
        },
      });
    }
  }

  /**
   * 顧客のサブスクリプション一覧を取得
   */
  async listSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });

    return subscriptions.data;
  }

  /**
   * 顧客の請求書一覧を取得
   */
  async listCustomerInvoices(
    customerId: string,
    limit: number = 10
  ): Promise<Stripe.Invoice[]> {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }
}

export const stripeService = new StripeService();
