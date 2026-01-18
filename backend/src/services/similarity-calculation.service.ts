import { prisma } from '../models';

// ========================================
// 型定義
// ========================================

export interface BigFiveVector {
  extraversion: number;
  openness: number;
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
}

export interface SimilarityResult {
  userId: string;
  similarUserId: string;
  similarityPercentage: number;
  differingFactors: string[];
}

export interface SimilarMember {
  userId: string;
  fullName: string | null;
  nickname: string;
  department: string | null;
  departmentId: string | null;
  similarityPercentage: number;
  differingFactors: string[];
}

// 因子名のマッピング
const FACTOR_NAMES: Record<keyof BigFiveVector, string> = {
  extraversion: '外向性',
  openness: '開放性',
  agreeableness: '協調性',
  conscientiousness: '誠実性',
  neuroticism: '神経症傾向',
};

// ========================================
// 類似度計算サービス
// ========================================

class SimilarityCalculationService {
  /**
   * コサイン類似度を計算
   * @param vectorA BigFiveベクトルA
   * @param vectorB BigFiveベクトルB
   * @returns 類似度（0-100%）
   */
  calculateCosineSimilarity(vectorA: BigFiveVector, vectorB: BigFiveVector): number {
    const keysA = Object.keys(vectorA) as (keyof BigFiveVector)[];
    
    // ベクトルの内積
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (const key of keysA) {
      const a = vectorA[key];
      const b = vectorB[key];
      dotProduct += a * b;
      magnitudeA += a * a;
      magnitudeB += b * b;
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    // コサイン類似度（-1〜1を0〜100%に変換）
    const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);
    // コサイン類似度は-1〜1の範囲だが、BigFiveスコアは正の値なので0〜1になる
    // 0〜100%に変換
    return Math.round(cosineSimilarity * 100);
  }

  /**
   * ユークリッド距離ベースの類似度を計算
   * @param vectorA BigFiveベクトルA
   * @param vectorB BigFiveベクトルB
   * @returns 類似度（0-100%）
   */
  calculateEuclideanSimilarity(vectorA: BigFiveVector, vectorB: BigFiveVector): number {
    const keys = Object.keys(vectorA) as (keyof BigFiveVector)[];
    
    let sumSquaredDiff = 0;
    for (const key of keys) {
      const diff = vectorA[key] - vectorB[key];
      sumSquaredDiff += diff * diff;
    }

    const distance = Math.sqrt(sumSquaredDiff);
    // 最大距離は各因子で60の差（20-80の範囲）× 5因子 = sqrt(5 * 60^2) ≈ 134
    const maxDistance = Math.sqrt(5 * 60 * 60);
    
    // 距離を類似度に変換（距離が0なら100%、最大距離なら0%）
    const similarity = (1 - distance / maxDistance) * 100;
    return Math.round(Math.max(0, similarity));
  }

  /**
   * 差が大きい因子を抽出
   * @param vectorA BigFiveベクトルA
   * @param vectorB BigFiveベクトルB
   * @param threshold 差の閾値（デフォルト15）
   * @returns 差が大きい因子名の配列
   */
  findDifferingFactors(
    vectorA: BigFiveVector,
    vectorB: BigFiveVector,
    threshold: number = 15
  ): string[] {
    const differingFactors: { factor: string; diff: number }[] = [];
    const keys = Object.keys(vectorA) as (keyof BigFiveVector)[];

    for (const key of keys) {
      const diff = Math.abs(vectorA[key] - vectorB[key]);
      if (diff >= threshold) {
        differingFactors.push({
          factor: FACTOR_NAMES[key],
          diff,
        });
      }
    }

    // 差が大きい順にソート
    differingFactors.sort((a, b) => b.diff - a.diff);

    return differingFactors.map(f => f.factor);
  }

  /**
   * 2ユーザー間の類似度を計算
   */
  async calculateSimilarityBetweenUsers(
    userId: string,
    targetUserId: string
  ): Promise<SimilarityResult | null> {
    // 両ユーザーの診断結果を取得
    const [userResult, targetResult] = await Promise.all([
      prisma.diagnosisResult.findFirst({
        where: { userId },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.diagnosisResult.findFirst({
        where: { userId: targetUserId },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    if (!userResult || !targetResult) {
      return null;
    }

    const vectorA = userResult.bigFive as unknown as BigFiveVector;
    const vectorB = targetResult.bigFive as unknown as BigFiveVector;

    if (!vectorA || !vectorB) {
      return null;
    }

    // コサイン類似度とユークリッド類似度の平均を使用
    const cosineSim = this.calculateCosineSimilarity(vectorA, vectorB);
    const euclideanSim = this.calculateEuclideanSimilarity(vectorA, vectorB);
    const similarityPercentage = Math.round((cosineSim + euclideanSim) / 2);

    const differingFactors = this.findDifferingFactors(vectorA, vectorB);

    return {
      userId,
      similarUserId: targetUserId,
      similarityPercentage,
      differingFactors,
    };
  }

  /**
   * 同一企業内の類似メンバーを検索
   * @param userId 対象ユーザーID
   * @param companyId 企業ID
   * @param minSimilarity 最小類似度（デフォルト70%）
   * @param limit 最大件数（デフォルト10）
   */
  async findSimilarMembers(
    userId: string,
    companyId: string,
    minSimilarity: number = 70,
    limit: number = 10
  ): Promise<SimilarMember[]> {
    // 対象ユーザーの診断結果を取得
    const userResult = await prisma.diagnosisResult.findFirst({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    if (!userResult || !userResult.bigFive) {
      return [];
    }

    const userVector = userResult.bigFive as unknown as BigFiveVector;

    // 同一企業内の他ユーザーで診断結果があるユーザーを取得
    const companyUsers = await prisma.user.findMany({
      where: {
        companyId,
        id: { not: userId },
        isActive: true,
      },
      include: {
        department: true,
        diagnosisResults: {
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    // 類似度を計算
    const similarMembers: SimilarMember[] = [];

    for (const user of companyUsers) {
      const latestResult = user.diagnosisResults[0];
      if (!latestResult || !latestResult.bigFive) {
        continue;
      }

      const targetVector = latestResult.bigFive as unknown as BigFiveVector;

      // 類似度を計算
      const cosineSim = this.calculateCosineSimilarity(userVector, targetVector);
      const euclideanSim = this.calculateEuclideanSimilarity(userVector, targetVector);
      const similarityPercentage = Math.round((cosineSim + euclideanSim) / 2);

      // 最小類似度以上のみ追加
      if (similarityPercentage >= minSimilarity) {
        const differingFactors = this.findDifferingFactors(userVector, targetVector);

        similarMembers.push({
          userId: user.id,
          fullName: user.fullName,
          nickname: user.nickname,
          department: user.department?.name || null,
          departmentId: user.departmentId,
          similarityPercentage,
          differingFactors,
        });
      }
    }

    // 類似度の高い順にソートして上位を返す
    similarMembers.sort((a, b) => b.similarityPercentage - a.similarityPercentage);

    return similarMembers.slice(0, limit);
  }

  /**
   * 類似度スコアをDBに保存
   */
  async saveSimilarityScore(result: SimilarityResult): Promise<void> {
    await prisma.similarityScore.upsert({
      where: {
        userId_similarUserId: {
          userId: result.userId,
          similarUserId: result.similarUserId,
        },
      },
      update: {
        similarityPercentage: result.similarityPercentage,
        differingFactors: result.differingFactors,
        calculatedAt: new Date(),
      },
      create: {
        userId: result.userId,
        similarUserId: result.similarUserId,
        similarityPercentage: result.similarityPercentage,
        differingFactors: result.differingFactors,
        calculatedAt: new Date(),
      },
    });
  }

  /**
   * 企業全体の類似度マトリクスを計算・保存
   * バッチ処理用
   */
  async calculateCompanySimilarityMatrix(companyId: string): Promise<number> {
    // 診断結果があるユーザーを取得
    const users = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        diagnosisResults: {
          some: {},
        },
      },
      include: {
        diagnosisResults: {
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    let savedCount = 0;

    // 全ペアの類似度を計算
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const userA = users[i];
        const userB = users[j];

        const resultA = userA.diagnosisResults[0];
        const resultB = userB.diagnosisResults[0];

        if (!resultA?.bigFive || !resultB?.bigFive) {
          continue;
        }

        const vectorA = resultA.bigFive as unknown as BigFiveVector;
        const vectorB = resultB.bigFive as unknown as BigFiveVector;

        const cosineSim = this.calculateCosineSimilarity(vectorA, vectorB);
        const euclideanSim = this.calculateEuclideanSimilarity(vectorA, vectorB);
        const similarityPercentage = Math.round((cosineSim + euclideanSim) / 2);

        const differingFactors = this.findDifferingFactors(vectorA, vectorB);

        // 双方向で保存
        await this.saveSimilarityScore({
          userId: userA.id,
          similarUserId: userB.id,
          similarityPercentage,
          differingFactors,
        });

        await this.saveSimilarityScore({
          userId: userB.id,
          similarUserId: userA.id,
          similarityPercentage,
          differingFactors,
        });

        savedCount += 2;
      }
    }

    return savedCount;
  }

  /**
   * キャッシュされた類似メンバーを取得
   */
  async getCachedSimilarMembers(
    userId: string,
    minSimilarity: number = 70,
    limit: number = 10
  ): Promise<SimilarMember[]> {
    const cachedScores = await prisma.similarityScore.findMany({
      where: {
        userId,
        similarityPercentage: { gte: minSimilarity },
      },
      orderBy: { similarityPercentage: 'desc' },
      take: limit,
      include: {
        similarUser: {
          include: {
            department: true,
          },
        },
      },
    });

    return cachedScores.map(score => ({
      userId: score.similarUserId,
      fullName: score.similarUser.fullName,
      nickname: score.similarUser.nickname,
      department: score.similarUser.department?.name || null,
      departmentId: score.similarUser.departmentId,
      similarityPercentage: Number(score.similarityPercentage),
      differingFactors: score.differingFactors as string[],
    }));
  }
}

// シングルトンインスタンス
export const similarityCalculationService = new SimilarityCalculationService();
