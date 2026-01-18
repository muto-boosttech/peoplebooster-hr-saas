# レポート生成API 実装レポート

## 概要

PeopleBoosterのレポート生成APIを実装しました。個人診断レポート、候補者評価サマリー、組織傾向分析、採用活動サマリーのPDFレポート生成、およびCSVエクスポート機能を提供します。

## 実装ファイル一覧

| ファイル | 説明 |
|---------|------|
| `src/services/pdf-generator.service.ts` | PDF生成・S3アップロードサービス |
| `src/services/report-generation.service.ts` | レポートデータ生成・ビジネスロジック |
| `src/validators/report.validator.ts` | Zodバリデーションスキーマ |
| `src/controllers/report.controller.ts` | HTTPリクエストハンドラー |
| `src/routes/report.routes.ts` | ルーティング定義とOpenAPI仕様 |
| `src/templates/individual-report.ejs` | 個人診断レポートテンプレート |
| `src/templates/candidate-summary.ejs` | 候補者サマリーレポートテンプレート |
| `src/templates/organization-report.ejs` | 組織分析レポートテンプレート |
| `src/templates/recruitment-summary.ejs` | 採用サマリーレポートテンプレート |

## APIエンドポイント

### 1. 個人診断レポート生成

**POST /api/reports/individual/:userId**

ユーザーの診断結果をPDFレポートとして生成します。

**リクエストボディ:**
```json
{
  "includeDetail": true,
  "includePotential": true,
  "includeSimilarity": false,
  "companyLogo": false
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "url": "https://s3.amazonaws.com/...",
    "expiresAt": "2026-01-18T00:00:00Z",
    "key": "reports/individual-xxx.pdf"
  },
  "message": "個人診断レポートを生成しました"
}
```

**権限:** 本人、または自社のCOMPANY_ADMIN以上、SYSTEM_ADMIN

### 2. 候補者評価サマリーレポート生成

**POST /api/reports/candidate-summary/:candidateId**

候補者の評価情報をまとめたPDFレポートを生成します。

**リクエストボディ:**
```json
{
  "includeComments": true,
  "includeInterviews": true,
  "includeDiagnosis": true
}
```

**権限:** COMPANY_USER以上（自社の候補者のみ）

### 3. 組織傾向分析レポート生成

**POST /api/reports/organization/:companyId**

会社または部署の診断傾向を分析したPDFレポートを生成します。

**リクエストボディ:**
```json
{
  "departmentId": "uuid",
  "includeIndividualScores": false
}
```

**権限:** COMPANY_ADMIN以上

### 4. 採用活動サマリーレポート生成

**POST /api/reports/recruitment-summary/:companyId**

指定期間の採用活動をまとめたPDFレポートを生成します。

**クエリパラメータ:**
- `startDate`: 集計開始日（必須）
- `endDate`: 集計終了日（必須）

**リクエストボディ:**
```json
{
  "includeDetails": false
}
```

**権限:** COMPANY_ADMIN以上

### 5. CSVエクスポート

**GET /api/reports/export/csv**

指定したデータをCSV形式でエクスポートします。

**クエリパラメータ:**
- `type`: エクスポートタイプ（`diagnosis` | `candidates` | `interviews`）
- `companyId`: 会社ID（必須）
- `startDate`: 期間の開始日（オプション）
- `endDate`: 期間の終了日（オプション）

**権限:** COMPANY_ADMIN以上

## PDF生成サービス

### 機能

PDF生成サービス（`pdf-generator.service.ts`）は以下の機能を提供します。

**テンプレートレンダリング:** EJSテンプレートエンジンを使用してHTMLを生成します。テンプレートには日付フォーマット関数やChart.jsスクリプトの挿入機能が組み込まれています。

**PDF変換:** Puppeteerを使用してHTMLをPDFに変換します。A4サイズ、横向き/縦向き、余白設定などをカスタマイズ可能です。

**S3アップロード:** 生成したPDFをS3にアップロードし、署名付きURLを返却します。URLの有効期限はデフォルトで24時間です。

### テンプレートヘルパー

テンプレート内で使用可能なヘルパー関数:

| 関数 | 説明 |
|------|------|
| `formatDate(date, format?)` | 日付をフォーマット（デフォルト: YYYY/MM/DD） |
| `getChartScript()` | Chart.jsのCDNスクリプトタグを挿入 |

## HTMLテンプレート

### 共通デザイン要素

すべてのテンプレートは以下の共通デザイン要素を持ちます。

**ヘッダー:** レポートタイトル、サブタイトル、企業ロゴ（オプション）を表示します。各レポートタイプごとに異なるテーマカラーを使用しています。

**セクション:** 左ボーダー付きのセクションタイトルで情報を整理します。

**カード:** 重要な情報を強調するためのグラデーション背景カードを使用します。

**チャート:** Chart.jsを使用してレーダーチャート、ドーナツチャート、棒グラフなどを描画します。

**免責事項:** AI診断結果が参考情報であることを明示する注意書きを含めます。

**フッター:** 生成日時、生成者、著作権表示を含めます。

### テーマカラー

| レポートタイプ | プライマリカラー |
|---------------|-----------------|
| 個人診断 | 青（#2563eb） |
| 候補者サマリー | 緑（#059669） |
| 組織分析 | 紫（#7c3aed） |
| 採用サマリー | 赤（#dc2626） |

## 権限管理

### 個人レポート

本人は自分のレポートを生成可能です。COMPANY_ADMINは自社ユーザーのレポートを生成可能です。SYSTEM_ADMINは全ユーザーのレポートを生成可能です。企業ロゴの挿入はCOMPANY_ADMIN以上のみ可能です。

### 候補者・組織・採用レポート

COMPANY_USERは自社の候補者サマリーレポートを閲覧可能です。COMPANY_ADMINは自社の組織・採用レポートを生成可能です。SYSTEM_ADMINは全社のレポートを生成可能です。

### CSVエクスポート

COMPANY_ADMIN以上が自社データをエクスポート可能です。SYSTEM_ADMINは全社データをエクスポート可能です。

## CSVエクスポート詳細

### 診断結果エクスポート

出力カラム: ユーザーID、氏名、メールアドレス、部署、診断タイプ名、タイプコード、信頼性ステータス、ストレス耐性、Big Five各スコア、診断完了日時

### 候補者エクスポート

出力カラム: 候補者ID、氏名、メールアドレス、応募職種、ステータス、応募経路、タグ、担当者、面接回数、コメント数、登録日時、更新日時

### 面接エクスポート

出力カラム: 面接ID、候補者名、応募職種、面接官、予定日時、所要時間、形式、場所/URL、ステータス、作成日時

## 倫理的配慮

すべてのレポートには以下の免責事項を含めています。

> 本レポートの診断結果はAIによる分析に基づく参考情報です。採用や人事評価の最終判断は、面接やその他の評価方法と組み合わせて総合的に行ってください。本診断結果のみを根拠とした自動的な採否判定は推奨されません。

これはHRテックにおけるAI診断結果の適切な利用を促進するためのガードレールです。

## 依存パッケージ

| パッケージ | バージョン | 用途 |
|-----------|----------|------|
| puppeteer | ^22.x | PDF生成 |
| ejs | ^3.x | HTMLテンプレートレンダリング |
| csv-stringify | ^6.x | CSVファイル生成 |

## 今後の拡張予定

以下の機能は将来的に実装予定です。

1. **類似性分析レポート:** 候補者と既存社員の類似性分析結果をレポートに含める機能
2. **カスタムテンプレート:** 企業ごとにカスタマイズ可能なレポートテンプレート
3. **バッチレポート生成:** 複数ユーザー/候補者のレポートを一括生成する機能
4. **レポート履歴管理:** 生成したレポートの履歴を管理し、再ダウンロード可能にする機能
