import { PrismaClient, UserRole, AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { AuthUser } from '../types/auth.types';
import {
  GetCompaniesQuery,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../validators/company.validator';

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

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CompanyStats {
  userCount: number;
  activeUserCount: number;
  diagnosisCompletedCount: number;
  diagnosisInProgressCount: number;
  candidateCount: number;
  departmentCount: number;
  typeDistribution: Record<string, number>;
  bigFiveAverages: {
    extraversion: number;
    neuroticism: number;
    openness: number;
    agreeableness: number;
    conscientiousness: number;
  } | null;
}

// ========================================
// 企業サービス
// ========================================

export class CompanyService {
  /**
   * 企業一覧取得
   */
  async getCompanies(
    query: GetCompaniesQuery,
    currentUser: AuthUser
  ): Promise<ServiceResult<PaginatedResult<unknown>>> {
    try {
      // SYSTEM_ADMINのみアクセス可能
      if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '企業一覧を閲覧する権限がありません',
          },
        };
      }

      const { page, limit, search, isActive, planId, sortBy, sortOrder } = query;
      const skip = (page - 1) * limit;

      // 検索条件の構築
      const where: Record<string, unknown> = {};

      if (search) {
        where.name = {
          contains: search,
          mode: 'insensitive',
        };
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (planId) {
        where.planId = planId;
      }

      // 総件数取得
      const total = await prisma.company.count({ where });

      // 企業一覧取得
      const companies = await prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              monthlyPrice: true,
            },
          },
          _count: {
            select: {
              users: true,
              departments: true,
              candidates: true,
            },
          },
        },
      });

      return {
        success: true,
        data: {
          items: companies,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('Error in getCompanies:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '企業一覧の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 企業詳細取得
   */
  async getCompanyById(
    companyId: string,
    currentUser: AuthUser
  ): Promise<ServiceResult<unknown>> {
    try {
      // 権限チェック: SYSTEM_ADMINまたは該当企業の管理者
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        currentUser.companyId !== companyId
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この企業の情報を閲覧する権限がありません',
          },
        };
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          plan: true,
          departments: {
            where: { parentDepartmentId: null },
            include: {
              childDepartments: {
                include: {
                  childDepartments: true,
                },
              },
            },
          },
          _count: {
            select: {
              users: true,
              candidates: true,
            },
          },
        },
      });

      if (!company) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '企業が見つかりません',
          },
        };
      }

      return {
        success: true,
        data: company,
      };
    } catch (error) {
      console.error('Error in getCompanyById:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '企業情報の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 企業作成
   */
  async createCompany(
    input: CreateCompanyInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<ServiceResult<unknown>> {
    try {
      // SYSTEM_ADMINのみ作成可能
      if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '企業を作成する権限がありません',
          },
        };
      }

      // プランの存在確認
      const plan = await prisma.plan.findUnique({
        where: { id: input.planId },
      });

      if (!plan) {
        return {
          success: false,
          error: {
            code: 'INVALID_PLAN',
            message: '指定されたプランが存在しません',
          },
        };
      }

      // 診断用URL生成（ユニーク）
      const diagnosisUrl = uuidv4();

      // トランザクションで企業と管理者を作成
      const result = await prisma.$transaction(async (tx) => {
        // 企業作成
        const company = await tx.company.create({
          data: {
            name: input.name,
            logoUrl: input.logoUrl,
            planId: input.planId,
            diagnosisUrl,
            contractStartDate: input.contractStartDate,
            contractEndDate: input.contractEndDate,
            isActive: true,
          },
          include: {
            plan: true,
          },
        });

        // 企業管理者同時作成
        let admin = null;
        if (input.createAdmin && input.adminEmail) {
          // メールアドレス重複チェック
          const existingUser = await tx.user.findUnique({
            where: { email: input.adminEmail.toLowerCase() },
          });

          if (existingUser) {
            throw new Error('EMAIL_EXISTS');
          }

          // 仮パスワード生成
          const tempPassword = this.generateTempPassword();
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          admin = await tx.user.create({
            data: {
              email: input.adminEmail.toLowerCase(),
              passwordHash,
              nickname: input.adminNickname || input.adminEmail.split('@')[0],
              fullName: input.adminFullName,
              role: UserRole.COMPANY_ADMIN,
              companyId: company.id,
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              nickname: true,
              role: true,
            },
          });

          // TODO: 招待メール送信（tempPasswordを含む）
        }

        // 監査ログ記録
        await tx.auditLog.create({
          data: {
            userId: currentUser.userId,
            action: AuditAction.CREATE,
            entityType: 'Company',
            entityId: company.id,
            newData: {
              name: company.name,
              planId: company.planId,
              diagnosisUrl: company.diagnosisUrl,
              contractStartDate: company.contractStartDate,
              contractEndDate: company.contractEndDate,
              adminCreated: !!admin,
            },
            ipAddress,
            userAgent,
          },
        });

        return { company, admin };
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error in createCompany:', error);
      
      if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
        return {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: '指定されたメールアドレスは既に登録されています',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '企業の作成に失敗しました',
        },
      };
    }
  }

  /**
   * 企業更新
   */
  async updateCompany(
    companyId: string,
    input: UpdateCompanyInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<ServiceResult<unknown>> {
    try {
      // SYSTEM_ADMINのみ更新可能
      if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '企業を更新する権限がありません',
          },
        };
      }

      // 企業の存在確認
      const existingCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!existingCompany) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '企業が見つかりません',
          },
        };
      }

      // プランの存在確認（変更がある場合）
      if (input.planId) {
        const plan = await prisma.plan.findUnique({
          where: { id: input.planId },
        });

        if (!plan) {
          return {
            success: false,
            error: {
              code: 'INVALID_PLAN',
              message: '指定されたプランが存在しません',
            },
          };
        }
      }

      // 契約日の整合性チェック
      const startDate = input.contractStartDate || existingCompany.contractStartDate;
      const endDate = input.contractEndDate || existingCompany.contractEndDate;
      if (endDate <= startDate) {
        return {
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: '契約終了日は契約開始日より後の日付を指定してください',
          },
        };
      }

      // 企業更新
      const company = await prisma.$transaction(async (tx) => {
        const updated = await tx.company.update({
          where: { id: companyId },
          data: {
            name: input.name,
            logoUrl: input.logoUrl,
            planId: input.planId,
            contractStartDate: input.contractStartDate,
            contractEndDate: input.contractEndDate,
            isActive: input.isActive,
          },
          include: {
            plan: true,
          },
        });

        // 監査ログ記録
        await tx.auditLog.create({
          data: {
            userId: currentUser.userId,
            action: AuditAction.UPDATE,
            entityType: 'Company',
            entityId: companyId,
            previousData: {
              name: existingCompany.name,
              planId: existingCompany.planId,
              contractStartDate: existingCompany.contractStartDate,
              contractEndDate: existingCompany.contractEndDate,
              isActive: existingCompany.isActive,
            },
            newData: {
              name: updated.name,
              planId: updated.planId,
              contractStartDate: updated.contractStartDate,
              contractEndDate: updated.contractEndDate,
              isActive: updated.isActive,
            },
            ipAddress,
            userAgent,
          },
        });

        return updated;
      });

      return {
        success: true,
        data: company,
      };
    } catch (error) {
      console.error('Error in updateCompany:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '企業の更新に失敗しました',
        },
      };
    }
  }

  /**
   * 企業削除（論理削除）
   */
  async deleteCompany(
    companyId: string,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<ServiceResult<void>> {
    try {
      // SYSTEM_ADMINのみ削除可能
      if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '企業を削除する権限がありません',
          },
        };
      }

      // 企業の存在確認
      const existingCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!existingCompany) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '企業が見つかりません',
          },
        };
      }

      // 論理削除（isActive = false）
      await prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: companyId },
          data: { isActive: false },
        });

        // 所属ユーザーも無効化
        await tx.user.updateMany({
          where: { companyId },
          data: { isActive: false },
        });

        // 監査ログ記録
        await tx.auditLog.create({
          data: {
            userId: currentUser.userId,
            action: AuditAction.DELETE,
            entityType: 'Company',
            entityId: companyId,
            previousData: {
              name: existingCompany.name,
              isActive: existingCompany.isActive,
            },
            newData: {
              isActive: false,
            },
            ipAddress,
            userAgent,
          },
        });
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in deleteCompany:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '企業の削除に失敗しました',
        },
      };
    }
  }

  /**
   * 企業統計取得
   */
  async getCompanyStats(
    companyId: string,
    currentUser: AuthUser
  ): Promise<ServiceResult<CompanyStats>> {
    try {
      // 権限チェック: SYSTEM_ADMINまたは該当企業の管理者
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        currentUser.companyId !== companyId
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この企業の統計を閲覧する権限がありません',
          },
        };
      }

      // 企業の存在確認
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '企業が見つかりません',
          },
        };
      }

      // ユーザー数
      const [userCount, activeUserCount] = await Promise.all([
        prisma.user.count({ where: { companyId } }),
        prisma.user.count({ where: { companyId, isActive: true } }),
      ]);

      // 診断完了数・進行中数
      const diagnosisResults = await prisma.diagnosisResult.count({
        where: {
          user: { companyId },
          completedAt: { not: null },
        },
      });

      const diagnosisInProgress = await prisma.user.count({
        where: {
          companyId,
          answers: { some: {} },
          diagnosisResults: { none: {} },
        },
      });

      // 候補者数
      const candidateCount = await prisma.candidate.count({
        where: { companyId },
      });

      // 部門数
      const departmentCount = await prisma.department.count({
        where: { companyId },
      });

      // タイプ分布
      const typeDistribution = await prisma.diagnosisResult.groupBy({
        by: ['typeCode'],
        where: {
          user: { companyId },
        },
        _count: {
          typeCode: true,
        },
      });

      const typeDistributionMap: Record<string, number> = {};
      typeDistribution.forEach((item) => {
        typeDistributionMap[item.typeCode] = item._count.typeCode;
      });

      // BigFive平均値
      const bigFiveResults = await prisma.diagnosisResult.findMany({
        where: {
          user: { companyId },
          bigFive: { not: null },
        },
        select: {
          bigFive: true,
        },
      });

      let bigFiveAverages = null;
      if (bigFiveResults.length > 0) {
        const totals = {
          extraversion: 0,
          neuroticism: 0,
          openness: 0,
          agreeableness: 0,
          conscientiousness: 0,
        };

        bigFiveResults.forEach((result) => {
          const bigFive = result.bigFive as Record<string, number>;
          totals.extraversion += bigFive.extraversion || 0;
          totals.neuroticism += bigFive.neuroticism || 0;
          totals.openness += bigFive.openness || 0;
          totals.agreeableness += bigFive.agreeableness || 0;
          totals.conscientiousness += bigFive.conscientiousness || 0;
        });

        const count = bigFiveResults.length;
        bigFiveAverages = {
          extraversion: Math.round(totals.extraversion / count * 10) / 10,
          neuroticism: Math.round(totals.neuroticism / count * 10) / 10,
          openness: Math.round(totals.openness / count * 10) / 10,
          agreeableness: Math.round(totals.agreeableness / count * 10) / 10,
          conscientiousness: Math.round(totals.conscientiousness / count * 10) / 10,
        };
      }

      return {
        success: true,
        data: {
          userCount,
          activeUserCount,
          diagnosisCompletedCount: diagnosisResults,
          diagnosisInProgressCount: diagnosisInProgress,
          candidateCount,
          departmentCount,
          typeDistribution: typeDistributionMap,
          bigFiveAverages,
        },
      };
    } catch (error) {
      console.error('Error in getCompanyStats:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '企業統計の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 仮パスワード生成
   */
  private generateTempPassword(): string {
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const all = uppercase + lowercase + numbers + symbols;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}

// シングルトンインスタンス
export const companyService = new CompanyService();
