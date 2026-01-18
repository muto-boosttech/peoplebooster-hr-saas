# PeopleBooster CI/CDパイプライン実装レポート

## 概要

PeopleBoosterのCI/CDパイプラインをGitHub Actionsで構築しました。AWS ECS/ECRを使用したコンテナベースのデプロイメントを実現し、ステージング環境と本番環境への自動デプロイを可能にしています。

## 実装ファイル一覧

| ファイル | 説明 |
|---------|------|
| `.github/workflows/ci.yml` | CI（Lint、型チェック、テスト、ビルド） |
| `.github/workflows/deploy-staging.yml` | ステージングデプロイ |
| `.github/workflows/deploy-production.yml` | 本番デプロイ |
| `.github/workflows/rollback.yml` | 手動ロールバック |
| `.github/SECRETS.md` | シークレット設定ガイド |
| `.aws/task-definition-*.json` | ECSタスク定義 |

## ワークフロー詳細

### 1. CI ワークフロー (ci.yml)

**トリガー**: `push`、`pull_request`

**ジョブ構成**:

```
lint → type-check → test → build
```

| ジョブ | 説明 | 並列実行 |
|--------|------|---------|
| lint | ESLint + Prettier | 可 |
| type-check | TypeScript型チェック | 可 |
| test | Jest単体テスト | 可 |
| build | Docker イメージビルド | lint, type-check, test完了後 |

**特徴**:
- pnpmキャッシュによる高速化
- バックエンド・フロントエンド並列ビルド
- PRへのビルド結果コメント

### 2. ステージングデプロイ (deploy-staging.yml)

**トリガー**: `push to develop`

**ジョブ構成**:

```
build → deploy → e2e-test → notify
```

| ジョブ | 説明 |
|--------|------|
| build | Dockerイメージビルド・ECRプッシュ |
| deploy | ECSサービス更新・DBマイグレーション |
| e2e-test | Playwrightによるe2eテスト |
| notify | Slack通知 |

**特徴**:
- Docker Buildxによるマルチプラットフォームビルド
- レイヤーキャッシュによる高速化
- デプロイ後のE2Eテスト自動実行
- 成功/失敗のSlack通知

### 3. 本番デプロイ (deploy-production.yml)

**トリガー**: `push to main`（手動承認必須）

**ジョブ構成**:

```
build → approval → deploy → notify
                     ↓
                  rollback (失敗時)
```

| ジョブ | 説明 |
|--------|------|
| build | Dockerイメージビルド・ECRプッシュ |
| approval | 手動承認（2名以上） |
| deploy | ECSサービス更新・DBマイグレーション |
| rollback | 自動ロールバック（失敗時） |
| notify | Slack + PagerDuty通知 |

**特徴**:
- 手動承認による安全なデプロイ
- デプロイ前のDBスナップショット作成
- ヘルスチェックによる検証
- 失敗時の自動ロールバック
- デプロイ記録のDynamoDB保存
- 失敗時のPagerDutyアラート

### 4. 手動ロールバック (rollback.yml)

**トリガー**: `workflow_dispatch`（手動実行）

**入力パラメータ**:
- environment: staging / production
- backend_task_definition: ロールバック先のタスク定義ARN
- frontend_task_definition: ロールバック先のタスク定義ARN
- reason: ロールバック理由

## インフラストラクチャ

### AWS構成

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                      VPC                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   ALB       │  │   ECS       │  │   RDS       │  │   │
│  │  │  (Public)   │→ │  (Private)  │→ │  (Private)  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │                          ↓                           │   │
│  │                   ┌─────────────┐                    │   │
│  │                   │ ElastiCache │                    │   │
│  │                   │   (Redis)   │                    │   │
│  │                   └─────────────┘                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │     ECR     │  │     S3      │  │  Secrets Manager    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### ECSタスク定義

| 環境 | Backend CPU/Memory | Frontend CPU/Memory |
|------|-------------------|---------------------|
| Staging | 512 / 1024 MB | 256 / 512 MB |
| Production | 1024 / 2048 MB | 512 / 1024 MB |

## シークレット管理

### GitHub Secrets

| カテゴリ | シークレット |
|---------|-------------|
| AWS認証 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| ネットワーク | `STAGING_SUBNET_IDS`, `PRODUCTION_SUBNET_IDS` |
| 通知 | `SLACK_WEBHOOK_URL`, `PAGERDUTY_ROUTING_KEY` |

### AWS Secrets Manager

アプリケーションの機密情報（DB接続文字列、APIキー等）はAWS Secrets Managerで管理し、ECSタスク定義から参照します。

## デプロイフロー

### ステージング

```
1. developブランチにpush
2. CIワークフロー実行（lint, test, build）
3. Dockerイメージビルド・ECRプッシュ
4. ECSサービス更新
5. DBマイグレーション実行
6. E2Eテスト実行
7. Slack通知
```

### 本番

```
1. mainブランチにpush（またはPRマージ）
2. CIワークフロー実行
3. Dockerイメージビルド・ECRプッシュ
4. 手動承認待ち（2名以上）
5. DBスナップショット作成
6. DBマイグレーション実行
7. ECSサービス更新
8. ヘルスチェック
9. 成功: Slack通知 / 失敗: 自動ロールバック + PagerDuty
```

## 監視とアラート

### Slack通知

- デプロイ開始/完了/失敗
- E2Eテスト結果
- ロールバック実行

### PagerDuty（本番のみ）

- デプロイ失敗時のクリティカルアラート

## セットアップ手順

1. **GitHubリポジトリ設定**
   - Secrets and variablesにシークレットを追加
   - Environmentsを作成（staging, production, production-approval）

2. **AWS設定**
   - ECRリポジトリ作成
   - ECSクラスター・サービス作成
   - Secrets Managerにシークレット登録
   - IAMロール・ポリシー設定

3. **初回デプロイ**
   - developブランチにpushしてステージングデプロイ
   - 動作確認後、mainブランチにマージして本番デプロイ

詳細な設定手順は `.github/SECRETS.md` を参照してください。
