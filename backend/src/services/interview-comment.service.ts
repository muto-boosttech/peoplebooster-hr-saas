import { PrismaClient, Prisma } from '@prisma/client';
import {
  GetInterviewCommentsQuery,
  CreateInterviewCommentInput,
  UpdateInterviewCommentInput,
  RATING_DISPLAY_NAMES,
} from '../validators/interview-comment.validator';
import { AuthenticatedUser } from '../types/auth.types';

const prisma = new PrismaClient();

/**
 * 面接コメント一覧レスポンス型
 */
interface InterviewCommentListResponse {
  comments: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    averageRating: number;
    ratingDistribution: Record<number, number>;
    totalComments: number;
  };
}

/**
 * 面接コメント詳細レスポンス型
 */
interface InterviewCommentDetailResponse {
  id: string;
  candidateId: string;
  interviewer: {
    id: string;
    fullName: string | null;
    nickname: string;
  };
  interviewDate: Date;
  comment: string;
  rating: number;
  ratingDisplayName: string;
  tags: string[];
  structuredEvaluation: any | null;
  extractedFeaturesJson: any | null;
  createdAt: Date;
  updatedAt: Date;
}

class InterviewCommentService {
  /**
   * 候補者の面接コメント一覧を取得
   */
  async getCommentsByCandidateId(
    candidateId: string,
    query: GetInterviewCommentsQuery,
    user: AuthenticatedUser
  ): Promise<InterviewCommentListResponse> {
    const { page, limit, sortBy, sortOrder } = query;

    // 候補者の存在確認と権限チェック
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: candidateId,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    // 検索条件
    const where: Prisma.InterviewCommentWhereInput = {
      candidateId,
    };

    // ソート条件
    const orderBy: Prisma.InterviewCommentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 総件数を取得
    const total = await prisma.interviewComment.count({ where });

    // コメント一覧を取得
    const comments = await prisma.interviewComment.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    // 統計情報を計算
    const allComments = await prisma.interviewComment.findMany({
      where: { candidateId },
      select: { rating: true },
    });

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const c of allComments) {
      ratingDistribution[c.rating] = (ratingDistribution[c.rating] || 0) + 1;
      totalRating += c.rating;
    }

    const averageRating = allComments.length > 0 ? totalRating / allComments.length : 0;

    return {
      comments: comments.map((c) => ({
        id: c.id,
        candidateId: c.candidateId,
        interviewer: c.interviewer,
        interviewDate: c.interviewDate,
        comment: c.comment,
        rating: c.rating,
        ratingDisplayName: RATING_DISPLAY_NAMES[c.rating],
        tags: c.tags as string[],
        structuredEvaluation: c.structuredEvaluation,
        extractedFeaturesJson: c.extractedFeaturesJson,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        totalComments: allComments.length,
      },
    };
  }

  /**
   * 面接コメント詳細を取得
   */
  async getCommentById(
    id: string,
    user: AuthenticatedUser
  ): Promise<InterviewCommentDetailResponse | null> {
    const comment = await prisma.interviewComment.findUnique({
      where: { id },
      include: {
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
        candidate: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!comment) {
      return null;
    }

    // 権限チェック
    if (user.role !== 'SYSTEM_ADMIN' && comment.candidate.companyId !== user.companyId) {
      throw new Error('このコメントを閲覧する権限がありません');
    }

    return {
      id: comment.id,
      candidateId: comment.candidateId,
      interviewer: comment.interviewer,
      interviewDate: comment.interviewDate,
      comment: comment.comment,
      rating: comment.rating,
      ratingDisplayName: RATING_DISPLAY_NAMES[comment.rating],
      tags: comment.tags as string[],
      structuredEvaluation: comment.structuredEvaluation,
      extractedFeaturesJson: comment.extractedFeaturesJson,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * 面接コメントを作成
   */
  async createComment(
    candidateId: string,
    input: CreateInterviewCommentInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // 候補者の存在確認と権限チェック
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: candidateId,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    // コメントを作成
    const comment = await prisma.interviewComment.create({
      data: {
        candidateId,
        interviewerId: user.id,
        interviewDate: new Date(input.interviewDate),
        comment: input.comment,
        rating: input.rating,
        tags: input.tags || [],
      },
      include: {
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'CREATE', 'InterviewComment', comment.id, null, comment);

    // AIブラッシュアップをトリガー（オプション）
    if (input.triggerBrushUp) {
      await this.triggerAiBrushUp(candidate.userId, comment.id, user);
    }

    return {
      ...comment,
      ratingDisplayName: RATING_DISPLAY_NAMES[comment.rating],
    };
  }

  /**
   * 面接コメントを更新
   */
  async updateComment(
    id: string,
    input: UpdateInterviewCommentInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // コメントの存在確認
    const comment = await prisma.interviewComment.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error('コメントが見つかりません');
    }

    // 権限チェック（作成者のみ編集可能）
    if (comment.interviewerId !== user.id) {
      throw new Error('このコメントを編集する権限がありません');
    }

    const previousData = { ...comment };

    // 更新データを構築
    const updateData: Prisma.InterviewCommentUpdateInput = {};
    if (input.interviewDate) {
      updateData.interviewDate = new Date(input.interviewDate);
    }
    if (input.comment !== undefined) {
      updateData.comment = input.comment;
    }
    if (input.rating !== undefined) {
      updateData.rating = input.rating;
    }
    if (input.tags !== undefined) {
      updateData.tags = input.tags;
    }

    // コメントを更新
    const updatedComment = await prisma.interviewComment.update({
      where: { id },
      data: updateData,
      include: {
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'UPDATE', 'InterviewComment', id, previousData, updatedComment);

    return {
      ...updatedComment,
      ratingDisplayName: RATING_DISPLAY_NAMES[updatedComment.rating],
    };
  }

  /**
   * 面接コメントを削除
   */
  async deleteComment(id: string, user: AuthenticatedUser): Promise<void> {
    // コメントの存在確認
    const comment = await prisma.interviewComment.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error('コメントが見つかりません');
    }

    // 権限チェック（作成者またはCOMPANY_ADMIN以上）
    const isCreator = comment.interviewerId === user.id;
    const isAdmin = user.role === 'SYSTEM_ADMIN' || user.role === 'COMPANY_ADMIN';

    if (!isCreator && !isAdmin) {
      throw new Error('このコメントを削除する権限がありません');
    }

    // 会社の権限チェック
    if (user.role !== 'SYSTEM_ADMIN' && comment.candidate.companyId !== user.companyId) {
      throw new Error('このコメントを削除する権限がありません');
    }

    // コメントを削除
    await prisma.interviewComment.delete({
      where: { id },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'DELETE', 'InterviewComment', id, comment, null);
  }

  /**
   * AIブラッシュアップをトリガー
   * 注: 実際のブラッシュアップ処理は別途ジョブで実行される
   */
  private async triggerAiBrushUp(
    userId: string,
    commentId: string,
    user: AuthenticatedUser
  ): Promise<void> {
    try {
      // 候補者の診断結果を取得
      const candidate = await prisma.candidate.findFirst({
        where: {
          userId: userId,
        },
        include: {
          user: {
            include: {
              diagnosisResults: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!candidate?.user?.diagnosisResults?.[0]) {
        console.log(`[AI BrushUp] No diagnosis result found for user ${userId}`);
        return;
      }

      const diagnosisResult = candidate.user.diagnosisResults[0];

      // BrushUpHistoryを作成してトリガー
      await prisma.brushUpHistory.create({
        data: {
          diagnosisResultId: diagnosisResult.id,
          version: `${diagnosisResult.version || '1'}.${Date.now()}`,
          triggerType: 'INTERVIEW_COMMENT',
          triggerSourceId: commentId,
          previousData: diagnosisResult.rawScores || {},
          updatedData: {},
          aiReasoning: null,
          modelVersion: null,
          confidence: null,
          riskFlag: false,
          displayDecision: 'pending',
          inputSourceHash: null,
        },
      });

      console.log(`[AI BrushUp] Triggered for user ${userId} by interview comment ${commentId}`);
    } catch (error) {
      console.error('[AI BrushUp] Failed to trigger:', error);
      // エラーがあってもコメント作成は成功させる
    }
  }

  /**
   * 監査ログを作成
   */
  private async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    previousData: any,
    newData: any
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action: action as any,
        entityType,
        entityId,
        previousData,
        newData,
        ipAddress: '0.0.0.0',
        userAgent: 'API',
      },
    });
  }
}

export const interviewCommentService = new InterviewCommentService();
