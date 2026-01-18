import { prisma } from '../models';
import { redisClient } from '../config/redis';

// キャッシュキーのプレフィックス
const CACHE_PREFIX = 'company_analysis';
const CACHE_TTL = 3600; // 1時間

// BigFive因子名
const BIG_FIVE_FACTORS = ['extraversion', 'neuroticism', 'openness', 'agreeableness', 'conscientiousness'] as const;
const BIG_FIVE_LABELS: Record<string, string> = {
  extraversion: '外向性',
  neuroticism: '神経症傾向',
  openness: '開放性',
  agreeableness: '協調性',
  conscientiousness: '誠実性',
};

// 思考パターン名
const THINKING_PATTERNS = ['leader', 'analyst', 'supporter', 'energetic'] as const;
const THINKING_PATTERN_LABELS: Record<string, string> = {
  leader: 'リーダー',
  analyst: 'アナリスト',
  supporter: 'サポーター',
  energetic: 'エネルギッシュ',
};

// 行動パターン名
const BEHAVIOR_PATTERNS = ['efficiency', 'friendliness', 'knowledge', 'appearance', 'challenge'] as const;
const BEHAVIOR_PATTERN_LABELS: Record<string, string> = {
  efficiency: '効率重視',
  friendliness: '友好重視',
  knowledge: '知識重視',
  appearance: '体裁重視',
  challenge: '挑戦重視',
};

// タイプコード
const TYPE_CODES = ['EE', 'EI', 'IE', 'II'] as const;
const TYPE_NAMES: Record<string, string> = {
  EE: '情熱的リーダー型',
  EI: '実行力重視型',
  IE: '思索的クリエイター型',
  II: '分析的専門家型',
};

/**
 * 企業傾向分析サービス
 */
class CompanyAnalysisService {
  /**
   * キャッシュからデータを取得
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    return null;
  }

  /**
   * キャッシュにデータを保存
   */
  private async setToCache(key: string, data: unknown, ttl: number = CACHE_TTL): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * 企業のキャッシュを無効化
   */
  async invalidateCompanyCache(companyId: string): Promise<void> {
    try {
      const keys = await redisClient.keys(`${CACHE_PREFIX}:${companyId}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * 概要分析を取得
   */
  async getOverview(companyId: string): Promise<{
    totalEmployees: number;
    diagnosisCompleted: number;
    completionRate: number;
    lastUpdated: string;
  }> {
    const cacheKey = `${CACHE_PREFIX}:${companyId}:overview`;
    const cached = await this.getFromCache<ReturnType<typeof this.getOverview>>(cacheKey);
    if (cached) return cached;

    // 総従業員数
    const totalEmployees = await prisma.user.count({
      where: {
        companyId,
        isActive: true,
        role: { in: ['COMPANY_ADMIN', 'COMPANY_USER'] },
      },
    });

    // 診断完了者数
    const diagnosisCompleted = await prisma.diagnosisResult.count({
      where: {
        user: {
          companyId,
          isActive: true,
        },
      },
    });

    // 最終更新日時
    const lastDiagnosis = await prisma.diagnosisResult.findFirst({
      where: {
        user: {
          companyId,
        },
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    const result = {
      totalEmployees,
      diagnosisCompleted,
      completionRate: totalEmployees > 0 ? Math.round((diagnosisCompleted / totalEmployees) * 1000) / 10 : 0,
      lastUpdated: lastDiagnosis?.completedAt?.toISOString() || new Date().toISOString(),
    };

    await this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * 思考パターン分析を取得
   */
  async getThinkingPatternAnalysis(companyId: string): Promise<{
    distribution: Record<string, { count: number; percentage: number; label: string }>;
    averages: Record<string, number>;
    dominantPattern: string;
    insights: string[];
  }> {
    const cacheKey = `${CACHE_PREFIX}:${companyId}:thinking-pattern`;
    const cached = await this.getFromCache<ReturnType<typeof this.getThinkingPatternAnalysis>>(cacheKey);
    if (cached) return cached;

    // 診断結果を取得
    const diagnosisResults = await prisma.diagnosisResult.findMany({
      where: {
        user: {
          companyId,
          isActive: true,
        },
      },
      select: {
        thinkingPattern: true,
      },
    });

    // 集計
    const counts: Record<string, number> = {
      leader: 0,
      analyst: 0,
      supporter: 0,
      energetic: 0,
    };
    const sums: Record<string, number> = {
      leader: 0,
      analyst: 0,
      supporter: 0,
      energetic: 0,
    };

    for (const result of diagnosisResults) {
      const pattern = result.thinkingPattern as Record<string, number>;
      if (!pattern) continue;

      // 最も高いパターンをカウント
      let maxPattern = 'leader';
      let maxValue = 0;
      for (const key of THINKING_PATTERNS) {
        const value = pattern[key] || 0;
        sums[key] += value;
        if (value > maxValue) {
          maxValue = value;
          maxPattern = key;
        }
      }
      counts[maxPattern]++;
    }

    const total = diagnosisResults.length;
    const distribution: Record<string, { count: number; percentage: number; label: string }> = {};
    const averages: Record<string, number> = {};

    for (const key of THINKING_PATTERNS) {
      distribution[key] = {
        count: counts[key],
        percentage: total > 0 ? Math.round((counts[key] / total) * 1000) / 10 : 0,
        label: THINKING_PATTERN_LABELS[key],
      };
      averages[key] = total > 0 ? Math.round((sums[key] / total) * 10) / 10 : 50;
    }

    // 最も多いパターン
    const dominantPattern = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    // インサイト生成
    const insights = this.generateThinkingPatternInsights(distribution, averages, dominantPattern);

    const result = {
      distribution,
      averages,
      dominantPattern,
      insights,
    };

    await this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * 思考パターンのインサイトを生成
   */
  private generateThinkingPatternInsights(
    distribution: Record<string, { count: number; percentage: number; label: string }>,
    averages: Record<string, number>,
    dominantPattern: string
  ): string[] {
    const insights: string[] = [];

    // 最も多いパターンについて
    const dominantLabel = THINKING_PATTERN_LABELS[dominantPattern];
    const dominantPercentage = distribution[dominantPattern].percentage;
    insights.push(`貴社は「${dominantLabel}」タイプが${dominantPercentage}%と最も多く、組織の中核を担っています。`);

    // 平均値が高いパターン
    const highAverages = Object.entries(averages)
      .filter(([_, value]) => value > 55)
      .map(([key]) => THINKING_PATTERN_LABELS[key]);
    if (highAverages.length > 0) {
      insights.push(`全体的に${highAverages.join('・')}の傾向が強く、これらの特性を活かした業務設計が効果的です。`);
    }

    // バランスについて
    const percentages = Object.values(distribution).map(d => d.percentage);
    const maxPercentage = Math.max(...percentages);
    const minPercentage = Math.min(...percentages);
    if (maxPercentage - minPercentage < 15) {
      insights.push('思考パターンのバランスが良く、多様な視点からの意思決定が可能な組織です。');
    } else if (maxPercentage > 40) {
      insights.push('特定のパターンに偏りがあるため、異なる視点を持つメンバーの意見を積極的に取り入れることを推奨します。');
    }

    return insights;
  }

  /**
   * 行動パターン分析を取得
   */
  async getBehaviorPatternAnalysis(companyId: string): Promise<{
    distribution: Record<string, { count: number; percentage: number; label: string }>;
    averages: Record<string, number>;
    dominantPattern: string;
    insights: string[];
  }> {
    const cacheKey = `${CACHE_PREFIX}:${companyId}:behavior-pattern`;
    const cached = await this.getFromCache<ReturnType<typeof this.getBehaviorPatternAnalysis>>(cacheKey);
    if (cached) return cached;

    // 診断結果を取得
    const diagnosisResults = await prisma.diagnosisResult.findMany({
      where: {
        user: {
          companyId,
          isActive: true,
        },
      },
      select: {
        behaviorPattern: true,
      },
    });

    // 集計
    const counts: Record<string, number> = {
      efficiency: 0,
      friendliness: 0,
      knowledge: 0,
      appearance: 0,
      challenge: 0,
    };
    const sums: Record<string, number> = {
      efficiency: 0,
      friendliness: 0,
      knowledge: 0,
      appearance: 0,
      challenge: 0,
    };

    for (const result of diagnosisResults) {
      const pattern = result.behaviorPattern as Record<string, number>;
      if (!pattern) continue;

      // 最も高いパターンをカウント
      let maxPattern = 'efficiency';
      let maxValue = 0;
      for (const key of BEHAVIOR_PATTERNS) {
        const value = pattern[key] || 0;
        sums[key] += value;
        if (value > maxValue) {
          maxValue = value;
          maxPattern = key;
        }
      }
      counts[maxPattern]++;
    }

    const total = diagnosisResults.length;
    const distribution: Record<string, { count: number; percentage: number; label: string }> = {};
    const averages: Record<string, number> = {};

    for (const key of BEHAVIOR_PATTERNS) {
      distribution[key] = {
        count: counts[key],
        percentage: total > 0 ? Math.round((counts[key] / total) * 1000) / 10 : 0,
        label: BEHAVIOR_PATTERN_LABELS[key],
      };
      averages[key] = total > 0 ? Math.round((sums[key] / total) * 10) / 10 : 50;
    }

    // 最も多いパターン
    const dominantPattern = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    // インサイト生成
    const insights = this.generateBehaviorPatternInsights(distribution, averages, dominantPattern);

    const result = {
      distribution,
      averages,
      dominantPattern,
      insights,
    };

    await this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * 行動パターンのインサイトを生成
   */
  private generateBehaviorPatternInsights(
    distribution: Record<string, { count: number; percentage: number; label: string }>,
    averages: Record<string, number>,
    dominantPattern: string
  ): string[] {
    const insights: string[] = [];

    const dominantLabel = BEHAVIOR_PATTERN_LABELS[dominantPattern];
    const dominantPercentage = distribution[dominantPattern].percentage;
    insights.push(`貴社は「${dominantLabel}」を重視するメンバーが${dominantPercentage}%と最も多いです。`);

    // 効率と友好のバランス
    const efficiencyAvg = averages.efficiency;
    const friendlinessAvg = averages.friendliness;
    if (efficiencyAvg > friendlinessAvg + 10) {
      insights.push('効率性を重視する傾向が強いため、チームビルディングやコミュニケーションの機会を意識的に設けることを推奨します。');
    } else if (friendlinessAvg > efficiencyAvg + 10) {
      insights.push('人間関係を重視する傾向が強いため、目標設定や進捗管理の仕組みを強化することで生産性向上が期待できます。');
    }

    // 挑戦傾向
    if (averages.challenge > 55) {
      insights.push('挑戦を好むメンバーが多いため、新規プロジェクトや改善活動への参加意欲が高いと予想されます。');
    } else if (averages.challenge < 45) {
      insights.push('安定志向のメンバーが多いため、変革を進める際は丁寧な説明とサポートが重要です。');
    }

    return insights;
  }

  /**
   * BigFive分析を取得
   */
  async getBigFiveAnalysis(companyId: string): Promise<{
    companyAverages: Record<string, number>;
    benchmarkAverages: Record<string, number>;
    comparison: Record<string, { difference: number; interpretation: string }>;
    comparisonText: string;
    insights: string[];
  }> {
    const cacheKey = `${CACHE_PREFIX}:${companyId}:big-five`;
    const cached = await this.getFromCache<ReturnType<typeof this.getBigFiveAnalysis>>(cacheKey);
    if (cached) return cached;

    // 診断結果を取得
    const diagnosisResults = await prisma.diagnosisResult.findMany({
      where: {
        user: {
          companyId,
          isActive: true,
        },
      },
      select: {
        bigFive: true,
      },
    });

    // 集計
    const sums: Record<string, number> = {
      extraversion: 0,
      neuroticism: 0,
      openness: 0,
      agreeableness: 0,
      conscientiousness: 0,
    };

    for (const result of diagnosisResults) {
      const bigFive = result.bigFive as Record<string, number>;
      if (!bigFive) continue;

      for (const key of BIG_FIVE_FACTORS) {
        sums[key] += bigFive[key] || 50;
      }
    }

    const total = diagnosisResults.length;
    const companyAverages: Record<string, number> = {};
    const benchmarkAverages: Record<string, number> = {
      extraversion: 50.0,
      neuroticism: 50.0,
      openness: 50.0,
      agreeableness: 50.0,
      conscientiousness: 50.0,
    };

    for (const key of BIG_FIVE_FACTORS) {
      companyAverages[key] = total > 0 ? Math.round((sums[key] / total) * 10) / 10 : 50;
    }

    // 比較分析
    const comparison: Record<string, { difference: number; interpretation: string }> = {};
    for (const key of BIG_FIVE_FACTORS) {
      const diff = companyAverages[key] - benchmarkAverages[key];
      let interpretation = '平均的';
      if (diff > 5) interpretation = '高い';
      else if (diff > 2) interpretation = 'やや高い';
      else if (diff < -5) interpretation = '低い';
      else if (diff < -2) interpretation = 'やや低い';

      comparison[key] = {
        difference: Math.round(diff * 10) / 10,
        interpretation,
      };
    }

    // 比較テキスト生成
    const comparisonText = this.generateBigFiveComparisonText(companyAverages, comparison);
    const insights = this.generateBigFiveInsights(companyAverages, comparison);

    const result = {
      companyAverages,
      benchmarkAverages,
      comparison,
      comparisonText,
      insights,
    };

    await this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * BigFive比較テキストを生成
   */
  private generateBigFiveComparisonText(
    companyAverages: Record<string, number>,
    comparison: Record<string, { difference: number; interpretation: string }>
  ): string {
    const highFactors = Object.entries(comparison)
      .filter(([_, v]) => v.difference > 3)
      .map(([k]) => BIG_FIVE_LABELS[k]);

    const lowFactors = Object.entries(comparison)
      .filter(([_, v]) => v.difference < -3)
      .map(([k]) => BIG_FIVE_LABELS[k]);

    let text = '貴社の性格特性傾向について分析しました。';

    if (highFactors.length > 0) {
      text += `全体的に${highFactors.join('・')}が高い傾向にあります。`;
    }
    if (lowFactors.length > 0) {
      text += `一方、${lowFactors.join('・')}は平均より低めです。`;
    }
    if (highFactors.length === 0 && lowFactors.length === 0) {
      text += '全体的にバランスの取れた特性分布となっています。';
    }

    return text;
  }

  /**
   * BigFiveインサイトを生成
   */
  private generateBigFiveInsights(
    companyAverages: Record<string, number>,
    comparison: Record<string, { difference: number; interpretation: string }>
  ): string[] {
    const insights: string[] = [];

    // 外向性について
    if (comparison.extraversion.difference > 5) {
      insights.push('外向性が高いメンバーが多く、活発なコミュニケーションや対外的な活動に強みがあります。');
    } else if (comparison.extraversion.difference < -5) {
      insights.push('内向的なメンバーが多いため、集中作業や深い思考を要する業務に適性があります。');
    }

    // 神経症傾向について
    if (comparison.neuroticism.difference > 5) {
      insights.push('ストレスを感じやすいメンバーが多いため、メンタルヘルスケアや心理的安全性の確保が重要です。');
    } else if (comparison.neuroticism.difference < -5) {
      insights.push('情緒的に安定したメンバーが多く、プレッシャーのかかる状況でも冷静に対応できる傾向があります。');
    }

    // 開放性について
    if (comparison.openness.difference > 5) {
      insights.push('新しいアイデアや変化を受け入れやすい組織文化があり、イノベーションに適した環境です。');
    }

    // 協調性について
    if (comparison.agreeableness.difference > 5) {
      insights.push('協調性が高く、チームワークを重視する文化が根付いています。');
    } else if (comparison.agreeableness.difference < -5) {
      insights.push('個人の意見を主張する傾向が強いため、建設的な議論を促進する仕組みが効果的です。');
    }

    // 誠実性について
    if (comparison.conscientiousness.difference > 5) {
      insights.push('計画性と責任感が高いメンバーが多く、品質や納期の遵守に強みがあります。');
    }

    return insights;
  }

  /**
   * 部門別分析を取得
   */
  async getDepartmentAnalysis(companyId: string, departmentId?: string): Promise<{
    departments: Array<{
      id: string;
      name: string;
      memberCount: number;
      diagnosisCompleted: number;
      completionRate: number;
      bigFiveAverages: Record<string, number>;
      dominantThinkingPattern: string;
      dominantBehaviorPattern: string;
    }>;
    comparison: {
      mostExtraverted: { departmentId: string; departmentName: string; value: number };
      mostOpen: { departmentId: string; departmentName: string; value: number };
      highestCompletion: { departmentId: string; departmentName: string; value: number };
    };
  }> {
    const cacheKey = departmentId
      ? `${CACHE_PREFIX}:${companyId}:department:${departmentId}`
      : `${CACHE_PREFIX}:${companyId}:departments`;
    const cached = await this.getFromCache<ReturnType<typeof this.getDepartmentAnalysis>>(cacheKey);
    if (cached) return cached;

    // 部門を取得
    const departments = await prisma.department.findMany({
      where: {
        companyId,
        ...(departmentId ? { id: departmentId } : {}),
      },
      include: {
        users: {
          where: { isActive: true },
          include: {
            diagnosisResults: {
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const departmentAnalysis = departments.map(dept => {
      const memberCount = dept.users.length;
      const usersWithDiagnosis = dept.users.filter(u => u.diagnosisResults.length > 0);
      const diagnosisCompleted = usersWithDiagnosis.length;

      // BigFive平均
      const bigFiveSums: Record<string, number> = {
        extraversion: 0,
        neuroticism: 0,
        openness: 0,
        agreeableness: 0,
        conscientiousness: 0,
      };
      const thinkingCounts: Record<string, number> = { leader: 0, analyst: 0, supporter: 0, energetic: 0 };
      const behaviorCounts: Record<string, number> = { efficiency: 0, friendliness: 0, knowledge: 0, appearance: 0, challenge: 0 };

      for (const user of usersWithDiagnosis) {
        const result = user.diagnosisResults[0];
        const bigFive = result.bigFive as Record<string, number>;
        const thinking = result.thinkingPattern as Record<string, number>;
        const behavior = result.behaviorPattern as Record<string, number>;

        if (bigFive) {
          for (const key of BIG_FIVE_FACTORS) {
            bigFiveSums[key] += bigFive[key] || 50;
          }
        }

        if (thinking) {
          let maxKey = 'leader';
          let maxVal = 0;
          for (const key of THINKING_PATTERNS) {
            if ((thinking[key] || 0) > maxVal) {
              maxVal = thinking[key];
              maxKey = key;
            }
          }
          thinkingCounts[maxKey]++;
        }

        if (behavior) {
          let maxKey = 'efficiency';
          let maxVal = 0;
          for (const key of BEHAVIOR_PATTERNS) {
            if ((behavior[key] || 0) > maxVal) {
              maxVal = behavior[key];
              maxKey = key;
            }
          }
          behaviorCounts[maxKey]++;
        }
      }

      const bigFiveAverages: Record<string, number> = {};
      for (const key of BIG_FIVE_FACTORS) {
        bigFiveAverages[key] = diagnosisCompleted > 0
          ? Math.round((bigFiveSums[key] / diagnosisCompleted) * 10) / 10
          : 50;
      }

      const dominantThinkingPattern = Object.entries(thinkingCounts).sort((a, b) => b[1] - a[1])[0][0];
      const dominantBehaviorPattern = Object.entries(behaviorCounts).sort((a, b) => b[1] - a[1])[0][0];

      return {
        id: dept.id,
        name: dept.name,
        memberCount,
        diagnosisCompleted,
        completionRate: memberCount > 0 ? Math.round((diagnosisCompleted / memberCount) * 1000) / 10 : 0,
        bigFiveAverages,
        dominantThinkingPattern,
        dominantBehaviorPattern,
      };
    });

    // 比較データ
    const comparison = {
      mostExtraverted: departmentAnalysis.reduce((max, dept) =>
        dept.bigFiveAverages.extraversion > max.value
          ? { departmentId: dept.id, departmentName: dept.name, value: dept.bigFiveAverages.extraversion }
          : max,
        { departmentId: '', departmentName: '', value: 0 }
      ),
      mostOpen: departmentAnalysis.reduce((max, dept) =>
        dept.bigFiveAverages.openness > max.value
          ? { departmentId: dept.id, departmentName: dept.name, value: dept.bigFiveAverages.openness }
          : max,
        { departmentId: '', departmentName: '', value: 0 }
      ),
      highestCompletion: departmentAnalysis.reduce((max, dept) =>
        dept.completionRate > max.value
          ? { departmentId: dept.id, departmentName: dept.name, value: dept.completionRate }
          : max,
        { departmentId: '', departmentName: '', value: 0 }
      ),
    };

    const result = {
      departments: departmentAnalysis,
      comparison,
    };

    await this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * タイプ分布を取得
   */
  async getTypeDistribution(companyId: string): Promise<{
    distribution: Array<{
      typeCode: string;
      typeName: string;
      count: number;
      percentage: number;
    }>;
    total: number;
    insights: string[];
  }> {
    const cacheKey = `${CACHE_PREFIX}:${companyId}:type-distribution`;
    const cached = await this.getFromCache<ReturnType<typeof this.getTypeDistribution>>(cacheKey);
    if (cached) return cached;

    // 診断結果を取得
    const diagnosisResults = await prisma.diagnosisResult.findMany({
      where: {
        user: {
          companyId,
          isActive: true,
        },
      },
      select: {
        typeCode: true,
      },
    });

    // タイプ別カウント
    const counts: Record<string, number> = {
      EE: 0,
      EI: 0,
      IE: 0,
      II: 0,
    };

    for (const result of diagnosisResults) {
      if (result.typeCode && counts[result.typeCode] !== undefined) {
        counts[result.typeCode]++;
      }
    }

    const total = diagnosisResults.length;
    const distribution = TYPE_CODES.map(code => ({
      typeCode: code,
      typeName: TYPE_NAMES[code],
      count: counts[code],
      percentage: total > 0 ? Math.round((counts[code] / total) * 1000) / 10 : 0,
    }));

    // インサイト生成
    const insights = this.generateTypeDistributionInsights(distribution, total);

    const result = {
      distribution,
      total,
      insights,
    };

    await this.setToCache(cacheKey, result);
    return result;
  }

  /**
   * タイプ分布のインサイトを生成
   */
  private generateTypeDistributionInsights(
    distribution: Array<{ typeCode: string; typeName: string; count: number; percentage: number }>,
    total: number
  ): string[] {
    const insights: string[] = [];

    if (total === 0) {
      insights.push('診断を完了したメンバーがいないため、分析データがありません。');
      return insights;
    }

    // 最も多いタイプ
    const dominant = distribution.sort((a, b) => b.count - a.count)[0];
    insights.push(`貴社は「${dominant.typeName}」が${dominant.percentage}%と最も多く、組織の特徴を表しています。`);

    // 外向型と内向型のバランス
    const extraverted = distribution.filter(d => d.typeCode.startsWith('E')).reduce((sum, d) => sum + d.count, 0);
    const introverted = distribution.filter(d => d.typeCode.startsWith('I')).reduce((sum, d) => sum + d.count, 0);
    const extravertedPercentage = Math.round((extraverted / total) * 100);

    if (extravertedPercentage > 60) {
      insights.push('外向型のメンバーが多く、活発なコミュニケーションや対外活動に強みがあります。');
    } else if (extravertedPercentage < 40) {
      insights.push('内向型のメンバーが多く、深い思考や集中作業を要する業務に適性があります。');
    } else {
      insights.push('外向型と内向型のバランスが取れており、多様な業務に対応できる組織構成です。');
    }

    // 開放型と安定型のバランス
    const open = distribution.filter(d => d.typeCode.endsWith('E')).reduce((sum, d) => sum + d.count, 0);
    const stable = distribution.filter(d => d.typeCode.endsWith('I')).reduce((sum, d) => sum + d.count, 0);
    const openPercentage = Math.round((open / total) * 100);

    if (openPercentage > 60) {
      insights.push('変化や新しいことを好むメンバーが多く、イノベーションに適した組織です。');
    } else if (openPercentage < 40) {
      insights.push('安定志向のメンバーが多く、着実な業務遂行に強みがあります。');
    }

    return insights;
  }
}

export const companyAnalysisService = new CompanyAnalysisService();
