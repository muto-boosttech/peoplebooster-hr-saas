# PeopleBooster セキュリティインシデント対応手順書

## 概要

本ドキュメントでは、セキュリティインシデントが発生した際の対応手順を定義します。迅速かつ適切な対応により、被害を最小限に抑え、再発を防止することを目的としています。

## セキュリティインシデントの定義

以下の事象をセキュリティインシデントとして扱います。

| カテゴリ | 例 |
|---------|-----|
| 不正アクセス | 認証情報の漏洩、不正ログイン試行 |
| データ漏洩 | 個人情報の流出、機密データの露出 |
| マルウェア | ランサムウェア、ウイルス感染 |
| サービス妨害 | DDoS攻撃、リソース枯渇攻撃 |
| 脆弱性悪用 | 既知/未知の脆弱性を利用した攻撃 |
| 内部不正 | 従業員による不正アクセス、データ持ち出し |

## インシデント重要度

| レベル | 定義 | 対応時間 |
|--------|------|----------|
| Critical | データ漏洩確定、サービス停止 | 即時対応 |
| High | 攻撃進行中、漏洩の可能性 | 1時間以内 |
| Medium | 攻撃試行検知、脆弱性発見 | 4時間以内 |
| Low | 軽微な異常、情報収集段階 | 24時間以内 |

## 対応フロー

### Phase 1: 検知と初期対応（0-30分）

**1. インシデントの確認**

セキュリティアラートまたは報告を受けたら、まずインシデントの発生を確認します。

| 確認項目 | 確認方法 |
|---------|---------|
| WAFログ | CloudWatch Logs |
| アクセスログ | ALBアクセスログ |
| 監査ログ | アプリケーション監査ログ |
| Sentryエラー | Sentryダッシュボード |

**2. 初期封じ込め**

被害拡大を防ぐため、必要に応じて以下の対応を実施します。

```bash
# 特定IPのブロック（WAF）
aws wafv2 update-ip-set \
  --name blocked-ips \
  --scope REGIONAL \
  --id <ip-set-id> \
  --addresses "1.2.3.4/32"

# 特定ユーザーのセッション無効化
# アプリケーション管理画面から実施

# 疑わしいサービスの隔離
aws ecs update-service \
  --cluster peoplebooster-production \
  --service peoplebooster-backend \
  --desired-count 0
```

**3. インシデント宣言**

```
@channel @security-team 【セキュリティインシデント発生】
発生時刻: HH:MM
重要度: Critical / High / Medium / Low
種類: [インシデントの種類]
概要: [概要を簡潔に記載]
対応者: @担当者名
状況チャンネル: #security-incident-YYYYMMDD
```

### Phase 2: 調査と分析（30分-数時間）

**1. 証拠の保全**

調査に必要なログやデータを保全します。

```bash
# CloudWatch Logsのエクスポート
aws logs create-export-task \
  --log-group-name /aws/ecs/peoplebooster-production/application \
  --from $(date -d '24 hours ago' +%s000) \
  --to $(date +%s000) \
  --destination peoplebooster-security-logs \
  --destination-prefix incident-$(date +%Y%m%d)

# RDSスナップショットの作成
aws rds create-db-snapshot \
  --db-instance-identifier peoplebooster-production \
  --db-snapshot-identifier security-incident-$(date +%Y%m%d-%H%M%S)
```

**2. 影響範囲の特定**

| 確認項目 | 確認方法 |
|---------|---------|
| 影響を受けたユーザー | 監査ログの分析 |
| アクセスされたデータ | データベースクエリログ |
| 攻撃の経路 | WAF/ALBログの分析 |
| 攻撃の期間 | タイムライン分析 |

**3. 根本原因の分析**

| 分析項目 | 内容 |
|---------|------|
| 攻撃手法 | どのような手法が使われたか |
| 脆弱性 | どの脆弱性が悪用されたか |
| 侵入経路 | どこから侵入されたか |
| 検知遅延 | なぜ検知が遅れたか |

### Phase 3: 封じ込めと根絶（状況に応じて）

**認証情報漏洩の場合**

```bash
# 1. 全ユーザーのセッションを無効化
# Redisのセッションデータをクリア

# 2. パスワードリセットを強制
# 管理画面から一括リセット

# 3. APIキーのローテーション
aws secretsmanager rotate-secret \
  --secret-id peoplebooster/production/api-keys

# 4. JWTシークレットのローテーション
aws secretsmanager update-secret \
  --secret-id peoplebooster/production/jwt-secret \
  --secret-string "$(openssl rand -base64 64)"
```

**不正アクセスの場合**

```bash
# 1. 攻撃元IPのブロック
# WAFルールの更新

# 2. 影響を受けたアカウントのロック
# 管理画面から実施

# 3. 不正な変更のロールバック
# 監査ログを基に手動で修正
```

**脆弱性悪用の場合**

```bash
# 1. 脆弱なコンポーネントの特定
npm audit
pip-audit

# 2. 緊急パッチの適用
npm update <vulnerable-package>

# 3. 緊急デプロイ
gh workflow run deploy-production.yml
```

### Phase 4: 復旧（封じ込め完了後）

**1. サービスの復旧**

```bash
# ECSサービスの再開
aws ecs update-service \
  --cluster peoplebooster-production \
  --service peoplebooster-backend \
  --desired-count 2

# ヘルスチェック
curl https://api.peoplebooster.com/health
```

**2. 監視の強化**

| 対応 | 内容 |
|------|------|
| アラート閾値の引き下げ | 一時的に検知感度を上げる |
| ログ監視の強化 | 追加のログ監視ルールを設定 |
| 手動監視 | 24-48時間は手動で監視 |

### Phase 5: 事後対応（復旧後）

**1. 関係者への通知**

| 通知先 | タイミング | 内容 |
|--------|-----------|------|
| 経営層 | 即時 | インシデント概要と対応状況 |
| 法務部門 | 24時間以内 | 法的対応の要否確認 |
| 影響ユーザー | 72時間以内 | 影響と対応の説明 |
| 監督官庁 | 法令に従う | 個人情報漏洩の場合 |

**2. インシデントレポートの作成**

| セクション | 内容 |
|-----------|------|
| 概要 | インシデントの概要 |
| タイムライン | 発生から復旧までの時系列 |
| 影響範囲 | 影響を受けたユーザー、データ |
| 根本原因 | インシデントの根本原因 |
| 対応内容 | 実施した対応の詳細 |
| 再発防止策 | 技術的・組織的な改善策 |

**3. 再発防止策の実施**

| カテゴリ | 対策例 |
|---------|--------|
| 技術的対策 | 脆弱性修正、監視強化、アクセス制御強化 |
| 組織的対策 | セキュリティ教育、プロセス改善 |
| 運用的対策 | 定期的な脆弱性診断、ペネトレーションテスト |

## 連絡先

| 担当 | 連絡先 | 役割 |
|------|--------|------|
| セキュリティチーム | #security-team (Slack) | インシデント対応リード |
| インフラチーム | #infra-support (Slack) | インフラ対応 |
| 法務部門 | legal@peoplebooster.com | 法的対応 |
| 広報部門 | pr@peoplebooster.com | 外部コミュニケーション |
| CSIRT | csirt@peoplebooster.com | セキュリティ専門対応 |

## 外部連絡先

| 組織 | 連絡先 | 用途 |
|------|--------|------|
| 警察（サイバー犯罪相談窓口） | 各都道府県警察 | 犯罪被害の届出 |
| IPA | https://www.ipa.go.jp/security/ | 脆弱性情報、相談 |
| JPCERT/CC | https://www.jpcert.or.jp/ | インシデント報告 |
| 個人情報保護委員会 | https://www.ppc.go.jp/ | 個人情報漏洩報告 |

## 定期的な訓練

セキュリティインシデント対応の実効性を確保するため、以下の訓練を定期的に実施します。

| 訓練 | 頻度 | 内容 |
|------|------|------|
| 机上訓練 | 四半期 | シナリオベースの対応訓練 |
| 実地訓練 | 年1回 | 実際の環境での対応訓練 |
| レッドチーム演習 | 年1回 | 外部専門家による攻撃シミュレーション |
