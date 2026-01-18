import { UserRole, SubUserPermission } from '@prisma/client';

/**
 * ロール定義（Prismaのenumを再エクスポート）
 */
export { UserRole, SubUserPermission };

/**
 * ロールの階層レベル（数値が大きいほど権限が高い）
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.GENERAL_USER]: 1,
  [UserRole.COMPANY_USER]: 2,
  [UserRole.COMPANY_ADMIN]: 3,
  [UserRole.SYSTEM_ADMIN]: 4,
};

/**
 * サブユーザー権限の操作タイプ
 */
export enum OperationType {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  CREATE = 'CREATE',
  DELETE = 'DELETE',
}

/**
 * サブユーザー権限で許可される操作
 */
export const SUB_USER_PERMISSION_OPERATIONS: Record<SubUserPermission, OperationType[]> = {
  [SubUserPermission.VIEW_ONLY]: [OperationType.VIEW],
  [SubUserPermission.EDIT]: [OperationType.VIEW, OperationType.EDIT],
  [SubUserPermission.FULL]: [OperationType.VIEW, OperationType.EDIT, OperationType.CREATE, OperationType.DELETE],
};

/**
 * 認証済みユーザー情報（リクエストに付加される）
 */
export interface AuthUser {
  id?: string;  // userIdのエイリアス
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string | null;
  departmentId?: string | null;
  parentUserId?: string | null;
  subUserPermission?: SubUserPermission | null;
  isActive?: boolean;
}

/**
 * ターゲットユーザー情報（権限チェック対象）
 */
export interface TargetUser {
  id: string;
  role: UserRole;
  companyId?: string | null;
  departmentId?: string | null;
  parentUserId?: string | null;
}

/**
 * 候補者情報（権限チェック対象）
 */
export interface TargetCandidate {
  id: string;
  companyId: string;
  userId?: string | null;
}

/**
 * 診断結果情報（権限チェック対象）
 */
export interface TargetDiagnosisResult {
  id: string;
  userId: string;
  user?: {
    companyId?: string | null;
    departmentId?: string | null;
  };
}

/**
 * 権限チェック関数の型
 */
export type PermissionCheckFunction<T = unknown> = (
  user: AuthUser,
  target?: T,
  operation?: OperationType
) => boolean | Promise<boolean> | PermissionCheckResult;

/**
 * 非同期権限チェック関数の型
 */
export type AsyncPermissionCheckFunction<T = unknown> = (
  user: AuthUser,
  target?: T,
  operation?: OperationType
) => Promise<boolean>;

/**
 * 権限チェック結果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * リソースタイプ
 */
export enum ResourceType {
  COMPANY = 'COMPANY',
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
  DIAGNOSIS = 'DIAGNOSIS',
  CANDIDATE = 'CANDIDATE',
  INTERVIEW = 'INTERVIEW',
  INVOICE = 'INVOICE',
  AUDIT_LOG = 'AUDIT_LOG',
  PLAN = 'PLAN',
}

/**
 * アクションタイプ
 */
export enum ActionType {
  LIST = 'LIST',
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

/**
 * 権限定義
 */
export interface Permission {
  resource: ResourceType;
  action: ActionType;
  condition?: (user: AuthUser, target?: unknown) => boolean | Promise<boolean>;
}

/**
 * ロール別権限マップ
 */
export type RolePermissionMap = Record<UserRole, Permission[]>;

/**
 * AuthenticatedUser型（AuthUserのエイリアス）
 * 候補者サービスなどで使用
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  companyId?: string | null;
  departmentId?: string | null;
}

/**
 * AuthenticatedRequest型（Express Request拡張）
 */
import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
}

/**
 * Express Request拡張（認証済みユーザー情報付き）
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      targetUser?: TargetUser;
      targetCandidate?: TargetCandidate;
      targetDiagnosisResult?: TargetDiagnosisResult;
    }
  }
}
