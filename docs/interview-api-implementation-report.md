# 面接コメント・スケジュールAPI実装レポート

## 概要

PeopleBoosterのATS（Applicant Tracking System）機能として、面接コメントAPIと面接スケジュールAPIを実装しました。これらのAPIは候補者管理機能と連携し、採用プロセス全体を効率的に管理できるようにします。

## 実装ファイル一覧

| ファイルパス | 説明 |
|-------------|------|
| `src/validators/interview-comment.validator.ts` | 面接コメントのバリデーションスキーマ |
| `src/validators/interview.validator.ts` | 面接スケジュールのバリデーションスキーマ |
| `src/services/interview-comment.service.ts` | 面接コメントのビジネスロジック |
| `src/services/interview.service.ts` | 面接スケジュールのビジネスロジック |
| `src/controllers/interview-comment.controller.ts` | 面接コメントのHTTPハンドラー |
| `src/controllers/interview.controller.ts` | 面接スケジュールのHTTPハンドラー |
| `src/routes/interview-comment.routes.ts` | 面接コメントのルーティング定義 |
| `src/routes/interview.routes.ts` | 面接スケジュールのルーティング定義 |
| `src/jobs/interview-reminder.job.ts` | 面接リマインダージョブ |
| `src/jobs/index.ts` | ジョブモジュールのエントリーポイント |

## 面接コメントAPI

### エンドポイント

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/candidates/:candidateId/comments` | 候補者の面接コメント一覧取得 | COMPANY_USER以上 |
| POST | `/api/candidates/:candidateId/comments` | 面接コメント作成 | COMPANY_USER以上 |
| GET | `/api/comments/:id` | 面接コメント詳細取得 | COMPANY_USER以上 |
| PUT | `/api/comments/:id` | 面接コメント更新 | コメント作成者のみ |
| DELETE | `/api/comments/:id` | 面接コメント削除 | コメント作成者またはCOMPANY_ADMIN以上 |

### 主な機能

**コメント作成時の処理**
- 面接日時、コメント内容、評価（1-5）、タグの保存
- AIブラッシュアップトリガー（オプション）
- 監査ログの記録

**評価レーティング**

| 値 | 表示名 |
|----|--------|
| 1 | 不採用 |
| 2 | 要検討 |
| 3 | 普通 |
| 4 | 良い |
| 5 | 非常に良い |

## 面接スケジュールAPI

### エンドポイント

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/interviews` | 面接一覧取得 | COMPANY_USER以上 |
| GET | `/api/interviews/calendar` | カレンダー形式で取得 | COMPANY_USER以上 |
| GET | `/api/interviews/:id` | 面接詳細取得 | COMPANY_USER以上 |
| POST | `/api/interviews` | 面接スケジュール作成 | COMPANY_USER以上 |
| PUT | `/api/interviews/:id` | 面接スケジュール更新 | COMPANY_USER以上 |
| PUT | `/api/interviews/:id/status` | 面接ステータス更新 | COMPANY_USER以上 |
| DELETE | `/api/interviews/:id` | 面接キャンセル | COMPANY_USER以上 |

### 面接タイプ

| コード | 表示名 |
|--------|--------|
| PHONE | 電話面接 |
| VIDEO | ビデオ面接 |
| ONSITE | 対面面接 |

### 面接ステータス

| コード | 表示名 |
|--------|--------|
| SCHEDULED | 予定 |
| COMPLETED | 完了 |
| CANCELLED | キャンセル |
| NO_SHOW | 欠席 |

### 主な機能

**面接作成時の処理**
- 面接官の予定重複チェック
- 候補者・面接官への通知メール送信（オプション）
- 監査ログの記録

**面接更新時の処理**
- 予定状態の面接のみ更新可能
- 変更通知メール送信（オプション）
- 監査ログの記録

**カレンダー機能**
- 日/週/月表示に対応
- 面接官でのフィルタリング
- カレンダーイベント形式でのレスポンス

## リマインダージョブ

### 概要

Bull + Redisを使用したジョブキュー管理により、面接24時間前にリマインダーメールを送信します。

### 機能

**自動リマインダー**
- 1時間ごとに24時間後の面接をスキャン
- 面接官と候補者の両方にリマインダー送信
- リマインダー送信済みフラグで重複送信を防止

**手動リマインダー**
- 管理者が任意のタイミングでリマインダーを送信可能

**ジョブ管理**
- 最大3回のリトライ（指数バックオフ）
- 完了ジョブは100件まで保持
- 失敗ジョブは50件まで保持
- キュー統計情報の取得

### 使用方法

```typescript
import { initializeJobs, sendManualReminder, getQueueStats } from './jobs';

// アプリケーション起動時にジョブを初期化
initializeJobs();

// 手動でリマインダーを送信
await sendManualReminder('interview-uuid');

// キュー統計を取得
const stats = await getQueueStats();
console.log(stats);
// { waiting: 0, active: 0, completed: 10, failed: 0, delayed: 5 }
```

## 権限管理

### アクセス制御

| ロール | 閲覧 | 作成 | 編集 | 削除 |
|--------|------|------|------|------|
| SYSTEM_ADMIN | 全社 | ○ | ○ | ○ |
| COMPANY_ADMIN | 自社のみ | ○ | ○ | ○ |
| COMPANY_USER | 自社のみ | ○ | 自分のコメントのみ | 自分のコメントのみ |
| GENERAL_USER | × | × | × | × |

### 特記事項

- 面接コメントの編集・削除は作成者のみ可能（COMPANY_ADMIN以上は削除のみ可能）
- 面接スケジュールの更新は予定状態（SCHEDULED）の面接のみ可能
- 会社間のデータアクセスは厳密に制限

## 監査ログ

すべての操作は監査ログに記録されます。

| 操作 | エンティティタイプ |
|------|-------------------|
| コメント作成 | InterviewComment |
| コメント更新 | InterviewComment |
| コメント削除 | InterviewComment |
| 面接作成 | Interview |
| 面接更新 | Interview |
| 面接ステータス更新 | Interview |
| 面接キャンセル | Interview |
| メール送信 | EmailNotification |

## 通知メール

### 面接スケジュール通知

**候補者向け**
- 面接日時、形式、場所/会議URL
- 面接官名

**面接官向け**
- 面接日時、形式、場所/会議URL
- 候補者名、応募職種

### リマインダー通知

面接24時間前に以下の情報を含むリマインダーを送信します。

- 面接日時
- 所要時間
- 面接形式
- 場所/会議URL
- 候補者/面接官情報

## 依存パッケージ

```json
{
  "bull": "^4.x",
  "@types/bull": "^4.x"
}
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| REDIS_URL | Redisサーバーの接続URL | redis://localhost:6379 |

## 今後の拡張予定

1. **Googleカレンダー連携**: 面接スケジュールをGoogleカレンダーに自動同期
2. **Slack通知**: リマインダーをSlackにも送信
3. **面接評価テンプレート**: 構造化された評価項目の追加
4. **AIによるコメント分析**: 面接コメントからの自動特徴抽出
