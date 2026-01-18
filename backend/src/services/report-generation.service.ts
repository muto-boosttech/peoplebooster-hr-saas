import { PrismaClient } from '@prisma/client';
import { pdfGeneratorService, S3UploadResult } from './pdf-generator.service';
import { stringify } from 'csv-stringify/sync';
import { AuthenticatedUser } from '../types/auth.types';

const prisma = new PrismaClient();

/**
 * 個人レポートオプション
 */
export interface IndividualReportOptions {
  includeDetail?: boolean;
  includePotential?: boolean;
  includeSimilarity?: boolean;
  companyLogo?: boolean;
}

/**
 * 組織レポートオプション
 */
export interface OrganizationReportOptions {
  departmentId?: string;
  includeIndividualScores?: boolean;
}

/**
 * 採用サマリーレポートオプション
 */
export interface RecruitmentSummaryOptions {
  startDate: Date;
  endDate: Date;
  includeDetails?: boolean;
}

/**
 * CSVエクスポートオプション
 */
export interface CsvExportOptions {
  type: 'diagnosis' | 'candidates' | 'interviews';
  companyId: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * レポート生成サービス
 */
class ReportGenerationService {
  /**
   * 個人診断レポートを生成
   */
  async generateIndividualReport(
    userId: string,
    options: IndividualReportOptions,
    currentUser: AuthenticatedUser
  ): Promise<S3UploadResult> {
    // ユーザーと診断結果を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        department: true,
        diagnosisResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            potentialScores: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // 権限チェック
    this.checkIndividualReportPermission(user, currentUser);

    const diagnosisResult = user.diagnosisResults[0];
    if (!diagnosisResult) {
      throw new Error('診断結果が見つかりません');
    }

    // 企業ロゴを取得（オプション）
    let companyLogoUrl: string | null = null;
    if (options.companyLogo && user.company) {
      companyLogoUrl = user.company.logoUrl;
    }

    // レポートデータを構築
    const reportData = {
      user: {
        fullName: user.fullName || user.nickname,
        email: user.email,
        company: user.company?.name,
        department: user.department?.name,
      },
      diagnosis: {
        typeName: diagnosisResult.typeName,
        typeCode: diagnosisResult.typeCode,
        featureLabels: diagnosisResult.featureLabels,
        reliabilityStatus: diagnosisResult.reliabilityStatus,
        stressTolerance: diagnosisResult.stressTolerance,
        thinkingPattern: diagnosisResult.thinkingPattern,
        behaviorPattern: diagnosisResult.behaviorPattern,
        bigFive: diagnosisResult.bigFive,
        completedAt: diagnosisResult.completedAt,
      },
      includeDetail: options.includeDetail !== false,
      includePotential: options.includePotential !== false,
      potentialScores: options.includePotential !== false ? diagnosisResult.potentialScores : [],
      companyLogo: companyLogoUrl,
      generatedAt: new Date(),
      generatedBy: currentUser.email,
    };

    // PDFを生成してS3にアップロード
    const fileName = `individual-report-${userId}-${Date.now()}.pdf`;
    return pdfGeneratorService.generateAndUpload(
      'individual-report',
      reportData,
      fileName,
      { format: 'A4' },
      {
        userId,
        reportType: 'individual',
        generatedBy: currentUser.id,
      }
    );
  }

  /**
   * 候補者評価サマリーレポートを生成
   */
  async generateCandidateSummaryReport(
    candidateId: string,
    currentUser: AuthenticatedUser
  ): Promise<S3UploadResult> {
    // 候補者情報を取得
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        user: {
          include: {
            diagnosisResults: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                potentialScores: true,
              },
            },
          },
        },
        assignedUser: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
          },
        },
        company: true,
        interviews: {
          include: {
            interviewer: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
              },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        },
        interviewComments: {
          include: {
            interviewer: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
              },
            },
          },
          orderBy: { interviewDate: 'desc' },
        },
      },
    });

    if (!candidate) {
      throw new Error('候補者が見つかりません');
    }

    // 権限チェック
    this.checkCandidateReportPermission(candidate, currentUser);

    // 評価の平均を計算
    const ratings = candidate.interviewComments.map((c) => c.rating).filter((r): r is number => r !== null);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    // レポートデータを構築
    const reportData = {
      candidate: {
        id: candidate.id,
        user: {
          fullName: candidate.user.fullName || candidate.user.nickname,
          email: candidate.user.email,
        },
        appliedPosition: candidate.appliedPosition,
        status: candidate.status,
        statusDisplayName: this.getCandidateStatusDisplayName(candidate.status),
        source: candidate.source,
        tags: candidate.tags,
        assignedTo: candidate.assignedUser
          ? candidate.assignedUser.fullName || candidate.assignedUser.nickname
          : null,
        createdAt: candidate.createdAt,
      },
      diagnosis: candidate.user.diagnosisResults[0] || null,
      interviews: candidate.interviews.map((i) => ({
        scheduledAt: i.scheduledAt,
        duration: i.duration,
        type: i.type,
        typeDisplayName: this.getInterviewTypeDisplayName(i.type),
        status: i.status,
        statusDisplayName: this.getInterviewStatusDisplayName(i.status),
        interviewer: i.interviewer.fullName || i.interviewer.nickname,
      })),
      comments: candidate.interviewComments.map((c) => ({
        interviewDate: c.interviewDate,
        comment: c.comment,
        rating: c.rating,
        ratingDisplayName: c.rating ? this.getRatingDisplayName(c.rating) : null,
        tags: c.tags,
        interviewer: c.interviewer.fullName || c.interviewer.nickname,
      })),
      summary: {
        totalInterviews: candidate.interviews.length,
        completedInterviews: candidate.interviews.filter((i) => i.status === 'COMPLETED').length,
        totalComments: candidate.interviewComments.length,
        averageRating,
      },
      companyLogo: candidate.company?.logoUrl,
      generatedAt: new Date(),
      generatedBy: currentUser.email,
    };

    // PDFを生成してS3にアップロード
    const fileName = `candidate-summary-${candidateId}-${Date.now()}.pdf`;
    return pdfGeneratorService.generateAndUpload(
      'candidate-summary',
      reportData,
      fileName,
      { format: 'A4' },
      {
        candidateId,
        reportType: 'candidate-summary',
        generatedBy: currentUser.id,
      }
    );
  }

  /**
   * 組織傾向分析レポートを生成
   */
  async generateOrganizationReport(
    companyId: string,
    options: OrganizationReportOptions,
    currentUser: AuthenticatedUser
  ): Promise<S3UploadResult> {
    // 会社情報を取得
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        departments: true,
      },
    });

    if (!company) {
      throw new Error('会社が見つかりません');
    }

    // 権限チェック
    this.checkOrganizationReportPermission(company, currentUser);

    // ユーザーと診断結果を取得
    const whereClause: Record<string, unknown> = {
      companyId,
      diagnosisResults: {
        some: {},
      },
    };

    if (options.departmentId) {
      whereClause.departmentId = options.departmentId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        department: true,
        diagnosisResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            potentialScores: true,
          },
        },
      },
    });

    // 統計を計算
    const typeDistribution: Record<string, number> = {};
    const stressToleranceDistribution: Record<string, number> = {};
    const bigFiveAverages: Record<string, number[]> = {
      openness: [],
      conscientiousness: [],
      extraversion: [],
      agreeableness: [],
      neuroticism: [],
    };

    for (const user of users) {
      const diagnosis = user.diagnosisResults[0];
      if (!diagnosis) continue;

      // タイプ分布
      typeDistribution[diagnosis.typeCode] = (typeDistribution[diagnosis.typeCode] || 0) + 1;

      // ストレス耐性分布
      stressToleranceDistribution[diagnosis.stressTolerance] =
        (stressToleranceDistribution[diagnosis.stressTolerance] || 0) + 1;

      // Big Five平均
      const bigFive = diagnosis.bigFive as Record<string, number>;
      if (bigFive) {
        for (const [key, value] of Object.entries(bigFive)) {
          if (bigFiveAverages[key]) {
            bigFiveAverages[key].push(value);
          }
        }
      }
    }

    // Big Five平均を計算
    const bigFiveAvg: Record<string, number> = {};
    for (const [key, values] of Object.entries(bigFiveAverages)) {
      bigFiveAvg[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    // 部門別統計
    const departmentStats: Record<string, { count: number; types: Record<string, number> }> = {};
    for (const user of users) {
      const deptName = user.department?.name || '未所属';
      if (!departmentStats[deptName]) {
        departmentStats[deptName] = { count: 0, types: {} };
      }
      departmentStats[deptName].count++;

      const diagnosis = user.diagnosisResults[0];
      if (diagnosis) {
        departmentStats[deptName].types[diagnosis.typeCode] =
          (departmentStats[deptName].types[diagnosis.typeCode] || 0) + 1;
      }
    }

    // レポートデータを構築
    const reportData = {
      company: {
        name: company.name,
        logoUrl: company.logoUrl,
      },
      targetDepartment: options.departmentId
        ? company.departments.find((d) => d.id === options.departmentId)?.name
        : null,
      statistics: {
        totalUsers: users.length,
        typeDistribution,
        stressToleranceDistribution,
        bigFiveAverages: bigFiveAvg,
        departmentStats,
      },
      generatedAt: new Date(),
      generatedBy: currentUser.email,
    };

    // PDFを生成してS3にアップロード
    const fileName = `organization-report-${companyId}-${Date.now()}.pdf`;
    return pdfGeneratorService.generateAndUpload(
      'organization-report',
      reportData,
      fileName,
      { format: 'A4', landscape: true },
      {
        companyId,
        reportType: 'organization',
        generatedBy: currentUser.id,
      }
    );
  }

  /**
   * 採用活動サマリーレポートを生成
   */
  async generateRecruitmentSummaryReport(
    companyId: string,
    options: RecruitmentSummaryOptions,
    currentUser: AuthenticatedUser
  ): Promise<S3UploadResult> {
    // 会社情報を取得
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('会社が見つかりません');
    }

    // 権限チェック
    this.checkOrganizationReportPermission(company, currentUser);

    // 期間内の候補者を取得
    const candidates = await prisma.candidate.findMany({
      where: {
        companyId,
        createdAt: {
          gte: options.startDate,
          lte: options.endDate,
        },
      },
      include: {
        user: {
          select: {
            fullName: true,
            nickname: true,
          },
        },
        interviews: true,
        interviewComments: true,
      },
    });

    // ステータス別集計
    const statusCounts: Record<string, number> = {};
    const positionCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};

    for (const candidate of candidates) {
      // ステータス別
      statusCounts[candidate.status] = (statusCounts[candidate.status] || 0) + 1;

      // ポジション別
      positionCounts[candidate.appliedPosition] = (positionCounts[candidate.appliedPosition] || 0) + 1;

      // ソース別
      if (candidate.source) {
        sourceCounts[candidate.source] = (sourceCounts[candidate.source] || 0) + 1;
      }
    }

    // 採用ファネル計算
    const funnel = {
      total: candidates.length,
      inProgress: candidates.filter((c) =>
        ['IN_PROGRESS', 'COMPLETED', 'DOCUMENT_SCREENING'].includes(c.status)
      ).length,
      interviewing: candidates.filter((c) =>
        ['FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW'].includes(c.status)
      ).length,
      offered: candidates.filter((c) => c.status === 'OFFER').length,
      hired: candidates.filter((c) => c.status === 'HIRED').length,
      rejected: candidates.filter((c) => c.status === 'REJECTED').length,
      withdrawn: candidates.filter((c) => c.status === 'WITHDRAWN').length,
    };

    // 面接統計
    const allInterviews = candidates.flatMap((c) => c.interviews);
    const interviewStats = {
      total: allInterviews.length,
      completed: allInterviews.filter((i) => i.status === 'COMPLETED').length,
      cancelled: allInterviews.filter((i) => i.status === 'CANCELLED').length,
      noShow: allInterviews.filter((i) => i.status === 'NO_SHOW').length,
    };

    // レポートデータを構築
    const reportData = {
      company: {
        name: company.name,
        logoUrl: company.logoUrl,
      },
      period: {
        startDate: options.startDate,
        endDate: options.endDate,
      },
      summary: {
        totalCandidates: candidates.length,
        statusCounts,
        positionCounts,
        sourceCounts,
        funnel,
        interviewStats,
      },
      candidates: options.includeDetails
        ? candidates.map((c) => ({
            name: c.user.fullName || c.user.nickname,
            position: c.appliedPosition,
            status: c.status,
            statusDisplayName: this.getCandidateStatusDisplayName(c.status),
            source: c.source,
            interviewCount: c.interviews.length,
            commentCount: c.interviewComments.length,
            createdAt: c.createdAt,
          }))
        : [],
      generatedAt: new Date(),
      generatedBy: currentUser.email,
    };

    // PDFを生成してS3にアップロード
    const fileName = `recruitment-summary-${companyId}-${Date.now()}.pdf`;
    return pdfGeneratorService.generateAndUpload(
      'recruitment-summary',
      reportData,
      fileName,
      { format: 'A4' },
      {
        companyId,
        reportType: 'recruitment-summary',
        generatedBy: currentUser.id,
      }
    );
  }

  /**
   * CSVエクスポート
   */
  async exportCsv(
    options: CsvExportOptions,
    currentUser: AuthenticatedUser
  ): Promise<{ csv: string; filename: string }> {
    // 権限チェック
    if (
      currentUser.role !== 'SYSTEM_ADMIN' &&
      currentUser.companyId !== options.companyId
    ) {
      throw new Error('この会社のデータをエクスポートする権限がありません');
    }

    let data: Record<string, unknown>[];
    let columns: { key: string; header: string }[];
    let filename: string;

    switch (options.type) {
      case 'diagnosis':
        ({ data, columns, filename } = await this.exportDiagnosisData(options));
        break;
      case 'candidates':
        ({ data, columns, filename } = await this.exportCandidatesData(options));
        break;
      case 'interviews':
        ({ data, columns, filename } = await this.exportInterviewsData(options));
        break;
      default:
        throw new Error('無効なエクスポートタイプです');
    }

    // CSVを生成
    const csv = stringify(data, {
      header: true,
      columns: columns.map((c) => ({ key: c.key, header: c.header })),
      bom: true, // BOM付きUTF-8
    });

    return { csv, filename };
  }

  /**
   * 診断データをエクスポート
   */
  private async exportDiagnosisData(
    options: CsvExportOptions
  ): Promise<{ data: Record<string, unknown>[]; columns: { key: string; header: string }[]; filename: string }> {
    const whereClause: Record<string, unknown> = {
      companyId: options.companyId,
    };

    if (options.startDate || options.endDate) {
      whereClause.diagnosisResults = {
        some: {
          completedAt: {
            ...(options.startDate && { gte: options.startDate }),
            ...(options.endDate && { lte: options.endDate }),
          },
        },
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        department: true,
        diagnosisResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const data = users
      .filter((u) => u.diagnosisResults.length > 0)
      .map((u) => {
        const d = u.diagnosisResults[0];
        const bigFive = d.bigFive as Record<string, number> | null;
        return {
          userId: u.id,
          fullName: u.fullName || u.nickname || '',
          email: u.email,
          department: u.department?.name || '',
          typeName: d.typeName,
          typeCode: d.typeCode,
          reliabilityStatus: d.reliabilityStatus,
          stressTolerance: d.stressTolerance,
          openness: bigFive?.openness || '',
          conscientiousness: bigFive?.conscientiousness || '',
          extraversion: bigFive?.extraversion || '',
          agreeableness: bigFive?.agreeableness || '',
          neuroticism: bigFive?.neuroticism || '',
          completedAt: d.completedAt.toISOString(),
        };
      });

    const columns = [
      { key: 'userId', header: 'ユーザーID' },
      { key: 'fullName', header: '氏名' },
      { key: 'email', header: 'メールアドレス' },
      { key: 'department', header: '部署' },
      { key: 'typeName', header: '診断タイプ名' },
      { key: 'typeCode', header: 'タイプコード' },
      { key: 'reliabilityStatus', header: '信頼性ステータス' },
      { key: 'stressTolerance', header: 'ストレス耐性' },
      { key: 'openness', header: '開放性' },
      { key: 'conscientiousness', header: '誠実性' },
      { key: 'extraversion', header: '外向性' },
      { key: 'agreeableness', header: '協調性' },
      { key: 'neuroticism', header: '神経症傾向' },
      { key: 'completedAt', header: '診断完了日時' },
    ];

    return {
      data,
      columns,
      filename: `diagnosis-export-${options.companyId}-${Date.now()}.csv`,
    };
  }

  /**
   * 候補者データをエクスポート
   */
  private async exportCandidatesData(
    options: CsvExportOptions
  ): Promise<{ data: Record<string, unknown>[]; columns: { key: string; header: string }[]; filename: string }> {
    const whereClause: Record<string, unknown> = {
      companyId: options.companyId,
    };

    if (options.startDate || options.endDate) {
      whereClause.createdAt = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            fullName: true,
            nickname: true,
            email: true,
          },
        },
        assignedUser: {
          select: {
            fullName: true,
            nickname: true,
          },
        },
        interviews: true,
        interviewComments: true,
      },
    });

    const data = candidates.map((c) => ({
      candidateId: c.id,
      fullName: c.user.fullName || c.user.nickname || '',
      email: c.user.email,
      appliedPosition: c.appliedPosition,
      status: c.status,
      statusDisplayName: this.getCandidateStatusDisplayName(c.status),
      source: c.source || '',
      tags: (c.tags as string[])?.join(', ') || '',
      assignedTo: c.assignedUser?.fullName || c.assignedUser?.nickname || '',
      interviewCount: c.interviews.length,
      commentCount: c.interviewComments.length,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const columns = [
      { key: 'candidateId', header: '候補者ID' },
      { key: 'fullName', header: '氏名' },
      { key: 'email', header: 'メールアドレス' },
      { key: 'appliedPosition', header: '応募職種' },
      { key: 'status', header: 'ステータス' },
      { key: 'statusDisplayName', header: 'ステータス（日本語）' },
      { key: 'source', header: '応募経路' },
      { key: 'tags', header: 'タグ' },
      { key: 'assignedTo', header: '担当者' },
      { key: 'interviewCount', header: '面接回数' },
      { key: 'commentCount', header: 'コメント数' },
      { key: 'createdAt', header: '登録日時' },
      { key: 'updatedAt', header: '更新日時' },
    ];

    return {
      data,
      columns,
      filename: `candidates-export-${options.companyId}-${Date.now()}.csv`,
    };
  }

  /**
   * 面接データをエクスポート
   */
  private async exportInterviewsData(
    options: CsvExportOptions
  ): Promise<{ data: Record<string, unknown>[]; columns: { key: string; header: string }[]; filename: string }> {
    const whereClause: Record<string, unknown> = {
      candidate: {
        companyId: options.companyId,
      },
    };

    if (options.startDate || options.endDate) {
      whereClause.scheduledAt = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    const interviews = await prisma.interview.findMany({
      where: whereClause,
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
        interviewer: {
          select: {
            fullName: true,
            nickname: true,
          },
        },
      },
    });

    const data = interviews.map((i) => ({
      interviewId: i.id,
      candidateName: i.candidate.user.fullName || i.candidate.user.nickname || '',
      appliedPosition: i.candidate.appliedPosition,
      interviewerName: i.interviewer.fullName || i.interviewer.nickname || '',
      scheduledAt: i.scheduledAt.toISOString(),
      duration: i.duration,
      type: i.type,
      typeDisplayName: this.getInterviewTypeDisplayName(i.type),
      status: i.status,
      statusDisplayName: this.getInterviewStatusDisplayName(i.status),
      location: i.location || '',
      meetingUrl: i.meetingUrl || '',
      createdAt: i.createdAt.toISOString(),
    }));

    const columns = [
      { key: 'interviewId', header: '面接ID' },
      { key: 'candidateName', header: '候補者名' },
      { key: 'appliedPosition', header: '応募職種' },
      { key: 'interviewerName', header: '面接官' },
      { key: 'scheduledAt', header: '予定日時' },
      { key: 'duration', header: '所要時間（分）' },
      { key: 'type', header: '面接形式' },
      { key: 'typeDisplayName', header: '面接形式（日本語）' },
      { key: 'status', header: 'ステータス' },
      { key: 'statusDisplayName', header: 'ステータス（日本語）' },
      { key: 'location', header: '場所' },
      { key: 'meetingUrl', header: '会議URL' },
      { key: 'createdAt', header: '作成日時' },
    ];

    return {
      data,
      columns,
      filename: `interviews-export-${options.companyId}-${Date.now()}.csv`,
    };
  }

  /**
   * 個人レポートの権限チェック
   */
  private checkIndividualReportPermission(
    targetUser: { id: string; companyId: string | null },
    currentUser: AuthenticatedUser
  ): void {
    // 本人の場合は許可
    if (targetUser.id === currentUser.id) {
      return;
    }

    // SYSTEM_ADMINは全ユーザーのレポートを生成可能
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return;
    }

    // COMPANY_ADMINは同じ会社のユーザーのレポートを生成可能
    if (
      currentUser.role === 'COMPANY_ADMIN' &&
      targetUser.companyId === currentUser.companyId
    ) {
      return;
    }

    throw new Error('このユーザーのレポートを生成する権限がありません');
  }

  /**
   * 候補者レポートの権限チェック
   */
  private checkCandidateReportPermission(
    candidate: { companyId: string },
    currentUser: AuthenticatedUser
  ): void {
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return;
    }

    if (candidate.companyId !== currentUser.companyId) {
      throw new Error('この候補者のレポートを生成する権限がありません');
    }
  }

  /**
   * 組織レポートの権限チェック
   */
  private checkOrganizationReportPermission(
    company: { id: string },
    currentUser: AuthenticatedUser
  ): void {
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return;
    }

    if (currentUser.role !== 'COMPANY_ADMIN') {
      throw new Error('組織レポートを生成する権限がありません');
    }

    if (company.id !== currentUser.companyId) {
      throw new Error('この会社のレポートを生成する権限がありません');
    }
  }

  /**
   * 候補者ステータスの表示名を取得
   */
  private getCandidateStatusDisplayName(status: string): string {
    const displayNames: Record<string, string> = {
      UNTOUCHED: '未着手',
      IN_PROGRESS: '診断中',
      COMPLETED: '診断完了',
      DOCUMENT_SCREENING: '書類選考',
      FIRST_INTERVIEW: '一次面接',
      SECOND_INTERVIEW: '二次面接',
      FINAL_INTERVIEW: '最終面接',
      OFFER: '内定',
      HIRED: '採用',
      REJECTED: '不採用',
      WITHDRAWN: '辞退',
      ON_HOLD: '保留',
    };
    return displayNames[status] || status;
  }

  /**
   * 面接タイプの表示名を取得
   */
  private getInterviewTypeDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      PHONE: '電話面接',
      VIDEO: 'ビデオ面接',
      ONSITE: '対面面接',
    };
    return displayNames[type] || type;
  }

  /**
   * 面接ステータスの表示名を取得
   */
  private getInterviewStatusDisplayName(status: string): string {
    const displayNames: Record<string, string> = {
      SCHEDULED: '予定',
      COMPLETED: '完了',
      CANCELLED: 'キャンセル',
      NO_SHOW: '欠席',
    };
    return displayNames[status] || status;
  }

  /**
   * 評価の表示名を取得
   */
  private getRatingDisplayName(rating: number): string {
    const displayNames: Record<number, string> = {
      1: '不採用',
      2: '要検討',
      3: '普通',
      4: '良い',
      5: '非常に良い',
    };
    return displayNames[rating] || String(rating);
  }
}

export const reportGenerationService = new ReportGenerationService();
