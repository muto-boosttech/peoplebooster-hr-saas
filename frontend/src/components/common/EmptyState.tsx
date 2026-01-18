'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FileQuestion,
  Users,
  Search,
  Inbox,
  Calendar,
  FileText,
  BarChart3,
} from 'lucide-react';

type EmptyStateVariant =
  | 'default'
  | 'search'
  | 'users'
  | 'candidates'
  | 'calendar'
  | 'reports'
  | 'data';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
  }
> = {
  default: {
    icon: <Inbox className="h-12 w-12" />,
    title: 'データがありません',
    description: 'まだデータが登録されていません。',
  },
  search: {
    icon: <Search className="h-12 w-12" />,
    title: '検索結果がありません',
    description: '検索条件に一致するデータが見つかりませんでした。',
  },
  users: {
    icon: <Users className="h-12 w-12" />,
    title: 'ユーザーがいません',
    description: 'まだユーザーが登録されていません。',
  },
  candidates: {
    icon: <Users className="h-12 w-12" />,
    title: '候補者がいません',
    description: 'まだ候補者が登録されていません。',
  },
  calendar: {
    icon: <Calendar className="h-12 w-12" />,
    title: '予定がありません',
    description: 'この期間に予定はありません。',
  },
  reports: {
    icon: <FileText className="h-12 w-12" />,
    title: 'レポートがありません',
    description: 'まだレポートが生成されていません。',
  },
  data: {
    icon: <BarChart3 className="h-12 w-12" />,
    title: 'データがありません',
    description: '表示するデータがありません。',
  },
};

export function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">
        {icon || config.icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title || config.title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {description || config.description}
      </p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

// No search results variant
interface NoSearchResultsProps {
  searchTerm?: string;
  onClear?: () => void;
}

export function NoSearchResults({ searchTerm, onClear }: NoSearchResultsProps) {
  return (
    <EmptyState
      variant="search"
      description={
        searchTerm
          ? `「${searchTerm}」に一致する結果が見つかりませんでした。`
          : '検索条件に一致するデータが見つかりませんでした。'
      }
      action={
        onClear
          ? {
              label: '検索をクリア',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

// Error state
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'エラーが発生しました',
  description = 'データの取得中にエラーが発生しました。',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-4 text-red-600">
        <FileQuestion className="h-12 w-12" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          再試行
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
