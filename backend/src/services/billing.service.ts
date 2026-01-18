import { PrismaClient, InvoiceStatus, Prisma } from '@prisma/client';
import { stripeService } from './stripe.service';
import { pdfGeneratorService } from './pdf-generator.service';
// import { emailService } from './email.service';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  UpdateInvoiceStatusInput,
  SendInvoiceInput,
  TAX_RATE,
  INVOICE_NUMBER_PREFIX,
  validateInvoiceStatusTransition,
  INVOICE_STATUS_DISPLAY_NAMES,
} from '../validators/billing.validator';
import { AuthenticatedUser } from '../types/auth.types';

const prisma = new PrismaClient();

/**
 * 請求書一覧取得オプション
 */
export interface ListInvoicesOptions {
  companyId?: string;
  status?: InvoiceStatus;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

/**
 * 売上レポートオプション
 */
export interface RevenueReportOptions {
  period: 'monthly' | 'quarterly' | 'yearly';
  year?: number;
  month?: number;
}

/**
 * 請求サービス
 */
class BillingService {
  /**
   * 請求書番号を生成
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 同月の請求書数をカウント
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const count = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${INVOICE_NUMBER_PREFIX}-${yearMonth}-${sequence}`;
  }

  /**
   * 支払期限を計算（翌月末）
   */
  private calculateDueDate(billingPeriodEnd: Date): Date {
    const dueDate = new Date(billingPeriodEnd);
    dueDate.setMonth(dueDate.getMonth() + 2);
    dueDate.setDate(0); // 翌月末
    return dueDate;
  }

  /**
   * 請求書を作成
   */
  async createInvoice(
    input: CreateInvoiceInput,
    currentUser: AuthenticatedUser
  ): Promise<{
    id: string;
    invoiceNumber: string;
    subtotal: number;
    tax: number;
    total: number;
  }> {
    // 会社の存在確認
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
    });

    if (!company) {
      throw new Error('会社が見つかりません');
    }

    // 請求書番号を生成
    const invoiceNumber = await this.generateInvoiceNumber();

    // 小計を計算
    const subtotal = input.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // 税額を計算
    const tax = Math.round(subtotal * TAX_RATE);

    // 合計を計算
    const total = subtotal + tax;

    // 支払期限を計算
    const dueDate = this.calculateDueDate(input.billingPeriodEnd);

    // トランザクションで請求書と明細を作成
    const invoice = await prisma.$transaction(async (tx) => {
      // 請求書を作成
      const newInvoice = await tx.invoice.create({
        data: {
          companyId: input.companyId,
          invoiceNumber,
          billingPeriodStart: input.billingPeriodStart,
          billingPeriodEnd: input.billingPeriodEnd,
          subtotal: new Prisma.Decimal(subtotal),
          tax: new Prisma.Decimal(tax),
          total: new Prisma.Decimal(total),
          status: InvoiceStatus.DRAFT,
          dueDate,
        },
      });

      // 明細を作成
      for (const item of input.lineItems) {
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            amount: new Prisma.Decimal(item.quantity * item.unitPrice),
          },
        });
      }

      // 監査ログを記録
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'CREATE',
          entityType: 'Invoice',
          entityId: newInvoice.id,
          newData: {
            invoiceNumber,
            companyId: input.companyId,
            total,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'system',
        },
      });

      return newInvoice;
    });

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subtotal,
      tax,
      total,
    };
  }

  /**
   * 請求書一覧を取得
   */
  async listInvoices(options: ListInvoicesOptions): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Prisma.InvoiceWhereInput = {};

    if (options.companyId) {
      where.companyId = options.companyId;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.startDate || options.endDate) {
      where.billingPeriodStart = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          lineItems: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      items: items.map((invoice) => ({
        ...invoice,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        statusDisplayName: INVOICE_STATUS_DISPLAY_NAMES[invoice.status],
        lineItems: invoice.lineItems.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount),
        })),
      })),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  /**
   * 請求書詳細を取得
   */
  async getInvoice(invoiceId: string): Promise<any> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        lineItems: true,
      },
    });

    if (!invoice) {
      throw new Error('請求書が見つかりません');
    }

    return {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      statusDisplayName: INVOICE_STATUS_DISPLAY_NAMES[invoice.status],
      lineItems: invoice.lineItems.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    };
  }

  /**
   * 請求書を更新
   */
  async updateInvoice(
    invoiceId: string,
    input: UpdateInvoiceInput,
    currentUser: AuthenticatedUser
  ): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('請求書が見つかりません');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('下書き状態の請求書のみ更新できます');
    }

    await prisma.$transaction(async (tx) => {
      // 明細を更新する場合
      if (input.lineItems) {
        // 既存の明細を削除
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId },
        });

        // 新しい明細を作成
        const subtotal = input.lineItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        const tax = Math.round(subtotal * TAX_RATE);
        const total = subtotal + tax;

        for (const item of input.lineItems) {
          await tx.invoiceLineItem.create({
            data: {
              invoiceId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.quantity * item.unitPrice),
            },
          });
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            subtotal: new Prisma.Decimal(subtotal),
            tax: new Prisma.Decimal(tax),
            total: new Prisma.Decimal(total),
            ...(input.billingPeriodStart && { billingPeriodStart: input.billingPeriodStart }),
            ...(input.billingPeriodEnd && { billingPeriodEnd: input.billingPeriodEnd }),
            ...(input.dueDate && { dueDate: input.dueDate }),
          },
        });
      } else {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            ...(input.billingPeriodStart && { billingPeriodStart: input.billingPeriodStart }),
            ...(input.billingPeriodEnd && { billingPeriodEnd: input.billingPeriodEnd }),
            ...(input.dueDate && { dueDate: input.dueDate }),
          },
        });
      }

      // 監査ログを記録
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: invoiceId,
          ipAddress: '0.0.0.0',
          userAgent: 'system',
          newData: {
            changes: input,
          },
        },
      });
    });
  }

  /**
   * 請求書を送信
   */
  async sendInvoice(
    invoiceId: string,
    options: SendInvoiceInput,
    currentUser: AuthenticatedUser
  ): Promise<{ stripeInvoiceId?: string; pdfUrl?: string }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          include: {
            users: {
              where: { role: 'COMPANY_ADMIN' },
              take: 1,
            },
          },
        },
        lineItems: true,
      },
    });

    if (!invoice) {
      throw new Error('請求書が見つかりません');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new Error('下書き状態の請求書のみ送信できます');
    }

    let stripeInvoiceId: string | undefined;
    let pdfUrl: string | undefined;

    // Stripe請求書を作成する場合
    if (options.createStripeInvoice) {
      const adminUser = invoice.company.users[0];
      if (adminUser) {
        const customer = await stripeService.createOrGetCustomer(
          invoice.companyId,
          adminUser.email,
          invoice.company.name
        );

        const stripeResult = await stripeService.createStripeInvoice({
          customerId: customer.customerId,
          lineItems: invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          })),
          dueDate: invoice.dueDate,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
          },
        });

        stripeInvoiceId = stripeResult.stripeInvoiceId;
        pdfUrl = stripeResult.pdfUrl || undefined;

        // Stripe請求書を送信
        await stripeService.sendStripeInvoice(stripeInvoiceId);
      }
    }

    // PDFを生成（Stripeを使わない場合）
    if (!pdfUrl) {
      const pdfResult = await pdfGeneratorService.generateAndUpload(
        'invoice',
        {
          invoice: {
            ...invoice,
            subtotal: Number(invoice.subtotal),
            tax: Number(invoice.tax),
            total: Number(invoice.total),
            lineItems: invoice.lineItems.map((item) => ({
              ...item,
              unitPrice: Number(item.unitPrice),
              amount: Number(item.amount),
            })),
          },
          company: invoice.company,
          generatedAt: new Date(),
        },
        `invoice-${invoice.invoiceNumber}.pdf`,
        { format: 'A4' },
        {
          invoiceId: invoice.id,
          companyId: invoice.companyId,
        }
      );
      pdfUrl = pdfResult.signedUrl;
    }

    // メール送信
    if (options.sendEmail) {
      const adminUser = invoice.company.users[0];
      if (adminUser) {
        // TODO: emailService実装後に有効化
        // await emailService.sendInvoiceEmail(
        //   adminUser.email,
        //   invoice.company.name,
        //   invoice.invoiceNumber,
        //   Number(invoice.total),
        //   invoice.dueDate,
        //   pdfUrl
        // );
        console.log(`Invoice email would be sent to ${adminUser.email}`);
      }
    }

    // ステータスを更新
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.SENT,
          stripeInvoiceId,
          pdfUrl,
        },
      });

      // 監査ログを記録
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: invoiceId,
          ipAddress: '0.0.0.0',
          userAgent: 'system',
          newData: {
            action: 'send',
            stripeInvoiceId,
            emailSent: options.sendEmail,
          },
        },
      });
    });

    return { stripeInvoiceId, pdfUrl };
  }

  /**
   * 請求書ステータスを更新
   */
  async updateInvoiceStatus(
    invoiceId: string,
    input: UpdateInvoiceStatusInput,
    currentUser: AuthenticatedUser
  ): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('請求書が見つかりません');
    }

    // ステータス遷移を検証
    const validation = validateInvoiceStatusTransition(invoice.status, input.status);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: input.status,
          ...(input.status === InvoiceStatus.PAID && {
            paidAt: input.paidAt || new Date(),
          }),
        },
      });

      // 監査ログを記録
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: invoiceId,
          ipAddress: '0.0.0.0',
          userAgent: 'system',
          newData: {
            action: 'status_change',
            previousStatus: invoice.status,
            newStatus: input.status,
            notes: input.notes,
          },
        },
      });
    });
  }

  /**
   * 請求書をキャンセル
   */
  async cancelInvoice(
    invoiceId: string,
    currentUser: AuthenticatedUser
  ): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('請求書が見つかりません');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('支払い済みの請求書はキャンセルできません');
    }

    // Stripe請求書をキャンセル
    if (invoice.stripeInvoiceId) {
      await stripeService.voidStripeInvoice(invoice.stripeInvoiceId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.CANCELLED,
        },
      });

      // 監査ログを記録
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: invoiceId,
          ipAddress: '0.0.0.0',
          userAgent: 'system',
          newData: {
            action: 'cancel',
            previousStatus: invoice.status,
          },
        },
      });
    });
  }

  /**
   * 売上レポートを生成
   */
  async generateRevenueReport(options: RevenueReportOptions): Promise<{
    period: string;
    totalRevenue: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    byCompany: { companyId: string; companyName: string; total: number }[];
    byMonth: { month: string; total: number }[];
  }> {
    const now = new Date();
    const year = options.year || now.getFullYear();
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (options.period) {
      case 'monthly':
        const month = options.month || now.getMonth() + 1;
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
        periodLabel = `${year}年${month}月`;
        break;
      case 'quarterly':
        const quarter = Math.ceil((options.month || now.getMonth() + 1) / 3);
        startDate = new Date(year, (quarter - 1) * 3, 1);
        endDate = new Date(year, quarter * 3, 0);
        periodLabel = `${year}年Q${quarter}`;
        break;
      case 'yearly':
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        periodLabel = `${year}年`;
        break;
    }

    // 期間内の請求書を取得
    const invoices = await prisma.invoice.findMany({
      where: {
        billingPeriodStart: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 集計
    const paidInvoices = invoices.filter((i) => i.status === InvoiceStatus.PAID);
    const pendingInvoices = invoices.filter(
      (i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.DRAFT
    );
    const overdueInvoices = invoices.filter((i) => i.status === InvoiceStatus.OVERDUE);

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.total), 0);

    // 会社別集計
    const byCompanyMap = new Map<string, { companyName: string; total: number }>();
    for (const invoice of paidInvoices) {
      const existing = byCompanyMap.get(invoice.companyId);
      if (existing) {
        existing.total += Number(invoice.total);
      } else {
        byCompanyMap.set(invoice.companyId, {
          companyName: invoice.company.name,
          total: Number(invoice.total),
        });
      }
    }

    // 月別集計
    const byMonthMap = new Map<string, number>();
    for (const invoice of paidInvoices) {
      const monthKey = `${invoice.billingPeriodStart.getFullYear()}-${String(
        invoice.billingPeriodStart.getMonth() + 1
      ).padStart(2, '0')}`;
      byMonthMap.set(monthKey, (byMonthMap.get(monthKey) || 0) + Number(invoice.total));
    }

    return {
      period: periodLabel,
      totalRevenue,
      paidInvoices: paidInvoices.length,
      pendingInvoices: pendingInvoices.length,
      overdueInvoices: overdueInvoices.length,
      byCompany: Array.from(byCompanyMap.entries()).map(([companyId, data]) => ({
        companyId,
        companyName: data.companyName,
        total: data.total,
      })),
      byMonth: Array.from(byMonthMap.entries())
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /**
   * 企業のプラン情報と利用状況を取得
   */
  async getCompanyPlanInfo(companyId: string): Promise<{
    plan: {
      id: string;
      name: string;
      monthlyPrice: number;
      maxDiagnoses: number;
      maxUsers: number;
    };
    usage: {
      diagnosesUsed: number;
      diagnosesRemaining: number;
      usersCount: number;
    };
    contract: {
      startDate: Date;
      endDate: Date;
      isActive: boolean;
    };
  }> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        plan: true,
        users: {
          select: { id: true },
        },
      },
    });

    if (!company) {
      throw new Error('会社が見つかりません');
    }

    // 今月の診断数をカウント
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const diagnosesUsed = await prisma.diagnosisResult.count({
      where: {
        user: {
          companyId,
        },
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    const maxDiagnoses = (company.plan.features as any)?.maxDiagnoses || 100;
    const maxUsers = (company.plan.features as any)?.maxUsers || 50;

    return {
      plan: {
        id: company.plan.id,
        name: company.plan.name,
        monthlyPrice: Number(company.plan.monthlyPrice),
        maxDiagnoses,
        maxUsers,
      },
      usage: {
        diagnosesUsed,
        diagnosesRemaining: Math.max(0, maxDiagnoses - diagnosesUsed),
        usersCount: company.users.length,
      },
      contract: {
        startDate: company.contractStartDate,
        endDate: company.contractEndDate,
        isActive: company.isActive,
      },
    };
  }

  /**
   * 企業の請求書一覧を取得
   */
  async getCompanyInvoices(
    companyId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.listInvoices({
      companyId,
      page,
      limit,
    });
  }

  /**
   * 請求書PDFのURLを取得
   */
  async getInvoicePdfUrl(
    invoiceId: string,
    companyId: string
  ): Promise<string> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('請求書が見つかりません');
    }

    if (invoice.companyId !== companyId) {
      throw new Error('この請求書へのアクセス権限がありません');
    }

    if (!invoice.pdfUrl) {
      // PDFがない場合は生成
      const fullInvoice = await this.getInvoice(invoiceId);
      const pdfResult = await pdfGeneratorService.generateAndUpload(
        'invoice',
        {
          invoice: fullInvoice,
          company: fullInvoice.company,
          generatedAt: new Date(),
        },
        `invoice-${invoice.invoiceNumber}.pdf`,
        { format: 'A4' },
        {
          invoiceId: invoice.id,
          companyId: invoice.companyId,
        }
      );

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { pdfUrl: pdfResult.signedUrl },
      });

      return pdfResult.signedUrl;
    }

    return invoice.pdfUrl;
  }

  /**
   * 支払い期限超過の請求書を更新
   */
  async updateOverdueInvoices(): Promise<number> {
    const now = new Date();

    const result = await prisma.invoice.updateMany({
      where: {
        status: InvoiceStatus.SENT,
        dueDate: {
          lt: now,
        },
      },
      data: {
        status: InvoiceStatus.OVERDUE,
      },
    });

    return result.count;
  }
}

export const billingService = new BillingService();
