# PeopleBooster フロントエンド基盤実装レポート

## 概要

PeopleBoosterのNext.js 14フロントエンド基盤を構築しました。App Router、TypeScript、Tailwind CSS、shadcn/ui、React Query、Zustandを使用したモダンなアーキテクチャを採用しています。

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js | 14.x (App Router) |
| 言語 | TypeScript | 5.x |
| スタイリング | Tailwind CSS | 3.x |
| UIコンポーネント | shadcn/ui | - |
| データフェッチング | TanStack Query (React Query) | 5.x |
| 状態管理 | Zustand | 4.x |
| フォーム | React Hook Form + Zod | - |
| HTTPクライアント | Axios | - |

## ディレクトリ構造

```
frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # 一般ユーザーログイン
│   │   └── password-reset/page.tsx # パスワードリセット
│   ├── (dashboard)/
│   │   ├── layout.tsx              # ダッシュボードレイアウト
│   │   ├── page.tsx                # ダッシュボードトップ
│   │   ├── users/                  # ユーザー管理
│   │   ├── companies/              # 企業管理
│   │   ├── diagnosis/              # 診断管理
│   │   ├── ats/
│   │   │   ├── candidates/         # 候補者管理
│   │   │   └── interviews/         # 面接スケジュール
│   │   ├── reports/                # レポート
│   │   ├── billing/                # 請求管理
│   │   └── settings/               # 設定
│   ├── admin/
│   │   └── login/page.tsx          # システム管理者ログイン
│   ├── survey/
│   │   └── [page]/                 # 診断アンケート
│   └── layout.tsx                  # ルートレイアウト
├── components/
│   ├── ui/                         # shadcn/uiコンポーネント
│   ├── layouts/                    # レイアウトコンポーネント
│   └── providers/                  # プロバイダーコンポーネント
├── hooks/
│   ├── useAuth.ts                  # 認証フック
│   ├── useUser.ts                  # ユーザー管理フック
│   ├── useCandidates.ts            # 候補者管理フック
│   └── useToast.ts                 # トースト通知フック
├── lib/
│   ├── api-client.ts               # APIクライアント
│   ├── auth.ts                     # 認証ユーティリティ
│   └── utils.ts                    # ユーティリティ関数
├── stores/
│   ├── auth-store.ts               # 認証状態管理
│   └── ui-store.ts                 # UI状態管理
├── types/
│   └── index.ts                    # 型定義
└── middleware.ts                   # Next.jsミドルウェア
```

## 実装内容

### 1. APIクライアント (`lib/api-client.ts`)

- Axiosインスタンスの設定
- 認証ヘッダーの自動付与（リクエストインターセプター）
- トークンリフレッシュの自動処理（レスポンスインターセプター）
- エラーハンドリングとリダイレクト

```typescript
// 使用例
import { api } from '@/lib/api-client';

const users = await api.get<User[]>('/users');
const newUser = await api.post<User>('/users', userData);
```

### 2. 認証ユーティリティ (`lib/auth.ts`)

- ログイン/ログアウト
- MFA認証
- パスワードリセット
- ロールベースのアクセス制御ヘルパー

### 3. 状態管理

#### 認証ストア (`stores/auth-store.ts`)

```typescript
const { user, isAuthenticated, login, logout, hasRole } = useAuthStore();
```

- ユーザー情報の管理
- 認証状態の永続化（localStorage）
- ロールチェックヘルパー関数

#### UIストア (`stores/ui-store.ts`)

```typescript
const { sidebarCollapsed, theme, toggleSidebar, setTheme } = useUIStore();
```

- サイドバー状態
- テーマ設定
- 通知カウント

### 4. カスタムフック

#### useAuth

```typescript
const {
  user,
  isAuthenticated,
  login,
  logout,
  hasRole,
  isSystemAdmin,
  isCompanyAdmin,
} = useAuth();
```

#### useUsers / useUser

```typescript
const { data: users, isLoading } = useUsers({ page: 1, limit: 10 });
const createUser = useCreateUser();
const updateUser = useUpdateUser();
```

#### useCandidates

```typescript
const { data: candidates } = useCandidates({ status: ['IN_PROGRESS'] });
const updateStatus = useUpdateCandidateStatus();
```

### 5. レイアウトコンポーネント

#### Sidebar

- ロールベースのメニュー表示
- 折りたたみ機能
- レスポンシブ対応

#### Header

- ユーザーメニュー
- 通知ドロップダウン
- テーマ切り替え
- 検索バー

#### PageHeader

- ページタイトル
- パンくずリスト
- アクションボタン

### 6. UIコンポーネント (shadcn/ui)

| コンポーネント | 説明 |
|---------------|------|
| Button | ボタン（複数バリアント） |
| Input | テキスト入力 |
| Label | ラベル |
| Card | カードコンテナ |
| Avatar | アバター画像 |
| DropdownMenu | ドロップダウンメニュー |
| Dialog | モーダルダイアログ |
| Select | セレクトボックス |
| Tabs | タブ切り替え |
| Badge | バッジ |
| Table | テーブル |
| Toast | トースト通知 |
| Skeleton | ローディングスケルトン |
| Separator | 区切り線 |
| ScrollArea | スクロールエリア |

### 7. ミドルウェア (`middleware.ts`)

- 認証チェック
- 公開ルートの定義
- ログインページへのリダイレクト
- ロールベースのルート保護（クライアントサイド）

### 8. ログインページ

#### 一般ユーザーログイン (`/login`)

- メールアドレス/パスワード認証
- MFA対応
- パスワードリセットリンク

#### システム管理者ログイン (`/admin/login`)

- 専用のダークテーマUI
- MFA必須
- 権限チェック

## ロールベースのアクセス制御

| ロール | アクセス可能なページ |
|--------|---------------------|
| SYSTEM_ADMIN | すべてのページ |
| COMPANY_ADMIN | 自社のユーザー管理、候補者管理、請求管理、レポート |
| COMPANY_USER | 候補者管理（閲覧）、診断管理、面接スケジュール |
| GENERAL_USER | 自身の診断結果のみ |

## 環境変数

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 次のステップ

1. 各ページの詳細実装
2. フォームコンポーネントの作成
3. グラフコンポーネント（Chart.js）の統合
4. テストの追加
5. 国際化（i18n）対応

## ファイル一覧

### 新規作成ファイル

- `src/lib/api-client.ts`
- `src/lib/auth.ts`
- `src/stores/auth-store.ts`
- `src/stores/ui-store.ts`
- `src/hooks/useAuth.ts`
- `src/hooks/useUser.ts`
- `src/hooks/useCandidates.ts`
- `src/hooks/useToast.ts`
- `src/hooks/index.ts`
- `src/components/layouts/Sidebar.tsx`
- `src/components/layouts/Header.tsx`
- `src/components/layouts/DashboardLayout.tsx`
- `src/components/layouts/Breadcrumb.tsx`
- `src/components/layouts/PageHeader.tsx`
- `src/components/layouts/index.ts`
- `src/components/providers/Providers.tsx`
- `src/components/ui/*.tsx` (15ファイル)
- `src/middleware.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/password-reset/page.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/page.tsx`
- `src/types/index.ts`

### 更新ファイル

- `src/app/layout.tsx` - Providersの追加
