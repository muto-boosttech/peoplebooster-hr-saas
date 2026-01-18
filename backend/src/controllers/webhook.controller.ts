import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe.service';

/**
 * Webhookコントローラー
 */
class WebhookController {
  /**
   * Stripe Webhookを処理
   * POST /api/webhooks/stripe
   */
  async handleStripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature) {
      res.status(400).json({
        success: false,
        error: 'Stripe署名がありません',
      });
      return;
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: 'Webhook設定エラー',
      });
      return;
    }

    try {
      // 署名を検証してイベントを構築
      const event = stripeService.verifyWebhookSignature(
        req.body,
        signature,
        webhookSecret
      );

      console.log(`Received Stripe webhook: ${event.type}`);

      // イベントを処理
      await stripeService.handleWebhookEvent(event);

      // Stripeに成功を返す
      res.json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({
        success: false,
        error: `Webhook処理エラー: ${error.message}`,
      });
    }
  }
}

export const webhookController = new WebhookController();
