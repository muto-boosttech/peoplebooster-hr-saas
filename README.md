# PeopleBooster

**人と組織の最適なマッチングを科学する** HR SaaS プラットフォーム

## 概要

PeopleBooster は、科学的な性格診断と複数の評価軸を組み合わせることで、求職者の性格傾向を多角的に分析し、組織とのマッチ度を定量化する HR SaaS ソリューションです。

### 主な機能

- **性格診断システム**: 独自の設問セット（90問）による性格特性の分析
- **外部診断連携**: MBTI・動物占いの結果を入力・統合
- **AIブラッシュアップエンジン**: 面接官コメントを学習し診断結果を継続的に更新
- **組織マッチング分析**: チーム適合度や活躍可能性を数値化
- **採用管理（ATS）**: 選考ステータス管理、面接スケジュール調整を一元化

## 技術スタック

### バックエンド
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Redis（セッション管理・キャッシュ）
- JWT認証
- Zod バリデーション
- OpenAPI 3.0

### フロントエンド
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Zustand (状態管理)
- React Hook Form

### インフラ
- Docker + Docker Compose
- PostgreSQL 15
- Redis 7

### 外部サービス
- SendGrid（メール送信）
- AWS S3（ファイルストレージ）
- Stripe（決済処理）
- OpenAI（AI機能）

## ディレクトリ構造

```
peoplebooster/
├── backend/
│   ├── src/
│   │   ├── config/          # 設定ファイル
│   │   ├── controllers/     # コントローラー
│   │   ├── middlewares/     # ミドルウェア
│   │   ├── models/          # Prismaモデル
│   │   ├── routes/          # ルーティング
│   │   ├── services/        # ビジネスロジック
│   │   ├── utils/           # ユーティリティ
│   │   ├── validators/      # Zodスキーマ
│   │   └── types/           # 型定義
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── Dockerfile           # 本番用Dockerfile
│   ├── Dockerfile.dev       # 開発用Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/             # App Router
│   │   ├── components/      # コンポーネント
│   │   ├── hooks/           # カスタムフック
│   │   ├── lib/             # ライブラリ
│   │   ├── stores/          # 状態管理
│   │   └── types/           # 型定義
│   ├── Dockerfile           # 本番用Dockerfile
│   ├── Dockerfile.dev       # 開発用Dockerfile
│   └── package.json
├── docker/
│   └── postgres/
│       └── init/            # DB初期化スクリプト
├── docker-compose.yml
├── Makefile
└── package.json
```

## クイックスタート

### 前提条件

- Docker & Docker Compose
- Node.js 18以上（ローカル開発の場合）
- npm 9以上（ローカル開発の場合）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd peoplebooster
```

### 2. 環境変数の設定

```bash
# 環境変数ファイルをコピー
make setup-env
# または
npm run setup:env
```

`.env`ファイルを編集し、必要な環境変数を設定してください。

### 3. Docker環境の起動

```bash
# Docker環境を起動（ホットリロード対応）
make dev-docker
# または
npm run dev:docker
```

### 4. データベースのセットアップ

```bash
# マイグレーション実行
make migrate
# または
npm run db:migrate

# シードデータ投入
make seed
# または
npm run db:seed
```

## アクセスURL

| サービス | URL | 説明 |
|---------|-----|------|
| フロントエンド | http://localhost:3000 | Next.js アプリケーション |
| バックエンドAPI | http://localhost:3001 | Express API サーバー |
| API ドキュメント | http://localhost:3001/api-docs | Swagger UI |
| Adminer | http://localhost:8080 | データベース管理UI |
| Redis Commander | http://localhost:8081 | Redis管理UI |

## テストアカウント

| ロール | メールアドレス | パスワード |
|--------|---------------|-----------|
| システム管理者 | admin@peoplebooster.com | Admin123!@# |
| 企業管理者 | company-admin@demo.com | Company123!@# |
| 企業ユーザー | company-user@demo.com | User123!@# |
| 一般ユーザー | general-user@example.com | General123!@# |

## 開発コマンド

### Makefileを使用（推奨）

```bash
# ヘルプを表示
make help

# Docker環境を起動
make up

# Docker環境を停止
make down

# ログを表示
make logs

# マイグレーション実行
make migrate

# シードデータ投入
make seed

# Prisma Studioを起動
make studio

# テスト実行
make test

# リント実行
make lint

# コードフォーマット
make format
```

### npm scriptsを使用

```bash
# Docker環境を起動（ログ表示付き）
npm run dev:docker

# Docker環境をビルドして起動
npm run dev:docker:build

# Docker環境を停止
npm run docker:down

# バックエンドのログを表示
npm run docker:logs:backend

# フロントエンドのログを表示
npm run docker:logs:frontend

# マイグレーション実行
npm run db:migrate

# シードデータ投入
npm run db:seed

# Prisma Studioを起動
npm run db:studio

# バックエンドコンテナにシェルアクセス
npm run docker:shell:backend

# PostgreSQLにアクセス
npm run docker:shell:postgres

# Redisにアクセス
npm run docker:shell:redis
```

## 環境変数

### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| DATABASE_URL | PostgreSQL接続URL | postgresql://postgres:postgres@localhost:5432/peoplebooster |
| JWT_SECRET | JWTアクセストークン署名キー | 32文字以上のランダム文字列 |
| JWT_REFRESH_SECRET | JWTリフレッシュトークン署名キー | 32文字以上のランダム文字列 |
| REDIS_URL | Redis接続URL | redis://:password@localhost:6379 |

### オプションの環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| SENDGRID_API_KEY | SendGrid APIキー | - |
| AWS_S3_BUCKET | S3バケット名 | - |
| STRIPE_SECRET_KEY | Stripe秘密キー | - |
| OPENAI_API_KEY | OpenAI APIキー | - |

詳細は `.env.example` を参照してください。

## ホットリロード

Docker環境では、以下のディレクトリの変更が自動的に反映されます：

- `backend/src/` - バックエンドのソースコード
- `backend/prisma/` - Prismaスキーマ
- `frontend/src/` - フロントエンドのソースコード
- `frontend/public/` - 静的ファイル

## トラブルシューティング

### Docker環境が起動しない

```bash
# コンテナとボリュームを完全にクリーンアップ
make clean

# イメージを再ビルドして起動
make rebuild
```

### データベース接続エラー

```bash
# PostgreSQLコンテナの状態を確認
docker-compose ps postgres

# PostgreSQLのログを確認
docker-compose logs postgres
```

### ホットリロードが効かない

Dockerのファイル監視に問題がある場合、以下の環境変数が設定されていることを確認：

```
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true
```

## コミット規約

このプロジェクトでは [Conventional Commits](https://www.conventionalcommits.org/) を採用しています。

```
<type>(<scope>): <description>

例:
feat(auth): add login functionality
fix(api): resolve user endpoint error
docs: update README
```

**Types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

## ライセンス

Proprietary - All rights reserved

## お問い合わせ

PeopleBooster Team
