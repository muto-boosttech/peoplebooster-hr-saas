import { QuestionCategory, ReliabilityStatus, StressToleranceLevel, PotentialGrade } from '@prisma/client';

// ========================================
// 型定義
// ========================================

export interface AnswerData {
  questionId: string;
  score: number;
  category: QuestionCategory;
  isReverse: boolean;
}

export interface BigFiveScores {
  extraversion: number;
  openness: number;
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
}

export interface ThinkingPattern {
  R: number; // リーダー（意思決定・主体性）
  A: number; // アナリスト（分析・批判的思考）
  S: number; // サポーター（協調・支援）
  E: number; // エネルギッシュ（活動性・情報収集）
}

export interface BehaviorPattern {
  efficiency: number;   // 効率重視
  friendliness: number; // 友好重視
  knowledge: number;    // 知識重視
  appearance: number;   // 体裁重視
  challenge: number;    // 挑戦重視
}

export interface RawScores {
  extraversion: number;
  openness: number;
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
  thinking_R: number;
  thinking_A: number;
  thinking_S: number;
  thinking_E: number;
  behavior_efficiency: number;
  behavior_friendliness: number;
  behavior_knowledge: number;
  behavior_appearance: number;
  behavior_challenge: number;
}

export interface TypeResult {
  typeName: string;
  typeCode: string;
  featureLabels: string[];
}

export interface ReliabilityResult {
  status: ReliabilityStatus;
  issues: string[];
  score: number;
}

export interface PotentialScoreResult {
  jobType: string;
  score: number;
  grade: PotentialGrade;
  matchingFactors: string[];
}

export interface DiagnosisCalculationResult {
  bigFive: BigFiveScores;
  thinkingPattern: ThinkingPattern;
  behaviorPattern: BehaviorPattern;
  rawScores: RawScores;
  typeResult: TypeResult;
  stressTolerance: StressToleranceLevel;
  reliability: ReliabilityResult;
  potentialScores: PotentialScoreResult[];
}

// ========================================
// 基準値定義
// ========================================

// BigFive因子の基準値（平均・標準偏差）
const BIG_FIVE_NORMS = {
  extraversion: { mean: 3.5, sd: 1.0, questionsPerFactor: 15 },
  openness: { mean: 3.8, sd: 0.9, questionsPerFactor: 15 },
  agreeableness: { mean: 4.0, sd: 0.85, questionsPerFactor: 15 },
  conscientiousness: { mean: 3.7, sd: 0.95, questionsPerFactor: 15 },
  neuroticism: { mean: 3.3, sd: 1.1, questionsPerFactor: 15 },
};

// 思考パターンの基準値
const THINKING_NORMS = {
  R: { mean: 3.5, sd: 1.0 },
  A: { mean: 3.6, sd: 0.95 },
  S: { mean: 3.8, sd: 0.9 },
  E: { mean: 3.4, sd: 1.05 },
};

// 行動パターンの基準値
const BEHAVIOR_NORMS = {
  efficiency: { mean: 3.5, sd: 1.0 },
  friendliness: { mean: 3.7, sd: 0.9 },
  knowledge: { mean: 3.6, sd: 0.95 },
  appearance: { mean: 3.3, sd: 1.1 },
  challenge: { mean: 3.4, sd: 1.0 },
};

// 職種別の必要特性定義（20職種以上）
const JOB_REQUIREMENTS: {
  jobType: string;
  weights: {
    bigFive: Partial<Record<keyof BigFiveScores, { weight: number; ideal: 'high' | 'low' | 'medium' }>>;
    thinking: Partial<Record<keyof ThinkingPattern, { weight: number; ideal: 'high' | 'low' | 'medium' }>>;
    behavior: Partial<Record<keyof BehaviorPattern, { weight: number; ideal: 'high' | 'low' | 'medium' }>>;
  };
  description: string;
}[] = [
  // 1. エンジニア
  {
    jobType: 'エンジニア',
    weights: {
      bigFive: {
        openness: { weight: 0.25, ideal: 'high' },
        conscientiousness: { weight: 0.25, ideal: 'high' },
        neuroticism: { weight: 0.15, ideal: 'low' },
      },
      thinking: {
        A: { weight: 0.25, ideal: 'high' },
      },
      behavior: {
        efficiency: { weight: 0.1, ideal: 'high' },
      },
    },
    description: '論理的思考力と問題解決能力が求められる',
  },
  // 2. 新規営業
  {
    jobType: '新規営業',
    weights: {
      bigFive: {
        extraversion: { weight: 0.3, ideal: 'high' },
        neuroticism: { weight: 0.2, ideal: 'low' },
      },
      thinking: {
        R: { weight: 0.2, ideal: 'high' },
        E: { weight: 0.15, ideal: 'high' },
      },
      behavior: {
        challenge: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '積極性と対人スキルが求められる',
  },
  // 3. ルート営業
  {
    jobType: 'ルート営業',
    weights: {
      bigFive: {
        extraversion: { weight: 0.2, ideal: 'medium' },
        agreeableness: { weight: 0.25, ideal: 'high' },
        conscientiousness: { weight: 0.2, ideal: 'high' },
      },
      thinking: {
        S: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        friendliness: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '信頼関係構築と継続的なフォローが求められる',
  },
  // 4. カスタマーサクセス
  {
    jobType: 'カスタマーサクセス',
    weights: {
      bigFive: {
        agreeableness: { weight: 0.25, ideal: 'high' },
        conscientiousness: { weight: 0.2, ideal: 'high' },
        extraversion: { weight: 0.15, ideal: 'medium' },
      },
      thinking: {
        S: { weight: 0.25, ideal: 'high' },
      },
      behavior: {
        friendliness: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '顧客志向と問題解決能力が求められる',
  },
  // 5. デザイナー
  {
    jobType: 'デザイナー',
    weights: {
      bigFive: {
        openness: { weight: 0.35, ideal: 'high' },
        conscientiousness: { weight: 0.15, ideal: 'medium' },
      },
      thinking: {
        A: { weight: 0.15, ideal: 'medium' },
      },
      behavior: {
        efficiency: { weight: 0.15, ideal: 'high' },
        knowledge: { weight: 0.2, ideal: 'high' },
      },
    },
    description: '創造性と美的センスが求められる',
  },
  // 6. マーケティング
  {
    jobType: 'マーケティング',
    weights: {
      bigFive: {
        openness: { weight: 0.25, ideal: 'high' },
        extraversion: { weight: 0.15, ideal: 'medium' },
      },
      thinking: {
        A: { weight: 0.2, ideal: 'high' },
        E: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        knowledge: { weight: 0.2, ideal: 'high' },
      },
    },
    description: '分析力と創造性のバランスが求められる',
  },
  // 7. 人事・採用担当
  {
    jobType: '人事・採用担当',
    weights: {
      bigFive: {
        agreeableness: { weight: 0.25, ideal: 'high' },
        extraversion: { weight: 0.2, ideal: 'medium' },
        conscientiousness: { weight: 0.15, ideal: 'high' },
      },
      thinking: {
        S: { weight: 0.25, ideal: 'high' },
      },
      behavior: {
        friendliness: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '対人スキルと公平な判断力が求められる',
  },
  // 8. 経理・財務
  {
    jobType: '経理・財務',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.35, ideal: 'high' },
        neuroticism: { weight: 0.15, ideal: 'low' },
      },
      thinking: {
        A: { weight: 0.3, ideal: 'high' },
      },
      behavior: {
        efficiency: { weight: 0.2, ideal: 'high' },
      },
    },
    description: '正確性と分析力が求められる',
  },
  // 9. 法務
  {
    jobType: '法務',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.3, ideal: 'high' },
        openness: { weight: 0.15, ideal: 'medium' },
      },
      thinking: {
        A: { weight: 0.3, ideal: 'high' },
      },
      behavior: {
        knowledge: { weight: 0.25, ideal: 'high' },
      },
    },
    description: '論理的思考と専門知識が求められる',
  },
  // 10. プロジェクトマネージャー
  {
    jobType: 'プロジェクトマネージャー',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.25, ideal: 'high' },
        extraversion: { weight: 0.15, ideal: 'medium' },
        neuroticism: { weight: 0.15, ideal: 'low' },
      },
      thinking: {
        R: { weight: 0.25, ideal: 'high' },
        A: { weight: 0.1, ideal: 'medium' },
      },
      behavior: {
        efficiency: { weight: 0.1, ideal: 'high' },
      },
    },
    description: 'リーダーシップと計画力が求められる',
  },
  // 11. データアナリスト
  {
    jobType: 'データアナリスト',
    weights: {
      bigFive: {
        openness: { weight: 0.2, ideal: 'high' },
        conscientiousness: { weight: 0.25, ideal: 'high' },
      },
      thinking: {
        A: { weight: 0.35, ideal: 'high' },
      },
      behavior: {
        knowledge: { weight: 0.2, ideal: 'high' },
      },
    },
    description: '分析力と論理的思考が求められる',
  },
  // 12. コンサルタント
  {
    jobType: 'コンサルタント',
    weights: {
      bigFive: {
        extraversion: { weight: 0.15, ideal: 'medium' },
        openness: { weight: 0.2, ideal: 'high' },
        conscientiousness: { weight: 0.15, ideal: 'high' },
      },
      thinking: {
        R: { weight: 0.2, ideal: 'high' },
        A: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        knowledge: { weight: 0.1, ideal: 'high' },
      },
    },
    description: '問題解決能力とコミュニケーション力が求められる',
  },
  // 13. 経営企画
  {
    jobType: '経営企画',
    weights: {
      bigFive: {
        openness: { weight: 0.2, ideal: 'high' },
        conscientiousness: { weight: 0.2, ideal: 'high' },
        neuroticism: { weight: 0.1, ideal: 'low' },
      },
      thinking: {
        R: { weight: 0.2, ideal: 'high' },
        A: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        challenge: { weight: 0.1, ideal: 'high' },
      },
    },
    description: '戦略的思考と実行力が求められる',
  },
  // 14. 広報・PR
  {
    jobType: '広報・PR',
    weights: {
      bigFive: {
        extraversion: { weight: 0.25, ideal: 'high' },
        openness: { weight: 0.2, ideal: 'high' },
        agreeableness: { weight: 0.15, ideal: 'medium' },
      },
      thinking: {
        E: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        appearance: { weight: 0.2, ideal: 'high' },
      },
    },
    description: 'コミュニケーション力と発信力が求められる',
  },
  // 15. カスタマーサポート
  {
    jobType: 'カスタマーサポート',
    weights: {
      bigFive: {
        agreeableness: { weight: 0.3, ideal: 'high' },
        neuroticism: { weight: 0.2, ideal: 'low' },
        conscientiousness: { weight: 0.15, ideal: 'high' },
      },
      thinking: {
        S: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        friendliness: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '忍耐力と共感力が求められる',
  },
  // 16. 研究開発（R&D）
  {
    jobType: '研究開発（R&D）',
    weights: {
      bigFive: {
        openness: { weight: 0.35, ideal: 'high' },
        conscientiousness: { weight: 0.2, ideal: 'high' },
      },
      thinking: {
        A: { weight: 0.25, ideal: 'high' },
      },
      behavior: {
        knowledge: { weight: 0.2, ideal: 'high' },
      },
    },
    description: '探究心と専門性が求められる',
  },
  // 17. 事業開発
  {
    jobType: '事業開発',
    weights: {
      bigFive: {
        extraversion: { weight: 0.2, ideal: 'high' },
        openness: { weight: 0.2, ideal: 'high' },
        neuroticism: { weight: 0.1, ideal: 'low' },
      },
      thinking: {
        R: { weight: 0.2, ideal: 'high' },
        E: { weight: 0.15, ideal: 'high' },
      },
      behavior: {
        challenge: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '起業家精神と交渉力が求められる',
  },
  // 18. 品質管理（QA）
  {
    jobType: '品質管理（QA）',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.35, ideal: 'high' },
        neuroticism: { weight: 0.15, ideal: 'medium' },
      },
      thinking: {
        A: { weight: 0.3, ideal: 'high' },
      },
      behavior: {
        efficiency: { weight: 0.2, ideal: 'high' },
      },
    },
    description: '細部への注意力と品質意識が求められる',
  },
  // 19. 総務・庶務
  {
    jobType: '総務・庶務',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.3, ideal: 'high' },
        agreeableness: { weight: 0.2, ideal: 'high' },
      },
      thinking: {
        S: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        efficiency: { weight: 0.15, ideal: 'high' },
        friendliness: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '正確性とサポート力が求められる',
  },
  // 20. 経営層・役員
  {
    jobType: '経営層・役員',
    weights: {
      bigFive: {
        extraversion: { weight: 0.15, ideal: 'high' },
        neuroticism: { weight: 0.2, ideal: 'low' },
        conscientiousness: { weight: 0.15, ideal: 'high' },
      },
      thinking: {
        R: { weight: 0.3, ideal: 'high' },
      },
      behavior: {
        challenge: { weight: 0.2, ideal: 'high' },
      },
    },
    description: 'リーダーシップと決断力が求められる',
  },
  // 21. 秘書・アシスタント
  {
    jobType: '秘書・アシスタント',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.3, ideal: 'high' },
        agreeableness: { weight: 0.25, ideal: 'high' },
        neuroticism: { weight: 0.1, ideal: 'low' },
      },
      thinking: {
        S: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        efficiency: { weight: 0.15, ideal: 'high' },
      },
    },
    description: '気配りと正確性が求められる',
  },
  // 22. 教育・研修担当
  {
    jobType: '教育・研修担当',
    weights: {
      bigFive: {
        extraversion: { weight: 0.2, ideal: 'medium' },
        agreeableness: { weight: 0.2, ideal: 'high' },
        openness: { weight: 0.2, ideal: 'high' },
      },
      thinking: {
        S: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        knowledge: { weight: 0.2, ideal: 'high' },
      },
    },
    description: '指導力と知識伝達能力が求められる',
  },
  // 23. 物流・ロジスティクス
  {
    jobType: '物流・ロジスティクス',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.35, ideal: 'high' },
        neuroticism: { weight: 0.15, ideal: 'low' },
      },
      thinking: {
        A: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        efficiency: { weight: 0.3, ideal: 'high' },
      },
    },
    description: '計画性と効率性が求められる',
  },
  // 24. 購買・調達
  {
    jobType: '購買・調達',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.25, ideal: 'high' },
        extraversion: { weight: 0.15, ideal: 'medium' },
      },
      thinking: {
        A: { weight: 0.2, ideal: 'high' },
        R: { weight: 0.15, ideal: 'medium' },
      },
      behavior: {
        efficiency: { weight: 0.25, ideal: 'high' },
      },
    },
    description: '交渉力と分析力が求められる',
  },
  // 25. 製造・生産管理
  {
    jobType: '製造・生産管理',
    weights: {
      bigFive: {
        conscientiousness: { weight: 0.35, ideal: 'high' },
        neuroticism: { weight: 0.15, ideal: 'low' },
      },
      thinking: {
        A: { weight: 0.2, ideal: 'high' },
      },
      behavior: {
        efficiency: { weight: 0.3, ideal: 'high' },
      },
    },
    description: '計画性と品質意識が求められる',
  },
];

// タイプ定義（外向性×開放性の組み合わせ）
const TYPE_DEFINITIONS = {
  EE: {
    name: '情熱的リーダー型',
    features: ['積極的', '創造的', '社交的', '革新的'],
  },
  EI: {
    name: '実行力重視型',
    features: ['行動的', '実践的', '現実的', '効率的'],
  },
  IE: {
    name: '思索的クリエイター型',
    features: ['内省的', '創造的', '独創的', '深い思考'],
  },
  II: {
    name: '分析的専門家型',
    features: ['慎重', '分析的', '専門的', '正確'],
  },
};

// 特徴ラベル定義
const FEATURE_LABELS = {
  highExtraversion: ['社交的', 'リーダーシップ', 'アイドル性', '発信力'],
  lowExtraversion: ['内省的', '集中力', '独立性', '深い思考'],
  highOpenness: ['創造的', '革新的', '好奇心旺盛', '柔軟性'],
  lowOpenness: ['実践的', '堅実', '伝統重視', '安定志向'],
  highAgreeableness: ['協調的', '共感力', '顧客志向', 'チームワーク'],
  lowAgreeableness: ['独立的', '競争的', '批判的思考', '自己主張'],
  highConscientiousness: ['計画的', '責任感', '正確性', '粘り強さ'],
  lowConscientiousness: ['柔軟', '即興的', '適応力', '自由'],
  highNeuroticism: ['感受性', '慎重', '危機察知', '繊細'],
  lowNeuroticism: ['不動心', 'ストレス耐性', '楽観的', '安定'],
  highR: ['決断力', '主体性', '権力的', 'リーダー気質'],
  highA: ['分析力', '論理的', '批判的思考', '問題解決'],
  highS: ['サポート力', '協調性', '傾聴力', '奉仕精神'],
  highE: ['行動力', '情報収集', '積極性', 'エネルギッシュ'],
};

// ========================================
// 診断結果計算サービス
// ========================================

class DiagnosisCalculationService {
  /**
   * 診断結果を計算
   */
  calculateDiagnosis(answers: AnswerData[]): DiagnosisCalculationResult {
    // 1. 生スコアを計算
    const rawScores = this.calculateRawScores(answers);

    // 2. BigFive偏差値を計算
    const bigFive = this.calculateBigFiveDeviationScores(rawScores);

    // 3. 思考パターン偏差値を計算
    const thinkingPattern = this.calculateThinkingPatternDeviationScores(rawScores);

    // 4. 行動パターン偏差値を計算
    const behaviorPattern = this.calculateBehaviorPatternDeviationScores(rawScores);

    // 5. タイプ判定
    const typeResult = this.determineType(bigFive, thinkingPattern);

    // 6. ストレス耐性判定
    const stressTolerance = this.determineStressTolerance(bigFive.neuroticism);

    // 7. 信頼性判定
    const reliability = this.assessReliability(answers);

    // 8. 活躍可能性スコア計算
    const potentialScores = this.calculatePotentialScores(bigFive, thinkingPattern, behaviorPattern);

    return {
      bigFive,
      thinkingPattern,
      behaviorPattern,
      rawScores,
      typeResult,
      stressTolerance,
      reliability,
      potentialScores,
    };
  }

  /**
   * 生スコアを計算
   */
  private calculateRawScores(answers: AnswerData[]): RawScores {
    // カテゴリ別に回答を分類
    const categoryScores: Record<string, number[]> = {
      EXTRAVERSION: [],
      OPENNESS: [],
      AGREEABLENESS: [],
      CONSCIENTIOUSNESS: [],
      NEUROTICISM: [],
      THINKING: [],
      BEHAVIOR: [],
    };

    for (const answer of answers) {
      const score = answer.isReverse ? (8 - answer.score) : answer.score;
      if (categoryScores[answer.category]) {
        categoryScores[answer.category].push(score);
      }
    }

    // 各因子の平均スコアを計算
    const calcAverage = (scores: number[]): number => {
      if (scores.length === 0) return 4; // デフォルト値
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    };

    // 思考パターンと行動パターンの分割（THINKING/BEHAVIORカテゴリを細分化）
    // 実際のプロダクトでは設問ごとにサブカテゴリを持たせるが、
    // ここでは設問の順番で分割する簡易実装
    const thinkingScores = categoryScores.THINKING;
    const behaviorScores = categoryScores.BEHAVIOR;

    // 思考パターン（4分割）
    const thinkingQuartile = Math.ceil(thinkingScores.length / 4);
    const thinking_R = calcAverage(thinkingScores.slice(0, thinkingQuartile));
    const thinking_A = calcAverage(thinkingScores.slice(thinkingQuartile, thinkingQuartile * 2));
    const thinking_S = calcAverage(thinkingScores.slice(thinkingQuartile * 2, thinkingQuartile * 3));
    const thinking_E = calcAverage(thinkingScores.slice(thinkingQuartile * 3));

    // 行動パターン（5分割）
    const behaviorQuintile = Math.ceil(behaviorScores.length / 5);
    const behavior_efficiency = calcAverage(behaviorScores.slice(0, behaviorQuintile));
    const behavior_friendliness = calcAverage(behaviorScores.slice(behaviorQuintile, behaviorQuintile * 2));
    const behavior_knowledge = calcAverage(behaviorScores.slice(behaviorQuintile * 2, behaviorQuintile * 3));
    const behavior_appearance = calcAverage(behaviorScores.slice(behaviorQuintile * 3, behaviorQuintile * 4));
    const behavior_challenge = calcAverage(behaviorScores.slice(behaviorQuintile * 4));

    return {
      extraversion: calcAverage(categoryScores.EXTRAVERSION),
      openness: calcAverage(categoryScores.OPENNESS),
      agreeableness: calcAverage(categoryScores.AGREEABLENESS),
      conscientiousness: calcAverage(categoryScores.CONSCIENTIOUSNESS),
      neuroticism: calcAverage(categoryScores.NEUROTICISM),
      thinking_R,
      thinking_A,
      thinking_S,
      thinking_E,
      behavior_efficiency,
      behavior_friendliness,
      behavior_knowledge,
      behavior_appearance,
      behavior_challenge,
    };
  }

  /**
   * 偏差値を計算
   */
  private calculateDeviationScore(rawScore: number, mean: number, sd: number): number {
    const deviation = ((rawScore - mean) / sd) * 10 + 50;
    // 偏差値は20-80の範囲に収める
    return Math.max(20, Math.min(80, Math.round(deviation)));
  }

  /**
   * BigFive偏差値を計算
   */
  private calculateBigFiveDeviationScores(rawScores: RawScores): BigFiveScores {
    return {
      extraversion: this.calculateDeviationScore(
        rawScores.extraversion,
        BIG_FIVE_NORMS.extraversion.mean,
        BIG_FIVE_NORMS.extraversion.sd
      ),
      openness: this.calculateDeviationScore(
        rawScores.openness,
        BIG_FIVE_NORMS.openness.mean,
        BIG_FIVE_NORMS.openness.sd
      ),
      agreeableness: this.calculateDeviationScore(
        rawScores.agreeableness,
        BIG_FIVE_NORMS.agreeableness.mean,
        BIG_FIVE_NORMS.agreeableness.sd
      ),
      conscientiousness: this.calculateDeviationScore(
        rawScores.conscientiousness,
        BIG_FIVE_NORMS.conscientiousness.mean,
        BIG_FIVE_NORMS.conscientiousness.sd
      ),
      neuroticism: this.calculateDeviationScore(
        rawScores.neuroticism,
        BIG_FIVE_NORMS.neuroticism.mean,
        BIG_FIVE_NORMS.neuroticism.sd
      ),
    };
  }

  /**
   * 思考パターン偏差値を計算
   */
  private calculateThinkingPatternDeviationScores(rawScores: RawScores): ThinkingPattern {
    return {
      R: this.calculateDeviationScore(rawScores.thinking_R, THINKING_NORMS.R.mean, THINKING_NORMS.R.sd),
      A: this.calculateDeviationScore(rawScores.thinking_A, THINKING_NORMS.A.mean, THINKING_NORMS.A.sd),
      S: this.calculateDeviationScore(rawScores.thinking_S, THINKING_NORMS.S.mean, THINKING_NORMS.S.sd),
      E: this.calculateDeviationScore(rawScores.thinking_E, THINKING_NORMS.E.mean, THINKING_NORMS.E.sd),
    };
  }

  /**
   * 行動パターン偏差値を計算
   */
  private calculateBehaviorPatternDeviationScores(rawScores: RawScores): BehaviorPattern {
    return {
      efficiency: this.calculateDeviationScore(
        rawScores.behavior_efficiency,
        BEHAVIOR_NORMS.efficiency.mean,
        BEHAVIOR_NORMS.efficiency.sd
      ),
      friendliness: this.calculateDeviationScore(
        rawScores.behavior_friendliness,
        BEHAVIOR_NORMS.friendliness.mean,
        BEHAVIOR_NORMS.friendliness.sd
      ),
      knowledge: this.calculateDeviationScore(
        rawScores.behavior_knowledge,
        BEHAVIOR_NORMS.knowledge.mean,
        BEHAVIOR_NORMS.knowledge.sd
      ),
      appearance: this.calculateDeviationScore(
        rawScores.behavior_appearance,
        BEHAVIOR_NORMS.appearance.mean,
        BEHAVIOR_NORMS.appearance.sd
      ),
      challenge: this.calculateDeviationScore(
        rawScores.behavior_challenge,
        BEHAVIOR_NORMS.challenge.mean,
        BEHAVIOR_NORMS.challenge.sd
      ),
    };
  }

  /**
   * タイプを判定
   */
  private determineType(bigFive: BigFiveScores, thinkingPattern: ThinkingPattern): TypeResult {
    // 外向性と開放性の組み合わせでタイプを決定
    const isExtraverted = bigFive.extraversion >= 50;
    const isOpen = bigFive.openness >= 50;

    let typeCode: string;
    if (isExtraverted && isOpen) {
      typeCode = 'EE';
    } else if (isExtraverted && !isOpen) {
      typeCode = 'EI';
    } else if (!isExtraverted && isOpen) {
      typeCode = 'IE';
    } else {
      typeCode = 'II';
    }

    const typeDefinition = TYPE_DEFINITIONS[typeCode as keyof typeof TYPE_DEFINITIONS];

    // 特徴ラベルを生成
    const featureLabels: string[] = [...typeDefinition.features];

    // BigFiveに基づく追加ラベル
    if (bigFive.extraversion >= 60) {
      featureLabels.push(...FEATURE_LABELS.highExtraversion.slice(0, 2));
    } else if (bigFive.extraversion <= 40) {
      featureLabels.push(...FEATURE_LABELS.lowExtraversion.slice(0, 2));
    }

    if (bigFive.agreeableness >= 60) {
      featureLabels.push(...FEATURE_LABELS.highAgreeableness.slice(0, 1));
    }

    if (bigFive.conscientiousness >= 60) {
      featureLabels.push(...FEATURE_LABELS.highConscientiousness.slice(0, 1));
    }

    if (bigFive.neuroticism <= 40) {
      featureLabels.push(...FEATURE_LABELS.lowNeuroticism.slice(0, 1));
    }

    // 思考パターンに基づく追加ラベル
    const maxThinking = Math.max(thinkingPattern.R, thinkingPattern.A, thinkingPattern.S, thinkingPattern.E);
    if (thinkingPattern.R === maxThinking && thinkingPattern.R >= 55) {
      featureLabels.push(...FEATURE_LABELS.highR.slice(0, 1));
    }
    if (thinkingPattern.A === maxThinking && thinkingPattern.A >= 55) {
      featureLabels.push(...FEATURE_LABELS.highA.slice(0, 1));
    }
    if (thinkingPattern.S === maxThinking && thinkingPattern.S >= 55) {
      featureLabels.push(...FEATURE_LABELS.highS.slice(0, 1));
    }
    if (thinkingPattern.E === maxThinking && thinkingPattern.E >= 55) {
      featureLabels.push(...FEATURE_LABELS.highE.slice(0, 1));
    }

    // 重複を除去して最大8個まで
    const uniqueLabels = [...new Set(featureLabels)].slice(0, 8);

    return {
      typeName: typeDefinition.name,
      typeCode,
      featureLabels: uniqueLabels,
    };
  }

  /**
   * ストレス耐性を判定
   */
  private determineStressTolerance(neuroticismScore: number): StressToleranceLevel {
    // 神経症傾向が低いほどストレス耐性が高い
    if (neuroticismScore <= 40) {
      return StressToleranceLevel.HIGH;
    } else if (neuroticismScore <= 60) {
      return StressToleranceLevel.MEDIUM;
    } else {
      return StressToleranceLevel.LOW;
    }
  }

  /**
   * 回答の信頼性を評価
   */
  private assessReliability(answers: AnswerData[]): ReliabilityResult {
    const issues: string[] = [];
    let reliabilityScore = 100;

    // 1. 同一回答の連続チェック
    let consecutiveCount = 1;
    let maxConsecutive = 1;
    for (let i = 1; i < answers.length; i++) {
      if (answers[i].score === answers[i - 1].score) {
        consecutiveCount++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      } else {
        consecutiveCount = 1;
      }
    }
    if (maxConsecutive >= 10) {
      issues.push(`同一回答が${maxConsecutive}問連続しています`);
      reliabilityScore -= 30;
    } else if (maxConsecutive >= 7) {
      issues.push(`同一回答が${maxConsecutive}問連続しています`);
      reliabilityScore -= 15;
    }

    // 2. 極端な回答パターンチェック
    const extremeAnswers = answers.filter(a => a.score === 1 || a.score === 7).length;
    const extremeRatio = extremeAnswers / answers.length;
    if (extremeRatio > 0.7) {
      issues.push('極端な回答（1または7）の割合が高すぎます');
      reliabilityScore -= 25;
    } else if (extremeRatio > 0.5) {
      issues.push('極端な回答（1または7）の割合がやや高いです');
      reliabilityScore -= 10;
    }

    // 3. 中央値回答の過多チェック
    const middleAnswers = answers.filter(a => a.score === 4).length;
    const middleRatio = middleAnswers / answers.length;
    if (middleRatio > 0.6) {
      issues.push('中央値（4）の回答が多すぎます');
      reliabilityScore -= 20;
    } else if (middleRatio > 0.4) {
      issues.push('中央値（4）の回答がやや多いです');
      reliabilityScore -= 10;
    }

    // 4. 回答の分散チェック
    const scores = answers.map(a => a.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    if (variance < 0.5) {
      issues.push('回答のばらつきが少なすぎます');
      reliabilityScore -= 15;
    }

    // 5. 逆転項目の一貫性チェック
    // 同じカテゴリの通常項目と逆転項目の相関をチェック
    const categoryAnswers: Record<string, { normal: number[]; reverse: number[] }> = {};
    for (const answer of answers) {
      if (!categoryAnswers[answer.category]) {
        categoryAnswers[answer.category] = { normal: [], reverse: [] };
      }
      if (answer.isReverse) {
        categoryAnswers[answer.category].reverse.push(answer.score);
      } else {
        categoryAnswers[answer.category].normal.push(answer.score);
      }
    }

    let inconsistentCategories = 0;
    for (const category of Object.keys(categoryAnswers)) {
      const { normal, reverse } = categoryAnswers[category];
      if (normal.length > 0 && reverse.length > 0) {
        const normalMean = normal.reduce((a, b) => a + b, 0) / normal.length;
        const reverseMean = reverse.reduce((a, b) => a + b, 0) / reverse.length;
        // 通常項目と逆転項目の平均が同じ方向（両方高いまたは両方低い）だと矛盾
        if ((normalMean > 4.5 && reverseMean > 4.5) || (normalMean < 3.5 && reverseMean < 3.5)) {
          inconsistentCategories++;
        }
      }
    }
    if (inconsistentCategories >= 3) {
      issues.push('逆転項目との一貫性に問題があります');
      reliabilityScore -= 20;
    } else if (inconsistentCategories >= 2) {
      issues.push('一部の逆転項目との一貫性に注意が必要です');
      reliabilityScore -= 10;
    }

    // 信頼性ステータスを決定
    let status: ReliabilityStatus;
    if (reliabilityScore >= 70) {
      status = ReliabilityStatus.RELIABLE;
    } else if (reliabilityScore >= 50) {
      status = ReliabilityStatus.NEEDS_REVIEW;
    } else {
      status = ReliabilityStatus.UNRELIABLE;
    }

    return {
      status,
      issues,
      score: Math.max(0, reliabilityScore),
    };
  }

  /**
   * 活躍可能性スコアを計算
   */
  private calculatePotentialScores(
    bigFive: BigFiveScores,
    thinkingPattern: ThinkingPattern,
    behaviorPattern: BehaviorPattern
  ): PotentialScoreResult[] {
    const results: PotentialScoreResult[] = [];

    for (const job of JOB_REQUIREMENTS) {
      let totalScore = 0;
      let totalWeight = 0;
      const matchingFactors: string[] = [];

      // BigFiveの評価
      for (const [factor, config] of Object.entries(job.weights.bigFive)) {
        const factorKey = factor as keyof BigFiveScores;
        const score = bigFive[factorKey];
        const { weight, ideal } = config;

        let factorScore = 0;
        if (ideal === 'high') {
          factorScore = (score - 20) / 60 * 100; // 20-80を0-100に変換
        } else if (ideal === 'low') {
          factorScore = (80 - score) / 60 * 100;
        } else {
          // medium: 50に近いほど高スコア
          factorScore = 100 - Math.abs(score - 50) * 2;
        }

        totalScore += factorScore * weight;
        totalWeight += weight;

        // マッチング要因を記録
        if (factorScore >= 70) {
          const factorNames: Record<string, string> = {
            extraversion: '外向性',
            openness: '開放性',
            agreeableness: '協調性',
            conscientiousness: '誠実性',
            neuroticism: '情緒安定性',
          };
          matchingFactors.push(factorNames[factorKey] || factorKey);
        }
      }

      // 思考パターンの評価
      for (const [factor, config] of Object.entries(job.weights.thinking)) {
        const factorKey = factor as keyof ThinkingPattern;
        const score = thinkingPattern[factorKey];
        const { weight, ideal } = config;

        let factorScore = 0;
        if (ideal === 'high') {
          factorScore = (score - 20) / 60 * 100;
        } else if (ideal === 'low') {
          factorScore = (80 - score) / 60 * 100;
        } else {
          factorScore = 100 - Math.abs(score - 50) * 2;
        }

        totalScore += factorScore * weight;
        totalWeight += weight;

        if (factorScore >= 70) {
          const factorNames: Record<string, string> = {
            R: 'リーダー傾向',
            A: 'アナリスト傾向',
            S: 'サポーター傾向',
            E: 'エネルギッシュ傾向',
          };
          matchingFactors.push(factorNames[factorKey] || factorKey);
        }
      }

      // 行動パターンの評価
      for (const [factor, config] of Object.entries(job.weights.behavior)) {
        const factorKey = factor as keyof BehaviorPattern;
        const score = behaviorPattern[factorKey];
        const { weight, ideal } = config;

        let factorScore = 0;
        if (ideal === 'high') {
          factorScore = (score - 20) / 60 * 100;
        } else if (ideal === 'low') {
          factorScore = (80 - score) / 60 * 100;
        } else {
          factorScore = 100 - Math.abs(score - 50) * 2;
        }

        totalScore += factorScore * weight;
        totalWeight += weight;

        if (factorScore >= 70) {
          const factorNames: Record<string, string> = {
            efficiency: '効率重視',
            friendliness: '友好重視',
            knowledge: '知識重視',
            appearance: '体裁重視',
            challenge: '挑戦重視',
          };
          matchingFactors.push(factorNames[factorKey] || factorKey);
        }
      }

      // 最終スコアを計算（0-100）
      const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

      // グレードを決定
      let grade: PotentialGrade;
      if (finalScore >= 80) {
        grade = PotentialGrade.A;
      } else if (finalScore >= 60) {
        grade = PotentialGrade.B;
      } else if (finalScore >= 40) {
        grade = PotentialGrade.C;
      } else {
        grade = PotentialGrade.D;
      }

      results.push({
        jobType: job.jobType,
        score: finalScore,
        grade,
        matchingFactors: [...new Set(matchingFactors)].slice(0, 5),
      });
    }

    // スコアの高い順にソート
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * 職種一覧を取得
   */
  getJobTypes(): string[] {
    return JOB_REQUIREMENTS.map(job => job.jobType);
  }

  /**
   * 職種の詳細を取得
   */
  getJobTypeDetails(jobType: string): typeof JOB_REQUIREMENTS[0] | undefined {
    return JOB_REQUIREMENTS.find(job => job.jobType === jobType);
  }
}

// シングルトンインスタンス
export const diagnosisCalculationService = new DiagnosisCalculationService();
