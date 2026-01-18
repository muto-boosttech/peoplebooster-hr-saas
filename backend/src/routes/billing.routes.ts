import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

/**
 * @openapi
 * /api/billing/plan:
 *   get:
 *     tags:
 *       - Billing
 *     summary: 現在のプラン情報と利用状況を取得
 *     description: 自社の契約プラン情報と診断残数などの利用状況を取得します
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: プラン情報と利用状況
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         monthlyPrice:
 *                           type: number
 *                         maxDiagnoses:
 *                           type: integer
 *                         maxUsers:
 *                           type: integer
 *                     usage:
 *                       type: object
 *                       properties:
 *                         diagnosesUsed:
 *                           type: integer
 *                         diagnosesRemaining:
 *                           type: integer
 *                         usersCount:
 *                           type: integer
 *                     contract:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date
 *                         endDate:
 *                           type: string
 *                           format: date
 *                         isActive:
 *                           type: boolean
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/plan',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.getPlanInfo.bind(billingController)
);

/**
 * @openapi
 * /api/billing/invoices:
 *   get:
 *     tags:
 *       - Billing
 *     summary: 自社の請求書一覧を取得
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
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
  authorize(['COMPANY_ADMIN']),
  billingController.listInvoices.bind(billingController)
);

/**
 * @openapi
 * /api/billing/invoices/{id}:
 *   get:
 *     tags:
 *       - Billing
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
 *     responses:
 *       200:
 *         description: 請求書詳細
 *       403:
 *         description: アクセス権限がありません
 *       404:
 *         description: 請求書が見つかりません
 */
router.get(
  '/invoices/:id',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.getInvoice.bind(billingController)
);

/**
 * @openapi
 * /api/billing/invoices/{id}/pdf:
 *   get:
 *     tags:
 *       - Billing
 *     summary: 請求書PDFのダウンロードURLを取得
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
 *         description: PDFダウンロードURL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     pdfUrl:
 *                       type: string
 *       403:
 *         description: アクセス権限がありません
 *       404:
 *         description: 請求書が見つかりません
 */
router.get(
  '/invoices/:id/pdf',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.downloadInvoicePdf.bind(billingController)
);

/**
 * @openapi
 * /api/billing/payment-methods:
 *   get:
 *     tags:
 *       - Billing
 *     summary: 支払い方法一覧を取得
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 支払い方法一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       last4:
 *                         type: string
 *                       brand:
 *                         type: string
 *                       isDefault:
 *                         type: boolean
 */
router.get(
  '/payment-methods',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.listPaymentMethods.bind(billingController)
);

/**
 * @openapi
 * /api/billing/setup-intent:
 *   post:
 *     tags:
 *       - Billing
 *     summary: SetupIntentを作成（カード登録用）
 *     description: Stripe Elementsでカード情報を入力するためのSetupIntentを作成します
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SetupIntent情報
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientSecret:
 *                       type: string
 *                     setupIntentId:
 *                       type: string
 *                     customerId:
 *                       type: string
 */
router.post(
  '/setup-intent',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.createSetupIntent.bind(billingController)
);

/**
 * @openapi
 * /api/billing/payment-methods:
 *   post:
 *     tags:
 *       - Billing
 *     summary: 支払い方法を登録
 *     description: Stripe経由でカードを登録します
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 description: StripeのPaymentMethod ID
 *               setAsDefault:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: 支払い方法を登録しました
 *       400:
 *         description: バリデーションエラー
 */
router.post(
  '/payment-methods',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.createPaymentMethod.bind(billingController)
);

/**
 * @openapi
 * /api/billing/payment-methods/{id}:
 *   delete:
 *     tags:
 *       - Billing
 *     summary: 支払い方法を削除
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
 *         description: 支払い方法を削除しました
 *       403:
 *         description: アクセス権限がありません
 *       404:
 *         description: 支払い方法が見つかりません
 */
router.delete(
  '/payment-methods/:id',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.deletePaymentMethod.bind(billingController)
);

/**
 * @openapi
 * /api/billing/payment-methods/{id}/default:
 *   put:
 *     tags:
 *       - Billing
 *     summary: デフォルト支払い方法を設定
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
 *         description: デフォルト支払い方法を設定しました
 *       404:
 *         description: 支払い方法が見つかりません
 */
router.put(
  '/payment-methods/:id/default',
  authenticate,
  authorize(['COMPANY_ADMIN']),
  billingController.setDefaultPaymentMethod.bind(billingController)
);

export default router;
