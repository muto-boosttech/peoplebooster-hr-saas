'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  className?: string;
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  isLoading = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={cn(
                  'flex items-center text-xs font-medium',
                  trend.isPositive === true && 'text-green-600',
                  trend.isPositive === false && 'text-red-600',
                  trend.isPositive === undefined && 'text-muted-foreground'
                )}
              >
                {trend.isPositive === true && <TrendingUp className="mr-1 h-3 w-3" />}
                {trend.isPositive === false && <TrendingDown className="mr-1 h-3 w-3" />}
                {trend.isPositive === undefined && <Minus className="mr-1 h-3 w-3" />}
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
                {trend.label && <span className="ml-1">{trend.label}</span>}
              </span>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Grid of stat cards
interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Mini stat card (for inline display)
interface MiniStatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export function MiniStat({ label, value, icon, className }: MiniStatProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-3', className)}>
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// Progress stat card (with progress bar)
interface ProgressStatCardProps {
  title: string;
  value: number;
  max: number;
  unit?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  progressColor?: string;
}

export function ProgressStatCard({
  title,
  value,
  max,
  unit = '',
  description,
  icon,
  className,
  progressColor = 'bg-primary',
}: ProgressStatCardProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">
            / {max}
            {unit}
          </span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-secondary">
          <div
            className={cn('h-2 rounded-full transition-all', progressColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {description && (
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Comparison stat card (for before/after or two values)
interface ComparisonStatCardProps {
  title: string;
  value1: { label: string; value: string | number };
  value2: { label: string; value: string | number };
  icon?: React.ReactNode;
  className?: string;
}

export function ComparisonStatCard({
  title,
  value1,
  value2,
  icon,
  className,
}: ComparisonStatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{value1.label}</p>
            <p className="text-xl font-bold">{value1.value}</p>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{value2.label}</p>
            <p className="text-xl font-bold">{value2.value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
