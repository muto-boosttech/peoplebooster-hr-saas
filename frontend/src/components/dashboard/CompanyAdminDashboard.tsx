'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users,
  ClipboardCheck,
  UserCheck,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatCard, StatGrid, ProgressStatCard } from '@/components/common/StatCard';
import { DonutChart } from '@/components/charts/PieChart';
import { BarChart } from '@/components/charts/BarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Types
interface CompanyStats {
  diagnosisCompletionRate: number;
  totalEmployees: number;
  completedDiagnoses: number;
  pendingDiagnoses: number;
  candidatesInPipeline: number;
  interviewsThisWeek: number;
  planUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface PipelineData {
  stage: string;
  count: number;
  color: string;
}

interface Interview {
  id: string;
  candidateName: string;
  position: string;
  scheduledAt: string;
  type: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  interviewer: string;
}

interface OrganizationTrend {
  trait: string;
  average: number;
  benchmark: number;
}

// Mock data fetching functions
const fetchCompanyStats = async (): Promise<CompanyStats> => {
  return {
    diagnosisCompletionRate: 78,
    totalEmployees: 156,
    completedDiagnoses: 122,
    pendingDiagnoses: 34,
    candidatesInPipeline: 45,
    interviewsThisWeek: 12,
    planUsage: {
      used: 85,
      total: 100,
      percentage: 85,
    },
  };
};

const fetchPipelineData = async (): Promise<PipelineData[]> => {
  return [
    { stage: '書類選考', count: 15, color: 'hsl(221.2 83.2% 53.3%)' },
    { stage: '一次面接', count: 12, color: 'hsl(262.1 83.3% 57.8%)' },
    { stage: '二次面接', count: 8, color: 'hsl(142.1 76.2% 36.3%)' },
    { stage: '最終面接', count: 5, color: 'hsl(24.6 95% 53.1%)' },
    { stage: 'オファー', count: 3, color: 'hsl(346.8 77.2% 49.8%)' },
    { stage: '内定', count: 2, color: 'hsl(199.4 95.5% 53.8%)' },
  ];
};

const fetchUpcomingInterviews = async (): Promise<Interview[]> => {
  return [
    {
      id: '1',
      candidateName: '山田 太郎',
      position: 'バックエンドエンジニア',
      scheduledAt: '2026-01-17T14:00:00Z',
      type: 'VIDEO',
      interviewer: '佐藤 花子',
    },
    {
      id: '2',
      candidateName: '鈴木 一郎',
      position: 'プロダクトマネージャー',
      scheduledAt: '2026-01-17T16:00:00Z',
      type: 'IN_PERSON',
      interviewer: '田中 次郎',
    },
    {
      id: '3',
      candidateName: '高橋 美咲',
      position: 'UIデザイナー',
      scheduledAt: '2026-01-18T10:00:00Z',
      type: 'VIDEO',
      interviewer: '佐藤 花子',
    },
    {
      id: '4',
      candidateName: '伊藤 健太',
      position: 'フロントエンドエンジニア',
      scheduledAt: '2026-01-18T14:00:00Z',
      type: 'VIDEO',
      interviewer: '山本 三郎',
    },
  ];
};

const fetchOrganizationTrends = async (): Promise<OrganizationTrend[]> => {
  return [
    { trait: '開放性', average: 72, benchmark: 65 },
    { trait: '誠実性', average: 78, benchmark: 70 },
    { trait: '外向性', average: 65, benchmark: 60 },
    { trait: '協調性', average: 80, benchmark: 72 },
    { trait: '神経症傾向', average: 45, benchmark: 50 },
  ];
};

// Progress component (simple implementation)
function SimpleProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function CompanyAdminDashboard() {
  // Fetch data
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['company-stats'],
    queryFn: fetchCompanyStats,
  });

  const { data: pipelineData, isLoading: isLoadingPipeline } = useQuery({
    queryKey: ['pipeline-data'],
    queryFn: fetchPipelineData,
  });

  const { data: interviews, isLoading: isLoadingInterviews } = useQuery({
    queryKey: ['upcoming-interviews'],
    queryFn: fetchUpcomingInterviews,
  });

  const { data: trends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['organization-trends'],
    queryFn: fetchOrganizationTrends,
  });

  // Format date
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get interview type label
  const getInterviewTypeLabel = (type: Interview['type']) => {
    const labels = {
      VIDEO: 'ビデオ',
      IN_PERSON: '対面',
      PHONE: '電話',
    };
    return labels[type];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <p className="text-muted-foreground">組織の状況と採用活動を確認できます</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/ats/candidates">
              候補者一覧
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
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
          <ProgressStatCard
            title="診断完了率"
            value={stats.diagnosisCompletionRate}
            max={100}
            unit="%"
            description={`${stats.completedDiagnoses}/${stats.totalEmployees}名完了`}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <StatCard
            title="採用パイプライン"
            value={stats.candidatesInPipeline}
            description="候補者"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="今週の面接"
            value={stats.interviewsThisWeek}
            description="件予定"
            icon={<Calendar className="h-4 w-4" />}
          />
          <ProgressStatCard
            title="診断枠利用状況"
            value={stats.planUsage.used}
            max={stats.planUsage.total}
            unit="枠"
            description={`残り${stats.planUsage.total - stats.planUsage.used}枠`}
            icon={<UserCheck className="h-4 w-4" />}
          />
        </StatGrid>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recruitment Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              採用パイプライン
            </CardTitle>
            <CardDescription>選考ステージ別の候補者数</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPipeline ? (
              <Skeleton className="h-[250px] w-full" />
            ) : pipelineData ? (
              <div className="space-y-4">
                {pipelineData.map((stage) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{stage.stage}</span>
                      <span className="font-medium">{stage.count}名</span>
                    </div>
                    <SimpleProgress
                      value={(stage.count / Math.max(...pipelineData.map((s) => s.count))) * 100}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Organization Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              組織の傾向サマリー
            </CardTitle>
            <CardDescription>ビッグファイブ特性の平均値</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <Skeleton className="h-[250px] w-full" />
            ) : trends ? (
              <div className="space-y-4">
                {trends.map((trend) => (
                  <div key={trend.trait} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{trend.trait}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trend.average}</span>
                        <span className="text-xs text-muted-foreground">
                          (業界平均: {trend.benchmark})
                        </span>
                        {trend.average > trend.benchmark ? (
                          <Badge variant="outline" className="text-green-600">
                            +{trend.average - trend.benchmark}
                          </Badge>
                        ) : trend.average < trend.benchmark ? (
                          <Badge variant="outline" className="text-red-600">
                            {trend.average - trend.benchmark}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute h-full bg-primary transition-all"
                        style={{ width: `${trend.average}%` }}
                      />
                      <div
                        className="absolute h-full w-0.5 bg-muted-foreground"
                        style={{ left: `${trend.benchmark}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Interviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              今週の面接予定
            </CardTitle>
            <CardDescription>直近の面接スケジュール</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/ats/interviews">
              すべて見る
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingInterviews ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : interviews && interviews.length > 0 ? (
            <div className="space-y-3">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {interview.candidateName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{interview.candidateName}</p>
                      <p className="text-sm text-muted-foreground">{interview.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDateTime(interview.scheduledAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        面接官: {interview.interviewer}
                      </p>
                    </div>
                    <Badge variant="outline">{getInterviewTypeLabel(interview.type)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>今週の面接予定はありません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/diagnosis">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">診断を依頼</p>
                <p className="text-sm text-muted-foreground">新しい診断を開始</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/ats/candidates/new">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-green-500/10 p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">候補者を追加</p>
                <p className="text-sm text-muted-foreground">新しい候補者を登録</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/reports">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-purple-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">レポートを作成</p>
                <p className="text-sm text-muted-foreground">組織分析レポート</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default CompanyAdminDashboard;
