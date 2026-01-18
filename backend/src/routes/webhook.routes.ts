import { Router, raw } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

/**
 * @openapi
 * /api/webhooks/stripe:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Stripe Webhookエンドポイント
 *     description: |
 *       Stripeからのイベント通知を受け取るエンドポイントです。
 *       このエンドポイントは認証不要で、Stripe署名による検証を行います。
 *       
 *       対応イベント:
 *       - invoice.paid: 請求書の支払い完了
 *       - invoice.payment_failed: 請求書の支払い失敗
 *       - customer.subscription.updated: サブスクリプション更新
 *       - payment_method.attached: 支払い方法のアタッチ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook処理成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *       400:
 *         description: 署名検証エラーまたは処理エラー
 */
router.post(
  '/stripe',
  // Stripe Webhookはraw bodyが必要
  raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook.bind(webhookController)
);

export default router;
