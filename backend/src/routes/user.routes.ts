import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  authorize,
  requireSystemAdmin,
  requireCompanyAdminOrHigher as requireCompanyAdminOrAbove,
} from '../middlewares/authorize.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// ========================================
// ユーザー管理ルート
// ========================================

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get current user info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 */
router.get(
  '/me',
  authenticate,
  userController.getCurrentUser.bind(userController)
);

/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     description: SYSTEM_ADMIN can see all users, COMPANY_ADMIN can see only their company users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [SYSTEM_ADMIN, COMPANY_ADMIN, COMPANY_USER, GENERAL_USER]
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of users with pagination
 */
router.get(
  '/',
  authenticate,
  authorize([UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN]),
  userController.getUsers.bind(userController)
);

/**
 * @openapi
 * /users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create new user
 *     description: SYSTEM_ADMIN can create any user, COMPANY_ADMIN can create COMPANY_USER or GENERAL_USER only
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - nickname
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               nickname:
 *                 type: string
 *                 maxLength: 100
 *               fullName:
 *                 type: string
 *                 maxLength: 100
 *               role:
 *                 type: string
 *                 enum: [SYSTEM_ADMIN, COMPANY_ADMIN, COMPANY_USER, GENERAL_USER]
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               sendInvitationEmail:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already registered
 */
router.post(
  '/',
  authenticate,
  requireCompanyAdminOrAbove,
  userController.createUser.bind(userController)
);

/**
 * @openapi
 * /users/bulk:
 *   post:
 *     tags:
 *       - Users
 *     summary: Bulk create users
 *     description: Create multiple users at once (max 100)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *             properties:
 *               users:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - email
 *                     - nickname
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                     nickname:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [COMPANY_USER, GENERAL_USER]
 *                     departmentId:
 *                       type: string
 *                       format: uuid
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               sendInvitationEmail:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Users created
 */
router.post(
  '/bulk',
  authenticate,
  requireCompanyAdminOrAbove,
  userController.bulkCreateUsers.bind(userController)
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: User can view their own profile, admins can view users in their scope
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  authenticate,
  userController.getUserById.bind(userController)
);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user
 *     description: User can update their own profile, admins can update users in their scope
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 maxLength: 100
 *               fullName:
 *                 type: string
 *                 maxLength: 100
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 150
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
router.put(
  '/:id',
  authenticate,
  userController.updateUser.bind(userController)
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user (soft delete)
 *     description: SYSTEM_ADMIN can delete any user, COMPANY_ADMIN can delete users in their company
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  authenticate,
  requireCompanyAdminOrAbove,
  userController.deleteUser.bind(userController)
);

/**
 * @openapi
 * /users/{id}/role:
 *   put:
 *     tags:
 *       - Users
 *     summary: Change user role
 *     description: Only SYSTEM_ADMIN can change user roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newRole
 *             properties:
 *               newRole:
 *                 type: string
 *                 enum: [SYSTEM_ADMIN, COMPANY_ADMIN, COMPANY_USER, GENERAL_USER]
 *     responses:
 *       200:
 *         description: Role changed
 *       403:
 *         description: Only SYSTEM_ADMIN can change roles
 */
router.put(
  '/:id/role',
  authenticate,
  requireSystemAdmin,
  userController.changeRole.bind(userController)
);

/**
 * @openapi
 * /users/{id}/active:
 *   put:
 *     tags:
 *       - Users
 *     summary: Toggle user active status
 *     description: Enable or disable user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Active status changed
 */
router.put(
  '/:id/active',
  authenticate,
  requireCompanyAdminOrAbove,
  userController.toggleActive.bind(userController)
);

/**
 * @openapi
 * /users/{id}/sub-users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create sub-user
 *     description: Create a sub-user linked to a parent user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Parent user ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - permission
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 description: If not provided, a random password will be generated
 *               nickname:
 *                 type: string
 *               permission:
 *                 type: string
 *                 enum: [VIEW_ONLY, EDIT, FULL]
 *               sendInvitationEmail:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Sub-user created
 */
router.post(
  '/:id/sub-users',
  authenticate,
  requireCompanyAdminOrAbove,
  userController.createSubUser.bind(userController)
);

/**
 * @openapi
 * /users/{id}/sub-users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get sub-users
 *     description: Get all sub-users of a parent user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Parent user ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of sub-users
 */
router.get(
  '/:id/sub-users',
  authenticate,
  userController.getSubUsers.bind(userController)
);

export default router;
