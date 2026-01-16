import { Request, Response } from 'express';
import { prisma } from '../models';
import { AuthenticatedRequest } from '../types';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  successResponse,
  errorResponse,
} from '../utils';
import { LoginInput, RegisterInput } from '../validators';

/**
 * Login user
 * POST /auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      res.status(401).json(errorResponse('Invalid email or password'));
      return;
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json(errorResponse('Invalid email or password'));
      return;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          fullName: user.fullName,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company?.name,
        },
        accessToken,
        refreshToken,
      })
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(errorResponse('Login failed'));
  }
};

/**
 * Register new user
 * POST /auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, nickname, fullName } = req.body as RegisterInput;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json(errorResponse('Email already registered'));
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname,
        fullName,
        role: 'general_user',
      },
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.status(201).json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          fullName: user.fullName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      })
    );
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json(errorResponse('Registration failed'));
  }
};

/**
 * Refresh access token
 * POST /auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json(errorResponse('Refresh token is required'));
      return;
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json(errorResponse('User not found'));
      return;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json(
      successResponse({
        accessToken,
        refreshToken: newRefreshToken,
      })
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json(errorResponse('Invalid refresh token'));
  }
};

/**
 * Logout user
 * POST /auth/logout
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // In a production environment, you might want to:
    // 1. Add the token to a blacklist
    // 2. Clear refresh token from database
    // 3. Invalidate all sessions for the user

    res.json(successResponse(null, 'Logged out successfully'));
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(errorResponse('Logout failed'));
  }
};

/**
 * Request password reset
 * POST /auth/password/reset
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json(successResponse(null, 'If the email exists, a reset link will be sent'));
      return;
    }

    // TODO: Generate reset token and send email
    // In production, implement:
    // 1. Generate secure reset token
    // 2. Store token with expiration
    // 3. Send email with reset link

    res.json(successResponse(null, 'If the email exists, a reset link will be sent'));
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json(errorResponse('Password reset request failed'));
  }
};

/**
 * Get current user
 * GET /auth/me
 */
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse('Not authenticated'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        company: true,
        department: true,
      },
    });

    if (!user) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    res.json(
      successResponse({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name,
        departmentId: user.departmentId,
        departmentName: user.department?.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    );
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json(errorResponse('Failed to get user information'));
  }
};
