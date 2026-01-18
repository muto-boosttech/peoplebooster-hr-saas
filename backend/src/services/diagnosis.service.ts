import { prisma } from '../models';
import { similarityCalculationService, SimilarMember } from './similarity-calculation.service';
import { ReliabilityStatus, StressToleranceLevel, PotentialGrade } from '@prisma/client';

// ========================================
// 型定義
// ========================================

export interface DiagnosisResultResponse {
  id: string;
  userId: string;
  typeName: string;
  typeCode: string;
  featureLabels: string[];
  reliabilityStatus: ReliabilityStatus;
  stressTolerance: StressToleranceLevel;
  thinkingPattern: {
    leader: number;
    analyst: number;
    supporter: number;
    energetic: number;
  };
  behaviorPattern: {
    efficiency: number;
    friendliness: number;
    knowledge: number;
    appearance: number;
    challenge: number;
  };
  bigFive: {
    extraversion: number;
    neuroticism: number;
    openness: number;
    agreeableness: number;
    conscientiousness: number;
  };
  completedAt: Date | null;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiagnosisDetailResponse extends DiagnosisResultResponse {
  typeDescription: string;
  managementPoints: string[];
  suitableJobs: string[];
  unsuitableJobs: string[];
  goalAchievementStyle: string;
  workValues: string[];
  strengthsDescription: string;
  weaknessesDescription: string;
  communicationStyle: string;
  teamworkStyle: string;
}

export interface PotentialScoreResponse {
  jobType: string;
  grade: PotentialGrade;
  score: number;
  matchingFactors?: string[];
}

export interface SimilarityResponse {
  similarMembers: SimilarMember[];
}

// タイプ別の詳細解説
const TYPE_DESCRIPTIONS: Record<string, {
  description: string;
  managementPoints: string[];
  suitableJobs: string[];
  unsuitableJobs: string[];
  goalAchievementStyle: string;
  workValues: string[];
  strengthsDescription: string;
  weaknessesDescription: string;
  communicationStyle: string;
  teamworkStyle: string;
}> = {
  EE: {
    description: '情熱的リーダー型は、高い外向性と開放性を持ち、新しいアイデアや挑戦を好みます。周囲を巻き込む力があり、チームを活性化させる存在です。変化を恐れず、革新的なアプローチを積極的に取り入れます。',
    managementPoints: [
      '自由度の高い環境を提供する',
      '新しいプロジェクトや挑戦的な課題を任せる',
      '定期的なフィードバックと承認を与える',
      'アイデアを発表する機会を設ける',
      'ルーティンワークは最小限に抑える',
    ],
    suitableJobs: ['新規事業開発', 'マーケティング', '営業', '広報・PR', 'スタートアップ経営'],
    unsuitableJobs: ['経理・財務', '品質管理', 'ルーティン業務', '細かい事務作業'],
    goalAchievementStyle: '大きなビジョンを掲げ、周囲を巻き込みながら目標に向かって突き進みます。途中で新しいアイデアが浮かぶと方向転換することもありますが、最終的には成果を出す力があります。',
    workValues: ['革新性', '自由', '影響力', '成長', '挑戦'],
    strengthsDescription: 'カリスマ性があり、人を惹きつける魅力を持っています。創造的な発想力と行動力を兼ね備え、変化の激しい環境でも力を発揮します。',
    weaknessesDescription: '細部への注意が散漫になりがちで、継続的な作業や地道な努力が苦手な傾向があります。また、衝動的な判断をしてしまうこともあります。',
    communicationStyle: 'オープンで積極的なコミュニケーションを好みます。自分の考えを熱意を持って伝え、相手の反応を引き出すのが得意です。',
    teamworkStyle: 'チームのムードメーカーとして機能し、メンバーのモチベーションを高めます。ただし、自分のペースで進めたがる傾向があります。',
  },
  EI: {
    description: '実行力重視型は、高い外向性と現実的な思考を持ち、具体的な成果を重視します。計画を立てて着実に実行する力があり、チームをまとめて目標達成に導きます。',
    managementPoints: [
      '明確な目標と期限を設定する',
      '具体的な成果指標を提示する',
      '権限を委譲して任せる',
      '実績を正当に評価する',
      '効率的な業務プロセスを整備する',
    ],
    suitableJobs: ['プロジェクトマネージャー', '営業マネージャー', '生産管理', '店舗運営', 'コンサルタント'],
    unsuitableJobs: ['研究開発', 'クリエイティブ職', '長期的な企画業務'],
    goalAchievementStyle: '具体的な計画を立て、マイルストーンを設定して着実に進めます。途中の進捗管理を重視し、必要に応じて軌道修正を行います。',
    workValues: ['成果', '効率', '実績', '責任', 'リーダーシップ'],
    strengthsDescription: '実行力と推進力に優れ、困難な状況でも諦めずに成果を出します。チームをまとめる力があり、メンバーの能力を引き出すのが得意です。',
    weaknessesDescription: '新しいアイデアや変化に対して保守的になりがちです。また、効率を重視するあまり、人間関係への配慮が不足することがあります。',
    communicationStyle: '要点を押さえた簡潔なコミュニケーションを好みます。結論から話し、具体的なアクションにつなげることを重視します。',
    teamworkStyle: 'チームの目標達成に向けてメンバーを導きます。役割分担を明確にし、各自の責任を重視します。',
  },
  IE: {
    description: '思索的クリエイター型は、内省的でありながら高い開放性を持ち、独自の視点で物事を捉えます。深い思考と創造性を活かして、革新的なアイデアを生み出します。',
    managementPoints: [
      '一人で集中できる時間と空間を確保する',
      '創造的な課題を与える',
      'アイデアを形にする機会を提供する',
      '急かさず、じっくり考える時間を与える',
      '専門性を深める機会を設ける',
    ],
    suitableJobs: ['研究開発', 'デザイナー', 'エンジニア', 'ライター', 'アナリスト'],
    unsuitableJobs: ['営業', '接客', '頻繁な対人交渉が必要な業務'],
    goalAchievementStyle: '独自のアプローチで目標に取り組みます。深く考え抜いてから行動に移すため、時間はかかりますが質の高い成果を出します。',
    workValues: ['創造性', '専門性', '独自性', '深い理解', '品質'],
    strengthsDescription: '深い洞察力と創造性を持ち、他の人が気づかない視点から問題を捉えることができます。専門分野での高い能力を発揮します。',
    weaknessesDescription: '対人コミュニケーションや自己アピールが苦手な傾向があります。また、考えすぎて行動が遅れることがあります。',
    communicationStyle: '深い話題について一対一で話すことを好みます。表面的な会話よりも、本質的な議論を重視します。',
    teamworkStyle: '専門家として貢献し、独自の視点でチームに価値を提供します。少人数のチームで力を発揮します。',
  },
  II: {
    description: '分析的専門家型は、内省的で現実的な思考を持ち、正確性と専門性を重視します。データや事実に基づいた判断を行い、着実に成果を積み上げます。',
    managementPoints: [
      '明確なルールと手順を提示する',
      '専門性を活かせる業務を任せる',
      '正確性を評価する',
      '急な変更は避け、事前に情報を共有する',
      '一人で集中できる環境を整える',
    ],
    suitableJobs: ['経理・財務', '法務', '品質管理', 'データアナリスト', 'システムエンジニア'],
    unsuitableJobs: ['営業', '広報', '頻繁な変化がある業務', '即興的な対応が求められる業務'],
    goalAchievementStyle: '計画を綿密に立て、一つ一つのタスクを確実にこなしていきます。リスクを最小化しながら、着実に目標に近づきます。',
    workValues: ['正確性', '専門性', '安定', '論理性', '品質'],
    strengthsDescription: '高い分析力と正確性を持ち、複雑な問題を論理的に解決できます。専門分野での深い知識を活かした貢献ができます。',
    weaknessesDescription: '変化への適応や即興的な対応が苦手です。また、完璧を求めすぎて作業が遅れることがあります。',
    communicationStyle: '事実とデータに基づいた論理的なコミュニケーションを好みます。感情的なやり取りは苦手です。',
    teamworkStyle: '専門家として正確な情報と分析を提供します。明確な役割分担のもとで力を発揮します。',
  },
};

// ========================================
// 診断結果サービス
// ========================================

class DiagnosisService {
  /**
   * 診断結果を取得
   */
  async getDiagnosisResult(userId: string): Promise<DiagnosisResultResponse | null> {
    const result = await prisma.diagnosisResult.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    if (!result) {
      return null;
    }

    return this.formatDiagnosisResult(result);
  }

  /**
   * 診断結果の詳細を取得
   */
  async getDiagnosisDetail(userId: string): Promise<DiagnosisDetailResponse | null> {
    const result = await prisma.diagnosisResult.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    if (!result) {
      return null;
    }

    const baseResult = this.formatDiagnosisResult(result);
    const typeDetail = TYPE_DESCRIPTIONS[result.typeCode] || TYPE_DESCRIPTIONS['II'];

    return {
      ...baseResult,
      typeDescription: typeDetail.description,
      managementPoints: typeDetail.managementPoints,
      suitableJobs: typeDetail.suitableJobs,
      unsuitableJobs: typeDetail.unsuitableJobs,
      goalAchievementStyle: typeDetail.goalAchievementStyle,
      workValues: typeDetail.workValues,
      strengthsDescription: typeDetail.strengthsDescription,
      weaknessesDescription: typeDetail.weaknessesDescription,
      communicationStyle: typeDetail.communicationStyle,
      teamworkStyle: typeDetail.teamworkStyle,
    };
  }

  /**
   * 活躍可能性スコアを取得
   */
  async getPotentialScores(userId: string): Promise<PotentialScoreResponse[]> {
    // 最新の診断結果を取得
    const diagnosisResult = await prisma.diagnosisResult.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    if (!diagnosisResult) {
      return [];
    }

    // 活躍可能性スコアを取得
    const scores = await prisma.potentialScore.findMany({
      where: { diagnosisResultId: diagnosisResult.id },
      orderBy: { score: 'desc' },
    });

    return scores.map(score => ({
      jobType: score.jobType,
      grade: score.grade,
      score: score.score,
      matchingFactors: (score.matchingFactors as string[]) || [],
    }));
  }

  /**
   * 類似メンバーを取得
   */
  async getSimilarMembers(
    userId: string,
    companyId: string,
    minSimilarity: number = 70,
    limit: number = 10
  ): Promise<SimilarityResponse> {
    // まずキャッシュを確認
    let similarMembers = await similarityCalculationService.getCachedSimilarMembers(
      userId,
      minSimilarity,
      limit
    );

    // キャッシュがない場合はリアルタイム計算
    if (similarMembers.length === 0) {
      similarMembers = await similarityCalculationService.findSimilarMembers(
        userId,
        companyId,
        minSimilarity,
        limit
      );
    }

    return { similarMembers };
  }

  /**
   * 診断結果が存在するか確認
   */
  async hasDiagnosisResult(userId: string): Promise<boolean> {
    const count = await prisma.diagnosisResult.count({
      where: { userId },
    });
    return count > 0;
  }

  /**
   * 診断結果の履歴を取得
   */
  async getDiagnosisHistory(
    userId: string,
    limit: number = 10
  ): Promise<DiagnosisResultResponse[]> {
    const results = await prisma.diagnosisResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    return results.map(result => this.formatDiagnosisResult(result));
  }

  /**
   * ブラッシュアップ履歴を取得
   */
  async getBrushUpHistory(userId: string): Promise<any[]> {
    const diagnosisResult = await prisma.diagnosisResult.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    if (!diagnosisResult) {
      return [];
    }

    const history = await prisma.brushUpHistory.findMany({
      where: { diagnosisResultId: diagnosisResult.id },
      orderBy: { createdAt: 'desc' },
    });

    return history.map(h => ({
      id: h.id,
      version: h.version,
      triggerType: h.triggerType,
      aiReasoning: h.aiReasoning,
      createdAt: h.createdAt,
    }));
  }

  /**
   * 外部診断結果を取得
   */
  async getExternalDiagnosis(userId: string): Promise<any[]> {
    const externalDiagnoses = await prisma.externalDiagnosis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return externalDiagnoses.map(d => ({
      id: d.id,
      type: d.type,
      result: d.result,
      sourceUrl: d.sourceUrl,
      diagnosedAt: d.diagnosedAt,
      createdAt: d.createdAt,
    }));
  }

  /**
   * 診断結果をフォーマット
   */
  private formatDiagnosisResult(result: any): DiagnosisResultResponse {
    const thinkingPattern = result.thinkingPattern as any || {};
    const behaviorPattern = result.behaviorPattern as any || {};
    const bigFive = result.bigFive as any || {};

    return {
      id: result.id,
      userId: result.userId,
      typeName: result.typeName,
      typeCode: result.typeCode,
      featureLabels: (result.featureLabels as string[]) || [],
      reliabilityStatus: result.reliabilityStatus,
      stressTolerance: result.stressTolerance,
      thinkingPattern: {
        leader: thinkingPattern.R || 50,
        analyst: thinkingPattern.A || 50,
        supporter: thinkingPattern.S || 50,
        energetic: thinkingPattern.E || 50,
      },
      behaviorPattern: {
        efficiency: behaviorPattern.efficiency || 50,
        friendliness: behaviorPattern.friendliness || 50,
        knowledge: behaviorPattern.knowledge || 50,
        appearance: behaviorPattern.appearance || 50,
        challenge: behaviorPattern.challenge || 50,
      },
      bigFive: {
        extraversion: bigFive.extraversion || 50,
        neuroticism: bigFive.neuroticism || 50,
        openness: bigFive.openness || 50,
        agreeableness: bigFive.agreeableness || 50,
        conscientiousness: bigFive.conscientiousness || 50,
      },
      completedAt: result.completedAt,
      version: result.version,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * 企業全体の診断統計を取得
   */
  async getCompanyDiagnosisStats(companyId: string): Promise<any> {
    // 企業のユーザーを取得
    const users = await prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    });

    const userIds = users.map(u => u.id);

    // 診断結果を取得
    const diagnosisResults = await prisma.diagnosisResult.findMany({
      where: { userId: { in: userIds } },
      orderBy: { completedAt: 'desc' },
    });

    // ユーザーごとの最新結果のみを抽出
    const latestResults = new Map<string, any>();
    for (const result of diagnosisResults) {
      if (!latestResults.has(result.userId)) {
        latestResults.set(result.userId, result);
      }
    }

    const results = Array.from(latestResults.values());

    // タイプ分布
    const typeDistribution: Record<string, number> = {};
    for (const result of results) {
      typeDistribution[result.typeCode] = (typeDistribution[result.typeCode] || 0) + 1;
    }

    // BigFive平均
    const bigFiveSum = {
      extraversion: 0,
      openness: 0,
      agreeableness: 0,
      conscientiousness: 0,
      neuroticism: 0,
    };

    for (const result of results) {
      const bigFive = result.bigFive as any;
      if (bigFive) {
        bigFiveSum.extraversion += bigFive.extraversion || 0;
        bigFiveSum.openness += bigFive.openness || 0;
        bigFiveSum.agreeableness += bigFive.agreeableness || 0;
        bigFiveSum.conscientiousness += bigFive.conscientiousness || 0;
        bigFiveSum.neuroticism += bigFive.neuroticism || 0;
      }
    }

    const count = results.length || 1;
    const bigFiveAverage = {
      extraversion: Math.round(bigFiveSum.extraversion / count),
      openness: Math.round(bigFiveSum.openness / count),
      agreeableness: Math.round(bigFiveSum.agreeableness / count),
      conscientiousness: Math.round(bigFiveSum.conscientiousness / count),
      neuroticism: Math.round(bigFiveSum.neuroticism / count),
    };

    // ストレス耐性分布
    const stressDistribution: Record<string, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    for (const result of results) {
      stressDistribution[result.stressTolerance] = (stressDistribution[result.stressTolerance] || 0) + 1;
    }

    return {
      totalUsers: users.length,
      diagnosedUsers: results.length,
      diagnosisRate: Math.round((results.length / users.length) * 100),
      typeDistribution,
      bigFiveAverage,
      stressDistribution,
    };
  }
}

// シングルトンインスタンス
export const diagnosisService = new DiagnosisService();
