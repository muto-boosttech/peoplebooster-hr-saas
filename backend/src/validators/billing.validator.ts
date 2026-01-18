import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

/**
 * 請求書一覧クエリスキーマ（システム管理者向け）
 */
export const listInvoicesQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  startDate: z.string().transform((val) => new Date(val)).optional(),
  endDate: z.string().transform((val) => new Date(val)).optional(),
  page: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
  limit: z.string().transform((val) => parseInt(val, 10)).optional().default('20'),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: '開始日は終了日以前である必要があります' }
);

export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQuerySchema>;

/**
 * 請求書明細スキーマ
 */
export const lineItemSchema = z.object({
  description: z.string().min(1, '説明は必須です').max(500, '説明は500文字以内で入力してください'),
  quantity: z.number().int().positive('数量は1以上の整数で入力してください'),
  unitPrice: z.number().positive('単価は正の数で入力してください'),
});

/**
 * 請求書作成スキーマ
 */
export const createInvoiceSchema = z.object({
  companyId: z.string().uuid('有効な会社IDを入力してください'),
  billingPeriodStart: z.string().transform((val) => new Date(val)),
  billingPeriodEnd: z.string().transform((val) => new Date(val)),
  lineItems: z.array(lineItemSchema).min(1, '明細は1件以上必要です'),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.billingPeriodStart <= data.billingPeriodEnd,
  { message: '請求期間の開始日は終了日以前である必要があります' }
);

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * 請求書更新スキーマ
 */
export const updateInvoiceSchema = z.object({
  billingPeriodStart: z.string().transform((val) => new Date(val)).optional(),
  billingPeriodEnd: z.string().transform((val) => new Date(val)).optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
  notes: z.string().max(1000).optional(),
  dueDate: z.string().transform((val) => new Date(val)).optional(),
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/**
 * 請求書ステータス更新スキーマ
 */
export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  paidAt: z.string().transform((val) => new Date(val)).optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;

/**
 * 請求書送信オプションスキーマ
 */
export const sendInvoiceSchema = z.object({
  createStripeInvoice: z.boolean().optional().default(false),
  sendEmail: z.boolean().optional().default(true),
});

export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;

/**
 * 売上レポートクエリスキーマ
 */
export const revenueReportQuerySchema = z.object({
  period: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  year: z.string().transform((val) => parseInt(val, 10)).optional(),
  month: z.string().transform((val) => parseInt(val, 10)).optional(),
});

export type RevenueReportQueryInput = z.infer<typeof revenueReportQuerySchema>;

/**
 * 支払い方法登録スキーマ
 */
export const createPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, '支払い方法IDは必須です'),
  setAsDefault: z.boolean().optional().default(false),
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;

/**
 * SetupIntent作成スキーマ
 */
export const createSetupIntentSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
});

export type CreateSetupIntentInput = z.infer<typeof createSetupIntentSchema>;

/**
 * 請求書ステータスの表示名
 */
export const INVOICE_STATUS_DISPLAY_NAMES: Record<InvoiceStatus, string> = {
  DRAFT: '下書き',
  SENT: '送信済み',
  PAID: '支払い済み',
  OVERDUE: '支払い期限超過',
  CANCELLED: 'キャンセル',
};

/**
 * 請求書ステータス遷移ルール
 */
export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
  SENT: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
  PAID: [], // 支払い済みからは遷移不可
  OVERDUE: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
  CANCELLED: [], // キャンセルからは遷移不可
};

/**
 * ステータス遷移の検証
 */
export function validateInvoiceStatusTransition(
  currentStatus: InvoiceStatus,
  newStatus: InvoiceStatus
): { valid: boolean; message?: string } {
  const allowedTransitions = INVOICE_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      message: `${INVOICE_STATUS_DISPLAY_NAMES[currentStatus]}から${INVOICE_STATUS_DISPLAY_NAMES[newStatus]}への遷移は許可されていません`,
    };
  }

  return { valid: true };
}

/**
 * 税率（消費税10%）
 */
export const TAX_RATE = 0.10;

/**
 * 請求書番号のプレフィックス
 */
export const INVOICE_NUMBER_PREFIX = 'INV';

/**
 * 支払い期限のデフォルト日数（翌月末）
 */
export const DEFAULT_DUE_DAYS = 30;
