import { PrismaClient, BrushUpTriggerType, DiagnosisResult, ExternalDiagnosis, InterviewComment } from '@prisma/client';
import crypto from 'crypto';
import { openaiService, BrushUpInput, BrushUpAIResponse } from './openai.service';

const prisma = new PrismaClient();

// ブラッシュアップ結果の型
interface BrushUpResult {
  success: boolean;
  diagnosisResultId: string;
  brushUpHistoryId?: string;
  version?: string;
  changes?: {
    featureLabels: { previous: string[]; updated: string[] };
    thinkingPattern?: { previous: Record<string, number>; updated: Record<string, number> };
    behaviorPattern?: { previous: Record<string, number>; updated: Record<string, number> };
    bigFive?: { previous: Record<string, number>; updated: Record<string, number> };
  };
  aiReasoning?: string;
  confidence?: number;
  riskFlags?: string[];
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// バージョン差分の型
interface VersionDiff {
  version: string;
  previousVersion: string;
  changes: Array<{
    field: string;
    category?: string;
    previousValue: any;
    newValue: any;
    changeAmount?: number;
  }>;
  triggerType: string;
  aiReasoning: string;
  confidence: number;
  riskFlags: string[];
  createdAt: Date;
}

class AIBrushUpService {
  /**
   * ブラッシュアップをトリガー
   */
  async triggerBrushUp(
    userId: string,
    triggerType: BrushUpTriggerType,
    triggerSourceId?: string
  ): Promise<BrushUpResult> {
    try {
      // 1. 現在の診断結果を取得
      const diagnosisResult = await prisma.diagnosisResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!diagnosisResult) {
        return {
          success: false,
          diagnosisResultId: '',
          error: '診断結果が見つかりません',
        };
      }

      // 2. 関連データを収集
      const collectedData = await this.collectData(userId, diagnosisResult.id);

      // 3. データが不十分な場合はスキップ
      if (!this.hasEnoughData(collectedData, triggerType)) {
        return {
          success: true,
          diagnosisResultId: diagnosisResult.id,
          skipped: true,
          skipReason: 'ブラッシュアップに必要なデータが不十分です',
        };
      }

      // 4. AIプロンプト用の入力を構築
      const brushUpInput = this.buildBrushUpInput(diagnosisResult, collectedData, triggerType);

      // 5. OpenAI API呼び出し
      const aiResponse = await openaiService.generateBrushUp(brushUpInput);

      if (!aiResponse.success || !aiResponse.data) {
        // AI呼び出し失敗時はログを記録して終了
        await this.logAIGeneration(
          diagnosisResult.id,
          brushUpInput,
          null,
          'suppressed',
          aiResponse.error || 'AI呼び出しに失敗しました'
        );

        return {
          success: false,
          diagnosisResultId: diagnosisResult.id,
          error: aiResponse.error || 'AI呼び出しに失敗しました',
        };
      }

      // 6. 信頼度が低い場合はスキップ
      if (aiResponse.data.confidence < 50) {
        await this.logAIGeneration(
          diagnosisResult.id,
          brushUpInput,
          aiResponse.data,
          'suppressed',
          '信頼度が低いため適用をスキップ'
        );

        return {
          success: true,
          diagnosisResultId: diagnosisResult.id,
          skipped: true,
          skipReason: `信頼度が低いため適用をスキップしました（信頼度: ${aiResponse.data.confidence}%）`,
          confidence: aiResponse.data.confidence,
          riskFlags: aiResponse.data.riskFlags,
          aiReasoning: aiResponse.data.reasoning,
        };
      }

      // 7. 結果を適用
      const result = await this.applyBrushUp(
        diagnosisResult,
        aiResponse.data,
        triggerType,
        triggerSourceId
      );

      // 8. AI生成ログを記録
      await this.logAIGeneration(
        diagnosisResult.id,
        brushUpInput,
        aiResponse.data,
        'shown',
        undefined,
        aiResponse.usage
      );

      return result;
    } catch (error: any) {
      console.error('BrushUp error:', error);
      return {
        success: false,
        diagnosisResultId: '',
        error: error.message || 'ブラッシュアップ処理中にエラーが発生しました',
      };
    }
  }

  /**
   * 手動ブラッシュアップを実行
   */
  async manualBrushUp(userId: string, executorId: string): Promise<BrushUpResult> {
    // 権限チェックは呼び出し元で行う
    return this.triggerBrushUp(userId, BrushUpTriggerType.MANUAL);
  }

  /**
   * ブラッシュアップ履歴を取得
   */
  async getBrushUpHistory(userId: string): Promise<any[]> {
    const diagnosisResult = await prisma.diagnosisResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!diagnosisResult) {
      return [];
    }

    const history = await prisma.brushUpHistory.findMany({
      where: { diagnosisResultId: diagnosisResult.id },
      orderBy: { createdAt: 'desc' },
    });

    return history.map((h) => ({
      id: h.id,
      version: h.version,
      triggerType: h.triggerType,
      previousData: h.previousData,
      updatedData: h.updatedData,
      aiReasoning: h.aiReasoning,
      createdAt: h.createdAt,
    }));
  }

  /**
   * バージョン間の差分を取得
   */
  async getVersionDiff(historyId: string): Promise<VersionDiff | null> {
    const history = await prisma.brushUpHistory.findUnique({
      where: { id: historyId },
    });

    if (!history) {
      return null;
    }

    const previousData = history.previousData as any;
    const updatedData = history.updatedData as any;

    const changes: VersionDiff['changes'] = [];

    // 特徴ラベルの変更
    if (previousData.featureLabels && updatedData.featureLabels) {
      const added = updatedData.featureLabels.filter(
        (l: string) => !previousData.featureLabels.includes(l)
      );
      const removed = previousData.featureLabels.filter(
        (l: string) => !updatedData.featureLabels.includes(l)
      );

      if (added.length > 0 || removed.length > 0) {
        changes.push({
          field: 'featureLabels',
          previousValue: previousData.featureLabels,
          newValue: updatedData.featureLabels,
        });
      }
    }

    // BigFiveの変更
    if (previousData.bigFive && updatedData.bigFive) {
      for (const key of Object.keys(previousData.bigFive)) {
        if (previousData.bigFive[key] !== updatedData.bigFive[key]) {
          changes.push({
            field: 'bigFive',
            category: key,
            previousValue: previousData.bigFive[key],
            newValue: updatedData.bigFive[key],
            changeAmount: updatedData.bigFive[key] - previousData.bigFive[key],
          });
        }
      }
    }

    // 思考パターンの変更
    if (previousData.thinkingPattern && updatedData.thinkingPattern) {
      for (const key of Object.keys(previousData.thinkingPattern)) {
        if (previousData.thinkingPattern[key] !== updatedData.thinkingPattern[key]) {
          changes.push({
            field: 'thinkingPattern',
            category: key,
            previousValue: previousData.thinkingPattern[key],
            newValue: updatedData.thinkingPattern[key],
            changeAmount: updatedData.thinkingPattern[key] - previousData.thinkingPattern[key],
          });
        }
      }
    }

    // 行動パターンの変更
    if (previousData.behaviorPattern && updatedData.behaviorPattern) {
      for (const key of Object.keys(previousData.behaviorPattern)) {
        if (previousData.behaviorPattern[key] !== updatedData.behaviorPattern[key]) {
          changes.push({
            field: 'behaviorPattern',
            category: key,
            previousValue: previousData.behaviorPattern[key],
            newValue: updatedData.behaviorPattern[key],
            changeAmount: updatedData.behaviorPattern[key] - previousData.behaviorPattern[key],
          });
        }
      }
    }

    // AI生成ログから信頼度とリスクフラグを取得
    const aiLog = await prisma.aiGenerationLog.findFirst({
      where: {
        diagnosisResultId: history.diagnosisResultId,
        createdAt: {
          gte: new Date(history.createdAt.getTime() - 60000), // 1分以内
          lte: new Date(history.createdAt.getTime() + 60000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      version: history.version,
      previousVersion: this.getPreviousVersion(history.version),
      changes,
      triggerType: history.triggerType,
      aiReasoning: history.aiReasoning,
      confidence: (aiLog?.confidence as number) || 0,
      riskFlags: ((aiLog?.outputData as any)?.riskFlags as string[]) || [],
      createdAt: history.createdAt,
    };
  }

  /**
   * 関連データを収集
   */
  private async collectData(
    userId: string,
    diagnosisResultId: string
  ): Promise<{
    mbti: ExternalDiagnosis | null;
    animalFortune: ExternalDiagnosis | null;
    interviewComments: InterviewComment[];
  }> {
    // MBTI診断を取得
    const mbti = await prisma.externalDiagnosis.findFirst({
      where: {
        userId,
        type: 'MBTI',
      },
    });

    // 動物占い診断を取得
    const animalFortune = await prisma.externalDiagnosis.findFirst({
      where: {
        userId,
        type: 'ANIMAL_FORTUNE',
      },
    });

    // 面接コメントを取得（候補者として登録されている場合）
    const candidate = await prisma.candidate.findFirst({
      where: { userId },
    });

    let interviewComments: InterviewComment[] = [];
    if (candidate) {
      interviewComments = await prisma.interviewComment.findMany({
        where: { candidateId: candidate.id },
        orderBy: { createdAt: 'desc' },
        take: 10, // 最新10件
      });
    }

    return { mbti, animalFortune, interviewComments };
  }

  /**
   * データが十分かチェック
   */
  private hasEnoughData(
    data: {
      mbti: ExternalDiagnosis | null;
      animalFortune: ExternalDiagnosis | null;
      interviewComments: InterviewComment[];
    },
    triggerType: BrushUpTriggerType
  ): boolean {
    // 初回は常に実行
    if (triggerType === BrushUpTriggerType.INITIAL) {
      return true;
    }

    // 手動実行は何かしらのデータがあれば実行
    if (triggerType === BrushUpTriggerType.MANUAL) {
      return data.mbti !== null || data.animalFortune !== null || data.interviewComments.length > 0;
    }

    // トリガータイプに応じたデータがあるかチェック
    switch (triggerType) {
      case BrushUpTriggerType.MBTI_ADDED:
        return data.mbti !== null;
      case BrushUpTriggerType.ANIMAL_ADDED:
        return data.animalFortune !== null;
      case BrushUpTriggerType.INTERVIEW_COMMENT:
        return data.interviewComments.length > 0;
      default:
        return false;
    }
  }

  /**
   * AI入力データを構築
   */
  private buildBrushUpInput(
    diagnosisResult: DiagnosisResult,
    data: {
      mbti: ExternalDiagnosis | null;
      animalFortune: ExternalDiagnosis | null;
      interviewComments: InterviewComment[];
    },
    triggerType: BrushUpTriggerType
  ): BrushUpInput {
    const bigFive = diagnosisResult.bigFive as Record<string, number>;
    const thinkingPattern = diagnosisResult.thinkingPattern as Record<string, number>;
    const behaviorPattern = diagnosisResult.behaviorPattern as Record<string, number>;
    const featureLabels = diagnosisResult.featureLabels as string[];

    const input: BrushUpInput = {
      currentDiagnosis: {
        typeName: diagnosisResult.typeName,
        typeCode: diagnosisResult.typeCode,
        featureLabels,
        bigFive,
        thinkingPattern,
        behaviorPattern,
      },
      triggerType,
    };

    // MBTI情報を追加
    if (data.mbti) {
      const mbtiResult = data.mbti.result as any;
      input.mbti = {
        type: mbtiResult.type,
        indicators: mbtiResult.indicators,
      };
    }

    // 動物占い情報を追加
    if (data.animalFortune) {
      const animalResult = data.animalFortune.result as any;
      input.animalFortune = {
        animal: animalResult.animal,
        color: animalResult.color,
        detail60: animalResult.detail60,
      };
    }

    // 面接コメント情報を追加
    if (data.interviewComments.length > 0) {
      input.interviewComments = data.interviewComments.map((comment) => ({
        comment: comment.comment,
        rating: comment.rating,
        tags: (comment.tags as string[]) || [],
        structuredEvaluation: comment.structuredEvaluation as Record<string, any> | undefined,
      }));
    }

    return input;
  }

  /**
   * ブラッシュアップ結果を適用
   */
  private async applyBrushUp(
    diagnosisResult: DiagnosisResult,
    aiResponse: BrushUpAIResponse,
    triggerType: BrushUpTriggerType,
    triggerSourceId?: string
  ): Promise<BrushUpResult> {
    const previousData = {
      featureLabels: diagnosisResult.featureLabels,
      bigFive: diagnosisResult.bigFive,
      thinkingPattern: diagnosisResult.thinkingPattern,
      behaviorPattern: diagnosisResult.behaviorPattern,
    };

    // 新しいバージョン番号を生成
    const newVersion = this.incrementVersion(diagnosisResult.version);

    // 調整後のスコアを構築（最大±5の制限を適用）
    const currentBigFive = diagnosisResult.bigFive as Record<string, number>;
    const currentThinkingPattern = diagnosisResult.thinkingPattern as Record<string, number>;
    const currentBehaviorPattern = diagnosisResult.behaviorPattern as Record<string, number>;

    const updatedBigFive = this.applyScoreAdjustments(
      currentBigFive,
      aiResponse.adjustedScores.bigFive || {}
    );
    const updatedThinkingPattern = this.applyScoreAdjustments(
      currentThinkingPattern,
      aiResponse.adjustedScores.thinkingPattern || {}
    );
    const updatedBehaviorPattern = this.applyScoreAdjustments(
      currentBehaviorPattern,
      aiResponse.adjustedScores.behaviorPattern || {}
    );

    const updatedData = {
      featureLabels: aiResponse.updatedFeatureLabels,
      bigFive: updatedBigFive,
      thinkingPattern: updatedThinkingPattern,
      behaviorPattern: updatedBehaviorPattern,
    };

    // トランザクションで更新
    const [updatedDiagnosis, brushUpHistory] = await prisma.$transaction([
      // 診断結果を更新
      prisma.diagnosisResult.update({
        where: { id: diagnosisResult.id },
        data: {
          featureLabels: updatedData.featureLabels,
          bigFive: updatedData.bigFive,
          thinkingPattern: updatedData.thinkingPattern,
          behaviorPattern: updatedData.behaviorPattern,
          version: newVersion,
          updatedAt: new Date(),
        },
      }),
      // ブラッシュアップ履歴を作成
      prisma.brushUpHistory.create({
        data: {
          diagnosisResultId: diagnosisResult.id,
          version: newVersion,
          triggerType,
          triggerSourceId,
          previousData,
          updatedData,
          aiReasoning: aiResponse.reasoning,
        },
      }),
    ]);

    return {
      success: true,
      diagnosisResultId: diagnosisResult.id,
      brushUpHistoryId: brushUpHistory.id,
      version: newVersion,
      changes: {
        featureLabels: {
          previous: previousData.featureLabels as string[],
          updated: updatedData.featureLabels,
        },
        thinkingPattern: {
          previous: currentThinkingPattern,
          updated: updatedThinkingPattern,
        },
        behaviorPattern: {
          previous: currentBehaviorPattern,
          updated: updatedBehaviorPattern,
        },
        bigFive: {
          previous: currentBigFive,
          updated: updatedBigFive,
        },
      },
      aiReasoning: aiResponse.reasoning,
      confidence: aiResponse.confidence,
      riskFlags: aiResponse.riskFlags,
    };
  }

  /**
   * スコア調整を適用（最大±5の制限付き）
   */
  private applyScoreAdjustments(
    current: Record<string, number>,
    adjustments: Record<string, number | undefined>
  ): Record<string, number> {
    const result = { ...current };
    const MAX_ADJUSTMENT = 5;
    const MIN_SCORE = 20;
    const MAX_SCORE = 80;

    for (const [key, newValue] of Object.entries(adjustments)) {
      if (newValue !== undefined && current[key] !== undefined) {
        const currentValue = current[key];
        let adjustment = newValue - currentValue;

        // 調整幅を制限
        if (adjustment > MAX_ADJUSTMENT) {
          adjustment = MAX_ADJUSTMENT;
        } else if (adjustment < -MAX_ADJUSTMENT) {
          adjustment = -MAX_ADJUSTMENT;
        }

        // 新しい値を計算し、範囲内に収める
        let finalValue = currentValue + adjustment;
        finalValue = Math.max(MIN_SCORE, Math.min(MAX_SCORE, finalValue));

        result[key] = Math.round(finalValue * 10) / 10;
      }
    }

    return result;
  }

  /**
   * バージョン番号をインクリメント
   */
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    if (parts.length === 2) {
      const major = parseInt(parts[0], 10);
      const minor = parseInt(parts[1], 10);
      return `${major}.${minor + 1}`;
    }
    return '1.1';
  }

  /**
   * 前のバージョン番号を取得
   */
  private getPreviousVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length === 2) {
      const major = parseInt(parts[0], 10);
      const minor = parseInt(parts[1], 10);
      if (minor > 0) {
        return `${major}.${minor - 1}`;
      }
      return `${major - 1}.0`;
    }
    return '1.0';
  }

  /**
   * AI生成ログを記録
   */
  private async logAIGeneration(
    diagnosisResultId: string,
    input: BrushUpInput,
    output: BrushUpAIResponse | null,
    displayDecision: 'shown' | 'suppressed' | 'fallback',
    errorMessage?: string,
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number; estimatedCost: number }
  ): Promise<void> {
    // 入力データのハッシュを生成
    const inputHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');

    await prisma.aiGenerationLog.create({
      data: {
        diagnosisResultId,
        inputSourceHash: inputHash,
        modelVersion: openaiService.getDefaultModel(),
        confidence: output?.confidence || 0,
        riskFlag: output?.riskFlags && output.riskFlags.length > 0,
        displayDecision,
        inputData: input as any,
        outputData: output as any,
      },
    });

    // コスト監視用ログ
    if (usage) {
      console.log('[AI Cost Log]', {
        diagnosisResultId,
        model: openaiService.getDefaultModel(),
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        estimatedCost: usage.estimatedCost,
        displayDecision,
        timestamp: new Date().toISOString(),
      });
    }

    if (errorMessage) {
      console.error('[AI Error Log]', {
        diagnosisResultId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const aiBrushUpService = new AIBrushUpService();
