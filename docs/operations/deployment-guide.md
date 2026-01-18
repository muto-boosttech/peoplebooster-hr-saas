# PeopleBooster デプロイ手順書

## 概要

本ドキュメントでは、PeopleBoosterのステージング環境および本番環境へのデプロイ手順を説明します。

## 前提条件

デプロイを実行する前に、以下の条件が満たされていることを確認してください。

| 項目 | 要件 |
|------|------|
| AWS CLI | v2.x以上がインストールされ、適切な認証情報が設定されていること |
| Docker | v20.x以上がインストールされていること |
| GitHub CLI | `gh`コマンドが利用可能で、リポジトリへのアクセス権があること |
| Terraform | v1.5以上がインストールされていること（インフラ変更時のみ） |

## 環境情報

### ステージング環境

ステージング環境は、本番リリース前の最終確認を行うための環境です。developブランチへのプッシュで自動デプロイされます。

| 項目 | 値 |
|------|-----|
| URL | https://staging.peoplebooster.com |
| API | https://api-staging.peoplebooster.com |
| AWS Account | 123456789012 (staging) |
| ECS Cluster | peoplebooster-staging |

### 本番環境

本番環境は、エンドユーザーが利用する環境です。mainブランチへのプッシュ後、手動承認を経てデプロイされます。

| 項目 | 値 |
|------|-----|
| URL | https://app.peoplebooster.com |
| API | https://api.peoplebooster.com |
| AWS Account | 987654321098 (production) |
| ECS Cluster | peoplebooster-production |

## 自動デプロイ（推奨）

### ステージングデプロイ

ステージング環境へのデプロイは、developブランチへのプッシュで自動的に実行されます。

```bash
# 機能ブランチからdevelopへマージ
git checkout develop
git pull origin develop
git merge feature/your-feature
git push origin develop
```

GitHub Actionsが自動的に以下の処理を実行します。

1. コードのビルドとテスト
2. Dockerイメージのビルド
3. ECRへのイメージプッシュ
4. ECSサービスの更新
5. データベースマイグレーション
6. E2Eテストの実行
7. Slack通知

### 本番デプロイ

本番環境へのデプロイは、mainブランチへのプッシュ後、手動承認を経て実行されます。

```bash
# developからmainへマージ
git checkout main
git pull origin main
git merge develop
git push origin main
```

GitHub Actionsのワークフローが開始され、以下の承認プロセスが必要です。

1. **承認待ち**: GitHub上で2名以上の承認者による承認が必要
2. **承認方法**: Actions > Deploy Production > Review deployments > Approve
3. **承認後**: 自動的にデプロイが開始

## 手動デプロイ

緊急時や自動デプロイが失敗した場合は、手動でデプロイを実行できます。

### バックエンドのデプロイ

```bash
# 1. ECRへログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# 2. Dockerイメージのビルド
cd backend
docker build -t peoplebooster-backend:latest .

# 3. イメージのタグ付けとプッシュ
docker tag peoplebooster-backend:latest \
  <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/peoplebooster-backend:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/peoplebooster-backend:latest

# 4. ECSサービスの更新
aws ecs update-service \
  --cluster peoplebooster-<environment> \
  --service peoplebooster-backend \
  --force-new-deployment
```

### フロントエンドのデプロイ

```bash
# 1. ECRへログイン（バックエンドと同様）

# 2. Dockerイメージのビルド
cd frontend
docker build -t peoplebooster-frontend:latest .

# 3. イメージのタグ付けとプッシュ
docker tag peoplebooster-frontend:latest \
  <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/peoplebooster-frontend:latest
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/peoplebooster-frontend:latest

# 4. ECSサービスの更新
aws ecs update-service \
  --cluster peoplebooster-<environment> \
  --service peoplebooster-frontend \
  --force-new-deployment
```

### データベースマイグレーション

```bash
# ECSタスクとしてマイグレーションを実行
aws ecs run-task \
  --cluster peoplebooster-<environment> \
  --task-definition peoplebooster-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"
```

## デプロイ後の確認

デプロイ完了後、以下の確認を行ってください。

### ヘルスチェック

```bash
# 総合ヘルスチェック
curl https://api-<environment>.peoplebooster.com/health

# レディネスチェック
curl https://api-<environment>.peoplebooster.com/health/ready

# ライブネスチェック
curl https://api-<environment>.peoplebooster.com/health/live
```

### 機能確認

| 確認項目 | 確認方法 |
|---------|---------|
| ログイン | テストアカウントでログインできること |
| 診断機能 | 診断を開始し、回答を保存できること |
| API応答 | 主要APIのレスポンスタイムが3秒以内であること |
| エラー | Sentryに新規エラーが発生していないこと |

### CloudWatchダッシュボード

AWS CloudWatchダッシュボードで以下のメトリクスを確認してください。

| メトリクス | 正常値 |
|-----------|--------|
| ECS CPU使用率 | 80%未満 |
| ECS メモリ使用率 | 80%未満 |
| ALB 5xxエラー | 0 |
| RDS 接続数 | 最大接続数の80%未満 |

## トラブルシューティング

### デプロイが失敗した場合

1. GitHub Actionsのログを確認
2. CloudWatch Logsでアプリケーションログを確認
3. ECSサービスのイベントを確認

```bash
aws ecs describe-services \
  --cluster peoplebooster-<environment> \
  --services peoplebooster-backend \
  --query 'services[0].events[:5]'
```

### タスクが起動しない場合

```bash
# 停止したタスクの詳細を確認
aws ecs describe-tasks \
  --cluster peoplebooster-<environment> \
  --tasks <task-arn> \
  --query 'tasks[0].stoppedReason'
```

## 連絡先

デプロイに関する問題が発生した場合は、以下に連絡してください。

| 担当 | 連絡先 |
|------|--------|
| インフラチーム | #infra-support (Slack) |
| オンコール | PagerDuty経由 |
| 緊急連絡先 | ops@peoplebooster.com |
