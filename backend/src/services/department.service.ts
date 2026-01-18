import { PrismaClient, UserRole, AuditAction } from '@prisma/client';
import { AuthUser } from '../types/auth.types';
import {
  GetDepartmentsQuery,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  AssignUsersToDepartmentInput,
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

interface DepartmentWithChildren {
  id: string;
  name: string;
  companyId: string;
  parentDepartmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children?: DepartmentWithChildren[];
  userCount?: number;
}

// ========================================
// 部門サービス
// ========================================

export class DepartmentService {
  /**
   * 部門一覧取得（階層構造）
   */
  async getDepartments(
    companyId: string,
    query: GetDepartmentsQuery,
    currentUser: AuthUser
  ): Promise<ServiceResult<DepartmentWithChildren[]>> {
    try {
      // 権限チェック: SYSTEM_ADMINまたは該当企業のユーザー
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        currentUser.companyId !== companyId
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この企業の部門を閲覧する権限がありません',
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

      // フラット形式で返す場合
      if (query.flat) {
        const departments = await prisma.department.findMany({
          where: { companyId },
          orderBy: { name: 'asc' },
          include: query.includeUsers
            ? {
                _count: {
                  select: { users: true },
                },
              }
            : undefined,
        });

        const result = departments.map((dept) => ({
          ...dept,
          userCount: query.includeUsers ? (dept as unknown as { _count: { users: number } })._count.users : undefined,
        }));

        return {
          success: true,
          data: result as DepartmentWithChildren[],
        };
      }

      // 階層構造で返す場合
      const allDepartments = await prisma.department.findMany({
        where: { companyId },
        include: query.includeUsers
          ? {
              _count: {
                select: { users: true },
              },
            }
          : undefined,
      });

      // 階層構造を構築
      const departmentMap = new Map<string, DepartmentWithChildren>();
      const rootDepartments: DepartmentWithChildren[] = [];

      // まず全部門をマップに登録
      allDepartments.forEach((dept) => {
        departmentMap.set(dept.id, {
          ...dept,
          children: [],
          userCount: query.includeUsers ? (dept as unknown as { _count: { users: number } })._count.users : undefined,
        });
      });

      // 親子関係を構築
      allDepartments.forEach((dept) => {
        const deptWithChildren = departmentMap.get(dept.id)!;
        if (dept.parentDepartmentId) {
          const parent = departmentMap.get(dept.parentDepartmentId);
          if (parent) {
            parent.children!.push(deptWithChildren);
          }
        } else {
          rootDepartments.push(deptWithChildren);
        }
      });

      // 名前でソート
      const sortDepartments = (depts: DepartmentWithChildren[]): DepartmentWithChildren[] => {
        return depts
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((dept) => ({
            ...dept,
            children: dept.children ? sortDepartments(dept.children) : [],
          }));
      };

      return {
        success: true,
        data: sortDepartments(rootDepartments),
      };
    } catch (error) {
      console.error('Error in getDepartments:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '部門一覧の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 部門詳細取得
   */
  async getDepartmentById(
    departmentId: string,
    currentUser: AuthUser
  ): Promise<ServiceResult<unknown>> {
    try {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          parentDepartment: {
            select: {
              id: true,
              name: true,
            },
          },
          childDepartments: {
            select: {
              id: true,
              name: true,
            },
          },
          users: {
            select: {
              id: true,
              email: true,
              nickname: true,
              fullName: true,
              role: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
      });

      if (!department) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '部門が見つかりません',
          },
        };
      }

      // 権限チェック
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        currentUser.companyId !== department.companyId
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'この部門を閲覧する権限がありません',
          },
        };
      }

      return {
        success: true,
        data: department,
      };
    } catch (error) {
      console.error('Error in getDepartmentById:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '部門情報の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 部門作成
   */
  async createDepartment(
    companyId: string,
    input: CreateDepartmentInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<ServiceResult<unknown>> {
    try {
      // 権限チェック: SYSTEM_ADMINまたは該当企業のCOMPANY_ADMIN
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        (currentUser.role !== UserRole.COMPANY_ADMIN || currentUser.companyId !== companyId)
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '部門を作成する権限がありません',
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

      // 親部門の存在確認（指定がある場合）
      if (input.parentDepartmentId) {
        const parentDepartment = await prisma.department.findUnique({
          where: { id: input.parentDepartmentId },
        });

        if (!parentDepartment) {
          return {
            success: false,
            error: {
              code: 'INVALID_PARENT',
              message: '指定された親部門が存在しません',
            },
          };
        }

        if (parentDepartment.companyId !== companyId) {
          return {
            success: false,
            error: {
              code: 'INVALID_PARENT',
              message: '親部門は同じ企業に属している必要があります',
            },
          };
        }
      }

      // 同名部門の重複チェック（同一企業・同一階層内）
      const existingDepartment = await prisma.department.findFirst({
        where: {
          companyId,
          name: input.name,
          parentDepartmentId: input.parentDepartmentId || null,
        },
      });

      if (existingDepartment) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_NAME',
            message: '同じ名前の部門が既に存在します',
          },
        };
      }

      // 部門作成
      const department = await prisma.$transaction(async (tx) => {
        const created = await tx.department.create({
          data: {
            companyId,
            name: input.name,
            parentDepartmentId: input.parentDepartmentId,
          },
          include: {
            parentDepartment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // 監査ログ記録
        await tx.auditLog.create({
          data: {
            userId: currentUser.userId,
            action: AuditAction.CREATE,
            entityType: 'Department',
            entityId: created.id,
            newData: {
              name: created.name,
              companyId: created.companyId,
              parentDepartmentId: created.parentDepartmentId,
            },
            ipAddress,
            userAgent,
          },
        });

        return created;
      });

      return {
        success: true,
        data: department,
      };
    } catch (error) {
      console.error('Error in createDepartment:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '部門の作成に失敗しました',
        },
      };
    }
  }

  /**
   * 部門更新
   */
  async updateDepartment(
    departmentId: string,
    input: UpdateDepartmentInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<ServiceResult<unknown>> {
    try {
      // 部門の存在確認
      const existingDepartment = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!existingDepartment) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '部門が見つかりません',
          },
        };
      }

      // 権限チェック
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        (currentUser.role !== UserRole.COMPANY_ADMIN ||
          currentUser.companyId !== existingDepartment.companyId)
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '部門を更新する権限がありません',
          },
        };
      }

      // 親部門の変更がある場合の検証
      if (input.parentDepartmentId !== undefined) {
        if (input.parentDepartmentId) {
          // 自分自身を親にできない
          if (input.parentDepartmentId === departmentId) {
            return {
              success: false,
              error: {
                code: 'INVALID_PARENT',
                message: '自分自身を親部門に設定することはできません',
              },
            };
          }

          const parentDepartment = await prisma.department.findUnique({
            where: { id: input.parentDepartmentId },
          });

          if (!parentDepartment) {
            return {
              success: false,
              error: {
                code: 'INVALID_PARENT',
                message: '指定された親部門が存在しません',
              },
            };
          }

          if (parentDepartment.companyId !== existingDepartment.companyId) {
            return {
              success: false,
              error: {
                code: 'INVALID_PARENT',
                message: '親部門は同じ企業に属している必要があります',
              },
            };
          }

          // 循環参照チェック
          const isCircular = await this.checkCircularReference(
            departmentId,
            input.parentDepartmentId
          );
          if (isCircular) {
            return {
              success: false,
              error: {
                code: 'CIRCULAR_REFERENCE',
                message: '循環参照が発生するため、この親部門は設定できません',
              },
            };
          }
        }
      }

      // 同名部門の重複チェック
      if (input.name) {
        const parentId = input.parentDepartmentId !== undefined
          ? input.parentDepartmentId
          : existingDepartment.parentDepartmentId;

        const duplicateDepartment = await prisma.department.findFirst({
          where: {
            companyId: existingDepartment.companyId,
            name: input.name,
            parentDepartmentId: parentId,
            id: { not: departmentId },
          },
        });

        if (duplicateDepartment) {
          return {
            success: false,
            error: {
              code: 'DUPLICATE_NAME',
              message: '同じ名前の部門が既に存在します',
            },
          };
        }
      }

      // 部門更新
      const department = await prisma.$transaction(async (tx) => {
        const updated = await tx.department.update({
          where: { id: departmentId },
          data: {
            name: input.name,
            parentDepartmentId: input.parentDepartmentId,
          },
          include: {
            parentDepartment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // 監査ログ記録
        await tx.auditLog.create({
          data: {
            userId: currentUser.userId,
            action: AuditAction.UPDATE,
            entityType: 'Department',
            entityId: departmentId,
            previousData: {
              name: existingDepartment.name,
              parentDepartmentId: existingDepartment.parentDepartmentId,
            },
            newData: {
              name: updated.name,
              parentDepartmentId: updated.parentDepartmentId,
            },
            ipAddress,
            userAgent,
          },
        });

        return updated;
      });

      return {
        success: true,
        data: department,
      };
    } catch (error) {
      console.error('Error in updateDepartment:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '部門の更新に失敗しました',
        },
      };
    }
  }

  /**
   * 部門削除
   */
  async deleteDepartment(
    departmentId: string,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<ServiceResult<void>> {
    try {
      // 部門の存在確認
      const existingDepartment = await prisma.department.findUnique({
        where: { id: departmentId },
        include: {
          _count: {
            select: {
              users: true,
              childDepartments: true,
            },
          },
        },
      });

      if (!existingDepartment) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '部門が見つかりません',
          },
        };
      }

      // 権限チェック
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        (currentUser.role !== UserRole.COMPANY_ADMIN ||
          currentUser.companyId !== existingDepartment.companyId)
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '部門を削除する権限がありません',
          },
        };
      }

      // 所属ユーザーがいる場合はエラー
      if (existingDepartment._count.users > 0) {
        return {
          success: false,
          error: {
            code: 'HAS_USERS',
            message: '所属ユーザーがいるため削除できません。先にユーザーを別の部門に移動してください。',
          },
        };
      }

      // 子部門がある場合はエラー
      if (existingDepartment._count.childDepartments > 0) {
        return {
          success: false,
          error: {
            code: 'HAS_CHILDREN',
            message: '子部門があるため削除できません。先に子部門を削除してください。',
          },
        };
      }

      // 部門削除
      await prisma.$transaction(async (tx) => {
        await tx.department.delete({
          where: { id: departmentId },
        });

        // 監査ログ記録
        await tx.auditLog.create({
          data: {
            userId: currentUser.userId,
            action: AuditAction.DELETE,
            entityType: 'Department',
            entityId: departmentId,
            previousData: {
              name: existingDepartment.name,
              companyId: existingDepartment.companyId,
              parentDepartmentId: existingDepartment.parentDepartmentId,
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
      console.error('Error in deleteDepartment:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '部門の削除に失敗しました',
        },
      };
    }
  }

  /**
   * ユーザーを部門に割り当て
   */
  async assignUsersToDepartment(
    departmentId: string,
    input: AssignUsersToDepartmentInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<ServiceResult<{ assigned: number; skipped: number }>> {
    try {
      // 部門の存在確認
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '部門が見つかりません',
          },
        };
      }

      // 権限チェック
      if (
        currentUser.role !== UserRole.SYSTEM_ADMIN &&
        (currentUser.role !== UserRole.COMPANY_ADMIN ||
          currentUser.companyId !== department.companyId)
      ) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'ユーザーを部門に割り当てる権限がありません',
          },
        };
      }

      // ユーザーの検証（同じ企業に属しているか）
      const users = await prisma.user.findMany({
        where: {
          id: { in: input.userIds },
          companyId: department.companyId,
        },
        select: {
          id: true,
          departmentId: true,
        },
      });

      const validUserIds = users.map((u) => u.id);
      const skippedCount = input.userIds.length - validUserIds.length;

      if (validUserIds.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_VALID_USERS',
            message: '割り当て可能なユーザーがいません',
          },
        };
      }

      // ユーザーを部門に割り当て
      await prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
          where: { id: { in: validUserIds } },
          data: { departmentId },
        });

        // 監査ログ記録
        await tx.auditLog.create({
          data: {
            userId: currentUser.userId,
            action: AuditAction.UPDATE,
            entityType: 'Department',
            entityId: departmentId,
            newData: {
              action: 'assign_users',
              userIds: validUserIds,
              assignedCount: validUserIds.length,
            },
            ipAddress,
            userAgent,
          },
        });
      });

      return {
        success: true,
        data: {
          assigned: validUserIds.length,
          skipped: skippedCount,
        },
      };
    } catch (error) {
      console.error('Error in assignUsersToDepartment:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ユーザーの割り当てに失敗しました',
        },
      };
    }
  }

  /**
   * 循環参照チェック
   */
  private async checkCircularReference(
    departmentId: string,
    newParentId: string
  ): Promise<boolean> {
    // 新しい親部門から上位をたどり、自分自身が含まれていないかチェック
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === departmentId) {
        return true;
      }

      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const dept = await prisma.department.findUnique({
        where: { id: currentId },
        select: { parentDepartmentId: true },
      });

      currentId = dept?.parentDepartmentId || null;
    }

    return false;
  }
}

// シングルトンインスタンス
export const departmentService = new DepartmentService();
