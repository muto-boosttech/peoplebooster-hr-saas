import { Router } from 'express';
import { interviewController } from '../controllers/interview.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Interview:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         candidate:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             user:
 *               type: object
 *             appliedPosition:
 *               type: string
 *         interviewer:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             fullName:
 *               type: string
 *             nickname:
 *               type: string
 *             email:
 *               type: string
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: integer
 *           description: 面接時間（分）
 *         type:
 *           type: string
 *           enum: [PHONE, VIDEO, ONSITE]
 *         typeDisplayName:
 *           type: string
 *         status:
 *           type: string
 *           enum: [SCHEDULED, COMPLETED, CANCELLED, NO_SHOW]
 *         statusDisplayName:
 *           type: string
 *         location:
 *           type: string
 *           nullable: true
 *         meetingUrl:
 *           type: string
 *           nullable: true
 *         reminderSent:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateInterviewInput:
 *       type: object
 *       required:
 *         - candidateId
 *         - interviewerId
 *         - scheduledAt
 *       properties:
 *         candidateId:
 *           type: string
 *           format: uuid
 *         interviewerId:
 *           type: string
 *           format: uuid
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: integer
 *           default: 60
 *           minimum: 15
 *           maximum: 480
 *         type:
 *           type: string
 *           enum: [PHONE, VIDEO, ONSITE]
 *           default: VIDEO
 *         location:
 *           type: string
 *           nullable: true
 *         meetingUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         notes:
 *           type: string
 *         sendNotification:
 *           type: boolean
 *           default: true
 *     UpdateInterviewInput:
 *       type: object
 *       properties:
 *         interviewerId:
 *           type: string
 *           format: uuid
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: integer
 *           minimum: 15
 *           maximum: 480
 *         type:
 *           type: string
 *           enum: [PHONE, VIDEO, ONSITE]
 *         location:
 *           type: string
 *           nullable: true
 *         meetingUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         notes:
 *           type: string
 *         sendNotification:
 *           type: boolean
 *           default: true
 *     UpdateInterviewStatusInput:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [COMPLETED, CANCELLED, NO_SHOW]
 *         note:
 *           type: string
 *     CalendarEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         start:
 *           type: string
 *           format: date-time
 *         end:
 *           type: string
 *           format: date-time
 *         type:
 *           type: string
 *         status:
 *           type: string
 *         candidate:
 *           type: object
 *         interviewer:
 *           type: object
 *         location:
 *           type: string
 *         meetingUrl:
 *           type: string
 *         duration:
 *           type: integer
 */

/**
 * @openapi
 * /api/interviews:
 *   get:
 *     summary: 面接一覧を取得
 *     tags: [Interviews]
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
 *         name: candidateId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: interviewerId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           description: カンマ区切りで複数指定可
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           description: カンマ区切りで複数指定可
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [scheduledAt, createdAt, status]
 *           default: scheduledAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: 面接一覧
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewController.getInterviews.bind(interviewController)
);

/**
 * @openapi
 * /api/interviews/calendar:
 *   get:
 *     summary: カレンダー形式で面接を取得
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *       - in: query
 *         name: interviewerId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: カレンダーイベント一覧
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/calendar',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewController.getCalendar.bind(interviewController)
);

/**
 * @openapi
 * /api/interviews/{id}:
 *   get:
 *     summary: 面接詳細を取得
 *     tags: [Interviews]
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
 *         description: 面接詳細
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 面接が見つかりません
 */
router.get(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewController.getInterviewById.bind(interviewController)
);

/**
 * @openapi
 * /api/interviews:
 *   post:
 *     summary: 面接をスケジュール
 *     description: 面接官の予定重複チェックを行い、候補者・面接官への通知メールを送信
 *     tags: [Interviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInterviewInput'
 *     responses:
 *       201:
 *         description: 面接スケジュール作成成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者または面接官が見つかりません
 *       409:
 *         description: 面接官の予定が重複しています
 */
router.post(
  '/',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewController.createInterview.bind(interviewController)
);

/**
 * @openapi
 * /api/interviews/{id}:
 *   put:
 *     summary: 面接スケジュールを更新
 *     description: 変更通知メールを送信
 *     tags: [Interviews]
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
 *             $ref: '#/components/schemas/UpdateInterviewInput'
 *     responses:
 *       200:
 *         description: 面接スケジュール更新成功
 *       400:
 *         description: バリデーションエラーまたは予定状態以外の面接
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 面接が見つかりません
 *       409:
 *         description: 面接官の予定が重複しています
 */
router.put(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewController.updateInterview.bind(interviewController)
);

/**
 * @openapi
 * /api/interviews/{id}/status:
 *   put:
 *     summary: 面接ステータスを更新
 *     tags: [Interviews]
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
 *             $ref: '#/components/schemas/UpdateInterviewStatusInput'
 *     responses:
 *       200:
 *         description: 面接ステータス更新成功
 *       400:
 *         description: バリデーションエラーまたは無効なステータス遷移
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 面接が見つかりません
 */
router.put(
  '/:id/status',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewController.updateInterviewStatus.bind(interviewController)
);

/**
 * @openapi
 * /api/interviews/{id}:
 *   delete:
 *     summary: 面接をキャンセル
 *     description: 面接をキャンセル扱いにし、キャンセル通知を送信
 *     tags: [Interviews]
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
 *         description: 面接キャンセル成功
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 面接が見つかりません
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  interviewController.deleteInterview.bind(interviewController)
);

export default router;
