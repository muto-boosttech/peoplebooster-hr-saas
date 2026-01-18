import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { candidateController } from '../controllers/candidate.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

// レート制限設定
const candidateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 100リクエスト
  message: {
    success: false,
    error: 'リクエスト数が多すぎます。しばらく待ってから再試行してください。',
  },
});

/**
 * @openapi
 * /api/candidates:
 *   get:
 *     summary: 候補者一覧を取得
 *     tags: [Candidates]
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
 *           maximum: 100
 *         description: 1ページあたりの件数
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: ステータス（カンマ区切りで複数指定可）
 *       - in: query
 *         name: appliedPosition
 *         schema:
 *           type: string
 *         description: 応募職種
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 名前検索
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 担当者ID
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: タグ（カンマ区切りで複数指定可）
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, status, appliedPosition, updatedAt]
 *           default: createdAt
 *         description: ソート項目
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: ソート順
 *     responses:
 *       200:
 *         description: 候補者一覧
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  candidateRateLimit,
  candidateController.getCandidates.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/statistics:
 *   get:
 *     summary: 候補者統計情報を取得
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 統計情報
 *       401:
 *         description: 認証エラー
 */
router.get(
  '/statistics',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  candidateController.getStatistics.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/status-transitions:
 *   get:
 *     summary: ステータス遷移ルールを取得
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ステータス遷移ルール
 */
router.get(
  '/status-transitions',
  authenticate,
  candidateController.getStatusTransitions.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/bulk/status:
 *   put:
 *     summary: 一括ステータス更新
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateIds
 *               - status
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 maxItems: 100
 *               status:
 *                 type: string
 *                 enum: [UNTOUCHED, IN_PROGRESS, COMPLETED, DOCUMENT_SCREENING, FIRST_INTERVIEW, SECOND_INTERVIEW, FINAL_INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN, ON_HOLD]
 *               note:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: 更新結果
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.put(
  '/bulk/status',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.bulkUpdateStatus.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/bulk/assign:
 *   put:
 *     summary: 一括担当者割り当て
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateIds
 *               - assignedTo
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 maxItems: 100
 *               assignedTo:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: 更新結果
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.put(
  '/bulk/assign',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.bulkAssign.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/{id}:
 *   get:
 *     summary: 候補者詳細を取得
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 候補者ID
 *     responses:
 *       200:
 *         description: 候補者詳細
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つかりません
 */
router.get(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  candidateController.getCandidateById.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates:
 *   post:
 *     summary: 候補者を作成
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - userId
 *                   - appliedPosition
 *                 properties:
 *                   userId:
 *                     type: string
 *                     format: uuid
 *                   appliedPosition:
 *                     type: string
 *                   source:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   notes:
 *                     type: string
 *                   assignedTo:
 *                     type: string
 *                     format: uuid
 *               - type: object
 *                 required:
 *                   - email
 *                   - fullName
 *                   - appliedPosition
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                   fullName:
 *                     type: string
 *                   nickname:
 *                     type: string
 *                   appliedPosition:
 *                     type: string
 *                   source:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   notes:
 *                     type: string
 *                   assignedTo:
 *                     type: string
 *                     format: uuid
 *     responses:
 *       201:
 *         description: 候補者作成成功
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
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.createCandidate.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/{id}:
 *   put:
 *     summary: 候補者を更新
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 候補者ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appliedPosition:
 *                 type: string
 *               source:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つかりません
 */
router.put(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.updateCandidate.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/{id}/status:
 *   put:
 *     summary: ステータスを更新
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 候補者ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [UNTOUCHED, IN_PROGRESS, COMPLETED, DOCUMENT_SCREENING, FIRST_INTERVIEW, SECOND_INTERVIEW, FINAL_INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN, ON_HOLD]
 *               note:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: ステータス更新成功
 *       400:
 *         description: バリデーションエラーまたは無効なステータス遷移
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つかりません
 */
router.put(
  '/:id/status',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.updateCandidateStatus.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/{id}/assign:
 *   put:
 *     summary: 担当者を割り当て
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 候補者ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: 担当者割り当て成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者または担当者が見つかりません
 */
router.put(
  '/:id/assign',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.assignCandidate.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/{id}/tags:
 *   post:
 *     summary: タグを追加
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 候補者ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tags
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 10
 *     responses:
 *       200:
 *         description: タグ追加成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つかりません
 */
router.post(
  '/:id/tags',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.addTags.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/{id}/tags:
 *   delete:
 *     summary: タグを削除
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 候補者ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tags
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 10
 *     responses:
 *       200:
 *         description: タグ削除成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つかりません
 */
router.delete(
  '/:id/tags',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.removeTags.bind(candidateController)
);

/**
 * @openapi
 * /api/candidates/{id}:
 *   delete:
 *     summary: 候補者を削除（論理削除）
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 候補者ID
 *     responses:
 *       200:
 *         description: 削除成功
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つかりません
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  candidateController.deleteCandidate.bind(candidateController)
);

export default router;
