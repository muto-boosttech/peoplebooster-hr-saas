# GitHub Actions シークレット設定ガイド

PeopleBoosterのCI/CDパイプラインを正常に動作させるために、以下のシークレットをGitHubリポジトリに設定してください。

## 必須シークレット

### AWS認証情報

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | IAMユーザーから取得 |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | IAMユーザーから取得 |

### ネットワーク設定（ステージング）

| シークレット名 | 説明 | 例 |
|--------------|------|-----|
| `STAGING_SUBNET_IDS` | ステージング環境のサブネットID（カンマ区切り） | `subnet-xxx,subnet-yyy` |
| `STAGING_SECURITY_GROUP_ID` | ステージング環境のセキュリティグループID | `sg-xxxxxxxxx` |

### ネットワーク設定（本番）

| シークレット名 | 説明 | 例 |
|--------------|------|-----|
| `PRODUCTION_SUBNET_IDS` | 本番環境のサブネットID（カンマ区切り） | `subnet-xxx,subnet-yyy` |
| `PRODUCTION_SECURITY_GROUP_ID` | 本番環境のセキュリティグループID | `sg-xxxxxxxxx` |
| `PRODUCTION_DB_INSTANCE` | 本番RDSインスタンス識別子 | `peoplebooster-production` |

### 通知設定

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | Slack Appから取得 |
| `PAGERDUTY_ROUTING_KEY` | PagerDutyルーティングキー（オプション） | PagerDutyから取得 |

## リポジトリ変数（Variables）

GitHub Actionsの変数として設定するもの（シークレットではない）：

### ステージング環境

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `STAGING_URL` | ステージング環境のURL | `https://staging.peoplebooster.jp` |
| `STAGING_API_URL` | ステージングAPIのURL | `https://api-staging.peoplebooster.jp` |

### 本番環境

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `PRODUCTION_URL` | 本番環境のURL | `https://peoplebooster.jp` |
| `PRODUCTION_API_URL` | 本番APIのURL | `https://api.peoplebooster.jp` |

## AWS Secrets Manager

アプリケーションの機密情報はAWS Secrets Managerで管理します。以下のシークレットを作成してください：

### ステージング環境

```
peoplebooster/staging/database-url
peoplebooster/staging/redis-url
peoplebooster/staging/jwt-secret
peoplebooster/staging/jwt-refresh-secret
peoplebooster/staging/sendgrid-api-key
peoplebooster/staging/stripe-secret-key
peoplebooster/staging/stripe-webhook-secret
peoplebooster/staging/s3-bucket
peoplebooster/staging/openai-api-key
```

### 本番環境

```
peoplebooster/production/database-url
peoplebooster/production/redis-url
peoplebooster/production/jwt-secret
peoplebooster/production/jwt-refresh-secret
peoplebooster/production/sendgrid-api-key
peoplebooster/production/stripe-secret-key
peoplebooster/production/stripe-webhook-secret
peoplebooster/production/s3-bucket
peoplebooster/production/openai-api-key
```

## IAMポリシー

CI/CDで使用するIAMユーザーには以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeTasks",
        "ecs:UpdateService",
        "ecs:RegisterTaskDefinition",
        "ecs:RunTask",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::*:role/ecsTaskExecutionRole",
        "arn:aws:iam::*:role/peoplebooster-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBSnapshot"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/peoplebooster-deployments"
    }
  ]
}
```

## GitHub Environments

以下のEnvironmentsを作成してください：

### staging

- 保護ルール: なし
- シークレット: 上記のステージング用シークレット

### production

- 保護ルール: 
  - Required reviewers: 1名以上
  - Wait timer: 0分
- シークレット: 上記の本番用シークレット

### production-approval

- 保護ルール:
  - Required reviewers: 2名以上
  - Wait timer: 5分
- シークレット: なし（承認のみ）

## 設定手順

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** に移動
2. **New repository secret** をクリックして各シークレットを追加
3. **Variables** タブで変数を追加
4. **Environments** でステージング・本番環境を作成
5. 各環境に必要な保護ルールを設定
