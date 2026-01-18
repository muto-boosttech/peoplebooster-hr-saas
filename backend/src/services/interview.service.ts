import { PrismaClient, Prisma, InterviewType, InterviewStatus } from '@prisma/client';
import {
  GetInterviewsQuery,
  GetInterviewCalendarQuery,
  CreateInterviewInput,
  UpdateInterviewInput,
  UpdateInterviewStatusInput,
  InterviewTypeType,
  InterviewStatusType,
  INTERVIEW_TYPE_DISPLAY_NAMES,
  INTERVIEW_STATUS_DISPLAY_NAMES,
  isValidInterviewStatusTransition,
} from '../validators/interview.validator';
import { AuthenticatedUser } from '../types/auth.types';

const prisma = new PrismaClient();

/**
 * 面接一覧レスポンス型
 */
interface InterviewListResponse {
  interviews: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
}

/**
 * カレンダーレスポンス型
 */
interface CalendarResponse {
  events: any[];
  view: string;
  startDate: string;
  endDate: string;
}

class InterviewService {
  /**
   * 面接一覧を取得
   */
  async getInterviews(
    query: GetInterviewsQuery,
    user: AuthenticatedUser
  ): Promise<InterviewListResponse> {
    const { page, limit, candidateId, interviewerId, startDate, endDate, status, type, sortBy, sortOrder } = query;

    // 企業フィルター
    const companyFilter = user.role === 'SYSTEM_ADMIN' ? {} : { candidate: { companyId: user.companyId } };

    // 検索条件を構築
    const where: Prisma.InterviewWhereInput = {
      ...companyFilter,
    };

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (interviewerId) {
      where.interviewerId = interviewerId;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate);
      }
    }

    if (status && status.length > 0) {
      where.status = { in: status as InterviewStatus[] };
    }

    if (type && type.length > 0) {
      where.type = { in: type as InterviewType[] };
    }

    // ソート条件
    const orderBy: Prisma.InterviewOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 総件数を取得
    const total = await prisma.interview.count({ where });

    // 面接一覧を取得
    const interviews = await prisma.interview.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        candidate: {
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
        },
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    // ステータス別件数を取得
    const statusCountsRaw = await prisma.interview.groupBy({
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
      interviews: interviews.map((i) => ({
        id: i.id,
        candidate: {
          id: i.candidate.id,
          user: i.candidate.user,
          appliedPosition: i.candidate.appliedPosition,
        },
        interviewer: i.interviewer,
        scheduledAt: i.scheduledAt,
        duration: i.duration,
        type: i.type,
        typeDisplayName: INTERVIEW_TYPE_DISPLAY_NAMES[i.type as InterviewTypeType],
        status: i.status,
        statusDisplayName: INTERVIEW_STATUS_DISPLAY_NAMES[i.status as InterviewStatusType],
        location: i.location,
        meetingUrl: i.meetingUrl,
        reminderSent: i.reminderSent,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
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
   * カレンダー形式で面接を取得
   */
  async getCalendar(
    query: GetInterviewCalendarQuery,
    user: AuthenticatedUser
  ): Promise<CalendarResponse> {
    const { startDate, endDate, view, interviewerId } = query;

    // 企業フィルター
    const companyFilter = user.role === 'SYSTEM_ADMIN' ? {} : { candidate: { companyId: user.companyId } };

    // 検索条件
    const where: Prisma.InterviewWhereInput = {
      ...companyFilter,
      scheduledAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: { not: 'CANCELLED' },
    };

    if (interviewerId) {
      where.interviewerId = interviewerId;
    }

    // 面接を取得
    const interviews = await prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        candidate: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    // カレンダーイベント形式に変換
    const events = interviews.map((i) => {
      const endTime = new Date(i.scheduledAt);
      endTime.setMinutes(endTime.getMinutes() + i.duration);

      return {
        id: i.id,
        title: `${i.candidate.user.fullName || i.candidate.user.nickname} - ${i.candidate.appliedPosition}`,
        start: i.scheduledAt.toISOString(),
        end: endTime.toISOString(),
        type: i.type,
        typeDisplayName: INTERVIEW_TYPE_DISPLAY_NAMES[i.type as InterviewTypeType],
        status: i.status,
        statusDisplayName: INTERVIEW_STATUS_DISPLAY_NAMES[i.status as InterviewStatusType],
        candidate: {
          id: i.candidate.id,
          user: i.candidate.user,
          appliedPosition: i.candidate.appliedPosition,
        },
        interviewer: i.interviewer,
        location: i.location,
        meetingUrl: i.meetingUrl,
        duration: i.duration,
      };
    });

    return {
      events,
      view,
      startDate,
      endDate,
    };
  }

  /**
   * 面接詳細を取得
   */
  async getInterviewById(id: string, user: AuthenticatedUser): Promise<any | null> {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: {
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
        },
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    if (!interview) {
      return null;
    }

    // 権限チェック
    if (user.role !== 'SYSTEM_ADMIN' && interview.candidate.companyId !== user.companyId) {
      throw new Error('この面接を閲覧する権限がありません');
    }

    return {
      id: interview.id,
      candidate: {
        id: interview.candidate.id,
        user: interview.candidate.user,
        appliedPosition: interview.candidate.appliedPosition,
      },
      interviewer: interview.interviewer,
      scheduledAt: interview.scheduledAt,
      duration: interview.duration,
      type: interview.type,
      typeDisplayName: INTERVIEW_TYPE_DISPLAY_NAMES[interview.type as InterviewTypeType],
      status: interview.status,
      statusDisplayName: INTERVIEW_STATUS_DISPLAY_NAMES[interview.status as InterviewStatusType],
      location: interview.location,
      meetingUrl: interview.meetingUrl,
      reminderSent: interview.reminderSent,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }

  /**
   * 面接を作成
   */
  async createInterview(input: CreateInterviewInput, user: AuthenticatedUser): Promise<any> {
    // 候補者の存在確認と権限チェック
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: input.candidateId,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
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

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    // 面接官の存在確認
    const interviewer = await prisma.user.findFirst({
      where: {
        id: input.interviewerId,
        isActive: true,
        ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
      },
    });

    if (!interviewer) {
      throw new Error('面接官が見つかりません');
    }

    // 面接官の予定重複チェック
    const scheduledAt = new Date(input.scheduledAt);
    const endTime = new Date(scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + input.duration);

    const conflictingInterview = await prisma.interview.findFirst({
      where: {
        interviewerId: input.interviewerId,
        status: 'SCHEDULED',
        OR: [
          {
            // 新しい面接の開始時刻が既存の面接の時間内にある
            scheduledAt: {
              lte: scheduledAt,
            },
            AND: {
              scheduledAt: {
                gte: new Date(scheduledAt.getTime() - 480 * 60 * 1000), // 最大8時間前まで
              },
            },
          },
        ],
      },
      include: {
        candidate: {
          include: {
            user: {
              select: {
                fullName: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (conflictingInterview) {
      // 実際の重複チェック
      const existingEnd = new Date(conflictingInterview.scheduledAt);
      existingEnd.setMinutes(existingEnd.getMinutes() + conflictingInterview.duration);

      const hasConflict =
        (scheduledAt >= conflictingInterview.scheduledAt && scheduledAt < existingEnd) ||
        (endTime > conflictingInterview.scheduledAt && endTime <= existingEnd) ||
        (scheduledAt <= conflictingInterview.scheduledAt && endTime >= existingEnd);

      if (hasConflict) {
        const conflictName = conflictingInterview.candidate.user.fullName || conflictingInterview.candidate.user.nickname;
        throw new Error(`面接官の予定が重複しています（${conflictName}さんとの面接: ${conflictingInterview.scheduledAt.toLocaleString()}）`);
      }
    }

    // 面接を作成
    const interview = await prisma.interview.create({
      data: {
        candidateId: input.candidateId,
        interviewerId: input.interviewerId,
        scheduledAt,
        duration: input.duration,
        type: input.type,
        location: input.location,
        meetingUrl: input.meetingUrl,
        status: 'SCHEDULED',
        reminderSent: false,
      },
      include: {
        candidate: {
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
        },
        interviewer: {
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
    await this.createAuditLog(user.id, 'CREATE', 'Interview', interview.id, null, interview);

    // 通知を送信
    if (input.sendNotification) {
      await this.sendInterviewNotification(interview, 'created', user);
    }

    return {
      ...interview,
      typeDisplayName: INTERVIEW_TYPE_DISPLAY_NAMES[interview.type as InterviewTypeType],
      statusDisplayName: INTERVIEW_STATUS_DISPLAY_NAMES[interview.status as InterviewStatusType],
    };
  }

  /**
   * 面接を更新
   */
  async updateInterview(
    id: string,
    input: UpdateInterviewInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // 面接の存在確認
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!interview) {
      throw new Error('面接が見つかりません');
    }

    // 権限チェック
    if (user.role !== 'SYSTEM_ADMIN' && interview.candidate.companyId !== user.companyId) {
      throw new Error('この面接を編集する権限がありません');
    }

    // 完了・キャンセル済みの面接は編集不可
    if (interview.status !== 'SCHEDULED') {
      throw new Error('予定状態の面接のみ編集できます');
    }

    // 面接官変更時の存在確認
    if (input.interviewerId) {
      const interviewer = await prisma.user.findFirst({
        where: {
          id: input.interviewerId,
          isActive: true,
          ...(user.role !== 'SYSTEM_ADMIN' ? { companyId: user.companyId } : {}),
        },
      });

      if (!interviewer) {
        throw new Error('面接官が見つかりません');
      }
    }

    // 日時変更時の重複チェック
    if (input.scheduledAt || input.duration) {
      const newScheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : interview.scheduledAt;
      const newDuration = input.duration || interview.duration;
      const newInterviewerId = input.interviewerId || interview.interviewerId;
      const newEndTime = new Date(newScheduledAt);
      newEndTime.setMinutes(newEndTime.getMinutes() + newDuration);

      const conflictingInterview = await prisma.interview.findFirst({
        where: {
          id: { not: id },
          interviewerId: newInterviewerId,
          status: 'SCHEDULED',
          scheduledAt: {
            lte: newEndTime,
            gte: new Date(newScheduledAt.getTime() - 480 * 60 * 1000),
          },
        },
      });

      if (conflictingInterview) {
        const existingEnd = new Date(conflictingInterview.scheduledAt);
        existingEnd.setMinutes(existingEnd.getMinutes() + conflictingInterview.duration);

        const hasConflict =
          (newScheduledAt >= conflictingInterview.scheduledAt && newScheduledAt < existingEnd) ||
          (newEndTime > conflictingInterview.scheduledAt && newEndTime <= existingEnd);

        if (hasConflict) {
          throw new Error('面接官の予定が重複しています');
        }
      }
    }

    const previousData = { ...interview };

    // 更新データを構築
    const updateData: Prisma.InterviewUpdateInput = {};
    if (input.interviewerId) {
      updateData.interviewer = { connect: { id: input.interviewerId } };
    }
    if (input.scheduledAt) {
      updateData.scheduledAt = new Date(input.scheduledAt);
    }
    if (input.duration !== undefined) {
      updateData.duration = input.duration;
    }
    if (input.type) {
      updateData.type = input.type;
    }
    if (input.location !== undefined) {
      updateData.location = input.location;
    }
    if (input.meetingUrl !== undefined) {
      updateData.meetingUrl = input.meetingUrl;
    }

    // 面接を更新
    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: updateData,
      include: {
        candidate: {
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
        },
        interviewer: {
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
    await this.createAuditLog(user.id, 'UPDATE', 'Interview', id, previousData, updatedInterview);

    // 変更通知を送信
    if (input.sendNotification) {
      await this.sendInterviewNotification(updatedInterview, 'updated', user);
    }

    return {
      ...updatedInterview,
      typeDisplayName: INTERVIEW_TYPE_DISPLAY_NAMES[updatedInterview.type as InterviewTypeType],
      statusDisplayName: INTERVIEW_STATUS_DISPLAY_NAMES[updatedInterview.status as InterviewStatusType],
    };
  }

  /**
   * 面接ステータスを更新
   */
  async updateInterviewStatus(
    id: string,
    input: UpdateInterviewStatusInput,
    user: AuthenticatedUser
  ): Promise<any> {
    // 面接の存在確認
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!interview) {
      throw new Error('面接が見つかりません');
    }

    // 権限チェック
    if (user.role !== 'SYSTEM_ADMIN' && interview.candidate.companyId !== user.companyId) {
      throw new Error('この面接を編集する権限がありません');
    }

    const currentStatus = interview.status as InterviewStatusType;
    const newStatus = input.status;

    // ステータス遷移の検証
    if (!isValidInterviewStatusTransition(currentStatus, newStatus)) {
      throw new Error(
        `ステータスを「${INTERVIEW_STATUS_DISPLAY_NAMES[currentStatus]}」から「${INTERVIEW_STATUS_DISPLAY_NAMES[newStatus]}」に変更することはできません`
      );
    }

    const previousData = { status: currentStatus };

    // ステータスを更新
    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: {
        status: newStatus,
      },
      include: {
        candidate: {
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
        },
        interviewer: {
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
    await this.createAuditLog(user.id, 'UPDATE', 'Interview', id, previousData, {
      status: newStatus,
      note: input.note,
    });

    return {
      ...updatedInterview,
      typeDisplayName: INTERVIEW_TYPE_DISPLAY_NAMES[updatedInterview.type as InterviewTypeType],
      statusDisplayName: INTERVIEW_STATUS_DISPLAY_NAMES[updatedInterview.status as InterviewStatusType],
      previousStatus: currentStatus,
      previousStatusDisplayName: INTERVIEW_STATUS_DISPLAY_NAMES[currentStatus],
    };
  }

  /**
   * 面接を削除（キャンセル扱い）
   */
  async deleteInterview(id: string, user: AuthenticatedUser): Promise<void> {
    // 面接の存在確認
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: {
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
        },
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    if (!interview) {
      throw new Error('面接が見つかりません');
    }

    // 権限チェック
    if (user.role !== 'SYSTEM_ADMIN' && interview.candidate.companyId !== user.companyId) {
      throw new Error('この面接を削除する権限がありません');
    }

    // キャンセル扱いにする
    await prisma.interview.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    // 監査ログを記録
    await this.createAuditLog(user.id, 'DELETE', 'Interview', id, interview, { status: 'CANCELLED' });

    // キャンセル通知を送信
    await this.sendInterviewNotification(interview, 'cancelled', user);
  }

  /**
   * 面接通知を送信
   */
  private async sendInterviewNotification(
    interview: any,
    action: 'created' | 'updated' | 'cancelled',
    user: AuthenticatedUser
  ): Promise<void> {
    const candidateName = interview.candidate.user.fullName || interview.candidate.user.nickname;
    const interviewerName = interview.interviewer.fullName || interview.interviewer.nickname;
    const scheduledAt = new Date(interview.scheduledAt).toLocaleString('ja-JP');

    let title: string;
    let message: string;

    switch (action) {
      case 'created':
        title = '面接がスケジュールされました';
        message = `${candidateName}さんとの面接が${scheduledAt}に予定されました`;
        break;
      case 'updated':
        title = '面接スケジュールが変更されました';
        message = `${candidateName}さんとの面接スケジュールが変更されました（${scheduledAt}）`;
        break;
      case 'cancelled':
        title = '面接がキャンセルされました';
        message = `${candidateName}さんとの面接がキャンセルされました`;
        break;
    }

    // 面接官に通知
    if (interview.interviewerId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: interview.interviewerId,
          type: 'INTERVIEW_SCHEDULED',
          title,
          message,
          link: `/interviews/${interview.id}`,
        },
      });
    }

    // 候補者に通知（実際のメール送信は別途実装）
    console.log(`[Email] Interview ${action}: ${interview.candidate.user.email}, ${message}`);
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

export const interviewService = new InterviewService();
