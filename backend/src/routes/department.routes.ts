import { Router } from 'express';
import { departmentController } from '../controllers/department.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

/**
 * @openapi
 * /api/departments/{id}:
 *   get:
 *     tags:
 *       - Departments
 *     summary: 部門詳細取得
 *     description: 指定した部門の詳細情報を取得します。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 部門ID
 *     responses:
 *       200:
 *         description: 部門詳細
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 部門が見つからない
 */
router.get(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  (req, res) => departmentController.getDepartmentById(req, res)
);

/**
 * @openapi
 * /api/departments/{id}:
 *   put:
 *     tags:
 *       - Departments
 *     summary: 部門更新
 *     description: 指定した部門の情報を更新します。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 部門ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               parentDepartmentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: 部門更新成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 部門が見つからない
 *       409:
 *         description: 同名の部門が既に存在
 */
router.put(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  (req, res) => departmentController.updateDepartment(req, res)
);

/**
 * @openapi
 * /api/departments/{id}:
 *   delete:
 *     tags:
 *       - Departments
 *     summary: 部門削除
 *     description: 指定した部門を削除します。所属ユーザーや子部門がある場合は削除できません。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 部門ID
 *     responses:
 *       200:
 *         description: 部門削除成功
 *       400:
 *         description: 所属ユーザーまたは子部門が存在
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 部門が見つからない
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  (req, res) => departmentController.deleteDepartment(req, res)
);

/**
 * @openapi
 * /api/departments/{id}/users:
 *   put:
 *     tags:
 *       - Departments
 *     summary: ユーザーを部門に割り当て
 *     description: 複数のユーザーを指定した部門に一括で割り当てます。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 部門ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 割り当てるユーザーIDの配列
 *     responses:
 *       200:
 *         description: ユーザー割り当て成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     assigned:
 *                       type: integer
 *                       description: 割り当てられたユーザー数
 *                     skipped:
 *                       type: integer
 *                       description: スキップされたユーザー数
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 部門が見つからない
 */
router.put(
  '/:id/users',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  (req, res) => departmentController.assignUsersToDepartment(req, res)
);

export default router;
