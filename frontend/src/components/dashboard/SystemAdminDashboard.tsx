'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Server,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard, StatGrid } from '@/components/common/StatCard';
import { LineChart, MultiLineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';

// Types
interface SystemStats {
  activeCompanies: number;
  activeCompaniesChange: number;
  totalUsers: number;
  totalUsersChange: number;
  monthlyDiagnoses: number;
  monthlyDiagnosesChange: number;
  monthlyRevenue: number;
  monthlyRevenueChange: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  target: number;
  [key: string]: string | number;
}

interface RegistrationData {
  month: string;
  companies: number;
  users: number;
  [key: string]: string | number;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

// Mock data fetching functions (replace with actual API calls)
const fetchSystemStats = async (): Promise<SystemStats> => {
  // In production, this would be an API call
  return {
    activeCompanies: 156,
    activeCompaniesChange: 12,
    totalUsers: 2847,
    totalUsersChange: 8.5,
    monthlyDiagnoses: 1234,
    monthlyDiagnosesChange: 15.2,
    monthlyRevenue: 4850000,
    monthlyRevenueChange: 10.3,
  };
};

const fetchRevenueData = async (): Promise<RevenueData[]> => {
  return [
    { month: '8月', revenue: 3200000, target: 3500000 },
    { month: '9月', revenue: 3800000, target: 4000000 },
    { month: '10月', revenue: 4200000, target: 4200000 },
    { month: '11月', revenue: 4500000, target: 4500000 },
    { month: '12月', revenue: 4700000, target: 4800000 },
    { month: '1月', revenue: 4850000, target: 5000000 },
  ];
};

const fetchRegistrationData = async (): Promise<RegistrationData[]> => {
  return [
    { month: '8月', companies: 8, users: 145 },
    { month: '9月', companies: 12, users: 210 },
    { month: '10月', companies: 15, users: 280 },
    { month: '11月', companies: 10, users: 195 },
    { month: '12月', companies: 18, users: 320 },
    { month: '1月', companies: 14, users: 265 },
  ];
};

const fetchSystemAlerts = async (): Promise<SystemAlert[]> => {
  return [
    {
      id: '1',
      type: 'warning',
      title: 'ストレージ使用量警告',
      message: 'ストレージ使用量が80%を超えました',
      timestamp: '2026-01-17T10:30:00Z',
    },
    {
      id: '2',
      type: 'info',
      title: '定期メンテナンス予定',
      message: '1月20日 2:00-4:00 にメンテナンスを実施します',
      timestamp: '2026-01-16T09:00:00Z',
    },
  ];
};

export function SystemAdminDashboard() {
  // Fetch data
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: fetchSystemStats,
  });

  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ['revenue-data'],
    queryFn: fetchRevenueData,
  });

  const { data: registrationData, isLoading: isLoadingRegistration } = useQuery({
    queryKey: ['registration-data'],
    queryFn: fetchRegistrationData,
  });

  const { data: alerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: fetchSystemAlerts,
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">システム管理ダッシュボード</h1>
        <p className="text-muted-foreground">システム全体の状況を確認できます</p>
      </div>

      {/* Stats Grid */}
      {isLoadingStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <StatGrid columns={4}>
          <StatCard
            title="アクティブ企業数"
            value={stats.activeCompanies}
            trend={{ value: stats.activeCompaniesChange, isPositive: stats.activeCompaniesChange > 0 }}
            icon={<Building2 className="h-4 w-4" />}
          />
          <StatCard
            title="総ユーザー数"
            value={stats.totalUsers.toLocaleString()}
            trend={{ value: stats.totalUsersChange, isPositive: stats.totalUsersChange > 0 }}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="月間診断完了数"
            value={stats.monthlyDiagnoses.toLocaleString()}
            trend={{ value: stats.monthlyDiagnosesChange, isPositive: stats.monthlyDiagnosesChange > 0 }}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <StatCard
            title="月間売上"
            value={formatCurrency(stats.monthlyRevenue)}
            trend={{ value: stats.monthlyRevenueChange, isPositive: stats.monthlyRevenueChange > 0 }}
            icon={<DollarSign className="h-4 w-4" />}
          />
        </StatGrid>
      ) : null}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              売上推移
            </CardTitle>
            <CardDescription>月次売上と目標の比較</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRevenue ? (
              <Skeleton className="h-[300px] w-full" />
            ) : revenueData ? (
              <MultiLineChart
                data={revenueData}
                lines={[
                  { key: 'revenue', name: '売上', color: 'hsl(221.2 83.2% 53.3%)' },
                  { key: 'target', name: '目標', color: 'hsl(var(--muted-foreground))' },
                ]}
                xAxisKey="month"
                height={300}
                showGrid
                showTooltip
                showLegend
              />
            ) : null}
          </CardContent>
        </Card>

        {/* Registration Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              新規登録推移
            </CardTitle>
            <CardDescription>企業・ユーザーの新規登録数</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRegistration ? (
              <Skeleton className="h-[300px] w-full" />
            ) : registrationData ? (
              <BarChart
                data={registrationData}
                dataKey="users"
                xAxisKey="month"
                height={300}
                showGrid
                showTooltip
                color="hsl(142.1 76.2% 36.3%)"
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            システムアラート
          </CardTitle>
          <CardDescription>システムの状態と通知</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAlerts ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-lg border p-4 ${
                    alert.type === 'error'
                      ? 'border-destructive/50 bg-destructive/10'
                      : alert.type === 'warning'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-blue-500/50 bg-blue-500/10'
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 shrink-0 ${
                      alert.type === 'error'
                        ? 'text-destructive'
                        : alert.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{alert.title}</p>
                      <Badge
                        variant={
                          alert.type === 'error'
                            ? 'destructive'
                            : alert.type === 'warning'
                            ? 'outline'
                            : 'secondary'
                        }
                      >
                        {alert.type === 'error'
                          ? 'エラー'
                          : alert.type === 'warning'
                          ? '警告'
                          : '情報'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>現在アラートはありません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日の診断完了</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">前日比 +12%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">アクティブセッション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">現在オンライン</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API呼び出し</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.4K</div>
            <p className="text-xs text-muted-foreground">過去24時間</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SystemAdminDashboard;
