import { UserRole, SubUserPermission } from '@prisma/client';
import {
  AuthUser,
  TargetUser,
  TargetCandidate,
  TargetDiagnosisResult,
  ROLE_HIERARCHY,
  OperationType,
  SUB_USER_PERMISSION_OPERATIONS,
  PermissionCheckResult,
} from '../types/auth.types';
import { prisma } from '../models';

/**
 * ロールの階層レベルを取得
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] || 0;
}

/**
 * ユーザーが指定されたロール以上の権限を持っているかチェック
 */
export function hasRoleOrHigher(user: AuthUser, requiredRole: UserRole): boolean {
  return getRoleLevel(user.role) >= getRoleLevel(requiredRole);
}

/**
 * サブユーザーが指定された操作を実行できるかチェック
 */
export function canSubUserPerformOperation(
  permission: SubUserPermission | null | undefined,
  operation: OperationType
): boolean {
  if (!permission) {
    return false;
  }
  return SUB_USER_PERMISSION_OPERATIONS[permission].includes(operation);
}

/**
 * ユーザーがシステム管理者かどうかチェック
 */
export function isSystemAdmin(user: AuthUser): boolean {
  return user.role === UserRole.SYSTEM_ADMIN;
}

/**
 * ユーザーが企業管理者以上かどうかチェック
 */
export function isCompanyAdminOrHigher(user: AuthUser): boolean {
  return hasRoleOrHigher(user, UserRole.COMPANY_ADMIN);
}

/**
 * 同一企業に所属しているかチェック
 */
export function isSameCompany(user: AuthUser, companyId: string | null | undefined): boolean {
  if (!user.companyId || !companyId) {
    return false;
  }
  return user.companyId === companyId;
}

/**
 * 同一部門に所属しているかチェック
 */
export function isSameDepartment(user: AuthUser, departmentId: string | null | undefined): boolean {
  if (!user.departmentId || !departmentId) {
    return false;
  }
  return user.departmentId === departmentId;
}

/**
 * 自分自身かどうかチェック
 */
export function isSelf(user: AuthUser, targetUserId: string): boolean {
  return user.userId === targetUserId;
}

// ========================================
// 権限チェック関数
// ========================================

/**
 * 1. 企業一覧閲覧権限
 * - SYSTEM_ADMIN: true
 * - その他: false
 */
export function canViewCompanies(user: AuthUser): PermissionCheckResult {
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }
  return { allowed: false, reason: '企業一覧の閲覧はシステム管理者のみ許可されています' };
}

/**
 * 2. ユーザー管理権限
 * - SYSTEM_ADMIN: 全ユーザー管理可能
 * - COMPANY_ADMIN: 自社ユーザーのみ
 * - その他: false
 */
export function canManageUsers(
  user: AuthUser,
  targetUser?: TargetUser,
  operation: OperationType = OperationType.VIEW
): PermissionCheckResult {
  // サブユーザーの場合、操作権限をチェック
  if (user.parentUserId && user.subUserPermission) {
    if (!canSubUserPerformOperation(user.subUserPermission, operation)) {
      return { allowed: false, reason: 'サブユーザーの権限では許可されていない操作です' };
    }
  }

  // システム管理者は全ユーザー管理可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // 企業管理者は自社ユーザーのみ管理可能
  if (user.role === UserRole.COMPANY_ADMIN) {
    if (!targetUser) {
      // ターゲットが指定されていない場合は自社ユーザー一覧の閲覧として許可
      return { allowed: true };
    }
    if (isSameCompany(user, targetUser.companyId)) {
      // 自分自身より上位のロールは管理不可
      if (getRoleLevel(targetUser.role) > getRoleLevel(user.role)) {
        return { allowed: false, reason: '自分より上位の権限を持つユーザーは管理できません' };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: '他社のユーザーは管理できません' };
  }

  return { allowed: false, reason: 'ユーザー管理は企業管理者以上のみ許可されています' };
}

/**
 * 3. 診断結果閲覧権限
 * - SYSTEM_ADMIN: 全て
 * - COMPANY_ADMIN: 自社のみ
 * - COMPANY_USER: 同一組織のみ
 * - GENERAL_USER: 自分のみ
 */
export function canViewDiagnosisResult(
  user: AuthUser,
  targetUserId?: string,
  targetUserCompanyId?: string | null,
  targetUserDepartmentId?: string | null
): PermissionCheckResult {
  // サブユーザーの場合、VIEW権限をチェック
  if (user.parentUserId && user.subUserPermission) {
    if (!canSubUserPerformOperation(user.subUserPermission, OperationType.VIEW)) {
      return { allowed: false, reason: 'サブユーザーの権限では閲覧が許可されていません' };
    }
  }

  // システム管理者は全て閲覧可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // ターゲットが指定されていない場合
  if (!targetUserId) {
    // 企業管理者以上は自社の診断結果一覧を閲覧可能
    if (isCompanyAdminOrHigher(user)) {
      return { allowed: true };
    }
    // 企業ユーザーは同一部門の診断結果一覧を閲覧可能
    if (user.role === UserRole.COMPANY_USER) {
      return { allowed: true };
    }
    // 一般ユーザーは自分の診断結果のみ
    return { allowed: true };
  }

  // 自分自身の診断結果は常に閲覧可能
  if (isSelf(user, targetUserId)) {
    return { allowed: true };
  }

  // 企業管理者は自社のみ
  if (user.role === UserRole.COMPANY_ADMIN) {
    if (isSameCompany(user, targetUserCompanyId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '他社の診断結果は閲覧できません' };
  }

  // 企業ユーザーは同一組織（部門）のみ
  if (user.role === UserRole.COMPANY_USER) {
    if (isSameCompany(user, targetUserCompanyId) && isSameDepartment(user, targetUserDepartmentId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '同一部門以外の診断結果は閲覧できません' };
  }

  // 一般ユーザーは自分のみ
  return { allowed: false, reason: '他のユーザーの診断結果は閲覧できません' };
}

/**
 * 4. 候補者管理権限
 * - SYSTEM_ADMIN: true
 * - COMPANY_ADMIN: true（自社のみ）
 * - COMPANY_USER: 閲覧のみ
 * - GENERAL_USER: false
 */
export function canManageCandidates(
  user: AuthUser,
  targetCandidate?: TargetCandidate,
  operation: OperationType = OperationType.VIEW
): PermissionCheckResult {
  // サブユーザーの場合、操作権限をチェック
  if (user.parentUserId && user.subUserPermission) {
    if (!canSubUserPerformOperation(user.subUserPermission, operation)) {
      return { allowed: false, reason: 'サブユーザーの権限では許可されていない操作です' };
    }
  }

  // 一般ユーザーは候補者管理不可
  if (user.role === UserRole.GENERAL_USER) {
    return { allowed: false, reason: '一般ユーザーは候補者管理にアクセスできません' };
  }

  // システム管理者は全て管理可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // 企業管理者は自社のみ全操作可能
  if (user.role === UserRole.COMPANY_ADMIN) {
    if (!targetCandidate) {
      return { allowed: true };
    }
    if (isSameCompany(user, targetCandidate.companyId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '他社の候補者は管理できません' };
  }

  // 企業ユーザーは閲覧のみ
  if (user.role === UserRole.COMPANY_USER) {
    if (operation !== OperationType.VIEW) {
      return { allowed: false, reason: '企業ユーザーは候補者の閲覧のみ許可されています' };
    }
    if (!targetCandidate) {
      return { allowed: true };
    }
    if (isSameCompany(user, targetCandidate.companyId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '他社の候補者は閲覧できません' };
  }

  return { allowed: false, reason: '候補者管理へのアクセス権限がありません' };
}

/**
 * 5. ロール変更権限
 * - SYSTEM_ADMIN: 全ロール変更可能
 * - その他: false
 * ※ 一般ユーザー→企業ユーザーはシステム管理者のみ
 */
export function canChangeUserRole(
  user: AuthUser,
  targetUser: TargetUser,
  newRole: UserRole
): PermissionCheckResult {
  // システム管理者のみロール変更可能
  if (!isSystemAdmin(user)) {
    return { allowed: false, reason: 'ロール変更はシステム管理者のみ許可されています' };
  }

  // 自分自身のロールは変更不可
  if (isSelf(user, targetUser.id)) {
    return { allowed: false, reason: '自分自身のロールは変更できません' };
  }

  // GENERAL_USER → COMPANY_USER への変更は企業への紐付けが必要
  if (targetUser.role === UserRole.GENERAL_USER && newRole === UserRole.COMPANY_USER) {
    if (!targetUser.companyId) {
      return { allowed: false, reason: '企業ユーザーへの変更には企業への紐付けが必要です' };
    }
  }

  // SYSTEM_ADMIN への変更は特に注意
  if (newRole === UserRole.SYSTEM_ADMIN) {
    // 追加のチェックが必要な場合はここに実装
  }

  return { allowed: true };
}

// ========================================
// 追加の権限チェック関数
// ========================================

/**
 * 企業管理権限
 * - SYSTEM_ADMIN: 全て
 * - COMPANY_ADMIN: 自社のみ
 * - その他: false
 */
export function canManageCompany(
  user: AuthUser,
  companyId?: string,
  operation: OperationType = OperationType.VIEW
): PermissionCheckResult {
  // サブユーザーの場合、操作権限をチェック
  if (user.parentUserId && user.subUserPermission) {
    if (!canSubUserPerformOperation(user.subUserPermission, operation)) {
      return { allowed: false, reason: 'サブユーザーの権限では許可されていない操作です' };
    }
  }

  // システム管理者は全て管理可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // 企業管理者は自社のみ
  if (user.role === UserRole.COMPANY_ADMIN) {
    if (!companyId || isSameCompany(user, companyId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '他社の情報は管理できません' };
  }

  return { allowed: false, reason: '企業管理は企業管理者以上のみ許可されています' };
}

/**
 * 部門管理権限
 * - SYSTEM_ADMIN: 全て
 * - COMPANY_ADMIN: 自社のみ
 * - その他: false
 */
export function canManageDepartments(
  user: AuthUser,
  companyId?: string,
  operation: OperationType = OperationType.VIEW
): PermissionCheckResult {
  return canManageCompany(user, companyId, operation);
}

/**
 * 請求書閲覧権限
 * - SYSTEM_ADMIN: 全て
 * - COMPANY_ADMIN: 自社のみ（閲覧・ダウンロードのみ）
 * - その他: false
 */
export function canViewInvoices(
  user: AuthUser,
  companyId?: string
): PermissionCheckResult {
  // システム管理者は全て閲覧可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // 企業管理者は自社のみ
  if (user.role === UserRole.COMPANY_ADMIN) {
    if (!companyId || isSameCompany(user, companyId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '他社の請求書は閲覧できません' };
  }

  return { allowed: false, reason: '請求書の閲覧は企業管理者以上のみ許可されています' };
}

/**
 * 請求書発行権限
 * - SYSTEM_ADMIN: true
 * - その他: false
 */
export function canIssueInvoices(user: AuthUser): PermissionCheckResult {
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }
  return { allowed: false, reason: '請求書の発行はシステム管理者のみ許可されています' };
}

/**
 * 監査ログ閲覧権限
 * - SYSTEM_ADMIN: 全て
 * - COMPANY_ADMIN: 自社ユーザーの操作ログのみ
 * - その他: false
 */
export function canViewAuditLogs(
  user: AuthUser,
  targetUserId?: string
): PermissionCheckResult {
  // システム管理者は全て閲覧可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // 企業管理者は自社ユーザーの操作ログのみ
  if (user.role === UserRole.COMPANY_ADMIN) {
    // ターゲットが指定されていない場合は自社ユーザーの一覧として許可
    return { allowed: true };
  }

  return { allowed: false, reason: '監査ログの閲覧は企業管理者以上のみ許可されています' };
}

/**
 * 面接管理権限
 * - SYSTEM_ADMIN: 全て
 * - COMPANY_ADMIN: 自社のみ
 * - COMPANY_USER: 自分が担当する面接のみ
 * - GENERAL_USER: false
 */
export function canManageInterviews(
  user: AuthUser,
  interviewCompanyId?: string,
  interviewerId?: string,
  operation: OperationType = OperationType.VIEW
): PermissionCheckResult {
  // サブユーザーの場合、操作権限をチェック
  if (user.parentUserId && user.subUserPermission) {
    if (!canSubUserPerformOperation(user.subUserPermission, operation)) {
      return { allowed: false, reason: 'サブユーザーの権限では許可されていない操作です' };
    }
  }

  // 一般ユーザーは面接管理不可
  if (user.role === UserRole.GENERAL_USER) {
    return { allowed: false, reason: '一般ユーザーは面接管理にアクセスできません' };
  }

  // システム管理者は全て管理可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // 企業管理者は自社のみ
  if (user.role === UserRole.COMPANY_ADMIN) {
    if (!interviewCompanyId || isSameCompany(user, interviewCompanyId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '他社の面接は管理できません' };
  }

  // 企業ユーザーは自分が担当する面接のみ
  if (user.role === UserRole.COMPANY_USER) {
    if (operation === OperationType.VIEW) {
      // 閲覧は自社の面接全て可能
      if (!interviewCompanyId || isSameCompany(user, interviewCompanyId)) {
        return { allowed: true };
      }
    } else {
      // 編集等は自分が担当する面接のみ
      if (interviewerId && isSelf(user, interviewerId)) {
        return { allowed: true };
      }
      return { allowed: false, reason: '自分が担当する面接のみ編集できます' };
    }
    return { allowed: false, reason: '他社の面接は閲覧できません' };
  }

  return { allowed: false, reason: '面接管理へのアクセス権限がありません' };
}

/**
 * プラン管理権限
 * - SYSTEM_ADMIN: true
 * - その他: false
 */
export function canManagePlans(user: AuthUser): PermissionCheckResult {
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'プラン管理はシステム管理者のみ許可されています' };
}

/**
 * データエクスポート権限
 * - SYSTEM_ADMIN: 全て
 * - COMPANY_ADMIN: 自社のみ
 * - その他: false
 */
export function canExportData(
  user: AuthUser,
  companyId?: string
): PermissionCheckResult {
  // システム管理者は全てエクスポート可能
  if (isSystemAdmin(user)) {
    return { allowed: true };
  }

  // 企業管理者は自社のみ
  if (user.role === UserRole.COMPANY_ADMIN) {
    if (!companyId || isSameCompany(user, companyId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: '他社のデータはエクスポートできません' };
  }

  return { allowed: false, reason: 'データエクスポートは企業管理者以上のみ許可されています' };
}

// ========================================
// 非同期権限チェック関数（DB参照が必要な場合）
// ========================================

/**
 * 診断結果閲覧権限（非同期版）
 * ターゲットユーザーの情報をDBから取得してチェック
 */
export async function canViewDiagnosisResultAsync(
  user: AuthUser,
  diagnosisResultId: string
): Promise<PermissionCheckResult> {
  // 診断結果とユーザー情報を取得
  const diagnosisResult = await prisma.diagnosisResult.findUnique({
    where: { id: diagnosisResultId },
    include: {
      user: {
        select: {
          id: true,
          companyId: true,
          departmentId: true,
        },
      },
    },
  });

  if (!diagnosisResult) {
    return { allowed: false, reason: '診断結果が見つかりません' };
  }

  return canViewDiagnosisResult(
    user,
    diagnosisResult.userId,
    diagnosisResult.user.companyId,
    diagnosisResult.user.departmentId
  );
}

/**
 * ユーザー管理権限（非同期版）
 * ターゲットユーザーの情報をDBから取得してチェック
 */
export async function canManageUsersAsync(
  user: AuthUser,
  targetUserId: string,
  operation: OperationType = OperationType.VIEW
): Promise<PermissionCheckResult> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
      companyId: true,
      departmentId: true,
      parentUserId: true,
    },
  });

  if (!targetUser) {
    return { allowed: false, reason: 'ユーザーが見つかりません' };
  }

  return canManageUsers(user, targetUser, operation);
}

/**
 * 候補者管理権限（非同期版）
 * ターゲット候補者の情報をDBから取得してチェック
 */
export async function canManageCandidatesAsync(
  user: AuthUser,
  candidateId: string,
  operation: OperationType = OperationType.VIEW
): Promise<PermissionCheckResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      companyId: true,
      userId: true,
    },
  });

  if (!candidate) {
    return { allowed: false, reason: '候補者が見つかりません' };
  }

  return canManageCandidates(user, candidate, operation);
}
