# 候補者管理API（ATS機能）実装レポート

## 概要

PeopleBooster HR SaaSアプリケーションの候補者管理API（ATS: Applicant Tracking System）を実装しました。本APIは採用候補者の登録、管理、選考ステータスの追跡を行う機能を提供します。

## 実装ファイル一覧

| ファイル | 説明 |
|---------|------|
| `src/validators/candidate.validator.ts` | Zodによるバリデーションスキーマとステータス遷移ルール |
| `src/services/candidate.service.ts` | ビジネスロジック層（CRUD操作、ステータス管理、統計） |
| `src/controllers/candidate.controller.ts` | HTTPリクエストハンドラー |
| `src/routes/candidate.routes.ts` | ルーティング定義とOpenAPI仕様 |
| `src/routes/index.ts` | ルートインデックス（候補者ルート追加済み） |

## APIエンドポイント

### 候補者一覧・詳細

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| GET | `/api/candidates` | 候補者一覧取得（フィルタリング、ページネーション対応） | COMPANY_USER以上 |
| GET | `/api/candidates/:id` | 候補者詳細取得 | COMPANY_USER以上 |
| GET | `/api/candidates/statistics` | 統計情報取得 | COMPANY_USER以上 |
| GET | `/api/candidates/status-transitions` | ステータス遷移ルール取得 | 認証済みユーザー |

### 候補者作成・更新・削除

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| POST | `/api/candidates` | 候補者作成（既存ユーザーまたは新規ユーザー） | COMPANY_ADMIN以上 |
| PUT | `/api/candidates/:id` | 候補者情報更新 | COMPANY_ADMIN以上 |
| DELETE | `/api/candidates/:id` | 候補者削除 | COMPANY_ADMIN以上 |

### ステータス・担当者管理

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| PUT | `/api/candidates/:id/status` | ステータス更新 | COMPANY_ADMIN以上 |
| PUT | `/api/candidates/:id/assign` | 担当者割り当て | COMPANY_ADMIN以上 |
| PUT | `/api/candidates/bulk/status` | 一括ステータス更新 | COMPANY_ADMIN以上 |
| PUT | `/api/candidates/bulk/assign` | 一括担当者割り当て | COMPANY_ADMIN以上 |

### タグ管理

| メソッド | エンドポイント | 説明 | 権限 |
|---------|---------------|------|------|
| POST | `/api/candidates/:id/tags` | タグ追加 | COMPANY_ADMIN以上 |
| DELETE | `/api/candidates/:id/tags` | タグ削除 | COMPANY_ADMIN以上 |

## ステータス遷移ルール

候補者のステータスは以下の遷移ルールに従います。

### 標準フロー

```
UNTOUCHED → IN_PROGRESS → COMPLETED → DOCUMENT_SCREENING → FIRST_INTERVIEW → SECOND_INTERVIEW → FINAL_INTERVIEW → OFFER → HIRED
```

### ステータス一覧と表示名

| ステータス | 表示名 | 説明 |
|-----------|--------|------|
| UNTOUCHED | 未対応 | 初期状態、診断未完了 |
| IN_PROGRESS | 対応中 | 診断実施中 |
| COMPLETED | 診断完了 | 診断完了、選考待ち |
| DOCUMENT_SCREENING | 書類選考 | 書類選考中 |
| FIRST_INTERVIEW | 一次面接 | 一次面接段階 |
| SECOND_INTERVIEW | 二次面接 | 二次面接段階 |
| FINAL_INTERVIEW | 最終面接 | 最終面接段階 |
| OFFER | 内定 | 内定提示済み |
| HIRED | 採用 | 採用確定 |
| REJECTED | 不採用 | 選考不通過 |
| WITHDRAWN | 辞退 | 候補者辞退 |
| ON_HOLD | 保留 | 選考一時停止 |

### 遷移ルール詳細

各ステータスから遷移可能なステータスは以下の通りです。

| 現在のステータス | 遷移可能なステータス |
|-----------------|---------------------|
| UNTOUCHED | IN_PROGRESS, REJECTED, WITHDRAWN, ON_HOLD |
| IN_PROGRESS | COMPLETED, REJECTED, WITHDRAWN, ON_HOLD |
| COMPLETED | DOCUMENT_SCREENING, REJECTED, WITHDRAWN, ON_HOLD |
| DOCUMENT_SCREENING | FIRST_INTERVIEW, REJECTED, WITHDRAWN, ON_HOLD |
| FIRST_INTERVIEW | SECOND_INTERVIEW, REJECTED, WITHDRAWN, ON_HOLD |
| SECOND_INTERVIEW | FINAL_INTERVIEW, REJECTED, WITHDRAWN, ON_HOLD |
| FINAL_INTERVIEW | OFFER, REJECTED, WITHDRAWN, ON_HOLD |
| OFFER | HIRED, REJECTED, WITHDRAWN, ON_HOLD |
| HIRED | ON_HOLD（基本的に変更不可） |
| REJECTED | ON_HOLD（基本的に変更不可） |
| WITHDRAWN | ON_HOLD（基本的に変更不可） |
| ON_HOLD | 前のステータスに復帰可能 |

## 主要機能

### 1. 候補者作成

候補者は2つの方法で作成できます。

**既存ユーザーから作成**
```json
{
  "userId": "uuid",
  "appliedPosition": "エンジニア",
  "source": "求人サイト",
  "tags": ["新卒", "技術職"],
  "notes": "メモ",
  "assignedTo": "担当者UUID"
}
```

**新規ユーザーと共に作成**
```json
{
  "email": "candidate@example.com",
  "fullName": "山田太郎",
  "nickname": "太郎",
  "appliedPosition": "エンジニア",
  "source": "求人サイト",
  "tags": ["新卒", "技術職"],
  "notes": "メモ",
  "assignedTo": "担当者UUID"
}
```

新規ユーザー作成時は、仮パスワードが生成され、診断URLがメール送信されます（実際のメール送信は別途実装が必要）。

### 2. フィルタリング・ソート

候補者一覧取得時に以下のパラメータでフィルタリング・ソートが可能です。

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| page | ページ番号 | 1 |
| limit | 1ページあたりの件数（最大100） | 20 |
| status | ステータス（カンマ区切りで複数指定可） | IN_PROGRESS,COMPLETED |
| appliedPosition | 応募職種（部分一致） | エンジニア |
| search | 名前・メール検索 | 山田 |
| assignedTo | 担当者ID | uuid |
| tags | タグ（カンマ区切りで複数指定可） | 新卒,技術職 |
| sortBy | ソート項目 | createdAt, status, appliedPosition, updatedAt |
| sortOrder | ソート順 | asc, desc |

### 3. 統計情報

`GET /api/candidates/statistics` で以下の統計情報を取得できます。

- ステータス別件数
- 今週の新規候補者数
- 今週のステータス変更数
- 応募職種別件数（上位10件）
- アクティブ候補者数（選考中）
- 終了候補者数（採用・不採用・辞退）

### 4. 監査ログ

すべての操作（作成、更新、削除、ステータス変更、担当者変更）は監査ログに記録されます。候補者詳細取得時にステータス変更履歴も取得できます。

### 5. 通知

以下のタイミングで通知が作成されます。

- 担当者割り当て時：担当者に通知
- ステータス変更時：担当者に通知（変更者以外）

## 権限管理

| ロール | 閲覧 | 編集 | 作成 | 削除 |
|--------|------|------|------|------|
| SYSTEM_ADMIN | ○（全社） | ○ | ○ | ○ |
| COMPANY_ADMIN | ○（自社のみ） | ○ | ○ | ○ |
| COMPANY_USER | ○（自社のみ） | × | × | × |
| GENERAL_USER | × | × | × | × |

## レート制限

候補者一覧取得エンドポイントには、15分間で100リクエストのレート制限が設定されています。

## 今後の拡張

以下の機能は今後の実装が必要です。

1. **メール送信機能**: 新規候補者作成時の診断URL送信
2. **ファイルアップロード**: 履歴書・職務経歴書の添付
3. **面接スケジュール管理**: Interview モデルとの連携
4. **面接コメント管理**: InterviewComment モデルとの連携
5. **診断結果との連携**: 候補者詳細に診断結果を表示（実装済み）

## テスト

APIのテストは以下のコマンドで実行できます（テストファイルは別途作成が必要）。

```bash
cd /home/ubuntu/peoplebooster/backend
npm test
```

## 参考

- Prismaスキーマ: `prisma/schema.prisma`
- OpenAPI仕様: ルートファイル内のJSDocコメント
- 認証ミドルウェア: `src/middlewares/auth.middleware.ts`
- 権限ミドルウェア: `src/middlewares/authorize.middleware.ts`
