import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { brushUpController } from '../controllers/brushup.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize, authorizeWithCheck } from '../middlewares/authorize.middleware';
import { canViewDiagnosisResult } from '../utils/permissions';

const router = Router();

// レート制限設定
const brushUpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 15分あたり10回まで
  message: {
    success: false,
    error: 'ブラッシュアップのリクエストが多すぎます。しばらく待ってから再試行してください。',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /api/diagnosis/me/brushup-history:
 *   get:
 *     summary: 自分のブラッシュアップ履歴を取得
 *     tags: [BrushUp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ブラッシュアップ履歴
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
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           version:
 *                             type: string
 *                           triggerType:
 *                             type: string
 *                           aiReasoning:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     totalCount:
 *                       type: integer
 */
router.get(
  '/me/brushup-history',
  authenticate,
  brushUpController.getMyBrushUpHistory
);

/**
 * @openapi
 * /api/diagnosis/{userId}/brushup:
 *   post:
 *     summary: 手動ブラッシュアップを実行
 *     description: |
 *       管理者が手動でAIブラッシュアップを実行します。
 *       MBTI、動物占い、面接コメントなどの追加情報に基づいて診断結果を精緻化します。
 *       
 *       **注意**: この機能はAIによる分析を使用しています。結果は参考情報としてご利用ください。
 *     tags: [BrushUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 対象ユーザーのID
 *     responses:
 *       200:
 *         description: ブラッシュアップ結果
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
 *                     diagnosisResultId:
 *                       type: string
 *                     brushUpHistoryId:
 *                       type: string
 *                     version:
 *                       type: string
 *                     changes:
 *                       type: object
 *                     aiReasoning:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                     riskFlags:
 *                       type: array
 *                       items:
 *                         type: string
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     disclaimer:
 *                       type: string
 *                     aiNotice:
 *                       type: string
 *                     evidenceLabel:
 *                       type: string
 *       400:
 *         description: ブラッシュアップに失敗
 *       401:
 *         description: 認証が必要
 *       403:
 *         description: 権限がありません
 */
router.post(
  '/:userId/brushup',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  brushUpRateLimiter,
  brushUpController.executeBrushUp
);

/**
 * @openapi
 * /api/diagnosis/{userId}/brushup-history:
 *   get:
 *     summary: ブラッシュアップ履歴を取得
 *     description: |
 *       指定したユーザーのブラッシュアップ履歴を取得します。
 *       各履歴には、トリガータイプ、変更内容、AIの判断根拠が含まれます。
 *     tags: [BrushUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 対象ユーザーのID
 *     responses:
 *       200:
 *         description: ブラッシュアップ履歴
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
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           version:
 *                             type: string
 *                           triggerType:
 *                             type: string
 *                             enum: [INITIAL, MBTI_ADDED, ANIMAL_ADDED, INTERVIEW_COMMENT, MANUAL]
 *                           previousData:
 *                             type: object
 *                           updatedData:
 *                             type: object
 *                           aiReasoning:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     totalCount:
 *                       type: integer
 *       401:
 *         description: 認証が必要
 *       403:
 *         description: 権限がありません
 */
router.get(
  '/:userId/brushup-history',
  authenticate,
  authorizeWithCheck(canViewDiagnosisResult),
  brushUpController.getBrushUpHistory
);

/**
 * @openapi
 * /api/diagnosis/{userId}/brushup-history/{historyId}/diff:
 *   get:
 *     summary: バージョン間の差分詳細を取得
 *     description: |
 *       特定のブラッシュアップ履歴の詳細な差分情報を取得します。
 *       各フィールドの変更量、AIの判断根拠、信頼度、リスクフラグが含まれます。
 *     tags: [BrushUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 対象ユーザーのID
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ブラッシュアップ履歴のID
 *     responses:
 *       200:
 *         description: 差分詳細
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
 *                     version:
 *                       type: string
 *                     previousVersion:
 *                       type: string
 *                     changes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                           category:
 *                             type: string
 *                           previousValue:
 *                             type: number
 *                           newValue:
 *                             type: number
 *                           changeAmount:
 *                             type: number
 *                     triggerType:
 *                       type: string
 *                     aiReasoning:
 *                       type: string
 *                     confidence:
 *                       type: number
 *                     riskFlags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: 履歴が見つかりません
 *       401:
 *         description: 認証が必要
 *       403:
 *         description: 権限がありません
 */
router.get(
  '/:userId/brushup-history/:historyId/diff',
  authenticate,
  authorizeWithCheck(canViewDiagnosisResult),
  brushUpController.getBrushUpDiff
);

export default router;
