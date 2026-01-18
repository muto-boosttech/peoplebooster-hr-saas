# PeopleBooster 共通コンポーネント実装レポート

## 概要

PeopleBoosterフロントエンドの共通コンポーネントを実装しました。これらのコンポーネントはshadcn/uiを拡張し、アプリケーション全体で再利用可能な形で設計されています。

## 実装ファイル一覧

### UIコンポーネント（shadcn/ui拡張）

| ファイル | 説明 |
|---------|------|
| `src/components/common/DataTable.tsx` | ソート、フィルタ、ページネーション対応のデータテーブル |
| `src/components/forms/FormField.tsx` | React Hook Form + Zod連携のフォームフィールド |
| `src/components/common/StatusBadge.tsx` | 各種ステータス表示用バッジ |
| `src/components/common/ConfirmDialog.tsx` | 確認ダイアログ |
| `src/components/common/LoadingSpinner.tsx` | ローディング表示 |
| `src/components/common/EmptyState.tsx` | 空状態表示 |
| `src/components/common/StatCard.tsx` | 統計カード |
| `src/components/ui/checkbox.tsx` | チェックボックス |

### チャートコンポーネント

| ファイル | 説明 |
|---------|------|
| `src/components/charts/RadarChart.tsx` | レーダーチャート（ビッグファイブ表示用） |
| `src/components/charts/BarChart.tsx` | 棒グラフ（分布表示用） |
| `src/components/charts/LineChart.tsx` | 折れ線グラフ（時系列データ用） |
| `src/components/charts/PieChart.tsx` | 円グラフ・ドーナツチャート（タイプ分布用） |

## コンポーネント詳細

### 1. DataTable

高機能なデータテーブルコンポーネントです。

**機能:**
- 列のソート（昇順/降順）
- 列の表示/非表示切り替え
- 行の一括選択
- ページネーション
- カスタムセルレンダリング

**使用例:**
```tsx
import { DataTable, Column } from '@/components/common/DataTable';

const columns: Column<User>[] = [
  { key: 'name', header: '名前', sortable: true },
  { key: 'email', header: 'メール' },
  { key: 'status', header: 'ステータス', render: (user) => <StatusBadge status={user.status} /> },
];

<DataTable
  data={users}
  columns={columns}
  pagination={{ page: 1, pageSize: 10, total: 100 }}
  onPageChange={handlePageChange}
  selectable
  onSelectionChange={handleSelectionChange}
/>
```

### 2. FormField

React Hook FormとZodを統合したフォームフィールドコンポーネントです。

**対応入力タイプ:**
- text, email, tel, url, number
- password（表示/非表示トグル付き）
- textarea
- select
- checkbox
- date, datetime-local, time

**使用例:**
```tsx
import { FormField } from '@/components/forms/FormField';

<FormField
  name="email"
  control={form.control}
  type="email"
  label="メールアドレス"
  placeholder="example@example.com"
  required
/>

<FormField
  name="role"
  control={form.control}
  type="select"
  label="ロール"
  options={[
    { value: 'admin', label: '管理者' },
    { value: 'user', label: 'ユーザー' },
  ]}
/>
```

### 3. StatusBadge

各種ステータスを視覚的に表示するバッジコンポーネントです。

**対応ステータス:**
- **CandidateStatus**: 候補者の選考ステータス（12種類）
- **InterviewStatus**: 面接ステータス（4種類）
- **InvoiceStatus**: 請求書ステータス（5種類）
- **UserStatus**: ユーザーステータス（3種類）
- **DiagnosisStatus**: 診断ステータス（3種類）

**使用例:**
```tsx
import { CandidateStatusBadge, InterviewStatusBadge } from '@/components/common/StatusBadge';

<CandidateStatusBadge status="FIRST_INTERVIEW" showIcon />
<InterviewStatusBadge status="SCHEDULED" />
```

### 4. ConfirmDialog

削除確認などの確認ダイアログコンポーネントです。

**バリアント:**
- default: 通常の確認
- danger: 削除などの危険な操作
- warning: 警告
- success: 成功確認

**プリセット:**
- DeleteDialog: 削除確認用
- LogoutDialog: ログアウト確認用
- StatusChangeDialog: ステータス変更確認用

**使用例:**
```tsx
import { DeleteDialog } from '@/components/common/ConfirmDialog';

<DeleteDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  itemName="山田太郎"
  onConfirm={handleDelete}
  isLoading={isDeleting}
/>
```

### 5. チャートコンポーネント

Rechartsを使用したチャートコンポーネント群です。

#### RadarChart / BigFiveRadarChart

ビッグファイブ性格診断結果の表示に最適化されたレーダーチャートです。

```tsx
import { BigFiveRadarChart } from '@/components/charts/RadarChart';

<BigFiveRadarChart
  data={{
    openness: 75,
    conscientiousness: 80,
    extraversion: 65,
    agreeableness: 70,
    neuroticism: 45,
  }}
  title="ビッグファイブ診断結果"
/>
```

#### BarChart / DistributionChart

棒グラフと分布チャートです。水平/垂直レイアウト、スタック表示に対応しています。

```tsx
import { DistributionChart } from '@/components/charts/BarChart';

<DistributionChart
  data={[
    { name: '論理的思考', value: 85 },
    { name: '創造的思考', value: 72 },
    { name: '分析的思考', value: 68 },
  ]}
  title="思考パターン分布"
/>
```

#### LineChart / MultiLineChart / AreaChart

時系列データの表示に適した折れ線グラフです。

```tsx
import { MultiLineChart } from '@/components/charts/LineChart';

<MultiLineChart
  data={monthlyData}
  lines={[
    { key: 'applications', name: '応募数', color: 'blue' },
    { key: 'hires', name: '採用数', color: 'green' },
  ]}
  title="採用トレンド"
/>
```

#### PieChart / DonutChart / TypeDistributionChart

円グラフとドーナツチャートです。タイプ分布の表示に最適化されています。

```tsx
import { TypeDistributionChart } from '@/components/charts/PieChart';

<TypeDistributionChart
  data={[
    { type: 'リーダータイプ', count: 25 },
    { type: 'サポータータイプ', count: 30 },
    { type: 'クリエイタータイプ', count: 20 },
  ]}
  title="タイプ分布"
/>
```

### 6. StatCard

ダッシュボードで使用する統計カードコンポーネントです。

**バリエーション:**
- StatCard: 基本的な統計カード
- MiniStat: コンパクトな統計表示
- ProgressStatCard: プログレスバー付き
- ComparisonStatCard: 比較表示用

**使用例:**
```tsx
import { StatCard, StatGrid, ProgressStatCard } from '@/components/common/StatCard';

<StatGrid columns={4}>
  <StatCard
    title="総候補者数"
    value={150}
    trend={{ value: 12, isPositive: true }}
    icon={<Users className="h-4 w-4" />}
  />
  <ProgressStatCard
    title="診断完了率"
    value={75}
    max={100}
    unit="%"
    description="今月の目標: 80%"
  />
</StatGrid>
```

### 7. LoadingSpinner / EmptyState

ローディング状態と空状態の表示コンポーネントです。

**LoadingSpinnerバリエーション:**
- LoadingSpinner: 基本的なスピナー
- PageLoading: ページ全体のローディング
- InlineLoading: インラインローディング
- ButtonLoading: ボタン内ローディング
- OverlayLoading: オーバーレイローディング

**EmptyStateバリエーション:**
- default, search, users, candidates, calendar, reports, data

## インポート方法

```tsx
// 共通コンポーネント
import { DataTable, StatusBadge, ConfirmDialog, LoadingSpinner, EmptyState, StatCard } from '@/components/common';

// フォームコンポーネント
import { FormField } from '@/components/forms';

// チャートコンポーネント
import { RadarChart, BarChart, LineChart, PieChart } from '@/components/charts';
```

## 技術仕様

- **TypeScript**: 完全な型安全性
- **Tailwind CSS**: スタイリング
- **Recharts**: チャートライブラリ
- **React Hook Form**: フォーム管理
- **Radix UI**: アクセシブルなUIプリミティブ

## コンパイル状況

すべてのコンポーネントはTypeScriptコンパイルチェックをパスしています。
