import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRole, SubUserPermission, AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../models';
import { config } from '../config';
import { AuthUser } from '../types/auth.types';
import {
  CreateUserInput,
  UpdateUserInput,
  ChangeRoleInput,
  CreateSubUserInput,
  GetUsersQuery,
  BulkCreateUsersInput,
} from '../validators/user.validator';
import { isSystemAdmin, isSameCompany } from '../utils/permissions';

// ========================================
// 型定義
// ========================================

export interface UserServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedUsers {
  users: UserWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ユーザーのセレクト（パスワード除外）
const userSelect = {
  id: true,
  email: true,
  nickname: true,
  fullName: true,
  role: true,
  companyId: true,
  departmentId: true,
  parentUserId: true,
  subUserPermission: true,
  age: true,
  gender: true,
  isActive: true,
  mfaEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type UserWithRelations = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

// ========================================
// ユーザーサービスクラス
// ========================================

export class UserService {
  /**
   * ユーザー一覧取得
   */
  async getUsers(
    query: GetUsersQuery,
    currentUser: AuthUser
  ): Promise<UserServiceResult<PaginatedUsers>> {
    try {
      const { page, limit, role, companyId, departmentId, search, isActive, sortBy, sortOrder } = query;

      // フィルター条件を構築
      const where: Prisma.UserWhereInput = {};

      // ロールによるフィルタリング
      if (!isSystemAdmin(currentUser)) {
        // 企業管理者は自社ユーザーのみ
        where.companyId = currentUser.companyId;
      } else if (companyId) {
        // システム管理者は企業IDでフィルタ可能
        where.companyId = companyId;
      }

      // その他のフィルター
      if (role) {
        where.role = role;
      }

      if (departmentId) {
        where.departmentId = departmentId;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // 検索条件
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { nickname: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ];
      }

      // 総数を取得
      const total = await prisma.user.count({ where });

      // ユーザー一覧を取得
      const users = await prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ユーザー一覧の取得に失敗しました',
        },
      };
    }
  }

  /**
   * ユーザー詳細取得
   */
  async getUserById(
    userId: string,
    currentUser: AuthUser
  ): Promise<UserServiceResult<UserWithRelations>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      // 権限チェック
      if (!isSystemAdmin(currentUser)) {
        // 自分自身または同じ企業のユーザーのみ閲覧可能
        if (user.id !== currentUser.userId && !isSameCompany(currentUser, user.companyId)) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'このユーザーの情報を閲覧する権限がありません',
            },
          };
        }
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ユーザー情報の取得に失敗しました',
        },
      };
    }
  }

  /**
   * ユーザー作成
   */
  async createUser(
    input: CreateUserInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<UserServiceResult<UserWithRelations>> {
    try {
      // メールアドレスの重複チェック
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'このメールアドレスは既に使用されています',
          },
        };
      }

      // 企業管理者は自社ユーザーのみ作成可能
      if (!isSystemAdmin(currentUser)) {
        if (input.companyId && input.companyId !== currentUser.companyId) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: '他社のユーザーを作成する権限がありません',
            },
          };
        }
        // 企業管理者は COMPANY_USER または GENERAL_USER のみ作成可能
        if (input.role === UserRole.SYSTEM_ADMIN || input.role === UserRole.COMPANY_ADMIN) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: '管理者ロールのユーザーを作成する権限がありません',
            },
          };
        }
        // 企業IDを自社に設定
        input.companyId = currentUser.companyId;
      }

      // パスワードハッシュ化
      const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

      // ユーザー作成
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          nickname: input.nickname,
          fullName: input.fullName,
          role: input.role,
          companyId: input.companyId,
          departmentId: input.departmentId,
          age: input.age,
          gender: input.gender,
          isActive: true,
        },
        select: userSelect,
      });

      // 監査ログ記録
      await this.createAuditLog(
        currentUser.userId,
        AuditAction.CREATE,
        'User',
        user.id,
        null,
        { email: user.email, role: user.role, companyId: user.companyId },
        ipAddress,
        userAgent
      );

      // 招待メール送信（非同期）
      if (input.sendInvitationEmail) {
        this.sendInvitationEmail(user.email, input.password, user.nickname).catch((err) => {
          console.error('Failed to send invitation email:', err);
        });
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ユーザーの作成に失敗しました',
        },
      };
    }
  }

  /**
   * ユーザー更新
   */
  async updateUser(
    userId: string,
    input: UpdateUserInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<UserServiceResult<UserWithRelations>> {
    try {
      // 既存ユーザーを取得
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          ...userSelect,
          passwordHash: false,
        },
      });

      if (!existingUser) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      // 権限チェック
      if (!isSystemAdmin(currentUser)) {
        // 自分自身または同じ企業のユーザーのみ更新可能
        if (existingUser.id !== currentUser.userId) {
          if (currentUser.role !== UserRole.COMPANY_ADMIN || !isSameCompany(currentUser, existingUser.companyId)) {
            return {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'このユーザーを更新する権限がありません',
              },
            };
          }
        }
      }

      // ユーザー更新
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          nickname: input.nickname,
          fullName: input.fullName,
          departmentId: input.departmentId,
          age: input.age,
          gender: input.gender,
        },
        select: userSelect,
      });

      // 監査ログ記録
      await this.createAuditLog(
        currentUser.userId,
        AuditAction.UPDATE,
        'User',
        user.id,
        existingUser,
        user,
        ipAddress,
        userAgent
      );

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ユーザーの更新に失敗しました',
        },
      };
    }
  }

  /**
   * ユーザー削除（論理削除）
   */
  async deleteUser(
    userId: string,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<UserServiceResult<void>> {
    try {
      // 既存ユーザーを取得
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      });

      if (!existingUser) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      // 自分自身は削除不可
      if (existingUser.id === currentUser.userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '自分自身を削除することはできません',
          },
        };
      }

      // 権限チェック
      if (!isSystemAdmin(currentUser)) {
        if (currentUser.role !== UserRole.COMPANY_ADMIN || !isSameCompany(currentUser, existingUser.companyId)) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'このユーザーを削除する権限がありません',
            },
          };
        }
        // 企業管理者は同等以上のロールを削除不可
        if (existingUser.role === UserRole.COMPANY_ADMIN || existingUser.role === UserRole.SYSTEM_ADMIN) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: '管理者ロールのユーザーを削除する権限がありません',
            },
          };
        }
      }

      // 論理削除
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // 監査ログ記録
      await this.createAuditLog(
        currentUser.userId,
        AuditAction.DELETE,
        'User',
        userId,
        existingUser,
        null,
        ipAddress,
        userAgent
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ユーザーの削除に失敗しました',
        },
      };
    }
  }

  /**
   * ロール変更
   */
  async changeRole(
    userId: string,
    input: ChangeRoleInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<UserServiceResult<UserWithRelations>> {
    try {
      // システム管理者のみ
      if (!isSystemAdmin(currentUser)) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'ロール変更はシステム管理者のみ可能です',
          },
        };
      }

      // 既存ユーザーを取得
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      });

      if (!existingUser) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      // 自分自身のロールは変更不可
      if (existingUser.id === currentUser.userId) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '自分自身のロールを変更することはできません',
          },
        };
      }

      // GENERAL_USER → COMPANY_USER への変更は企業への紐付けが必要
      if (existingUser.role === UserRole.GENERAL_USER && input.newRole === UserRole.COMPANY_USER) {
        if (!existingUser.companyId) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '企業ユーザーへの変更には企業への紐付けが必要です',
            },
          };
        }
      }

      // ロール更新
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role: input.newRole },
        select: userSelect,
      });

      // 監査ログ記録
      await this.createAuditLog(
        currentUser.userId,
        AuditAction.ROLE_CHANGE,
        'User',
        user.id,
        { role: existingUser.role },
        { role: user.role },
        ipAddress,
        userAgent
      );

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error('Error changing role:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ロールの変更に失敗しました',
        },
      };
    }
  }

  /**
   * サブユーザー作成
   */
  async createSubUser(
    parentUserId: string,
    input: CreateSubUserInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<UserServiceResult<UserWithRelations>> {
    try {
      // 親ユーザーを取得
      const parentUser = await prisma.user.findUnique({
        where: { id: parentUserId },
        select: userSelect,
      });

      if (!parentUser) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '親ユーザーが見つかりません',
          },
        };
      }

      // 権限チェック
      if (!isSystemAdmin(currentUser)) {
        if (currentUser.role !== UserRole.COMPANY_ADMIN || !isSameCompany(currentUser, parentUser.companyId)) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'サブユーザーを作成する権限がありません',
            },
          };
        }
      }

      // メールアドレスの重複チェック
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'このメールアドレスは既に使用されています',
          },
        };
      }

      // パスワード生成（指定がない場合は自動生成）
      const password = input.password || this.generateRandomPassword();
      const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

      // サブユーザー作成
      const subUser = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          nickname: input.nickname || `${parentUser.nickname}のサブユーザー`,
          role: parentUser.role, // 親と同じロール
          companyId: parentUser.companyId,
          departmentId: parentUser.departmentId,
          parentUserId: parentUser.id,
          subUserPermission: input.permission,
          isActive: true,
        },
        select: userSelect,
      });

      // 監査ログ記録
      await this.createAuditLog(
        currentUser.userId,
        AuditAction.CREATE,
        'User',
        subUser.id,
        null,
        { email: subUser.email, parentUserId: parentUser.id, permission: input.permission },
        ipAddress,
        userAgent
      );

      // 招待メール送信（非同期）
      if (input.sendInvitationEmail) {
        this.sendInvitationEmail(subUser.email, password, subUser.nickname).catch((err) => {
          console.error('Failed to send invitation email:', err);
        });
      }

      return {
        success: true,
        data: subUser,
      };
    } catch (error) {
      console.error('Error creating sub user:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サブユーザーの作成に失敗しました',
        },
      };
    }
  }

  /**
   * サブユーザー一覧取得
   */
  async getSubUsers(
    parentUserId: string,
    currentUser: AuthUser
  ): Promise<UserServiceResult<UserWithRelations[]>> {
    try {
      // 親ユーザーを取得
      const parentUser = await prisma.user.findUnique({
        where: { id: parentUserId },
        select: { id: true, companyId: true },
      });

      if (!parentUser) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '親ユーザーが見つかりません',
          },
        };
      }

      // 権限チェック
      if (!isSystemAdmin(currentUser)) {
        if (currentUser.userId !== parentUserId && !isSameCompany(currentUser, parentUser.companyId)) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'サブユーザー一覧を閲覧する権限がありません',
            },
          };
        }
      }

      // サブユーザー一覧を取得
      const subUsers = await prisma.user.findMany({
        where: { parentUserId },
        select: userSelect,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: subUsers,
      };
    } catch (error) {
      console.error('Error getting sub users:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サブユーザー一覧の取得に失敗しました',
        },
      };
    }
  }

  /**
   * 一括ユーザー作成
   */
  async bulkCreateUsers(
    input: BulkCreateUsersInput,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<UserServiceResult<{ created: number; failed: number; errors: string[] }>> {
    try {
      const results = {
        created: 0,
        failed: 0,
        errors: [] as string[],
      };

      // 企業IDの決定
      const companyId = input.companyId || currentUser.companyId;

      // 権限チェック
      if (!isSystemAdmin(currentUser)) {
        if (companyId !== currentUser.companyId) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: '他社のユーザーを作成する権限がありません',
            },
          };
        }
      }

      for (const userData of input.users) {
        try {
          // メールアドレスの重複チェック
          const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
          });

          if (existingUser) {
            results.failed++;
            results.errors.push(`${userData.email}: このメールアドレスは既に使用されています`);
            continue;
          }

          // パスワード自動生成
          const password = this.generateRandomPassword();
          const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

          // ユーザー作成
          const user = await prisma.user.create({
            data: {
              email: userData.email,
              passwordHash,
              nickname: userData.nickname,
              fullName: userData.fullName,
              role: userData.role,
              companyId,
              departmentId: userData.departmentId,
              isActive: true,
            },
          });

          // 監査ログ記録
          await this.createAuditLog(
            currentUser.userId,
            AuditAction.CREATE,
            'User',
            user.id,
            null,
            { email: user.email, role: user.role, companyId: user.companyId },
            ipAddress,
            userAgent
          );

          // 招待メール送信（非同期）
          if (input.sendInvitationEmail) {
            this.sendInvitationEmail(user.email, password, user.nickname).catch((err) => {
              console.error('Failed to send invitation email:', err);
            });
          }

          results.created++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${userData.email}: 作成に失敗しました`);
          console.error(`Error creating user ${userData.email}:`, error);
        }
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('Error bulk creating users:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '一括ユーザー作成に失敗しました',
        },
      };
    }
  }

  /**
   * アクティブ状態の切り替え
   */
  async toggleActive(
    userId: string,
    isActive: boolean,
    currentUser: AuthUser,
    ipAddress: string,
    userAgent: string
  ): Promise<UserServiceResult<UserWithRelations>> {
    try {
      // 既存ユーザーを取得
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      });

      if (!existingUser) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        };
      }

      // 自分自身は無効化不可
      if (existingUser.id === currentUser.userId && !isActive) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '自分自身を無効化することはできません',
          },
        };
      }

      // 権限チェック
      if (!isSystemAdmin(currentUser)) {
        if (currentUser.role !== UserRole.COMPANY_ADMIN || !isSameCompany(currentUser, existingUser.companyId)) {
          return {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'このユーザーのアクティブ状態を変更する権限がありません',
            },
          };
        }
      }

      // 更新
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: userSelect,
      });

      // 監査ログ記録
      await this.createAuditLog(
        currentUser.userId,
        AuditAction.UPDATE,
        'User',
        user.id,
        { isActive: existingUser.isActive },
        { isActive: user.isActive },
        ipAddress,
        userAgent
      );

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error('Error toggling active:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'アクティブ状態の変更に失敗しました',
        },
      };
    }
  }

  // ========================================
  // プライベートメソッド
  // ========================================

  /**
   * 監査ログ作成
   */
  private async createAuditLog(
    userId: string | null,
    action: AuditAction,
    entityType: string,
    entityId: string,
    previousData: unknown,
    newData: unknown,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          previousData: previousData ? JSON.parse(JSON.stringify(previousData)) : null,
          newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * 招待メール送信
   */
  private async sendInvitationEmail(
    email: string,
    password: string,
    nickname: string
  ): Promise<void> {
    // TODO: SendGridを使用したメール送信を実装
    // 現時点ではログ出力のみ
    console.log(`[Email] Sending invitation to ${email}`);
    console.log(`  Nickname: ${nickname}`);
    console.log(`  Temporary Password: ${password}`);

    // メール送信履歴を記録
    try {
      await prisma.emailLog.create({
        data: {
          toEmail: email,
          subject: 'PeopleBoosterへの招待',
          templateId: 'invitation',
          status: 'SENT', // 実際の実装では送信結果に応じて設定
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  /**
   * ランダムパスワード生成
   */
  private generateRandomPassword(): string {
    const length = 16;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()';
    const all = lowercase + uppercase + numbers + symbols;

    let password = '';
    // 各種類から最低1文字ずつ
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += symbols[crypto.randomInt(symbols.length)];

    // 残りをランダムに
    for (let i = 4; i < length; i++) {
      password += all[crypto.randomInt(all.length)];
    }

    // シャッフル
    return password
      .split('')
      .sort(() => crypto.randomInt(3) - 1)
      .join('');
  }
}

// シングルトンインスタンス
export const userService = new UserService();
