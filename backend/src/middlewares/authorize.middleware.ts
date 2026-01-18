import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import {
  AuthUser,
  OperationType,
  PermissionCheckResult,
  PermissionCheckFunction,
  AsyncPermissionCheckFunction,
} from '../types/auth.types';
import {
  isSystemAdmin,
  isCompanyAdminOrHigher,
  isSameCompany,
  isSelf,
  canViewCompanies,
  canManageUsers,
  canViewDiagnosisResult,
  canManageCandidates,
  canChangeUserRole,
  canManageCompany,
  canManageDepartments,
  canViewInvoices,
  canIssueInvoices,
  canViewAuditLogs,
  canManageInterviews,
  canManagePlans,
  canExportData,
  canViewDiagnosisResultAsync,
  canManageUsersAsync,
  canManageCandidatesAsync,
} from '../utils/permissions';
import { prisma } from '../models';

/**
 * エラーレスポンスを返すヘルパー関数
 */
function sendForbiddenResponse(res: Response, message: string = 'アクセス権限がありません'): void {
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message,
    },
  });
}

/**
 * 認証エラーレスポンスを返すヘルパー関数
 */
function sendUnauthorizedResponse(res: Response, message: string = '認証が必要です'): void {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
  });
}

// ========================================
// 基本認可ミドルウェア
// ========================================

/**
 * ロールベース認可ミドルウェア
 * 指定されたロールのいずれかを持つユーザーのみアクセス許可
 * 
 * @example
 * app.get('/api/companies', authenticate, authorize(['SYSTEM_ADMIN']), companyController.list);
 */
export function authorize(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      sendForbiddenResponse(res, `このリソースへのアクセスには ${allowedRoles.join(' または ')} の権限が必要です`);
      return;
    }

    next();
  };
}

/**
 * システム管理者専用ミドルウェア
 */
export function requireSystemAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.user as AuthUser | undefined;

  if (!user) {
    sendUnauthorizedResponse(res);
    return;
  }

  if (!isSystemAdmin(user)) {
    sendForbiddenResponse(res, 'システム管理者のみアクセス可能です');
    return;
  }

  next();
}

/**
 * 企業管理者以上専用ミドルウェア
 */
export function requireCompanyAdminOrHigher(req: Request, res: Response, next: NextFunction): void {
  const user = req.user as AuthUser | undefined;

  if (!user) {
    sendUnauthorizedResponse(res);
    return;
  }

  if (!isCompanyAdminOrHigher(user)) {
    sendForbiddenResponse(res, '企業管理者以上の権限が必要です');
    return;
  }

  next();
}

// ========================================
// 権限チェック関数を使用するミドルウェア
// ========================================

/**
 * 同期権限チェック関数を使用するミドルウェアファクトリ
 * 
 * @example
 * app.get('/api/companies', authenticate, authorizeWithCheck(canViewCompanies), companyController.list);
 */
export function authorizeWithCheck<T = unknown>(
  checkFn: PermissionCheckFunction<T>,
  getTarget?: (req: Request) => T | undefined,
  operation?: OperationType
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const target = getTarget ? getTarget(req) : undefined;
    const result = checkFn(user, target, operation);

    // Promise の場合は非同期版を使用
    if (result instanceof Promise) {
      result
        .then((asyncResult) => {
          if (typeof asyncResult === 'boolean') {
            if (!asyncResult) {
              sendForbiddenResponse(res);
              return;
            }
          } else {
            if (!asyncResult.allowed) {
              sendForbiddenResponse(res, asyncResult.reason);
              return;
            }
          }
          next();
        })
        .catch((error) => {
          console.error('Permission check error:', error);
          sendForbiddenResponse(res, '権限チェック中にエラーが発生しました');
        });
      return;
    }

    // 同期的な結果の処理
    if (typeof result === 'boolean') {
      if (!result) {
        sendForbiddenResponse(res);
        return;
      }
    } else {
      if (!result.allowed) {
        sendForbiddenResponse(res, result.reason);
        return;
      }
    }

    next();
  };
}

/**
 * 非同期権限チェック関数を使用するミドルウェアファクトリ
 * 
 * @example
 * app.get('/api/users/:id/diagnosis', authenticate, authorizeWithAsyncCheck(canViewDiagnosisResultAsync, (req) => req.params.id), diagnosisController.getResult);
 */
export function authorizeWithAsyncCheck<T = unknown>(
  checkFn: AsyncPermissionCheckFunction<T>,
  getTarget: (req: Request) => T | Promise<T>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    try {
      const target = await getTarget(req);
      const result = await checkFn(user, target);

      if (typeof result === 'boolean') {
        if (!result) {
          sendForbiddenResponse(res);
          return;
        }
      } else {
        if (!result.allowed) {
          sendForbiddenResponse(res, result.reason);
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      sendForbiddenResponse(res, '権限チェック中にエラーが発生しました');
    }
  };
}

// ========================================
// 特定リソース用認可ミドルウェア
// ========================================

/**
 * 企業一覧閲覧権限チェック
 */
export const authorizeViewCompanies = authorizeWithCheck(canViewCompanies);

/**
 * ユーザー管理権限チェック（ターゲットユーザーIDをパラメータから取得）
 */
export function authorizeManageUser(operation: OperationType = OperationType.VIEW) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const targetUserId = req.params.id || req.params.userId;

    if (!targetUserId) {
      // ターゲットが指定されていない場合（一覧取得など）
      const result = canManageUsers(user, undefined, operation);
      if (!result.allowed) {
        sendForbiddenResponse(res, result.reason);
        return;
      }
      next();
      return;
    }

    try {
      const result = await canManageUsersAsync(user, targetUserId, operation);
      if (!result.allowed) {
        sendForbiddenResponse(res, result.reason);
        return;
      }
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      sendForbiddenResponse(res, '権限チェック中にエラーが発生しました');
    }
  };
}

/**
 * 診断結果閲覧権限チェック（ターゲットユーザーIDをパラメータから取得）
 */
export function authorizeDiagnosisView() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    // 診断結果IDまたはユーザーIDを取得
    const diagnosisResultId = req.params.id || req.params.diagnosisId;
    const targetUserId = req.params.userId;

    if (diagnosisResultId) {
      try {
        const result = await canViewDiagnosisResultAsync(user, diagnosisResultId);
        if (!result.allowed) {
          sendForbiddenResponse(res, result.reason);
          return;
        }
        next();
        return;
      } catch (error) {
        console.error('Permission check error:', error);
        sendForbiddenResponse(res, '権限チェック中にエラーが発生しました');
        return;
      }
    }

    if (targetUserId) {
      // ユーザーIDから企業・部門情報を取得
      try {
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: {
            id: true,
            companyId: true,
            departmentId: true,
          },
        });

        if (!targetUser) {
          sendForbiddenResponse(res, 'ユーザーが見つかりません');
          return;
        }

        const result = canViewDiagnosisResult(
          user,
          targetUser.id,
          targetUser.companyId,
          targetUser.departmentId
        );

        if (!result.allowed) {
          sendForbiddenResponse(res, result.reason);
          return;
        }
        next();
      } catch (error) {
        console.error('Permission check error:', error);
        sendForbiddenResponse(res, '権限チェック中にエラーが発生しました');
      }
      return;
    }

    // ターゲットが指定されていない場合（一覧取得など）
    const result = canViewDiagnosisResult(user);
    if (!result.allowed) {
      sendForbiddenResponse(res, result.reason);
      return;
    }
    next();
  };
}

/**
 * 候補者管理権限チェック
 */
export function authorizeCandidateManagement(operation: OperationType = OperationType.VIEW) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const candidateId = req.params.id || req.params.candidateId;

    if (!candidateId) {
      // ターゲットが指定されていない場合（一覧取得など）
      const result = canManageCandidates(user, undefined, operation);
      if (!result.allowed) {
        sendForbiddenResponse(res, result.reason);
        return;
      }
      next();
      return;
    }

    try {
      const result = await canManageCandidatesAsync(user, candidateId, operation);
      if (!result.allowed) {
        sendForbiddenResponse(res, result.reason);
        return;
      }
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      sendForbiddenResponse(res, '権限チェック中にエラーが発生しました');
    }
  };
}

/**
 * ロール変更権限チェック
 */
export function authorizeRoleChange() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const targetUserId = req.params.id || req.params.userId;
    const newRole = req.body.role as UserRole;

    if (!targetUserId || !newRole) {
      sendForbiddenResponse(res, 'ユーザーIDと新しいロールが必要です');
      return;
    }

    try {
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
        sendForbiddenResponse(res, 'ユーザーが見つかりません');
        return;
      }

      const result = canChangeUserRole(user, targetUser, newRole);
      if (!result.allowed) {
        sendForbiddenResponse(res, result.reason);
        return;
      }
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      sendForbiddenResponse(res, '権限チェック中にエラーが発生しました');
    }
  };
}

/**
 * 企業管理権限チェック
 */
export function authorizeCompanyManagement(operation: OperationType = OperationType.VIEW) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const companyId = req.params.id || req.params.companyId || req.body.companyId;
    const result = canManageCompany(user, companyId, operation);

    if (!result.allowed) {
      sendForbiddenResponse(res, result.reason);
      return;
    }

    next();
  };
}

/**
 * 部門管理権限チェック
 */
export function authorizeDepartmentManagement(operation: OperationType = OperationType.VIEW) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const departmentId = req.params.id || req.params.departmentId;
    let companyId = req.body.companyId;

    // 部門IDから企業IDを取得
    if (departmentId && !companyId) {
      try {
        const department = await prisma.department.findUnique({
          where: { id: departmentId },
          select: { companyId: true },
        });
        companyId = department?.companyId;
      } catch (error) {
        console.error('Department lookup error:', error);
      }
    }

    const result = canManageDepartments(user, companyId, operation);

    if (!result.allowed) {
      sendForbiddenResponse(res, result.reason);
      return;
    }

    next();
  };
}

/**
 * 請求書閲覧権限チェック
 */
export function authorizeInvoiceView() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const companyId = req.params.companyId || req.query.companyId as string;
    const result = canViewInvoices(user, companyId);

    if (!result.allowed) {
      sendForbiddenResponse(res, result.reason);
      return;
    }

    next();
  };
}

/**
 * 請求書発行権限チェック
 */
export const authorizeInvoiceIssue = authorizeWithCheck(canIssueInvoices);

/**
 * 監査ログ閲覧権限チェック
 */
export function authorizeAuditLogView() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const targetUserId = req.query.userId as string;
    const result = canViewAuditLogs(user, targetUserId);

    if (!result.allowed) {
      sendForbiddenResponse(res, result.reason);
      return;
    }

    next();
  };
}

/**
 * 面接管理権限チェック
 */
export function authorizeInterviewManagement(operation: OperationType = OperationType.VIEW) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const interviewId = req.params.id || req.params.interviewId;
    let companyId: string | undefined;
    let interviewerId: string | undefined;

    // 面接IDから企業ID・面接官IDを取得
    if (interviewId) {
      try {
        const interview = await prisma.interview.findUnique({
          where: { id: interviewId },
          include: {
            candidate: {
              select: { companyId: true },
            },
          },
        });
        companyId = interview?.candidate.companyId;
        interviewerId = interview?.interviewerId;
      } catch (error) {
        console.error('Interview lookup error:', error);
      }
    }

    const result = canManageInterviews(user, companyId, interviewerId, operation);

    if (!result.allowed) {
      sendForbiddenResponse(res, result.reason);
      return;
    }

    next();
  };
}

/**
 * プラン管理権限チェック
 */
export const authorizePlanManagement = authorizeWithCheck(canManagePlans);

/**
 * データエクスポート権限チェック
 */
export function authorizeDataExport() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const companyId = req.query.companyId as string || req.body.companyId;
    const result = canExportData(user, companyId);

    if (!result.allowed) {
      sendForbiddenResponse(res, result.reason);
      return;
    }

    next();
  };
}

// ========================================
// 自分自身または管理者のみアクセス許可
// ========================================

/**
 * 自分自身または管理者のみアクセス許可するミドルウェア
 */
export function requireSelfOrAdmin(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    const targetUserId = req.params[paramName];

    // システム管理者は常にアクセス可能
    if (isSystemAdmin(user)) {
      next();
      return;
    }

    // 自分自身へのアクセス
    if (isSelf(user, targetUserId)) {
      next();
      return;
    }

    sendForbiddenResponse(res, '自分自身のリソースのみアクセス可能です');
  };
}

/**
 * 同一企業のリソースのみアクセス許可するミドルウェア
 */
export function requireSameCompany(companyIdGetter: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      sendUnauthorizedResponse(res);
      return;
    }

    // システム管理者は常にアクセス可能
    if (isSystemAdmin(user)) {
      next();
      return;
    }

    const targetCompanyId = companyIdGetter(req);

    if (!targetCompanyId) {
      // 企業IDが取得できない場合は自社のリソースとして扱う
      next();
      return;
    }

    if (isSameCompany(user, targetCompanyId)) {
      next();
      return;
    }

    sendForbiddenResponse(res, '他社のリソースにはアクセスできません');
  };
}

// ========================================
// エクスポート
// ========================================

export {
  // 権限チェック関数（utils/permissions.tsから再エクスポート）
  canViewCompanies,
  canManageUsers,
  canViewDiagnosisResult,
  canManageCandidates,
  canChangeUserRole,
  canManageCompany,
  canManageDepartments,
  canViewInvoices,
  canIssueInvoices,
  canViewAuditLogs,
  canManageInterviews,
  canManagePlans,
  canExportData,
  // 非同期版
  canViewDiagnosisResultAsync,
  canManageUsersAsync,
  canManageCandidatesAsync,
  // ヘルパー関数
  isSystemAdmin,
  isCompanyAdminOrHigher,
  isSameCompany,
  isSelf,
};
