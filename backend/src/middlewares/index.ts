import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AuthenticatedRequest, JwtPayload, UserRole } from '../types';
import { verifyToken, errorResponse } from '../utils';

// 認証ミドルウェアをエクスポート
export * from './auth.middleware';

// 認可ミドルウェアをエクスポート
export * from './authorize.middleware';

/**
 * Authentication middleware (legacy)
 * Verifies JWT token and attaches user to request
 */
export const authenticateLegacy = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json(errorResponse('Invalid or expired token'));
  }
};

/**
 * Authorization middleware factory (legacy)
 * Checks if user has required role(s)
 * @deprecated Use authorize from './authorize.middleware' instead
 */
export const authorizeLegacy = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(errorResponse('Insufficient permissions'));
      return;
    }

    next();
  };
};

/**
 * Validation middleware factory
 * Validates request body against Zod schema
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        res.status(400).json(errorResponse('Validation failed', errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Query validation middleware factory
 * Validates request query parameters against Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        res.status(400).json(errorResponse('Query validation failed', errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Params validation middleware factory
 * Validates request params against Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        res.status(400).json(errorResponse('Params validation failed', errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Company access middleware
 * Ensures user can only access their own company's data
 */
export const companyAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  // System admin can access all companies
  if (req.user.role === UserRole.SYSTEM_ADMIN) {
    next();
    return;
  }

  // Check if company ID in params matches user's company
  const companyId = req.params.companyId || req.body.companyId;
  if (companyId && companyId !== req.user.companyId) {
    res.status(403).json(errorResponse('Access denied to this company'));
    return;
  }

  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(errorResponse('Invalid token'));
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json(errorResponse('Token expired'));
    return;
  }

  res.status(500).json(errorResponse('Internal server error'));
};

/**
 * Not found middleware
 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json(errorResponse(`Route ${req.method} ${req.path} not found`));
};

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

/**
 * Async handler wrapper
 * Catches async errors and passes them to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
