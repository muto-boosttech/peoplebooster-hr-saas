'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Brain,
  Target,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadarChart } from '@/components/charts/RadarChart';

// Types
interface DiagnosisStatus {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progress?: number;
  completedAt?: string;
  currentPage?: number;
  totalPages?: number;
}

interface DiagnosisSummary {
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  personalityType: string;
  personalityDescription: string;
  strengths: string[];
  growthAreas: string[];
}

interface ExternalDiagnosisStatus {
  name: string;
  status: 'NOT_STARTED' | 'COMPLETED';
  completedAt?: string;
}

// Mock data fetching functions
const fetchDiagnosisStatus = async (): Promise<DiagnosisStatus> => {
  // Simulate different states - change this to test different views
  return {
    status: 'COMPLETED',
    completedAt: '2026-01-15T10:30:00Z',
  };
  // For in-progress state:
  // return {
  //   status: 'IN_PROGRESS',
  //   progress: 65,
  //   currentPage: 13,
  //   totalPages: 20,
  // };
  // For not started state:
  // return {
  //   status: 'NOT_STARTED',
  // };
};

const fetchDiagnosisSummary = async (): Promise<DiagnosisSummary | null> => {
  return {
    bigFive: {
      openness: 78,
      conscientiousness: 82,
      extraversion: 65,
      agreeableness: 75,
      neuroticism: 42,
    },
    personalityType: 'アナリスト型',
    personalityDescription:
      '論理的思考と分析力に優れ、複雑な問題を体系的に解決することを得意とします。データに基づいた意思決定を好み、正確性と効率性を重視します。',
    strengths: ['論理的思考力', '問題解決能力', '計画性', '正確性'],
    growthAreas: ['柔軟性', 'コミュニケーション', '感情表現'],
  };
};

const fetchExternalDiagnosisStatus = async (): Promise<ExternalDiagnosisStatus[]> => {
  return [
    { name: 'ストレングスファインダー', status: 'COMPLETED', completedAt: '2026-01-10' },
    { name: 'MBTI', status: 'NOT_STARTED' },
    { name: 'エニアグラム', status: 'NOT_STARTED' },
  ];
};

export function GeneralUserDashboard() {
  // Fetch data
  const { data: diagnosisStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['diagnosis-status'],
    queryFn: fetchDiagnosisStatus,
  });

  const { data: diagnosisSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['diagnosis-summary'],
    queryFn: fetchDiagnosisSummary,
    enabled: diagnosisStatus?.status === 'COMPLETED',
  });

  const { data: externalStatus, isLoading: isLoadingExternal } = useQuery({
    queryKey: ['external-diagnosis-status'],
    queryFn: fetchExternalDiagnosisStatus,
  });

  // Format radar chart data
  const radarData = diagnosisSummary
    ? [
        { trait: '開放性', value: diagnosisSummary.bigFive.openness },
        { trait: '誠実性', value: diagnosisSummary.bigFive.conscientiousness },
        { trait: '外向性', value: diagnosisSummary.bigFive.extraversion },
        { trait: '協調性', value: diagnosisSummary.bigFive.agreeableness },
        { trait: '情緒安定性', value: 100 - diagnosisSummary.bigFive.neuroticism },
      ]
    : [];

  // Render diagnosis status card
  const renderDiagnosisStatusCard = () => {
    if (isLoadingStatus) {
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      );
    }

    if (!diagnosisStatus) return null;

    switch (diagnosisStatus.status) {
      case 'NOT_STARTED':
        return (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <ClipboardCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">診断を開始しましょう</h3>
              <p className="mb-6 max-w-md text-center text-muted-foreground">
                あなたの性格特性や強みを分析する診断を受けてみましょう。
                所要時間は約15〜20分です。
              </p>
              <Button size="lg" asChild>
                <Link href="/survey/1">
                  診断を開始
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );

      case 'IN_PROGRESS':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                診断進行中
              </CardTitle>
              <CardDescription>
                診断を途中で中断しています。続きから再開できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>進捗状況</span>
                  <span className="font-medium">
                    {diagnosisStatus.currentPage}/{diagnosisStatus.totalPages}ページ
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${diagnosisStatus.progress}%` }}
                  />
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href={`/survey/${diagnosisStatus.currentPage}`}>
                  診断を再開
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );

      case 'COMPLETED':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                診断完了
              </CardTitle>
              <CardDescription>
                {diagnosisStatus.completedAt &&
                  `${new Date(diagnosisStatus.completedAt).toLocaleDateString('ja-JP')}に完了`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/diagnosis/result">
                  詳細な結果を見る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">マイページ</h1>
        <p className="text-muted-foreground">診断結果と自己分析を確認できます</p>
      </div>

      {/* Diagnosis Status */}
      {renderDiagnosisStatusCard()}

      {/* Diagnosis Summary (only shown if completed) */}
      {diagnosisStatus?.status === 'COMPLETED' && (
        <>
          {/* Summary Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Big Five Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  ビッグファイブ分析
                </CardTitle>
                <CardDescription>5つの性格特性の分析結果</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : diagnosisSummary ? (
                  <RadarChart
                    data={radarData}
                    dataKey="value"
                    nameKey="trait"
                    height={300}
                    showTooltip
                    color="hsl(221.2 83.2% 53.3%)"
                  />
                ) : null}
              </CardContent>
            </Card>

            {/* Personality Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  パーソナリティタイプ
                </CardTitle>
                <CardDescription>あなたの性格タイプ</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : diagnosisSummary ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold">{diagnosisSummary.personalityType}</h3>
                    </div>
                    <p className="text-muted-foreground">
                      {diagnosisSummary.personalityDescription}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="mb-2 font-medium text-green-600">強み</h4>
                        <ul className="space-y-1">
                          {diagnosisSummary.strengths.map((strength, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-2 font-medium text-orange-600">成長領域</h4>
                        <ul className="space-y-1">
                          {diagnosisSummary.growthAreas.map((area, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              {area}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* External Diagnosis Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                外部診断入力状況
              </CardTitle>
              <CardDescription>
                他の診断結果を入力すると、より詳細な分析が可能になります
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingExternal ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : externalStatus ? (
                <div className="space-y-3">
                  {externalStatus.map((diagnosis) => (
                    <div
                      key={diagnosis.name}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        {diagnosis.status === 'COMPLETED' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{diagnosis.name}</p>
                          {diagnosis.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(diagnosis.completedAt).toLocaleDateString('ja-JP')}に入力
                            </p>
                          )}
                        </div>
                      </div>
                      {diagnosis.status === 'NOT_STARTED' && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/diagnosis/external/${diagnosis.name.toLowerCase()}`}>
                            入力する
                          </Link>
                        </Button>
                      )}
                      {diagnosis.status === 'COMPLETED' && (
                        <Badge variant="outline" className="text-green-600">
                          入力済み
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/diagnosis/result">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">診断結果を確認</p>
                <p className="text-sm text-muted-foreground">詳細な分析結果を見る</p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/settings/profile">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-green-500/10 p-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">プロフィール設定</p>
                <p className="text-sm text-muted-foreground">個人情報を更新</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default GeneralUserDashboard;
