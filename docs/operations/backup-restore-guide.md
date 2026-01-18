# PeopleBooster バックアップ・リストア手順書

## 概要

本ドキュメントでは、PeopleBoosterのデータバックアップとリストア手順を説明します。定期的なバックアップと、障害時の迅速なリストアにより、データの安全性を確保します。

## バックアップ対象

以下のデータがバックアップ対象です。

| 対象 | 方法 | 保持期間 | 頻度 |
|------|------|----------|------|
| RDS PostgreSQL | 自動スナップショット | 7日間 | 日次 |
| RDS PostgreSQL | 手動スナップショット | 無期限 | リリース前 |
| S3 アセット | バージョニング | 無期限 | リアルタイム |
| S3 ログ | ライフサイクル | 90日間 | リアルタイム |
| ElastiCache Redis | スナップショット | 7日間 | 日次 |
| Secrets Manager | バージョン履歴 | 無期限 | 変更時 |

## RDSバックアップ

### 自動バックアップ

RDSの自動バックアップは、Terraformで設定されています。

| 設定項目 | ステージング | 本番 |
|---------|-------------|------|
| バックアップウィンドウ | 03:00-04:00 JST | 03:00-04:00 JST |
| 保持期間 | 7日間 | 7日間 |
| Multi-AZ | 無効 | 有効 |

### 手動スナップショットの作成

重要なリリース前や、メンテナンス前には手動スナップショットを作成します。

```bash
# スナップショットの作成
aws rds create-db-snapshot \
  --db-instance-identifier peoplebooster-production \
  --db-snapshot-identifier peoplebooster-production-$(date +%Y%m%d-%H%M%S)

# スナップショットの作成状況を確認
aws rds describe-db-snapshots \
  --db-snapshot-identifier peoplebooster-production-YYYYMMDD-HHMMSS
```

### スナップショット一覧の確認

```bash
# 自動スナップショット
aws rds describe-db-snapshots \
  --db-instance-identifier peoplebooster-production \
  --snapshot-type automated \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table

# 手動スナップショット
aws rds describe-db-snapshots \
  --db-instance-identifier peoplebooster-production \
  --snapshot-type manual \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table
```

## RDSリストア

### スナップショットからのリストア

データベースをスナップショットからリストアする手順です。

**手順1: 新しいインスタンスの作成**

```bash
# スナップショットから新しいインスタンスを作成
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier peoplebooster-production-restored \
  --db-snapshot-identifier peoplebooster-production-YYYYMMDD-HHMMSS \
  --db-instance-class db.t3.medium \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name peoplebooster-production-db

# 作成状況を確認
aws rds describe-db-instances \
  --db-instance-identifier peoplebooster-production-restored \
  --query 'DBInstances[0].DBInstanceStatus'
```

**手順2: エンドポイントの確認**

```bash
# 新しいインスタンスのエンドポイントを確認
aws rds describe-db-instances \
  --db-instance-identifier peoplebooster-production-restored \
  --query 'DBInstances[0].Endpoint.Address'
```

**手順3: アプリケーションの接続先を切り替え**

```bash
# Secrets Managerの値を更新
aws secretsmanager update-secret \
  --secret-id peoplebooster/production/database \
  --secret-string '{
    "host": "new-endpoint.xxx.ap-northeast-1.rds.amazonaws.com",
    "port": 5432,
    "database": "peoplebooster",
    "username": "admin",
    "password": "xxx"
  }'

# ECSサービスを再起動して新しい接続情報を反映
aws ecs update-service \
  --cluster peoplebooster-production \
  --service peoplebooster-backend \
  --force-new-deployment
```

### ポイントインタイムリカバリ（PITR）

特定の時点にデータベースを復元する場合は、PITRを使用します。

```bash
# 復元可能な時間範囲を確認
aws rds describe-db-instances \
  --db-instance-identifier peoplebooster-production \
  --query 'DBInstances[0].[LatestRestorableTime,EarliestRestorableTime]'

# 特定の時点に復元
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier peoplebooster-production \
  --target-db-instance-identifier peoplebooster-production-pitr \
  --restore-time 2026-01-15T10:30:00Z \
  --db-instance-class db.t3.medium
```

## S3バックアップ

### バージョニング

S3バケットではバージョニングが有効になっており、オブジェクトの変更履歴が保持されます。

```bash
# バージョニング状態の確認
aws s3api get-bucket-versioning \
  --bucket peoplebooster-production-assets

# オブジェクトのバージョン一覧
aws s3api list-object-versions \
  --bucket peoplebooster-production-assets \
  --prefix reports/
```

### 特定バージョンの復元

誤って削除または上書きしたファイルを復元します。

```bash
# 削除マーカーを削除して復元
aws s3api delete-object \
  --bucket peoplebooster-production-assets \
  --key reports/report-123.pdf \
  --version-id <delete-marker-version-id>

# 特定バージョンをコピーして復元
aws s3api copy-object \
  --bucket peoplebooster-production-assets \
  --copy-source peoplebooster-production-assets/reports/report-123.pdf?versionId=<version-id> \
  --key reports/report-123.pdf
```

## ElastiCacheバックアップ

### スナップショットの作成

```bash
# 手動スナップショットの作成
aws elasticache create-snapshot \
  --replication-group-id peoplebooster-production-redis \
  --snapshot-name peoplebooster-redis-$(date +%Y%m%d-%H%M%S)

# スナップショット一覧
aws elasticache describe-snapshots \
  --replication-group-id peoplebooster-production-redis
```

### スナップショットからのリストア

```bash
# スナップショットから新しいクラスターを作成
aws elasticache create-replication-group \
  --replication-group-id peoplebooster-production-redis-restored \
  --replication-group-description "Restored from snapshot" \
  --snapshot-name peoplebooster-redis-YYYYMMDD-HHMMSS \
  --cache-node-type cache.t3.micro \
  --engine redis
```

## バックアップ検証

定期的にバックアップからのリストアが正常に行えることを検証します。

### 月次バックアップ検証手順

| 手順 | 内容 | 担当 |
|------|------|------|
| 1 | RDSスナップショットからテストインスタンスを作成 | インフラチーム |
| 2 | データの整合性を確認 | 開発チーム |
| 3 | S3バージョンからファイルを復元 | インフラチーム |
| 4 | 検証結果を記録 | インフラチーム |
| 5 | テストリソースを削除 | インフラチーム |

### 検証チェックリスト

| 確認項目 | 確認方法 |
|---------|---------|
| RDSスナップショットが存在する | AWS Console / CLI |
| スナップショットからリストア可能 | テストリストア実施 |
| データの整合性 | レコード数の確認 |
| S3バージョニングが有効 | バケット設定確認 |
| 削除ファイルの復元可能 | テスト復元実施 |

## 災害復旧（DR）

### RPO/RTO目標

| 指標 | 目標値 | 説明 |
|------|--------|------|
| RPO | 1時間 | 最大1時間分のデータ損失を許容 |
| RTO | 4時間 | 4時間以内にサービス復旧 |

### DRシナリオ

**シナリオ1: 単一AZ障害**

Multi-AZ構成により、自動フェイルオーバーで対応します。

**シナリオ2: リージョン障害**

1. クロスリージョンスナップショットから別リージョンでRDSを復元
2. S3クロスリージョンレプリケーションからデータを復元
3. 別リージョンでECSサービスを起動
4. Route53でDNSを切り替え

## 連絡先

バックアップ・リストアに関する問題が発生した場合は、以下に連絡してください。

| 担当 | 連絡先 |
|------|--------|
| インフラチーム | #infra-support (Slack) |
| オンコール | PagerDuty経由 |
| AWS サポート | AWS Support Console |
