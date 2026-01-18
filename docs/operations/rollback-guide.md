# PeopleBooster ロールバック手順書

## 概要

本ドキュメントでは、デプロイ後に問題が発生した場合のロールバック手順を説明します。ロールバックは迅速に実行し、サービスへの影響を最小限に抑えることが重要です。

## ロールバック判断基準

以下のいずれかの状況が発生した場合、ロールバックを検討してください。

| 状況 | 重要度 | 判断時間 |
|------|--------|----------|
| 5xxエラー率が1%を超過 | Critical | 5分以内 |
| API応答時間が5秒を超過 | High | 10分以内 |
| 主要機能が利用不可 | Critical | 即時 |
| データ不整合が発生 | Critical | 即時 |
| セキュリティ脆弱性を発見 | Critical | 即時 |

## 自動ロールバック（GitHub Actions）

GitHub Actionsのワークフローを使用して、簡単にロールバックを実行できます。

### 手順

1. GitHubリポジトリの「Actions」タブを開く
2. 「Rollback」ワークフローを選択
3. 「Run workflow」をクリック
4. 以下のパラメータを入力

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| environment | 対象環境 | production / staging |
| service | 対象サービス | backend / frontend / both |
| version | ロールバック先バージョン | v1.2.3 または latest-1 |

5. 「Run workflow」をクリックして実行

## 手動ロールバック

### ECSサービスのロールバック

ECSは直近のタスク定義リビジョンを保持しているため、前のリビジョンに戻すことでロールバックできます。

```bash
# 1. 現在のタスク定義を確認
aws ecs describe-services \
  --cluster peoplebooster-<environment> \
  --services peoplebooster-backend \
  --query 'services[0].taskDefinition'

# 2. 利用可能なタスク定義リビジョンを確認
aws ecs list-task-definitions \
  --family-prefix peoplebooster-backend \
  --sort DESC \
  --max-items 5

# 3. 前のリビジョンにロールバック
aws ecs update-service \
  --cluster peoplebooster-<environment> \
  --service peoplebooster-backend \
  --task-definition peoplebooster-backend:<previous-revision>

# 4. デプロイ状況を監視
aws ecs wait services-stable \
  --cluster peoplebooster-<environment> \
  --services peoplebooster-backend
```

### Dockerイメージのロールバック

特定のバージョンのDockerイメージにロールバックする場合は、以下の手順を実行します。

```bash
# 1. 利用可能なイメージタグを確認
aws ecr describe-images \
  --repository-name peoplebooster-backend \
  --query 'imageDetails[*].[imageTags,imagePushedAt]' \
  --output table

# 2. 特定のタグでタスク定義を更新
# 新しいタスク定義を作成（前のイメージタグを指定）
aws ecs register-task-definition \
  --cli-input-json file://task-definition-rollback.json

# 3. サービスを更新
aws ecs update-service \
  --cluster peoplebooster-<environment> \
  --service peoplebooster-backend \
  --task-definition peoplebooster-backend:<new-revision>
```

### データベースのロールバック

データベースマイグレーションのロールバックが必要な場合は、慎重に実行してください。

```bash
# 1. 現在のマイグレーション状態を確認
npx prisma migrate status

# 2. マイグレーションをロールバック（開発環境のみ）
# 本番環境では手動でSQLを実行することを推奨
npx prisma migrate reset --skip-seed

# 3. 本番環境でのロールバック（手動SQL）
# RDSスナップショットからの復元を検討
```

### RDSスナップショットからの復元

重大なデータ問題が発生した場合は、スナップショットからの復元を検討します。

```bash
# 1. 利用可能なスナップショットを確認
aws rds describe-db-snapshots \
  --db-instance-identifier peoplebooster-<environment> \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# 2. スナップショットから新しいインスタンスを作成
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier peoplebooster-<environment>-restored \
  --db-snapshot-identifier <snapshot-identifier> \
  --db-instance-class db.t3.medium

# 3. アプリケーションの接続先を切り替え
# Secrets Managerの値を更新
aws secretsmanager update-secret \
  --secret-id peoplebooster/<environment>/database \
  --secret-string '{"host":"new-endpoint",...}'

# 4. ECSサービスを再起動
aws ecs update-service \
  --cluster peoplebooster-<environment> \
  --service peoplebooster-backend \
  --force-new-deployment
```

## ロールバック後の確認

ロールバック完了後、以下の確認を必ず実施してください。

### 即時確認（5分以内）

| 確認項目 | コマンド/方法 |
|---------|--------------|
| ヘルスチェック | `curl https://api.peoplebooster.com/health` |
| エラー率 | CloudWatchダッシュボードで確認 |
| ログ | CloudWatch Logsで異常がないか確認 |

### 機能確認（30分以内）

| 確認項目 | 確認方法 |
|---------|---------|
| ログイン機能 | テストアカウントでログイン |
| 診断機能 | 診断の開始と回答保存 |
| データ整合性 | 主要データの確認 |

## 関係者への連絡

ロールバックを実行した場合は、以下の関係者に連絡してください。

### 連絡テンプレート

```
【ロールバック実施報告】

実施日時: YYYY-MM-DD HH:MM
対象環境: production / staging
対象サービス: backend / frontend / both
ロールバック先: v1.2.3

【発生した問題】
- 問題の概要を記載

【影響範囲】
- 影響を受けたユーザー/機能を記載

【現在の状況】
- ロールバック完了、サービス正常稼働中

【今後の対応】
- 原因調査と再発防止策を検討中
```

### 連絡先

| 担当 | 連絡先 | タイミング |
|------|--------|-----------|
| 開発チーム | #dev-team (Slack) | 即時 |
| プロダクトマネージャー | #product (Slack) | 即時 |
| カスタマーサポート | #support (Slack) | 影響がある場合 |
| 経営層 | メール | 重大インシデント時 |

## ロールバック履歴の記録

すべてのロールバックは、以下の情報を記録してください。

| 項目 | 内容 |
|------|------|
| 日時 | ロールバック実施日時 |
| 実施者 | 実施した担当者名 |
| 対象環境 | production / staging |
| ロールバック元 | バージョン/リビジョン |
| ロールバック先 | バージョン/リビジョン |
| 理由 | ロールバックの理由 |
| 影響 | サービスへの影響 |
| 復旧時間 | 問題発生から復旧までの時間 |

記録は `/docs/operations/rollback-history.md` に追記してください。
