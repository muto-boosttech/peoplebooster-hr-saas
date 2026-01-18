# PeopleBooster 障害対応フロー

## 概要

本ドキュメントでは、システム障害が発生した際の対応フローを定義します。迅速かつ適切な対応により、サービスへの影響を最小限に抑えることを目的としています。

## 障害レベル定義

障害は以下の4つのレベルに分類されます。

| レベル | 名称 | 定義 | 対応時間目標 |
|--------|------|------|-------------|
| P1 | Critical | サービス全体が停止、データ損失の可能性 | 15分以内に対応開始 |
| P2 | High | 主要機能が利用不可、多数のユーザーに影響 | 30分以内に対応開始 |
| P3 | Medium | 一部機能に影響、回避策あり | 2時間以内に対応開始 |
| P4 | Low | 軽微な問題、ユーザー影響なし | 24時間以内に対応開始 |

## 障害対応フロー

### Phase 1: 検知と初期対応（0-15分）

障害を検知したら、以下の手順で初期対応を行います。

**1. 障害の確認**

監視アラートまたはユーザー報告を受けたら、まず障害の発生を確認します。

```bash
# ヘルスチェック
curl https://api.peoplebooster.com/health

# CloudWatchアラームの確認
aws cloudwatch describe-alarms --state-value ALARM

# ECSサービス状態の確認
aws ecs describe-services \
  --cluster peoplebooster-production \
  --services peoplebooster-backend peoplebooster-frontend
```

**2. 障害レベルの判定**

確認した情報をもとに、障害レベルを判定します。

| 症状 | 推定レベル |
|------|-----------|
| 全ユーザーがアクセス不可 | P1 |
| ログインできない | P1 |
| 診断機能が動作しない | P2 |
| レポート生成が遅い | P3 |
| UIの表示崩れ | P4 |

**3. インシデントの宣言**

P1/P2の場合は、Slackで即座にインシデントを宣言します。

```
@channel 【P1インシデント発生】
発生時刻: HH:MM
症状: [症状を簡潔に記載]
影響範囲: [影響を受けているユーザー/機能]
対応者: @担当者名
状況チャンネル: #incident-YYYYMMDD
```

### Phase 2: 調査と診断（15-60分）

**1. ログの確認**

```bash
# アプリケーションログの確認
aws logs filter-log-events \
  --log-group-name /aws/ecs/peoplebooster-production/application \
  --start-time $(date -d '30 minutes ago' +%s000) \
  --filter-pattern "ERROR"

# エラーログの確認
aws logs filter-log-events \
  --log-group-name /aws/ecs/peoplebooster-production/error \
  --start-time $(date -d '30 minutes ago' +%s000)
```

**2. メトリクスの確認**

CloudWatchダッシュボードで以下のメトリクスを確認します。

| メトリクス | 確認ポイント |
|-----------|-------------|
| ECS CPU/Memory | リソース枯渇がないか |
| ALB Request Count | トラフィック異常がないか |
| ALB 5xx Count | エラー率の推移 |
| RDS Connections | 接続数の異常増加 |
| RDS CPU | データベース負荷 |

**3. Sentryの確認**

Sentryダッシュボードで新規エラーや急増しているエラーを確認します。

### Phase 3: 復旧対応（状況に応じて）

**シナリオ別対応**

| シナリオ | 対応方法 |
|---------|---------|
| デプロイ後の障害 | ロールバックを実行 |
| リソース枯渇 | スケールアウト/スケールアップ |
| データベース問題 | RDSフェイルオーバー/スナップショット復元 |
| 外部サービス障害 | フォールバック有効化/待機 |
| セキュリティインシデント | 該当サービスの隔離 |

**ロールバックの実行**

```bash
# GitHub Actionsでロールバック
gh workflow run rollback.yml \
  -f environment=production \
  -f service=backend \
  -f version=latest-1
```

**スケールアウトの実行**

```bash
# ECSサービスのタスク数を増加
aws ecs update-service \
  --cluster peoplebooster-production \
  --service peoplebooster-backend \
  --desired-count 10
```

### Phase 4: 復旧確認（復旧後）

**1. ヘルスチェック**

```bash
# 総合ヘルスチェック
curl https://api.peoplebooster.com/health | jq .

# 期待される応答
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "externalServices": { "status": "healthy" }
  }
}
```

**2. 機能確認**

| 確認項目 | 確認方法 |
|---------|---------|
| ログイン | テストアカウントでログイン |
| 診断機能 | 診断の開始と回答保存 |
| API応答 | 主要APIのレスポンスタイム |

**3. 復旧宣言**

```
@channel 【インシデント復旧】
復旧時刻: HH:MM
障害時間: X時間Y分
原因: [原因を簡潔に記載]
対応内容: [実施した対応]
今後の対応: ポストモーテム実施予定
```

### Phase 5: ポストモーテム（復旧後24-48時間以内）

**ポストモーテムドキュメントの作成**

以下の項目を含むポストモーテムドキュメントを作成します。

| セクション | 内容 |
|-----------|------|
| 概要 | インシデントの概要 |
| タイムライン | 発生から復旧までの時系列 |
| 影響範囲 | 影響を受けたユーザー数、機能 |
| 根本原因 | 障害の根本原因 |
| 対応内容 | 実施した対応の詳細 |
| 改善策 | 再発防止のための改善策 |
| アクションアイテム | 具体的なタスクと担当者 |

## エスカレーションパス

障害レベルに応じて、以下のエスカレーションを行います。

| レベル | 連絡先 | 方法 |
|--------|--------|------|
| P1 | オンコール担当 | PagerDuty |
| P1 | CTO | 電話 |
| P2 | オンコール担当 | PagerDuty |
| P2 | 開発リード | Slack |
| P3 | 開発チーム | Slack |
| P4 | 開発チーム | Slack（翌営業日可） |

## オンコール体制

オンコール担当は、週次でローテーションします。

| 曜日 | 時間帯 | 担当 |
|------|--------|------|
| 平日 | 9:00-18:00 | 開発チーム全員 |
| 平日 | 18:00-翌9:00 | オンコール担当 |
| 休日 | 終日 | オンコール担当 |

オンコール担当は、PagerDutyアプリをインストールし、アラートを受信できる状態を維持してください。

## 連絡先一覧

| 担当 | 連絡先 |
|------|--------|
| インフラチーム | #infra-support (Slack) |
| 開発チーム | #dev-team (Slack) |
| オンコール | PagerDuty経由 |
| AWS サポート | AWS Support Console |
| 緊急連絡先 | ops@peoplebooster.com |
