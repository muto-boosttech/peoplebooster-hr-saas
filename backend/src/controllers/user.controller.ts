import { Request, Response } from 'express';
import { prisma } from '../models';
import { AuthenticatedRequest, UserRole } from '../types';
import {
  hashPassword,
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../utils';
import { CreateUserInput, UpdateUserInput, PaginationInput } from '../validators';

/**
 * Get all users (with pagination and filtering)
 * GET /users
 */
export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { page, limit, sortBy, sortOrder } = req.query as unknown as PaginationInput;
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let whereClause = {};
    if (req.user?.role === UserRole.COMPANY_ADMIN) {
      whereClause = { companyId: req.user.companyId };
    } else if (req.user?.role === UserRole.COMPANY_USER) {
      whereClause = { companyId: req.user.companyId };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nickname: true,
          fullName: true,
          role: true,
          companyId: true,
          departmentId: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: { name: true },
          },
          department: {
            select: { name: true },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    res.json(successResponse(paginatedResponse(users, page, limit, total)));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json(errorResponse('Failed to get users'));
  }
};

/**
 * Get user by ID
 * GET /users/:id
 */
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        company: true,
        department: true,
        diagnosisResults: {
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    // Check access permission
    if (
      req.user?.role !== UserRole.SYSTEM_ADMIN &&
      req.user?.companyId !== user.companyId &&
      req.user?.userId !== user.id
    ) {
      res.status(403).json(errorResponse('Access denied'));
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
        latestDiagnosis: user.diagnosisResults[0] || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    );
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json(errorResponse('Failed to get user'));
  }
};

/**
 * Create new user
 * POST /users
 */
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const data = req.body as CreateUserInput;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      res.status(409).json(errorResponse('Email already registered'));
      return;
    }

    // Company admin can only create users for their company
    if (req.user?.role === UserRole.COMPANY_ADMIN) {
      data.companyId = req.user.companyId;
      if (data.role === UserRole.SYSTEM_ADMIN) {
        res.status(403).json(errorResponse('Cannot create system admin'));
        return;
      }
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        nickname: data.nickname,
        fullName: data.fullName,
        role: data.role,
        companyId: data.companyId,
        departmentId: data.departmentId,
        parentUserId: data.parentUserId,
        subUserPermission: data.subUserPermission,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        fullName: true,
        role: true,
        companyId: true,
        departmentId: true,
        createdAt: true,
      },
    });

    res.status(201).json(successResponse(user, 'User created successfully'));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json(errorResponse('Failed to create user'));
  }
};

/**
 * Update user
 * PUT /users/:id
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as UpdateUserInput;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    // Check access permission
    if (
      req.user?.role !== UserRole.SYSTEM_ADMIN &&
      req.user?.companyId !== existingUser.companyId &&
      req.user?.userId !== id
    ) {
      res.status(403).json(errorResponse('Access denied'));
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        nickname: data.nickname,
        fullName: data.fullName,
        departmentId: data.departmentId,
        subUserPermission: data.subUserPermission,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        fullName: true,
        role: true,
        companyId: true,
        departmentId: true,
        updatedAt: true,
      },
    });

    res.json(successResponse(user, 'User updated successfully'));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json(errorResponse('Failed to update user'));
  }
};

/**
 * Delete user
 * DELETE /users/:id
 */
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    // Check access permission
    if (
      req.user?.role !== UserRole.SYSTEM_ADMIN &&
      req.user?.companyId !== existingUser.companyId
    ) {
      res.status(403).json(errorResponse('Access denied'));
      return;
    }

    // Prevent deleting self
    if (req.user?.userId === id) {
      res.status(400).json(errorResponse('Cannot delete your own account'));
      return;
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json(errorResponse('Failed to delete user'));
  }
};
