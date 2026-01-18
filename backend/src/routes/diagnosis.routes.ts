import { Router } from 'express';
import { diagnosisController } from '../controllers/diagnosis.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  authorize,
  authorizeWithCheck,
  authorizeDiagnosisView,
} from '../middlewares/authorize.middleware';
import { canViewDiagnosisResult } from '../utils/permissions';

const router = Router();

// ========================================
// 自分の診断結果エンドポイント
// ========================================

/**
 * @openapi
 * /api/diagnosis/me:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 自分の診断結果を取得
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 診断結果
 *       404:
 *         description: 診断結果が見つかりません
 */
router.get(
  '/me',
  authenticate,
  diagnosisController.getMyDiagnosisResult.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/me/detail:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 自分の診断結果詳細を取得
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 診断結果詳細
 *       404:
 *         description: 診断結果が見つかりません
 */
router.get(
  '/me/detail',
  authenticate,
  diagnosisController.getMyDiagnosisDetail.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/me/potential:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 自分の活躍可能性スコアを取得
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 活躍可能性スコア一覧
 *       404:
 *         description: スコアが見つかりません
 */
router.get(
  '/me/potential',
  authenticate,
  diagnosisController.getMyPotentialScores.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/me/similarity:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 自分の類似メンバーを取得
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minSimilarity
 *         schema:
 *           type: integer
 *           default: 70
 *         description: 最小類似度（%）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 最大取得件数
 *     responses:
 *       200:
 *         description: 類似メンバー一覧
 *       400:
 *         description: 企業に所属していません
 */
router.get(
  '/me/similarity',
  authenticate,
  diagnosisController.getMySimilarMembers.bind(diagnosisController)
);

// ========================================
// 企業統計エンドポイント
// ========================================

/**
 * @openapi
 * /api/diagnosis/company/{companyId}/stats:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 企業の診断統計を取得
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 企業診断統計
 *       403:
 *         description: アクセス権限がありません
 */
router.get(
  '/company/:companyId/stats',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  diagnosisController.getCompanyDiagnosisStats.bind(diagnosisController)
);

// ========================================
// ユーザー指定の診断結果エンドポイント
// ========================================

/**
 * @openapi
 * /api/diagnosis/{userId}:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 指定ユーザーの診断結果を取得
 *     description: |
 *       本人または権限を持つ管理者のみアクセス可能
 *       - SYSTEM_ADMIN: 全ユーザーの結果を閲覧可能
 *       - COMPANY_ADMIN: 自社ユーザーの結果を閲覧可能
 *       - COMPANY_USER: 同一部門のユーザーの結果を閲覧可能
 *       - GENERAL_USER: 自分の結果のみ閲覧可能
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 診断結果
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
 *                     id:
 *                       type: string
 *                     typeName:
 *                       type: string
 *                     typeCode:
 *                       type: string
 *                     featureLabels:
 *                       type: array
 *                       items:
 *                         type: string
 *                     reliabilityStatus:
 *                       type: string
 *                       enum: [RELIABLE, UNRELIABLE, NEEDS_REVIEW]
 *                     stressTolerance:
 *                       type: string
 *                       enum: [HIGH, MEDIUM, LOW]
 *                     thinkingPattern:
 *                       type: object
 *                     behaviorPattern:
 *                       type: object
 *                     bigFive:
 *                       type: object
 *       403:
 *         description: アクセス権限がありません
 *       404:
 *         description: 診断結果が見つかりません
 */
router.get(
  '/:userId',
  authenticate,
  authorizeDiagnosisView(),
  diagnosisController.getDiagnosisResult.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/{userId}/detail:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 指定ユーザーの診断結果詳細を取得
 *     description: |
 *       タイプ別詳細解説、マネジメントのポイント、適性が高い/低い仕事などを含む
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 診断結果詳細
 *       403:
 *         description: アクセス権限がありません
 *       404:
 *         description: 診断結果が見つかりません
 */
router.get(
  '/:userId/detail',
  authenticate,
  authorizeDiagnosisView(),
  diagnosisController.getDiagnosisDetail.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/{userId}/potential:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 指定ユーザーの活躍可能性スコアを取得
 *     description: |
 *       職種別の適性スコア（0-100）とグレード（A-D）を返却
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 活躍可能性スコア一覧
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
 *                     scores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           jobType:
 *                             type: string
 *                           grade:
 *                             type: string
 *                             enum: [A, B, C, D]
 *                           score:
 *                             type: integer
 *       403:
 *         description: アクセス権限がありません
 *       404:
 *         description: スコアが見つかりません
 */
router.get(
  '/:userId/potential',
  authenticate,
  authorizeDiagnosisView(),
  diagnosisController.getPotentialScores.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/{userId}/similarity:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 指定ユーザーの類似メンバーを取得
 *     description: |
 *       同一企業内で類似度が高いメンバーを返却
 *       - コサイン類似度とユークリッド類似度の平均を使用
 *       - 偏差値差が15以上の因子を「差が大きい因子」として抽出
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: minSimilarity
 *         schema:
 *           type: integer
 *           default: 70
 *         description: 最小類似度（%）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 最大取得件数
 *     responses:
 *       200:
 *         description: 類似メンバー一覧
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
 *                     similarMembers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           department:
 *                             type: string
 *                           similarityPercentage:
 *                             type: number
 *                           differingFactors:
 *                             type: array
 *                             items:
 *                               type: string
 *       403:
 *         description: 同一企業のメンバーのみ閲覧可能
 *       404:
 *         description: ユーザーが見つかりません
 */
router.get(
  '/:userId/similarity',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  diagnosisController.getSimilarMembers.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/{userId}/history:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 指定ユーザーの診断履歴を取得
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 診断履歴一覧
 */
router.get(
  '/:userId/history',
  authenticate,
  authorizeDiagnosisView(),
  diagnosisController.getDiagnosisHistory.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/{userId}/brushup-history:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 指定ユーザーのブラッシュアップ履歴を取得
 *     description: |
 *       外部診断やフィードバックに基づいて診断結果が更新された記録
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: ブラッシュアップ履歴一覧
 */
router.get(
  '/:userId/brushup-history',
  authenticate,
  authorizeDiagnosisView(),
  diagnosisController.getBrushUpHistory.bind(diagnosisController)
);

/**
 * @openapi
 * /api/diagnosis/{userId}/external:
 *   get:
 *     tags:
 *       - Diagnosis
 *     summary: 指定ユーザーの外部診断結果を取得
 *     description: |
 *       MBTI、動物占いなどの外部診断結果
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 外部診断結果一覧
 */
router.get(
  '/:userId/external',
  authenticate,
  authorizeDiagnosisView(),
  diagnosisController.getExternalDiagnosis.bind(diagnosisController)
);

export default router;
