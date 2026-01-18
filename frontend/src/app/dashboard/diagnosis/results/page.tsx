'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { Brain, Target, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function DiagnosisResultsPage() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <PageLoading text="読み込み中..." />;
  }

  if (!user) {
    return null;
  }

  // サンプルデータ
  const bigFiveResults = [
    { name: '開放性', score: 75, description: '新しい経験や考えに対する好奇心' },
    { name: '誠実性', score: 82, description: '計画性、組織性、責任感' },
    { name: '外向性', score: 65, description: '社交性、活動性、積極性' },
    { name: '協調性', score: 70, description: '他者への思いやり、協力性' },
    { name: '情緒安定性', score: 78, description: 'ストレス耐性、感情の安定性' },
  ];

  const personalityType = {
    type: 'アナリスト型',
    description: '論理的思考と分析力に優れ、複雑な問題を体系的に解決することを得意とします。データに基づいた意思決定を好み、正確性と効率性を重視します。',
    strengths: ['論理的思考力', '問題解決能力', '計画性', '正確性'],
    growthAreas: ['柔軟性', 'コミュニケーション', '感情表現'],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">診断結果</h1>
        <p className="text-gray-600">あなたの性格診断結果の詳細分析</p>
      </div>

      {/* 診断完了ステータス */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-4 py-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">診断完了</p>
            <p className="text-sm text-green-600">2026/1/15に完了</p>
          </div>
        </CardContent>
      </Card>

      {/* パーソナリティタイプ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            パーソナリティタイプ
          </CardTitle>
          <CardDescription>あなたの性格タイプ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {personalityType.type}
            </Badge>
          </div>
          <p className="text-gray-600">{personalityType.description}</p>
          
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                強み
              </h4>
              <div className="flex flex-wrap gap-2">
                {personalityType.strengths.map((strength) => (
                  <Badge key={strength} variant="outline" className="border-green-300 text-green-700">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                成長領域
              </h4>
              <div className="flex flex-wrap gap-2">
                {personalityType.growthAreas.map((area) => (
                  <Badge key={area} variant="outline" className="border-amber-300 text-amber-700">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ビッグファイブ分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ビッグファイブ分析
          </CardTitle>
          <CardDescription>5つの性格特性の分析結果</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {bigFiveResults.map((trait) => (
            <div key={trait.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{trait.name}</span>
                  <p className="text-sm text-gray-500">{trait.description}</p>
                </div>
                <span className="font-bold text-primary-600">{trait.score}%</span>
              </div>
              <Progress value={trait.score} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-4 py-4">
          <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">参考情報</p>
            <p className="text-sm text-amber-700">
              この診断結果はAIによる分析に基づく参考情報です。
              採用や人事評価の唯一の判断基準として使用することは推奨されません。
              人間による総合的な評価と組み合わせてご活用ください。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
