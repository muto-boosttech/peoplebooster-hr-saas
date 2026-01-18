import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authService, TokenPayload } from '../services/auth.service';
import { prisma } from '../models';

// Expressのリクエスト型を拡張
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & {
        isActive?: boolean;
        companyId?: string | null;
        departmentId?: string | null;
      };
    }
  }
}

/**
 * 認証ミドルウェア
 * Authorizationヘッダーからトークンを検証し、ユーザー情報をリクエストに付加
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    // トークン検証
    const payload = authService.verifyAccessToken(token);

    // ユーザーの有効性確認
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        isActive: true,
        role: true,
        companyId: true,
        departmentId: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'アカウントが無効化されています',
        },
      });
      return;
    }

    // リクエストにユーザー情報を付加
    req.user = {
      ...payload,
      isActive: user.isActive,
      companyId: user.companyId,
      departmentId: user.departmentId,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'トークンが無効または期限切れです',
      },
    });
  }
};

/**
 * オプショナル認証ミドルウェア
 * トークンがあれば検証するが、なくてもエラーにしない
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          isActive: true,
          role: true,
          companyId: true,
          departmentId: true,
        },
      });

      if (user && user.isActive) {
        req.user = {
          ...payload,
          isActive: user.isActive,
          companyId: user.companyId,
          departmentId: user.departmentId,
        };
      }
    }

    next();
  } catch {
    // エラーが発生してもスキップ
    next();
  }
};

/**
 * ロールベースアクセス制御ミドルウェア
 * 指定されたロールのいずれかを持つユーザーのみアクセスを許可
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'このリソースへのアクセス権限がありません',
        },
      });
      return;
    }

    next();
  };
};

/**
 * システム管理者専用ミドルウェア
 */
export const requireSystemAdmin = requireRole(UserRole.SYSTEM_ADMIN);

/**
 * 企業管理者以上専用ミドルウェア
 */
export const requireCompanyAdmin = requireRole(
  UserRole.SYSTEM_ADMIN,
  UserRole.COMPANY_ADMIN
);

/**
 * 企業ユーザー以上専用ミドルウェア
 */
export const requireCompanyUser = requireRole(
  UserRole.SYSTEM_ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.COMPANY_USER
);

/**
 * 同一企業アクセス制御ミドルウェア
 * 企業ユーザーは自社のリソースのみアクセス可能
 */
export const requireSameCompany = (companyIdParam: string = 'companyId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      return;
    }

    // システム管理者は全企業にアクセス可能
    if (req.user.role === UserRole.SYSTEM_ADMIN) {
      next();
      return;
    }

    const targetCompanyId = req.params[companyIdParam] || req.body[companyIdParam];

    if (!targetCompanyId) {
      next();
      return;
    }

    if (req.user.companyId !== targetCompanyId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '他社のリソースにはアクセスできません',
        },
      });
      return;
    }

    next();
  };
};

/**
 * 自分自身または管理者のみアクセス可能なミドルウェア
 */
export const requireSelfOrAdmin = (userIdParam: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      });
      return;
    }

    const targetUserId = req.params[userIdParam];

    // システム管理者は全ユーザーにアクセス可能
    if (req.user.role === UserRole.SYSTEM_ADMIN) {
      next();
      return;
    }

    // 自分自身へのアクセス
    if (req.user.userId === targetUserId) {
      next();
      return;
    }

    // 企業管理者は自社ユーザーにアクセス可能
    if (req.user.role === UserRole.COMPANY_ADMIN && req.user.companyId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { companyId: true },
      });

      if (targetUser && targetUser.companyId === req.user.companyId) {
        next();
        return;
      }
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'このリソースへのアクセス権限がありません',
      },
    });
  };
};

/**
 * MFA検証済みチェックミドルウェア
 * MFAが有効なユーザーは、MFA検証済みでないとアクセス不可
 */
export const requireMfaVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
      },
    });
    return;
  }

  // MFA必須ロールのチェック
  const mfaRequiredRoles = [UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN];
  
  if (mfaRequiredRoles.includes(req.user.role)) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { mfaEnabled: true },
    });

    if (!user?.mfaEnabled) {
      res.status(403).json({
        success: false,
        error: {
          code: 'MFA_REQUIRED',
          message: 'MFAの設定が必要です',
        },
      });
      return;
    }
  }

  next();
};

/**
 * IPアドレス取得ヘルパー
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

/**
 * ユーザーエージェント取得ヘルパー
 */
export const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};
