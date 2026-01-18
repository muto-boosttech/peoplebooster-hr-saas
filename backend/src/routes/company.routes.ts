import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { departmentController } from '../controllers/department.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

// ========================================
// 企業API
// ========================================

/**
 * @openapi
 * /api/companies:
 *   get:
 *     tags:
 *       - Companies
 *     summary: 企業一覧取得
 *     description: 企業の一覧をページネーション付きで取得します。SYSTEM_ADMINのみアクセス可能です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: ページ番号
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 1ページあたりの件数
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 企業名で検索
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: アクティブ状態でフィルタ
 *       - in: query
 *         name: planId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: プランIDでフィルタ
 *     responses:
 *       200:
 *         description: 企業一覧
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  (req, res) => companyController.getCompanies(req, res)
);

/**
 * @openapi
 * /api/companies:
 *   post:
 *     tags:
 *       - Companies
 *     summary: 企業作成
 *     description: 新しい企業を作成します。SYSTEM_ADMINのみアクセス可能です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - planId
 *               - contractStartDate
 *               - contractEndDate
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               logoUrl:
 *                 type: string
 *                 maxLength: 500
 *               planId:
 *                 type: string
 *                 format: uuid
 *               contractStartDate:
 *                 type: string
 *                 format: date
 *               contractEndDate:
 *                 type: string
 *                 format: date
 *               createAdmin:
 *                 type: boolean
 *                 description: 企業管理者を同時作成するか
 *               adminEmail:
 *                 type: string
 *                 format: email
 *               adminNickname:
 *                 type: string
 *               adminFullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: 企業作成成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.post(
  '/',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  (req, res) => companyController.createCompany(req, res)
);

/**
 * @openapi
 * /api/companies/{id}:
 *   get:
 *     tags:
 *       - Companies
 *     summary: 企業詳細取得
 *     description: 指定した企業の詳細情報を取得します。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 企業ID
 *     responses:
 *       200:
 *         description: 企業詳細
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 企業が見つからない
 */
router.get(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  (req, res) => companyController.getCompanyById(req, res)
);

/**
 * @openapi
 * /api/companies/{id}:
 *   put:
 *     tags:
 *       - Companies
 *     summary: 企業更新
 *     description: 指定した企業の情報を更新します。SYSTEM_ADMINのみアクセス可能です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 企業ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               planId:
 *                 type: string
 *                 format: uuid
 *               contractStartDate:
 *                 type: string
 *                 format: date
 *               contractEndDate:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 企業更新成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 企業が見つからない
 */
router.put(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  (req, res) => companyController.updateCompany(req, res)
);

/**
 * @openapi
 * /api/companies/{id}:
 *   delete:
 *     tags:
 *       - Companies
 *     summary: 企業削除
 *     description: 指定した企業を論理削除します。SYSTEM_ADMINのみアクセス可能です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 企業ID
 *     responses:
 *       200:
 *         description: 企業削除成功
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 企業が見つからない
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  (req, res) => companyController.deleteCompany(req, res)
);

/**
 * @openapi
 * /api/companies/{id}/stats:
 *   get:
 *     tags:
 *       - Companies
 *     summary: 企業統計取得
 *     description: 指定した企業の統計情報（ユーザー数、診断完了数など）を取得します。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 企業ID
 *     responses:
 *       200:
 *         description: 企業統計
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 企業が見つからない
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  (req, res) => companyController.getCompanyStats(req, res)
);

// ========================================
// 部門API（企業配下）
// ========================================

/**
 * @openapi
 * /api/companies/{companyId}/departments:
 *   get:
 *     tags:
 *       - Departments
 *     summary: 部門一覧取得
 *     description: 指定した企業の部門一覧を階層構造で取得します。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 企業ID
 *       - in: query
 *         name: flat
 *         schema:
 *           type: boolean
 *           default: false
 *         description: フラット形式で返却するか
 *       - in: query
 *         name: includeUsers
 *         schema:
 *           type: boolean
 *           default: false
 *         description: ユーザー数を含めるか
 *     responses:
 *       200:
 *         description: 部門一覧
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 企業が見つからない
 */
router.get(
  '/:companyId/departments',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  (req, res) => departmentController.getDepartments(req, res)
);

/**
 * @openapi
 * /api/companies/{companyId}/departments:
 *   post:
 *     tags:
 *       - Departments
 *     summary: 部門作成
 *     description: 指定した企業に新しい部門を作成します。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 企業ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               parentDepartmentId:
 *                 type: string
 *                 format: uuid
 *                 description: 親部門ID（階層構造の場合）
 *     responses:
 *       201:
 *         description: 部門作成成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 企業が見つからない
 *       409:
 *         description: 同名の部門が既に存在
 */
router.post(
  '/:companyId/departments',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  (req, res) => departmentController.createDepartment(req, res)
);

export default router;
