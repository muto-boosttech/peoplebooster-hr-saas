# 請求管理API実装レポート

## 概要

PeopleBoosterの請求管理APIを実装しました。システム管理者向けの請求書管理機能と、企業管理者向けの請求書閲覧・支払い方法管理機能を提供します。Stripe連携により、クレジットカード決済にも対応しています。

## 実装ファイル一覧

| ファイル | 説明 |
|---------|------|
| `src/services/stripe.service.ts` | Stripe連携サービス |
| `src/services/billing.service.ts` | 請求管理サービス |
| `src/validators/billing.validator.ts` | 請求バリデーター |
| `src/controllers/admin-billing.controller.ts` | システム管理者向けコントローラー |
| `src/controllers/billing.controller.ts` | 企業管理者向けコントローラー |
| `src/controllers/webhook.controller.ts` | Stripe Webhookコントローラー |
| `src/routes/admin-billing.routes.ts` | システム管理者向けルート |
| `src/routes/billing.routes.ts` | 企業管理者向けルート |
| `src/routes/webhook.routes.ts` | Webhookルート |
| `src/templates/invoice.ejs` | 請求書PDFテンプレート |

## APIエンドポイント

### システム管理者向けAPI（/api/admin）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/admin/invoices` | 請求書一覧取得（フィルタリング対応） |
| GET | `/admin/invoices/:id` | 請求書詳細取得 |
| POST | `/admin/invoices` | 請求書作成 |
| PUT | `/admin/invoices/:id` | 請求書更新 |
| PUT | `/admin/invoices/:id/send` | 請求書送信（メール・Stripe） |
| PUT | `/admin/invoices/:id/status` | 請求書ステータス更新（入金確認等） |
| DELETE | `/admin/invoices/:id` | 請求書キャンセル |
| GET | `/admin/revenue-report` | 売上レポート取得 |

### 企業管理者向けAPI（/api/billing）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/billing/plan` | 現在のプラン情報と利用状況取得 |
| GET | `/billing/invoices` | 自社の請求書一覧取得 |
| GET | `/billing/invoices/:id` | 請求書詳細取得 |
| GET | `/billing/invoices/:id/pdf` | 請求書PDFダウンロードURL取得 |
| GET | `/billing/payment-methods` | 支払い方法一覧取得 |
| POST | `/billing/setup-intent` | SetupIntent作成（カード登録用） |
| POST | `/billing/payment-methods` | 支払い方法登録 |
| DELETE | `/billing/payment-methods/:id` | 支払い方法削除 |
| PUT | `/billing/payment-methods/:id/default` | デフォルト支払い方法設定 |

### Webhook API（/api/webhooks）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/webhooks/stripe` | Stripe Webhook受信 |

## 主要機能

### 請求書管理

請求書の作成から入金確認までの一連のワークフローを管理します。請求書番号は自動採番され、小計・消費税・合計金額が自動計算されます。支払期限は翌月末に自動設定されます。

### Stripe連携

Stripeと連携して以下の機能を提供します。

**顧客管理**: 企業ごとにStripe顧客を作成し、支払い方法を紐付けます。

**支払い方法管理**: SetupIntentを使用してセキュアにカード情報を登録します。フロントエンドでStripe Elementsを使用してカード情報を入力し、PaymentMethodをアタッチする流れになります。

**請求書作成**: Stripe Invoiceを作成し、自動課金または手動課金を選択できます。

**Webhook処理**: 支払い完了（invoice.paid）、支払い失敗（invoice.payment_failed）などのイベントを受信し、DBの請求書ステータスを自動更新します。

### 請求書PDF生成

EJSテンプレートとPuppeteerを使用してプロフェッショナルなデザインの請求書PDFを生成します。A4サイズで、企業ロゴ、明細、支払い情報などを含みます。

### 売上レポート

月次・四半期・年次の売上レポートを生成します。期間ごとの売上推移、ステータス別集計、企業別売上ランキングなどを含みます。

## 権限管理

| ロール | 権限 |
|-------|------|
| SYSTEM_ADMIN | 全社の請求書管理、売上レポート閲覧 |
| COMPANY_ADMIN | 自社の請求書閲覧、支払い方法管理 |
| COMPANY_USER | アクセス不可 |
| GENERAL_USER | アクセス不可 |

## 環境変数

以下の環境変数を設定する必要があります。

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 監査ログ

すべての請求関連操作は監査ログに記録されます。請求書の作成、更新、送信、ステータス変更、キャンセルなどの操作履歴を追跡できます。

## 今後の拡張予定

以下の機能は今後実装予定です。

- メール送信サービス（emailService）の実装
- サブスクリプション管理機能
- 自動課金スケジュール機能
- 請求書リマインダー機能
