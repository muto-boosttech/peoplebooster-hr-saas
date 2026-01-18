import { Router } from 'express';
import { interviewCommentController } from '../controllers/interview-comment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     InterviewComment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         candidateId:
 *           type: string
 *           format: uuid
 *         interviewer:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             fullName:
 *               type: string
 *             nickname:
 *               type: string
 *         interviewDate:
 *           type: string
 *           format: date-time
 *         comment:
 *           type: string
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         ratingDisplayName:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateInterviewCommentInput:
 *       type: object
 *       required:
 *         - interviewDate
 *         - comment
 *         - rating
 *       properties:
 *         interviewDate:
 *           type: string
 *           format: date-time
 *         comment:
 *           type: string
 *           maxLength: 5000
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         triggerBrushUp:
 *           type: boolean
 *           default: false
 *     UpdateInterviewCommentInput:
 *       type: object
 *       properties:
 *         interviewDate:
 *           type: string
 *           format: date-time
 *         comment:
 *           type: string
 *           maxLength: 5000
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         tags:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @openapi
 * /api/candidates/{candidateId}/comments:
 *   get:
 *     summary: 候補者の面接コメント一覧を取得
 *     tags: [Interview Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, interviewDate, rating]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: 面接コメント一覧
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つかりません
 */
router.get(
  '/candidates/:candidateId/comments',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewCommentController.getCommentsByCandidateId.bind(interviewCommentController)
);

/**
 * @openapi
 * /api/candidates/{candidateId}/comments:
 *   post:
 *     summary: 面接コメントを作成
 *     tags: [Interview Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInterviewCommentInput'
 *     responses:
 *       201:
 *         description: 面接コメント作成成功
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
  '/candidates/:candidateId/comments',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewCommentController.createComment.bind(interviewCommentController)
);

/**
 * @openapi
 * /api/comments/{id}:
 *   get:
 *     summary: 面接コメント詳細を取得
 *     tags: [Interview Comments]
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
 *         description: 面接コメント詳細
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: コメントが見つかりません
 */
router.get(
  '/comments/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewCommentController.getCommentById.bind(interviewCommentController)
);

/**
 * @openapi
 * /api/comments/{id}:
 *   put:
 *     summary: 面接コメントを更新
 *     description: コメント作成者のみ編集可能
 *     tags: [Interview Comments]
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
 *             $ref: '#/components/schemas/UpdateInterviewCommentInput'
 *     responses:
 *       200:
 *         description: 面接コメント更新成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: コメントが見つかりません
 */
router.put(
  '/comments/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewCommentController.updateComment.bind(interviewCommentController)
);

/**
 * @openapi
 * /api/comments/{id}:
 *   delete:
 *     summary: 面接コメントを削除
 *     description: コメント作成者またはCOMPANY_ADMIN以上が削除可能
 *     tags: [Interview Comments]
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
 *         description: 面接コメント削除成功
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: コメントが見つかりません
 */
router.delete(
  '/comments/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewCommentController.deleteComment.bind(interviewCommentController)
);

export default router;
