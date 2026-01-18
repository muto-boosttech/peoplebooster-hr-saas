# PeopleBooster 監視・運用環境実装レポート

## 概要

本レポートでは、PeopleBoosterの監視・運用環境の実装内容をまとめます。CloudWatch監視、Sentryエラートラッキング、ヘルスチェックエンドポイント、および運用ドキュメントを整備しました。

## 実装ファイル一覧

| カテゴリ | ファイル | 説明 |
|---------|---------|------|
| CloudWatch | `terraform/modules/monitoring/main.tf` | ダッシュボード、アラート、ログ設定 |
| CloudWatch | `terraform/modules/monitoring/variables.tf` | 変数定義 |
| CloudWatch | `terraform/modules/monitoring/outputs.tf` | 出力定義 |
| Sentry | `backend/src/config/sentry.config.ts` | バックエンドSentry設定 |
| Sentry | `frontend/src/lib/sentry.ts` | フロントエンドSentry設定 |
| Sentry | `frontend/sentry.client.config.ts` | Next.jsクライアント設定 |
| Sentry | `frontend/sentry.server.config.ts` | Next.jsサーバー設定 |
| ヘルスチェック | `backend/src/services/health.service.ts` | ヘルスチェックサービス |
| ヘルスチェック | `backend/src/routes/health.routes.ts` | ヘルスチェックルート |

## CloudWatch監視

### ダッシュボード

PeopleBooster専用のCloudWatchダッシュボードを作成し、以下のメトリクスを可視化します。

| ウィジェット | 表示内容 |
|-------------|---------|
| ECS CPU使用率 | バックエンド/フロントエンドのCPU使用率 |
| ECS メモリ使用率 | バックエンド/フロントエンドのメモリ使用率 |
| ALB リクエスト数 | 分あたりのリクエスト数 |
| ALB レイテンシ | ターゲットレスポンスタイム |
| ALB エラー率 | 5xx/4xxエラー数 |
| RDS 接続数 | データベース接続数 |
| RDS CPU使用率 | データベースCPU使用率 |
| RDS IOPS | 読み取り/書き込みIOPS |
| Redis 接続数 | キャッシュ接続数 |
| Redis メモリ使用率 | キャッシュメモリ使用率 |

### アラート設定

以下のアラートを設定し、異常を検知した場合にSNS経由で通知します。

| アラート名 | 条件 | 重要度 |
|-----------|------|--------|
| ECS CPU High | CPU使用率 > 80%（5分間） | Warning |
| ECS Memory High | メモリ使用率 > 80%（5分間） | Warning |
| ALB 5xx Errors | 5xxエラー > 10（5分間） | Critical |
| ALB High Latency | レスポンスタイム > 3秒（5分間） | Warning |
| RDS Connections High | 接続数 > 最大の80%（5分間） | Warning |
| RDS CPU High | CPU使用率 > 80%（5分間） | Warning |

### ログ設定

| ロググループ | 内容 | 保持期間 |
|-------------|------|----------|
| /aws/ecs/{env}/application | アプリケーションログ | 30日 |
| /aws/ecs/{env}/access | アクセスログ | 30日 |
| /aws/ecs/{env}/error | エラーログ | 90日 |
| /aws/ecs/{env}/audit | 監査ログ | 365日 |

## Sentryエラートラッキング

### バックエンド設定

Express.jsアプリケーションにSentryを統合し、以下の機能を有効化しています。

| 機能 | 説明 |
|------|------|
| エラー自動キャプチャ | 未処理の例外を自動的に収集 |
| パフォーマンス監視 | トランザクションとスパンの追跡 |
| リリーストラッキング | バージョンごとのエラー追跡 |
| ユーザーコンテキスト | ユーザーIDとメールの紐付け |
| カスタムタグ | 環境、サービス名の付与 |

### フロントエンド設定

Next.js 14アプリケーションにSentryを統合し、クライアントサイドとサーバーサイドの両方でエラーを収集します。

| 機能 | 説明 |
|------|------|
| クライアントエラー | ブラウザでのJavaScriptエラー |
| サーバーエラー | Server ComponentsとAPI Routesのエラー |
| セッションリプレイ | エラー発生時のユーザー操作の再現 |
| ソースマップ | 本番コードのデバッグ情報 |

### Slack連携

Sentryアラートは以下のSlackチャンネルに通知されます。

| チャンネル | 通知内容 |
|-----------|---------|
| #alerts-critical | Critical/Fatalレベルのエラー |
| #alerts-errors | 新規エラーの発生 |
| #alerts-performance | パフォーマンス劣化 |

## ヘルスチェックエンドポイント

### エンドポイント一覧

| エンドポイント | 用途 | チェック内容 |
|---------------|------|-------------|
| `GET /health` | 総合ヘルスチェック | DB、Redis、外部サービス |
| `GET /health/live` | ライブネスプローブ | プロセス生存確認 |
| `GET /health/ready` | レディネスプローブ | トラフィック受付可否 |
| `GET /health/metrics` | 基本メトリクス | CPU、メモリ、アップタイム |

### レスポンス例

総合ヘルスチェック（`/health`）のレスポンス例を以下に示します。

```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T10:00:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    },
    "externalServices": {
      "status": "healthy",
      "services": {
        "openai": { "status": "healthy" },
        "stripe": { "status": "healthy" },
        "s3": { "status": "healthy" }
      }
    }
  }
}
```

## 運用ドキュメント

以下の運用ドキュメントを作成しました。

| ドキュメント | ファイル | 内容 |
|-------------|---------|------|
| デプロイ手順書 | `docs/operations/deployment-guide.md` | 自動/手動デプロイ手順 |
| ロールバック手順書 | `docs/operations/rollback-guide.md` | ロールバック判断基準と手順 |
| 障害対応フロー | `docs/operations/incident-response.md` | 障害レベル定義と対応フロー |
| バックアップ・リストア | `docs/operations/backup-restore-guide.md` | バックアップ方針とリストア手順 |
| セキュリティインシデント | `docs/operations/security-incident-response.md` | セキュリティインシデント対応 |

### デプロイ手順書

ステージング環境と本番環境へのデプロイ手順を文書化しています。自動デプロイ（GitHub Actions）と手動デプロイの両方の手順を記載しています。

### ロールバック手順書

デプロイ後に問題が発生した場合のロールバック判断基準と、ECSサービス、Dockerイメージ、データベースのロールバック手順を記載しています。

### 障害対応フロー

障害レベル（P1-P4）の定義、検知から復旧までの対応フロー、エスカレーションパス、オンコール体制を定義しています。

### バックアップ・リストア手順書

RDS、S3、ElastiCacheのバックアップ方針と、スナップショットからのリストア手順を記載しています。災害復旧（DR）シナリオも含まれています。

### セキュリティインシデント対応

セキュリティインシデントの定義、重要度分類、対応フロー、関係者への通知手順を定義しています。

## 今後の改善点

| 項目 | 内容 | 優先度 |
|------|------|--------|
| APM導入 | Datadog/New Relicによる詳細なAPM | Medium |
| 合成監視 | CloudWatch Syntheticsによる外形監視 | High |
| ログ分析 | CloudWatch Logs Insightsのクエリ整備 | Medium |
| アラート最適化 | 運用実績に基づくアラート閾値の調整 | Low |
| ランブック自動化 | Systems Manager Automationの活用 | Low |
