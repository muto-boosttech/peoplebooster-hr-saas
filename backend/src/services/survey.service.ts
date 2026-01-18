import { PrismaClient, QuestionCategory, ReliabilityStatus, StressTolerance, PotentialGrade } from '@prisma/client';
import { AuthUser } from '../types/auth.types';
import {
  SubmitAnswersInput,
  CompleteSurveyInput,
  AnswerReliabilityResult,
} from '../validators/survey.validator';

const prisma = new PrismaClient();

// ========================================
// 型定義
// ========================================

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface QuestionResponse {
  id: string;
  orderNumber: number;
  questionText: string;
  category: QuestionCategory;
}

interface QuestionsPageResponse {
  page: number;
  totalPages: number;
  questionsPerPage: number;
  questions: QuestionResponse[];
}

interface SurveyProgress {
  completedPages: number[];
  remainingPages: number[];
  totalAnswered: number;
  totalQuestions: number;
  isComplete: boolean;
}

interface DiagnosisResultData {
  id: string;
  typeName: string;
  typeCode: string;
  featureLabels: string[];
  reliabilityStatus: ReliabilityStatus;
  stressTolerance: StressTolerance;
  thinkingPattern: Record<string, number>;
  behaviorPattern: Record<string, number>;
  bigFive: Record<string, number>;
  completedAt: Date;
}

// ========================================
// 診断設問サービス
// ========================================

export class SurveyService {
  private readonly QUESTIONS_PER_PAGE = 30;
  private readonly TOTAL_PAGES = 3;

  /**
   * 設問一覧取得（ページ別）
   */
  async getQuestions(
    page: number,
    currentUser: AuthUser
  ): Promise<ServiceResult<QuestionsPageResponse>> {
    try {
      const questions = await prisma.question.findMany({
        where: {
          page,
          isActive: true,
        },
        orderBy: {
          orderNumber: 'asc',
        },
        select: {
          id: true,
          orderNumber: true,
          questionText: true,
          category: true,
        },
      });

      return {
        success: true,
        data: {
          page,
          totalPages: this.TOTAL_PAGES,
          questionsPerPage: this.QUESTIONS_PER_PAGE,
          questions,
        },
      };
    } catch (error) {
      console.error('Error in getQuestions:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '設問の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 回答送信
   */
  async submitAnswers(
    input: SubmitAnswersInput,
    currentUser: AuthUser
  ): Promise<ServiceResult<{ saved: number; reliability: AnswerReliabilityResult }>> {
    try {
      const { page, answers } = input;

      // 該当ページの設問IDを取得
      const pageQuestions = await prisma.question.findMany({
        where: {
          page,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      const pageQuestionIds = new Set(pageQuestions.map((q) => q.id));

      // 回答の設問IDが該当ページのものか確認
      const invalidQuestionIds = answers.filter(
        (a) => !pageQuestionIds.has(a.questionId)
      );

      if (invalidQuestionIds.length > 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_QUESTIONS',
            message: '無効な設問IDが含まれています',
            details: invalidQuestionIds.map((a) => a.questionId),
          },
        };
      }

      // 回答の信頼性チェック
      const reliability = this.checkAnswerReliability(answers.map((a) => a.score));

      // 回答を保存（upsert）
      await prisma.$transaction(
        answers.map((answer) =>
          prisma.answer.upsert({
            where: {
              userId_questionId: {
                userId: currentUser.userId,
                questionId: answer.questionId,
              },
            },
            update: {
              score: answer.score,
            },
            create: {
              userId: currentUser.userId,
              questionId: answer.questionId,
              score: answer.score,
            },
          })
        )
      );

      return {
        success: true,
        data: {
          saved: answers.length,
          reliability,
        },
      };
    } catch (error) {
      console.error('Error in submitAnswers:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '回答の保存に失敗しました',
        },
      };
    }
  }

  /**
   * 回答進捗取得
   */
  async getProgress(currentUser: AuthUser): Promise<ServiceResult<SurveyProgress>> {
    try {
      // ユーザーの回答を取得
      const answers = await prisma.answer.findMany({
        where: {
          userId: currentUser.userId,
        },
        include: {
          question: {
            select: {
              page: true,
            },
          },
        },
      });

      // ページごとの回答数をカウント
      const pageAnswerCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      answers.forEach((answer) => {
        const page = answer.question.page;
        pageAnswerCounts[page] = (pageAnswerCounts[page] || 0) + 1;
      });

      // 完了ページと残りページを判定
      const completedPages: number[] = [];
      const remainingPages: number[] = [];

      for (let page = 1; page <= this.TOTAL_PAGES; page++) {
        if (pageAnswerCounts[page] >= this.QUESTIONS_PER_PAGE) {
          completedPages.push(page);
        } else {
          remainingPages.push(page);
        }
      }

      return {
        success: true,
        data: {
          completedPages,
          remainingPages,
          totalAnswered: answers.length,
          totalQuestions: this.QUESTIONS_PER_PAGE * this.TOTAL_PAGES,
          isComplete: completedPages.length === this.TOTAL_PAGES,
        },
      };
    } catch (error) {
      console.error('Error in getProgress:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '進捗の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 診断完了・結果計算
   */
  async completeSurvey(
    input: CompleteSurveyInput,
    currentUser: AuthUser
  ): Promise<ServiceResult<DiagnosisResultData>> {
    try {
      // 全90問回答済みチェック
      const progressResult = await this.getProgress(currentUser);
      if (!progressResult.success || !progressResult.data?.isComplete) {
        return {
          success: false,
          error: {
            code: 'INCOMPLETE_SURVEY',
            message: '全ての設問に回答してください',
            details: progressResult.data,
          },
        };
      }

      // 既存の診断結果があるか確認
      const existingResult = await prisma.diagnosisResult.findFirst({
        where: {
          userId: currentUser.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // 全回答を取得
      const answers = await prisma.answer.findMany({
        where: {
          userId: currentUser.userId,
        },
        include: {
          question: true,
        },
      });

      // 診断結果を計算
      const calculationResult = this.calculateDiagnosisResult(answers);

      // 回答の信頼性を判定
      const allScores = answers.map((a) => a.score);
      const reliability = this.checkAnswerReliability(allScores);
      const reliabilityStatus = this.determineReliabilityStatus(reliability);

      // 診断結果を保存
      const diagnosisResult = await prisma.$transaction(async (tx) => {
        // ユーザー情報更新（オプション）
        if (input.nickname || input.email) {
          await tx.user.update({
            where: { id: currentUser.userId },
            data: {
              nickname: input.nickname || undefined,
              email: input.email || undefined,
            },
          });
        }

        // 診断結果作成
        const result = await tx.diagnosisResult.create({
          data: {
            userId: currentUser.userId,
            typeName: calculationResult.typeName,
            typeCode: calculationResult.typeCode,
            featureLabels: calculationResult.featureLabels,
            reliabilityStatus,
            stressTolerance: calculationResult.stressTolerance,
            thinkingPattern: calculationResult.thinkingPattern,
            behaviorPattern: calculationResult.behaviorPattern,
            bigFive: calculationResult.bigFive,
            rawScores: calculationResult.rawScores,
            version: existingResult ? this.incrementVersion(existingResult.version) : 'v1.0',
            completedAt: new Date(),
          },
        });

        // 活躍可能性スコア計算・保存
        const potentialScores = this.calculatePotentialScores(calculationResult);
        await tx.potentialScore.createMany({
          data: potentialScores.map((score) => ({
            diagnosisResultId: result.id,
            jobType: score.jobType,
            grade: score.grade,
            score: score.score,
          })),
        });

        return result;
      });

      return {
        success: true,
        data: {
          id: diagnosisResult.id,
          typeName: diagnosisResult.typeName,
          typeCode: diagnosisResult.typeCode,
          featureLabels: diagnosisResult.featureLabels as string[],
          reliabilityStatus: diagnosisResult.reliabilityStatus,
          stressTolerance: diagnosisResult.stressTolerance,
          thinkingPattern: diagnosisResult.thinkingPattern as Record<string, number>,
          behaviorPattern: diagnosisResult.behaviorPattern as Record<string, number>,
          bigFive: diagnosisResult.bigFive as Record<string, number>,
          completedAt: diagnosisResult.completedAt!,
        },
      };
    } catch (error) {
      console.error('Error in completeSurvey:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '診断結果の計算に失敗しました',
        },
      };
    }
  }

  /**
   * 回答の信頼性チェック
   */
  private checkAnswerReliability(scores: number[]): AnswerReliabilityResult {
    const issues: string[] = [];

    // ストレートライニング検出（同じ回答が連続）
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] === scores[i - 1]) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    const straightLining = maxConsecutive >= 10;
    if (straightLining) {
      issues.push('同じ回答が10問以上連続しています');
    }

    // 極端な回答の割合
    const extremeResponses = scores.filter((s) => s === 1 || s === 7).length;
    const extremeRatio = extremeResponses / scores.length;
    if (extremeRatio > 0.7) {
      issues.push('極端な回答（1または7）の割合が高すぎます');
    }

    // 回答パターンの一貫性（標準偏差が低すぎる）
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 0.5) {
      issues.push('回答のばらつきが少なすぎます');
    }

    return {
      isReliable: issues.length === 0,
      issues,
      details: {
        straightLining,
        extremeResponses,
        inconsistentPairs: 0, // 逆転項目との整合性チェックは後で実装
      },
    };
  }

  /**
   * 信頼性ステータス判定
   */
  private determineReliabilityStatus(reliability: AnswerReliabilityResult): ReliabilityStatus {
    if (reliability.isReliable) {
      return ReliabilityStatus.RELIABLE;
    }
    if (reliability.issues.length >= 2) {
      return ReliabilityStatus.UNRELIABLE;
    }
    return ReliabilityStatus.NEEDS_REVIEW;
  }

  /**
   * 診断結果計算
   */
  private calculateDiagnosisResult(
    answers: Array<{
      score: number;
      question: {
        category: QuestionCategory;
        isReverse: boolean;
      };
    }>
  ): {
    typeName: string;
    typeCode: string;
    featureLabels: string[];
    stressTolerance: StressTolerance;
    thinkingPattern: Record<string, number>;
    behaviorPattern: Record<string, number>;
    bigFive: Record<string, number>;
    rawScores: Record<string, number>;
  } {
    // カテゴリ別にスコアを集計
    const categoryScores: Record<string, number[]> = {
      EXTRAVERSION: [],
      OPENNESS: [],
      AGREEABLENESS: [],
      CONSCIENTIOUSNESS: [],
      NEUROTICISM: [],
      THINKING: [],
      BEHAVIOR: [],
    };

    answers.forEach((answer) => {
      const category = answer.question.category;
      let score = answer.score;
      
      // 逆転項目の場合はスコアを反転
      if (answer.question.isReverse) {
        score = 8 - score;
      }
      
      if (categoryScores[category]) {
        categoryScores[category].push(score);
      }
    });

    // 各カテゴリの平均スコアを計算
    const calculateAverage = (scores: number[]): number => {
      if (scores.length === 0) return 50;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      // 1-7のスコアを偏差値（0-100）に変換
      return Math.round(((avg - 1) / 6) * 100);
    };

    // BigFive偏差値
    const bigFive = {
      extraversion: calculateAverage(categoryScores.EXTRAVERSION),
      openness: calculateAverage(categoryScores.OPENNESS),
      agreeableness: calculateAverage(categoryScores.AGREEABLENESS),
      conscientiousness: calculateAverage(categoryScores.CONSCIENTIOUSNESS),
      neuroticism: calculateAverage(categoryScores.NEUROTICISM),
    };

    // 思考パターン（R,A,S,E）- THINKINGカテゴリから算出
    const thinkingScores = categoryScores.THINKING;
    const thinkingPattern = {
      R: calculateAverage(thinkingScores.slice(0, 4)),  // 論理的思考
      A: calculateAverage(thinkingScores.slice(4, 8)),  // 分析的思考
      S: calculateAverage(thinkingScores.slice(8, 12)), // 戦略的思考
      E: calculateAverage(thinkingScores.slice(12, 15)), // 感情的思考
    };

    // 行動パターン
    const behaviorPattern = {
      efficiency: Math.round((bigFive.conscientiousness + thinkingPattern.R) / 2),
      friendliness: Math.round((bigFive.agreeableness + bigFive.extraversion) / 2),
      knowledge: Math.round((bigFive.openness + thinkingPattern.A) / 2),
      appearance: Math.round((100 - bigFive.neuroticism + bigFive.extraversion) / 2),
      challenge: Math.round((bigFive.openness + thinkingPattern.S) / 2),
    };

    // タイプ判定
    const { typeName, typeCode } = this.determineType(bigFive, thinkingPattern);

    // 特徴ラベル生成
    const featureLabels = this.generateFeatureLabels(bigFive, thinkingPattern, behaviorPattern);

    // ストレス耐性判定
    const stressTolerance = this.determineStressTolerance(bigFive);

    return {
      typeName,
      typeCode,
      featureLabels,
      stressTolerance,
      thinkingPattern,
      behaviorPattern,
      bigFive,
      rawScores: {
        ...Object.fromEntries(
          Object.entries(categoryScores).map(([k, v]) => [
            k,
            v.reduce((a, b) => a + b, 0),
          ])
        ),
      },
    };
  }

  /**
   * タイプ判定
   */
  private determineType(
    bigFive: Record<string, number>,
    thinkingPattern: Record<string, number>
  ): { typeName: string; typeCode: string } {
    // 外向性と論理性でタイプを判定
    const isExtraverted = bigFive.extraversion >= 50;
    const isLogical = thinkingPattern.R >= 50;

    const typeMap: Record<string, { name: string; code: string }> = {
      'EL': { name: 'リーダー型', code: 'EL' },
      'EE': { name: 'エンターテイナー型', code: 'EE' },
      'IL': { name: 'アナリスト型', code: 'IL' },
      'IE': { name: 'クリエイター型', code: 'IE' },
    };

    const key = `${isExtraverted ? 'E' : 'I'}${isLogical ? 'L' : 'E'}`;
    return typeMap[key] || { name: '標準型', code: 'ST' };
  }

  /**
   * 特徴ラベル生成
   */
  private generateFeatureLabels(
    bigFive: Record<string, number>,
    thinkingPattern: Record<string, number>,
    behaviorPattern: Record<string, number>
  ): string[] {
    const labels: string[] = [];

    // BigFiveに基づくラベル
    if (bigFive.extraversion >= 70) labels.push('社交的');
    if (bigFive.extraversion <= 30) labels.push('内省的');
    if (bigFive.openness >= 70) labels.push('創造的');
    if (bigFive.agreeableness >= 70) labels.push('協調的');
    if (bigFive.conscientiousness >= 70) labels.push('計画的');
    if (bigFive.neuroticism <= 30) labels.push('安定的');

    // 思考パターンに基づくラベル
    if (thinkingPattern.R >= 70) labels.push('論理的');
    if (thinkingPattern.A >= 70) labels.push('分析的');
    if (thinkingPattern.S >= 70) labels.push('戦略的');

    // 行動パターンに基づくラベル
    if (behaviorPattern.efficiency >= 70) labels.push('効率重視');
    if (behaviorPattern.challenge >= 70) labels.push('挑戦的');

    // 最大5つまで
    return labels.slice(0, 5);
  }

  /**
   * ストレス耐性判定
   */
  private determineStressTolerance(bigFive: Record<string, number>): StressTolerance {
    // 神経症傾向が低いほどストレス耐性が高い
    const stressScore = 100 - bigFive.neuroticism;
    
    if (stressScore >= 70) return StressTolerance.HIGH;
    if (stressScore >= 40) return StressTolerance.MEDIUM;
    return StressTolerance.LOW;
  }

  /**
   * 活躍可能性スコア計算
   */
  private calculatePotentialScores(
    result: {
      bigFive: Record<string, number>;
      thinkingPattern: Record<string, number>;
      behaviorPattern: Record<string, number>;
    }
  ): Array<{ jobType: string; grade: PotentialGrade; score: number }> {
    const jobTypes = [
      {
        name: '営業職',
        weights: { extraversion: 0.3, agreeableness: 0.2, conscientiousness: 0.2, efficiency: 0.15, friendliness: 0.15 },
      },
      {
        name: 'エンジニア',
        weights: { openness: 0.25, conscientiousness: 0.25, R: 0.2, A: 0.2, knowledge: 0.1 },
      },
      {
        name: 'マーケティング',
        weights: { openness: 0.25, extraversion: 0.2, S: 0.2, challenge: 0.2, knowledge: 0.15 },
      },
      {
        name: '人事',
        weights: { agreeableness: 0.3, extraversion: 0.2, friendliness: 0.2, conscientiousness: 0.15, E: 0.15 },
      },
      {
        name: '経理・財務',
        weights: { conscientiousness: 0.3, R: 0.25, A: 0.2, efficiency: 0.15, neuroticism: -0.1 },
      },
      {
        name: 'デザイナー',
        weights: { openness: 0.35, E: 0.2, challenge: 0.2, knowledge: 0.15, appearance: 0.1 },
      },
      {
        name: 'マネージャー',
        weights: { extraversion: 0.2, conscientiousness: 0.2, S: 0.2, agreeableness: 0.2, efficiency: 0.2 },
      },
      {
        name: 'カスタマーサポート',
        weights: { agreeableness: 0.3, friendliness: 0.25, conscientiousness: 0.2, extraversion: 0.15, neuroticism: -0.1 },
      },
    ];

    const allScores = {
      ...result.bigFive,
      ...result.thinkingPattern,
      ...result.behaviorPattern,
    };

    return jobTypes.map((job) => {
      let score = 0;
      let totalWeight = 0;

      Object.entries(job.weights).forEach(([key, weight]) => {
        const value = allScores[key] || 50;
        if (weight < 0) {
          // 負の重みの場合は逆転
          score += (100 - value) * Math.abs(weight);
        } else {
          score += value * weight;
        }
        totalWeight += Math.abs(weight);
      });

      const normalizedScore = Math.round(score / totalWeight);
      
      let grade: PotentialGrade;
      if (normalizedScore >= 75) grade = PotentialGrade.A;
      else if (normalizedScore >= 60) grade = PotentialGrade.B;
      else if (normalizedScore >= 45) grade = PotentialGrade.C;
      else grade = PotentialGrade.D;

      return {
        jobType: job.name,
        grade,
        score: normalizedScore,
      };
    });
  }

  /**
   * バージョン番号インクリメント
   */
  private incrementVersion(version: string): string {
    const match = version.match(/v(\d+)\.(\d+)/);
    if (!match) return 'v1.0';
    
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    return `v${major}.${minor + 1}`;
  }
}

// シングルトンインスタンス
export const surveyService = new SurveyService();
