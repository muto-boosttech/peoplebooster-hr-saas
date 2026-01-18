'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard, StatGrid } from '@/components/common/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/common/StatusBadge';

// Types
interface UserStats {
  assignedCandidates: number;
  todayInterviews: number;
  pendingActions: number;
  completedInterviews: number;
}

interface TodayInterview {
  id: string;
  candidateName: string;
  position: string;
  scheduledAt: string;
  type: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface ActionRequiredCandidate {
  id: string;
  name: string;
  position: string;
  status: string;
  actionType: 'feedback' | 'schedule' | 'review';
  dueDate?: string;
}

// Mock data fetching functions
const fetchUserStats = async (): Promise<UserStats> => {
  return {
    assignedCandidates: 12,
    todayInterviews: 3,
    pendingActions: 5,
    completedInterviews: 28,
  };
};

const fetchTodayInterviews = async (): Promise<TodayInterview[]> => {
  return [
    {
      id: '1',
      candidateName: '山田 太郎',
      position: 'バックエンドエンジニア',
      scheduledAt: '2026-01-17T14:00:00Z',
      type: 'VIDEO',
      status: 'SCHEDULED',
    },
    {
      id: '2',
      candidateName: '鈴木 一郎',
      position: 'プロダクトマネージャー',
      scheduledAt: '2026-01-17T16:00:00Z',
      type: 'IN_PERSON',
      status: 'SCHEDULED',
    },
    {
      id: '3',
      candidateName: '高橋 美咲',
      position: 'UIデザイナー',
      scheduledAt: '2026-01-17T10:00:00Z',
      type: 'VIDEO',
      status: 'COMPLETED',
    },
  ];
};

const fetchActionRequiredCandidates = async (): Promise<ActionRequiredCandidate[]> => {
  return [
    {
      id: '1',
      name: '高橋 美咲',
      position: 'UIデザイナー',
      status: 'FIRST_INTERVIEW',
      actionType: 'feedback',
      dueDate: '2026-01-18',
    },
    {
      id: '2',
      name: '伊藤 健太',
      position: 'フロントエンドエンジニア',
      status: 'DOCUMENT_SCREENING',
      actionType: 'review',
    },
    {
      id: '3',
      name: '渡辺 さくら',
      position: 'データアナリスト',
      status: 'SECOND_INTERVIEW',
      actionType: 'schedule',
    },
    {
      id: '4',
      name: '中村 翔太',
      position: 'インフラエンジニア',
      status: 'FIRST_INTERVIEW',
      actionType: 'feedback',
      dueDate: '2026-01-19',
    },
    {
      id: '5',
      name: '小林 真由',
      position: 'マーケティング',
      status: 'DOCUMENT_SCREENING',
      actionType: 'review',
    },
  ];
};

export function CompanyUserDashboard() {
  // Fetch data
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStats,
  });

  const { data: todayInterviews, isLoading: isLoadingInterviews } = useQuery({
    queryKey: ['today-interviews'],
    queryFn: fetchTodayInterviews,
  });

  const { data: actionCandidates, isLoading: isLoadingActions } = useQuery({
    queryKey: ['action-required-candidates'],
    queryFn: fetchActionRequiredCandidates,
  });

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get interview type label
  const getInterviewTypeLabel = (type: TodayInterview['type']) => {
    const labels = {
      VIDEO: 'ビデオ',
      IN_PERSON: '対面',
      PHONE: '電話',
    };
    return labels[type];
  };

  // Get action type info
  const getActionTypeInfo = (actionType: ActionRequiredCandidate['actionType']) => {
    const info = {
      feedback: {
        label: 'フィードバック入力',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: MessageSquare,
      },
      schedule: {
        label: '面接日程調整',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: Calendar,
      },
      review: {
        label: '書類確認',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        icon: UserCheck,
      },
    };
    return info[actionType];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground">担当候補者と今日の予定を確認できます</p>
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
            title="担当候補者"
            value={stats.assignedCandidates}
            description="名"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="今日の面接"
            value={stats.todayInterviews}
            description="件"
            icon={<Calendar className="h-4 w-4" />}
          />
          <StatCard
            title="アクション待ち"
            value={stats.pendingActions}
            description="件"
            icon={<AlertCircle className="h-4 w-4" />}
          />
          <StatCard
            title="完了した面接"
            value={stats.completedInterviews}
            description="件（今月）"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </StatGrid>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Interviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                今日の面接
              </CardTitle>
              <CardDescription>本日予定されている面接</CardDescription>
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
            ) : todayInterviews && todayInterviews.length > 0 ? (
              <div className="space-y-3">
                {todayInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      interview.status === 'COMPLETED' ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{interview.candidateName}</p>
                        <p className="text-sm text-muted-foreground">{interview.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">{formatTime(interview.scheduledAt)}</p>
                        <Badge variant="outline" className="text-xs">
                          {getInterviewTypeLabel(interview.type)}
                        </Badge>
                      </div>
                      {interview.status === 'COMPLETED' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Button size="sm" asChild>
                          <Link href={`/ats/interviews/${interview.id}`}>参加</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>今日の面接予定はありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Required Candidates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                アクション必要
              </CardTitle>
              <CardDescription>対応が必要な候補者</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ats/candidates?filter=action_required">
                すべて見る
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingActions ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : actionCandidates && actionCandidates.length > 0 ? (
              <div className="space-y-3">
                {actionCandidates.slice(0, 5).map((candidate) => {
                  const actionInfo = getActionTypeInfo(candidate.actionType);
                  const ActionIcon = actionInfo.icon;
                  return (
                    <Link
                      key={candidate.id}
                      href={`/ats/candidates/${candidate.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>{candidate.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground">{candidate.position}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${actionInfo.bgColor} ${actionInfo.color}`}
                            >
                              <ActionIcon className="h-3 w-3" />
                              {actionInfo.label}
                            </div>
                            {candidate.dueDate && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                期限: {new Date(candidate.dueDate).toLocaleDateString('ja-JP')}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>アクションが必要な候補者はいません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/ats/candidates">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">担当候補者一覧</p>
                <p className="text-sm text-muted-foreground">担当している候補者を確認</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/ats/interviews/calendar">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-green-500/10 p-3">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">面接カレンダー</p>
                <p className="text-sm text-muted-foreground">スケジュールを確認</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default CompanyUserDashboard;
