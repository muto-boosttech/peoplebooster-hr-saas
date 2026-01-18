import { PrismaClient, ExternalDiagnosisType, BrushUpTriggerType } from '@prisma/client';
import { 
  mbtiMappingService, 
  MBTIType, 
  MBTIIndicators, 
  AnimalCharacter, 
  AnimalColor,
  BigFiveTraits 
} from './mbti-mapping.service';
import { CreateMBTIDiagnosisInput, CreateAnimalFortuneDiagnosisInput } from '../validators/external-diagnosis.validator';

const prisma = new PrismaClient();

// MBTI診断結果の型
interface MBTIResult {
  type: MBTIType;
  indicators?: Partial<MBTIIndicators>;
}

// 動物占い診断結果の型
interface AnimalFortuneResult {
  animal: AnimalCharacter;
  color?: AnimalColor | null;
  detail60?: string | null;
}

// ブラッシュアップ結果の型
interface BrushUpResult {
  success: boolean;
  historyId?: string;
  version?: string;
  adjustments?: Partial<BigFiveTraits>;
  reasoning?: string;
  error?: string;
}

class ExternalDiagnosisService {
  /**
   * MBTI診断を登録/更新
   */
  async createOrUpdateMBTIDiagnosis(
    userId: string,
    input: CreateMBTIDiagnosisInput
  ): Promise<{ diagnosis: any; brushUpResult: BrushUpResult }> {
    const result: MBTIResult = {
      type: input.type,
      indicators: input.indicators,
    };

    // 既存の診断を確認
    const existing = await prisma.externalDiagnosis.findUnique({
      where: {
        userId_type: {
          userId,
          type: ExternalDiagnosisType.MBTI,
        },
      },
    });

    let diagnosis;
    if (existing) {
      // 更新
      diagnosis = await prisma.externalDiagnosis.update({
        where: { id: existing.id },
        data: {
          result: result as any,
          sourceUrl: input.sourceUrl,
          diagnosedAt: input.diagnosedAt,
          updatedAt: new Date(),
        },
      });
    } else {
      // 新規作成
      diagnosis = await prisma.externalDiagnosis.create({
        data: {
          userId,
          type: ExternalDiagnosisType.MBTI,
          result: result as any,
          sourceUrl: input.sourceUrl,
          diagnosedAt: input.diagnosedAt,
        },
      });
    }

    // AIブラッシュアップをトリガー
    const brushUpResult = await this.triggerBrushUp(
      userId,
      BrushUpTriggerType.MBTI_ADDED,
      diagnosis.id
    );

    return { diagnosis, brushUpResult };
  }

  /**
   * 動物占い診断を登録/更新
   */
  async createOrUpdateAnimalFortuneDiagnosis(
    userId: string,
    input: CreateAnimalFortuneDiagnosisInput
  ): Promise<{ diagnosis: any; brushUpResult: BrushUpResult }> {
    const result: AnimalFortuneResult = {
      animal: input.animal as AnimalCharacter,
      color: input.color as AnimalColor | null,
      detail60: input.detail60,
    };

    // 既存の診断を確認
    const existing = await prisma.externalDiagnosis.findUnique({
      where: {
        userId_type: {
          userId,
          type: ExternalDiagnosisType.ANIMAL_FORTUNE,
        },
      },
    });

    let diagnosis;
    if (existing) {
      // 更新
      diagnosis = await prisma.externalDiagnosis.update({
        where: { id: existing.id },
        data: {
          result: result as any,
          sourceUrl: input.sourceUrl,
          diagnosedAt: input.diagnosedAt,
          updatedAt: new Date(),
        },
      });
    } else {
      // 新規作成
      diagnosis = await prisma.externalDiagnosis.create({
        data: {
          userId,
          type: ExternalDiagnosisType.ANIMAL_FORTUNE,
          result: result as any,
          sourceUrl: input.sourceUrl,
          diagnosedAt: input.diagnosedAt,
        },
      });
    }

    // AIブラッシュアップをトリガー
    const brushUpResult = await this.triggerBrushUp(
      userId,
      BrushUpTriggerType.ANIMAL_ADDED,
      diagnosis.id
    );

    return { diagnosis, brushUpResult };
  }

  /**
   * ユーザーの外部診断一覧を取得
   */
  async getExternalDiagnoses(
    userId: string,
    type?: ExternalDiagnosisType
  ): Promise<any[]> {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const diagnoses = await prisma.externalDiagnosis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // プロファイル情報を付加
    return diagnoses.map((diagnosis) => {
      const result = diagnosis.result as any;
      let profile = null;

      if (diagnosis.type === ExternalDiagnosisType.MBTI && result.type) {
        profile = mbtiMappingService.getMBTIProfile(result.type as MBTIType);
      } else if (diagnosis.type === ExternalDiagnosisType.ANIMAL_FORTUNE && result.animal) {
        profile = mbtiMappingService.getAnimalProfile(result.animal as AnimalCharacter);
      }

      return {
        ...diagnosis,
        profile,
      };
    });
  }

  /**
   * 外部診断を削除
   */
  async deleteExternalDiagnosis(
    userId: string,
    diagnosisId: string
  ): Promise<void> {
    const diagnosis = await prisma.externalDiagnosis.findUnique({
      where: { id: diagnosisId },
    });

    if (!diagnosis) {
      throw new Error('外部診断が見つかりません');
    }

    if (diagnosis.userId !== userId) {
      throw new Error('この外部診断を削除する権限がありません');
    }

    await prisma.externalDiagnosis.delete({
      where: { id: diagnosisId },
    });
  }

  /**
   * AIブラッシュアップをトリガー
   */
  private async triggerBrushUp(
    userId: string,
    triggerType: BrushUpTriggerType,
    triggerSourceId: string
  ): Promise<BrushUpResult> {
    try {
      // 最新の診断結果を取得
      const diagnosisResult = await prisma.diagnosisResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!diagnosisResult) {
        return {
          success: false,
          error: '診断結果が見つかりません。先に性格診断を完了してください。',
        };
      }

      // 外部診断を取得
      const externalDiagnoses = await prisma.externalDiagnosis.findMany({
        where: { userId },
      });

      // 現在のBigFive値を取得
      const currentBigFive = diagnosisResult.bigFive as BigFiveTraits;

      // MBTI推定値を取得
      let mbtiEstimate: BigFiveTraits | undefined;
      const mbtiDiagnosis = externalDiagnoses.find(
        (d) => d.type === ExternalDiagnosisType.MBTI
      );
      if (mbtiDiagnosis) {
        const mbtiResult = mbtiDiagnosis.result as MBTIResult;
        mbtiEstimate = mbtiMappingService.estimateBigFiveFromMBTI(
          mbtiResult.type,
          mbtiResult.indicators
        );
      }

      // 動物占い推定値を取得
      let animalEstimate: BigFiveTraits | undefined;
      const animalDiagnosis = externalDiagnoses.find(
        (d) => d.type === ExternalDiagnosisType.ANIMAL_FORTUNE
      );
      if (animalDiagnosis) {
        const animalResult = animalDiagnosis.result as AnimalFortuneResult;
        animalEstimate = mbtiMappingService.estimateBigFiveFromAnimal(
          animalResult.animal,
          animalResult.color || undefined
        );
      }

      // 調整係数を計算
      const { adjustments, confidence, reasoning } = 
        mbtiMappingService.calculateBrushUpAdjustments(
          currentBigFive,
          mbtiEstimate,
          animalEstimate
        );

      // 調整がない場合はスキップ
      if (Object.keys(adjustments).length === 0) {
        return {
          success: true,
          reasoning: '外部診断と診断結果の間に有意な差異がないため、調整は行われませんでした。',
        };
      }

      // 新しいバージョン番号を生成
      const latestHistory = await prisma.brushUpHistory.findFirst({
        where: { diagnosisResultId: diagnosisResult.id },
        orderBy: { createdAt: 'desc' },
      });
      
      const currentVersion = latestHistory?.version || 'v1.0';
      const versionParts = currentVersion.replace('v', '').split('.');
      const newVersion = `v${versionParts[0]}.${parseInt(versionParts[1] || '0') + 1}`;

      // 更新後のBigFive値を計算
      const updatedBigFive: BigFiveTraits = {
        ...currentBigFive,
        ...adjustments,
      };

      // ブラッシュアップ履歴を作成
      const history = await prisma.brushUpHistory.create({
        data: {
          diagnosisResultId: diagnosisResult.id,
          version: newVersion,
          triggerType,
          triggerSourceId,
          previousData: {
            bigFive: currentBigFive,
          },
          updatedData: {
            bigFive: updatedBigFive,
            adjustments,
          },
          aiReasoning: reasoning,
        },
      });

      // 診断結果を更新
      await prisma.diagnosisResult.update({
        where: { id: diagnosisResult.id },
        data: {
          bigFive: updatedBigFive as any,
          version: newVersion,
          updatedAt: new Date(),
        },
      });

      // AI生成ログを記録（監査用）
      await prisma.aiGenerationLog.create({
        data: {
          userId,
          inputSourceHash: this.generateHash(JSON.stringify({
            currentBigFive,
            mbtiEstimate,
            animalEstimate,
          })),
          modelVersion: 'brush-up-v1.0',
          confidence,
          riskFlag: confidence < 60,
          displayDecision: 'SHOWN',
          inputData: {
            currentBigFive,
            mbtiEstimate,
            animalEstimate,
            triggerType,
          },
          outputData: {
            adjustments,
            updatedBigFive,
            reasoning,
          },
        },
      });

      return {
        success: true,
        historyId: history.id,
        version: newVersion,
        adjustments,
        reasoning,
      };
    } catch (error) {
      console.error('ブラッシュアップエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ブラッシュアップ処理中にエラーが発生しました',
      };
    }
  }

  /**
   * MBTIと診断結果の整合性をチェック
   */
  async checkMBTIConsistency(userId: string): Promise<{
    isConsistent: boolean;
    consistencyScore: number;
    discrepancies: string[];
  } | null> {
    const [diagnosisResult, mbtiDiagnosis] = await Promise.all([
      prisma.diagnosisResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.externalDiagnosis.findUnique({
        where: {
          userId_type: {
            userId,
            type: ExternalDiagnosisType.MBTI,
          },
        },
      }),
    ]);

    if (!diagnosisResult || !mbtiDiagnosis) {
      return null;
    }

    const mbtiResult = mbtiDiagnosis.result as MBTIResult;
    const diagnosisBigFive = diagnosisResult.bigFive as BigFiveTraits;

    return mbtiMappingService.checkMBTIConsistency(
      mbtiResult.type,
      diagnosisBigFive
    );
  }

  /**
   * 動物占いと診断結果の整合性をチェック
   */
  async checkAnimalConsistency(userId: string): Promise<{
    isConsistent: boolean;
    consistencyScore: number;
    discrepancies: string[];
  } | null> {
    const [diagnosisResult, animalDiagnosis] = await Promise.all([
      prisma.diagnosisResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.externalDiagnosis.findUnique({
        where: {
          userId_type: {
            userId,
            type: ExternalDiagnosisType.ANIMAL_FORTUNE,
          },
        },
      }),
    ]);

    if (!diagnosisResult || !animalDiagnosis) {
      return null;
    }

    const animalResult = animalDiagnosis.result as AnimalFortuneResult;
    const diagnosisBigFive = diagnosisResult.bigFive as BigFiveTraits;

    return mbtiMappingService.checkAnimalConsistency(
      animalResult.animal,
      diagnosisBigFive
    );
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

    return prisma.brushUpHistory.findMany({
      where: { diagnosisResultId: diagnosisResult.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * ハッシュ生成（監査用）
   */
  private generateHash(input: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}

export const externalDiagnosisService = new ExternalDiagnosisService();
