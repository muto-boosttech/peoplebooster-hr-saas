import { Router } from 'express';
import { adminBillingController } from '../controllers/admin-billing.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

/**
 * @openapi
 * /api/admin/invoices:
 *   get:
 *     tags:
 *       - Admin - Billing
 *     summary: 請求書一覧を取得
 *     description: システム管理者が全企業の請求書一覧を取得します
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 会社IDでフィルタリング
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, PAID, OVERDUE, CANCELLED]
 *         description: ステータスでフィルタリング
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 請求期間開始日
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 請求期間終了日
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: ページ番号
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 1ページあたりの件数
 *     responses:
 *       200:
 *         description: 請求書一覧
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/invoices',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.listInvoices.bind(adminBillingController)
);

/**
 * @openapi
 * /api/admin/invoices/{id}:
 *   get:
 *     tags:
 *       - Admin - Billing
 *     summary: 請求書詳細を取得
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 請求書ID
 *     responses:
 *       200:
 *         description: 請求書詳細
 *       404:
 *         description: 請求書が見つかりません
 */
router.get(
  '/invoices/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.getInvoice.bind(adminBillingController)
);

/**
 * @openapi
 * /api/admin/invoices:
 *   post:
 *     tags:
 *       - Admin - Billing
 *     summary: 請求書を作成
 *     description: 新しい請求書を作成します。請求書番号は自動採番されます。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - billingPeriodStart
 *               - billingPeriodEnd
 *               - lineItems
 *             properties:
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               billingPeriodStart:
 *                 type: string
 *                 format: date
 *               billingPeriodEnd:
 *                 type: string
 *                 format: date
 *               lineItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     unitPrice:
 *                       type: number
 *     responses:
 *       201:
 *         description: 請求書を作成しました
 *       400:
 *         description: バリデーションエラー
 *       404:
 *         description: 会社が見つかりません
 */
router.post(
  '/invoices',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.createInvoice.bind(adminBillingController)
);

/**
 * @openapi
 * /api/admin/invoices/{id}:
 *   put:
 *     tags:
 *       - Admin - Billing
 *     summary: 請求書を更新
 *     description: 下書き状態の請求書を更新します
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               billingPeriodStart:
 *                 type: string
 *                 format: date
 *               billingPeriodEnd:
 *                 type: string
 *                 format: date
 *               lineItems:
 *                 type: array
 *                 items:
 *                   type: object
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: 請求書を更新しました
 *       400:
 *         description: 下書き状態の請求書のみ更新可能
 *       404:
 *         description: 請求書が見つかりません
 */
router.put(
  '/invoices/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.updateInvoice.bind(adminBillingController)
);

/**
 * @openapi
 * /api/admin/invoices/{id}/send:
 *   put:
 *     tags:
 *       - Admin - Billing
 *     summary: 請求書を送信
 *     description: 請求書をメールで送信し、オプションでStripe請求書を作成します
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               createStripeInvoice:
 *                 type: boolean
 *                 default: false
 *               sendEmail:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: 請求書を送信しました
 *       400:
 *         description: 下書き状態の請求書のみ送信可能
 *       404:
 *         description: 請求書が見つかりません
 */
router.put(
  '/invoices/:id/send',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.sendInvoice.bind(adminBillingController)
);

/**
 * @openapi
 * /api/admin/invoices/{id}/status:
 *   put:
 *     tags:
 *       - Admin - Billing
 *     summary: 請求書ステータスを更新
 *     description: 入金確認などでステータスを更新します
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, PAID, OVERDUE, CANCELLED]
 *               paidAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: ステータスを更新しました
 *       400:
 *         description: 不正なステータス遷移
 *       404:
 *         description: 請求書が見つかりません
 */
router.put(
  '/invoices/:id/status',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.updateInvoiceStatus.bind(adminBillingController)
);

/**
 * @openapi
 * /api/admin/invoices/{id}:
 *   delete:
 *     tags:
 *       - Admin - Billing
 *     summary: 請求書をキャンセル
 *     description: 請求書をキャンセルします（支払い済みはキャンセル不可）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 請求書をキャンセルしました
 *       400:
 *         description: 支払い済みの請求書はキャンセル不可
 *       404:
 *         description: 請求書が見つかりません
 */
router.delete(
  '/invoices/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.cancelInvoice.bind(adminBillingController)
);

/**
 * @openapi
 * /api/admin/revenue-report:
 *   get:
 *     tags:
 *       - Admin - Billing
 *     summary: 売上レポートを取得
 *     description: 期間別の売上レポートを取得します
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly]
 *           default: monthly
 *         description: 集計期間
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: 対象年
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: 対象月（monthlyの場合）
 *     responses:
 *       200:
 *         description: 売上レポート
 */
router.get(
  '/revenue-report',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  adminBillingController.getRevenueReport.bind(adminBillingController)
);

export default router;
