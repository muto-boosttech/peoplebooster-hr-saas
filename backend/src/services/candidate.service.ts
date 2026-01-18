import { PrismaClient, Prisma, CandidateStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  GetCandidatesQuery,
  CreateCandidateFromUserInput,
  CreateCandidateWithNewUserInput,
  UpdateCandidateInput,
  UpdateCandidateStatusInput,
  AssignCandidateInput,
  BulkUpdateStatusInput,
  BulkAssignInput,
  AddTagsInput,
  RemoveTagsInput,
  CandidateStatusType,
  isValidStatusTransition,
  STATUS_DISPLAY_NAMES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} from '../validators/candidate.validator';
import { AuthenticatedUser } from '../types/auth.types';

const prisma = new PrismaClient();

// 候補者一覧レスポンス型
interface CandidateListResponse {
  candidates: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
}

// 候補者詳細レスポンス型
interface CandidateDetailResponse {
  id: string;
  user: {
    id: string;
    fullName: string | null;
    nickname: string;
    email: string;
  };
  status: string;
  statusDisplayName: string;
  appliedPosition: string;
  source: string | null;
  tags: string[];
  notes: string | null;
  assignedTo: {
    id: string;
    fullName: string | null;
    nickname: string;
  } | null;
  diagnosisResult: any | null;
  interviewComments: any[];
  interviews: any[];
  statusHistory: any[];
  createdAt: Date;
  updatedAt: Date;
}

class CandidateService {
  /**
   * 候補者一覧を取得
   */
  async getCandidates(
    query: GetCandidatesQuery,
    user: AuthenticatedUser
  ): Promise<CandidateListResponse> {
    const { page, limit, status, appliedPosition, search, assignedTo, tags, sortBy, sortOrder } =
      query;

    // 企業フィルター（SYSTEM_ADMIN以外は自社のみ）
    const companyFilter =
      user.role === 'SYSTEM_ADMIN' ? {} : { companyId: user.companyId };

    // 検索条件を構築
    const where: Prisma.CandidateWhereInput = {
      ...companyFilter,
    };

    // ステータスフィルター
    if (status && status.length > 0) {
      where.status = { in: status as CandidateStatus[] };
    }

    // 応募職種フィルター
    if (appliedPosition) {
      where.appliedPosition = { contains: appliedPosition, mode: 'insensitive' };
    }

    // 担当者フィルター
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // タグフィルター（JSON配列内の検索）
    if (tags && tags.length > 0) {
      where.tags = {
        array_contains: tags,
      };
    }

    // 名前検索
    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { nickname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // ソート条件
    const orderBy: Prisma.CandidateOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 総件数を取得
    const total = await prisma.candidate.count({ where });

    // 候補者一覧を取得
    const candidates = await prisma.candidate.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
        _count: {
          select: {
            interviews: true,
            interviewComments: true,
          },
        },
      },
    });

    // ステータス別件数を取得
    const statusCountsRaw = await prisma.candidate.groupBy({
      by: ['status'],
      where: companyFilter,
      _count: {
        _all: true,
      },
    });

    const statusCounts: Record<string, number> = {};
    for (const item of statusCountsRaw) {
      statusCounts[item.status] = item._count._all;
    }

    return {
      candidates: candidates.map((c) => ({
        id: c.id,
        user: c.user,
        status: c.status,
        statusDisplayName: STATUS_DISPLAY_NAMES[c.status as CandidateStatusType],
        appliedPosition: c.appliedPosition,
        source: c.source,
        tags: c.tags,
        assignedTo: c.assignedUser,
        interviewCount: c._count.interviews,
        commentCount: c._count.interviewComments,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts,
    };
  }

  /**
   * 候補者詳細を取得
   */
  async getCandidateById(
    id: string,
    user: AuthenticatedUser
  ): Promise<CandidateDetailResponse | null> {
    const whereCondition: Prisma.CandidateWhereInput = {
      id,
      ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
    };

    const candidate = await prisma.candidate.findFirst({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            interviewer: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
              },
            },
          },
        },
        interviewComments: {
          orderBy: { createdAt: 'desc' },
          include: {
            interviewer: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!candidate) {
      return null;
    }

    // 診断結果を取得
    const diagnosisResult = await prisma.diagnosisResult.findFirst({
      where: { userId: candidate.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        typeName: true,
        typeCode: true,
        featureLabels: true,
        reliabilityStatus: true,
        stressTolerance: true,
        completedAt: true,
      },
    });

    // ステータス変更履歴を取得（監査ログから）
    const statusHistory = await prisma.auditLog.findMany({
      where: {
        entityType: 'Candidate',
        entityId: id,
        action: 'UPDATE',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        previousData: true,
        newData: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    // ステータス変更のみをフィルター
    const statusChanges = statusHistory
      .filter((log) => {
        const prev = log.previousData as any;
        const next = log.newData as any;
        return prev?.status !== next?.status;
      })
      .map((log) => ({
        id: log.id,
        previousStatus: (log.previousData as any)?.status,
        newStatus: (log.newData as any)?.status,
        changedBy: log.user,
        changedAt: log.createdAt,
      }));

    return {
      id: candidate.id,
      user: candidate.user,
      status: candidate.status,
      statusDisplayName: STATUS_DISPLAY_NAMES[candidate.status as CandidateStatusType],
      appliedPosition: candidate.appliedPosition,
      source: candidate.source,
      tags: candidate.tags as string[],
      notes: candidate.notes,
      assignedTo: candidate.assignedUser,
      diagnosisResult,
      interviewComments: candidate.interviewComments.map((c: any) => ({
        id: c.id,
        interviewer: c.interviewer,
        interviewDate: c.interviewDate,
        comment: c.comment,
        rating: c.rating,
        tags: c.tags,
        createdAt: c.createdAt,
      })),
      interviews: candidate.interviews.map((i: any) => ({
        id: i.id,
        interviewer: i.interviewer,
        scheduledAt: i.scheduledAt,
        duration: i.duration,
        location: i.location,
        meetingUrl: i.meetingUrl,
        type: i.type,
        status: i.status,
      })),
      statusHistory: statusChanges,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  }

  /**
   * 既存ユーザーから候補者を作成
   */
  async createCandidateFromUser(
    input: CreateCandidateFromUserInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser) {
      throw new Error('指定されたユーザーが見つかりません');
    }

    // 既に候補者として登録されていないか確認
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        userId: input.userId,
        companyId: user.companyId!,
      },
    });

    if (existingCandidate) {
      throw new Error('このユーザーは既に候補者として登録されています');
    }

    // 候補者を作成
    const candidate = await prisma.candidate.create({
      data: {
        companyId: user.companyId!,
        userId: input.userId,
        status: 'UNTOUCHED',
        appliedPosition: input.appliedPosition,
        source: input.source || '',
        tags: input.tags || [],
        notes: input.notes,
        assignedTo: input.assignedTo,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'CREATE', 'Candidate', candidate.id, null, candidate);

    return candidate;
  }

  /**
   * 新規ユーザーと共に候補者を作成
   */
  async createCandidateWithNewUser(
    input: CreateCandidateWithNewUserInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // メールアドレスの重複確認
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // 企業情報を取得
    const company = await prisma.company.findUnique({
      where: { id: user.companyId! },
    });

    if (!company) {
      throw new Error('企業情報が見つかりません');
    }

    // 仮パスワードを生成
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // トランザクションで新規ユーザーと候補者を作成
    const result = await prisma.$transaction(async (tx) => {
      // 新規ユーザーを作成
      const newUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          nickname: input.nickname || input.fullName,
          fullName: input.fullName,
          role: 'GENERAL_USER',
          companyId: user.companyId,
          isActive: true,
        },
      });

      // 候補者を作成
      const candidate = await tx.candidate.create({
        data: {
          companyId: user.companyId!,
          userId: newUser.id,
          status: 'UNTOUCHED',
          appliedPosition: input.appliedPosition,
          source: input.source || '',
          tags: input.tags || [],
          notes: input.notes,
          assignedTo: input.assignedTo,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              nickname: true,
              email: true,
            },
          },
        },
      });

      return { user: newUser, candidate };
    });

    // 監査ログを記録
    await this.createAuditLog(
      user.id,
      'CREATE',
      'Candidate',
      result.candidate.id,
      null,
      result.candidate
    );

    // 診断URLを含むメール送信（実際の実装ではメールサービスを使用）
    const diagnosisUrl = `${process.env.FRONTEND_URL}/survey?company=${company.diagnosisUrl}`;
    console.log(`[Email] 診断URL送信: ${input.email}, URL: ${diagnosisUrl}`);

    return {
      ...result.candidate,
      diagnosisUrl,
      tempPasswordSent: true,
    };
  }

  /**
   * 候補者を更新
   */
  async updateCandidate(
    id: string,
    input: UpdateCandidateInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // 候補者の存在確認
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    const previousData = { ...candidate };

    // 候補者を更新
    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'UPDATE', 'Candidate', id, previousData, updatedCandidate);

    return updatedCandidate;
  }

  /**
   * ステータスを更新
   */
  async updateCandidateStatus(
    id: string,
    input: UpdateCandidateStatusInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // 候補者の存在確認
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    const currentStatus = candidate.status as CandidateStatusType;
    const newStatus = input.status;

    // ステータス遷移の検証
    // ON_HOLDからの復帰の場合は、前のステータスを取得
    let previousStatus: CandidateStatusType | undefined;
    if (currentStatus === 'ON_HOLD') {
      const lastStatusChange = await prisma.auditLog.findFirst({
        where: {
          entityType: 'Candidate',
          entityId: id,
          action: 'UPDATE',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastStatusChange) {
        const prevData = lastStatusChange.previousData as any;
        previousStatus = prevData?.status;
      }
    }

    if (!isValidStatusTransition(currentStatus, newStatus, previousStatus)) {
      throw new Error(
        `ステータスを「${STATUS_DISPLAY_NAMES[currentStatus]}」から「${STATUS_DISPLAY_NAMES[newStatus]}」に変更することはできません`
      );
    }

    const previousData = { status: currentStatus };

    // ステータスを更新
    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    // 監査ログを記録（ステータス変更理由も含む）
    await this.createAuditLog(user.id, 'UPDATE', 'Candidate', id, previousData, {
      status: newStatus,
      note: input.note,
    });

    // 通知を作成（設定による）
    await this.createStatusChangeNotification(candidate, newStatus, user);

    return {
      ...updatedCandidate,
      statusDisplayName: STATUS_DISPLAY_NAMES[newStatus],
      previousStatus: currentStatus,
      previousStatusDisplayName: STATUS_DISPLAY_NAMES[currentStatus],
    };
  }

  /**
   * 担当者を割り当て
   */
  async assignCandidate(
    id: string,
    input: AssignCandidateInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // 候補者の存在確認
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    // 担当者の存在確認（nullでない場合）
    if (input.assignedTo) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: input.assignedTo,
          companyId: candidate.companyId,
          isActive: true,
        },
      });

      if (!assignee) {
        throw new Error('指定された担当者が見つかりません');
      }
    }

    const previousData = { assignedTo: candidate.assignedTo };

    // 担当者を更新
    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: {
        assignedTo: input.assignedTo,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'UPDATE', 'Candidate', id, previousData, {
      assignedTo: input.assignedTo,
    });

    // 担当者に通知を送信
    if (input.assignedTo) {
      await prisma.notification.create({
        data: {
          userId: input.assignedTo,
          type: 'CANDIDATE_NEW',
          title: '候補者が割り当てられました',
          message: `${updatedCandidate.user.fullName || updatedCandidate.user.nickname}さんが担当として割り当てられました`,
          link: `/candidates/${id}`,
        },
      });
    }

    return updatedCandidate;
  }

  /**
   * 候補者を削除（論理削除）
   */
  async deleteCandidate(id: string, user: AuthenticatedUser): Promise<void> {
    // 候補者の存在確認
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    // 物理削除（Prismaスキーマにis_deletedがないため）
    await prisma.candidate.delete({
      where: { id },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'DELETE', 'Candidate', id, candidate, null);
  }

  /**
   * 一括ステータス更新
   */
  async bulkUpdateStatus(input: BulkUpdateStatusInput, user: AuthenticatedUser): Promise<any> {
    const results: { success: string[]; failed: { id: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const candidateId of input.candidateIds) {
      try {
        await this.updateCandidateStatus(
          candidateId,
          { status: input.status, note: input.note },
          user
        );
        results.success.push(candidateId);
      } catch (error: any) {
        results.failed.push({ id: candidateId, error: error.message });
      }
    }

    return results;
  }

  /**
   * 一括担当者割り当て
   */
  async bulkAssign(input: BulkAssignInput, user: AuthenticatedUser): Promise<any> {
    const results: { success: string[]; failed: { id: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    for (const candidateId of input.candidateIds) {
      try {
        await this.assignCandidate(candidateId, { assignedTo: input.assignedTo }, user);
        results.success.push(candidateId);
      } catch (error: any) {
        results.failed.push({ id: candidateId, error: error.message });
      }
    }

    return results;
  }

  /**
   * タグを追加
   */
  async addTags(id: string, input: AddTagsInput, user: AuthenticatedUser): Promise<any> {
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    const currentTags = candidate.tags as string[];
    const newTags = Array.from(new Set([...currentTags, ...input.tags]));

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: {
        tags: newTags,
        updatedAt: new Date(),
      },
    });

    return updatedCandidate;
  }

  /**
   * タグを削除
   */
  async removeTags(id: string, input: RemoveTagsInput, user: AuthenticatedUser): Promise<any> {
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    const currentTags = candidate.tags as string[];
    const newTags = currentTags.filter((tag) => !input.tags.includes(tag));

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: {
        tags: newTags,
        updatedAt: new Date(),
      },
    });

    return updatedCandidate;
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(user: AuthenticatedUser): Promise<any> {
    const companyFilter =
      user.role === 'SYSTEM_ADMIN' ? {} : { companyId: user.companyId };

    // ステータス別件数
    const statusCounts = await prisma.candidate.groupBy({
      by: ['status'],
      where: companyFilter,
      _count: {
        _all: true,
      },
    });

    // 今週の新規候補者数
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const newCandidatesThisWeek = await prisma.candidate.count({
      where: {
        ...companyFilter,
        createdAt: { gte: weekAgo },
      },
    });

    // 今週のステータス変更数
    const statusChangesThisWeek = await prisma.auditLog.count({
      where: {
        entityType: 'Candidate',
        action: 'UPDATE',
        createdAt: { gte: weekAgo },
      },
    });

    // 応募職種別件数
    const positionCounts = await prisma.candidate.groupBy({
      by: ['appliedPosition'],
      where: companyFilter,
      _count: {
        _all: true,
      },
      orderBy: { _count: { appliedPosition: 'desc' } },
      take: 10,
    });

    return {
      statusCounts: statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = item._count._all;
          return acc;
        },
        {} as Record<string, number>
      ),
      newCandidatesThisWeek,
      statusChangesThisWeek,
      positionCounts: positionCounts.map((item) => ({
        position: item.appliedPosition,
        count: item._count._all,
      })),
      activeCount: statusCounts
        .filter((item) => ACTIVE_STATUSES.includes(item.status as CandidateStatusType))
        .reduce((sum, item) => sum + item._count._all, 0),
      terminatedCount: statusCounts
        .filter((item) => TERMINAL_STATUSES.includes(item.status as CandidateStatusType))
        .reduce((sum, item) => sum + item._count._all, 0),
    };
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
        ipAddress: '0.0.0.0', // 実際の実装ではリクエストから取得
        userAgent: 'API', // 実際の実装ではリクエストから取得
      },
    });
  }

  /**
   * ステータス変更通知を作成
   */
  private async createStatusChangeNotification(
    candidate: any,
    newStatus: CandidateStatusType,
    changedBy: AuthenticatedUser
  ): Promise<void> {
    // 担当者に通知
    if (candidate.assignedTo && candidate.assignedTo !== changedBy.id) {
      await prisma.notification.create({
        data: {
          userId: candidate.assignedTo,
          type: 'CANDIDATE_STATUS_CHANGE',
          title: '候補者のステータスが変更されました',
          message: `候補者のステータスが「${STATUS_DISPLAY_NAMES[newStatus]}」に変更されました`,
          link: `/candidates/${candidate.id}`,
        },
      });
    }
  }
}

export const candidateService = new CandidateService();
