import { Router } from 'express';
import { companyAnalysisController } from '../controllers/company-analysis.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

/**
 * @openapi
 * /api/companies/{companyId}/analysis/overview:
 *   get:
 *     tags:
 *       - Company Analysis
 *     summary: 企業の概要分析を取得
 *     description: |
 *       企業の診断完了状況の概要を取得します。
 *       - 総従業員数
 *       - 診断完了者数
 *       - 完了率
 *       - 最終更新日時
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
 *         description: 概要分析データ
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
 *                     companyId:
 *                       type: string
 *                     companyName:
 *                       type: string
 *                     totalEmployees:
 *                       type: integer
 *                     diagnosisCompleted:
 *                       type: integer
 *                     completionRate:
 *                       type: number
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: アクセス権限がありません
 *       404:
 *         description: 企業が見つかりません
 */
router.get(
  '/:companyId/analysis/overview',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  companyAnalysisController.getOverview.bind(companyAnalysisController)
);

/**
 * @openapi
 * /api/companies/{companyId}/analysis/thinking-pattern:
 *   get:
 *     tags:
 *       - Company Analysis
 *     summary: 思考パターン分析を取得
 *     description: |
 *       企業の思考パターン（RASE）分布と平均値を取得します。
 *       - R（リーダー）: 意思決定・主体性
 *       - A（アナリスト）: 分析・批判的思考
 *       - S（サポーター）: 協調・支援
 *       - E（エネルギッシュ）: 活動性・情報収集
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
 *         description: 思考パターン分析データ
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
 *                     distribution:
 *                       type: object
 *                     averages:
 *                       type: object
 *                     dominantPattern:
 *                       type: string
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get(
  '/:companyId/analysis/thinking-pattern',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  companyAnalysisController.getThinkingPatternAnalysis.bind(companyAnalysisController)
);

/**
 * @openapi
 * /api/companies/{companyId}/analysis/behavior-pattern:
 *   get:
 *     tags:
 *       - Company Analysis
 *     summary: 行動パターン分析を取得
 *     description: |
 *       企業の行動パターン5軸の分布と平均値を取得します。
 *       - 効率重視
 *       - 友好重視
 *       - 知識重視
 *       - 体裁重視
 *       - 挑戦重視
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
 *         description: 行動パターン分析データ
 */
router.get(
  '/:companyId/analysis/behavior-pattern',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  companyAnalysisController.getBehaviorPatternAnalysis.bind(companyAnalysisController)
);

/**
 * @openapi
 * /api/companies/{companyId}/analysis/big-five:
 *   get:
 *     tags:
 *       - Company Analysis
 *     summary: BigFive分析を取得
 *     description: |
 *       企業のBigFive性格特性の平均値とベンチマーク比較を取得します。
 *       - 外向性（Extraversion）
 *       - 神経症傾向（Neuroticism）
 *       - 開放性（Openness）
 *       - 協調性（Agreeableness）
 *       - 誠実性（Conscientiousness）
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
 *         description: BigFive分析データ
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
 *                     companyAverages:
 *                       type: object
 *                     benchmarkAverages:
 *                       type: object
 *                     comparison:
 *                       type: object
 *                     comparisonText:
 *                       type: string
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get(
  '/:companyId/analysis/big-five',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  companyAnalysisController.getBigFiveAnalysis.bind(companyAnalysisController)
);

/**
 * @openapi
 * /api/companies/{companyId}/analysis/by-department:
 *   get:
 *     tags:
 *       - Company Analysis
 *     summary: 部門別分析を取得
 *     description: |
 *       部門別の傾向比較データを取得します。
 *       特定の部門IDを指定することで、その部門のみのデータを取得できます。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 特定の部門IDを指定（省略時は全部門）
 *     responses:
 *       200:
 *         description: 部門別分析データ
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
 *                     departments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           memberCount:
 *                             type: integer
 *                           diagnosisCompleted:
 *                             type: integer
 *                           completionRate:
 *                             type: number
 *                           bigFiveAverages:
 *                             type: object
 *                           dominantThinkingPattern:
 *                             type: string
 *                           dominantBehaviorPattern:
 *                             type: string
 *                     comparison:
 *                       type: object
 */
router.get(
  '/:companyId/analysis/by-department',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  companyAnalysisController.getDepartmentAnalysis.bind(companyAnalysisController)
);

/**
 * @openapi
 * /api/companies/{companyId}/analysis/type-distribution:
 *   get:
 *     tags:
 *       - Company Analysis
 *     summary: タイプ分布を取得
 *     description: |
 *       企業のタイプ別人数分布を取得します。
 *       - EE型: 情熱的リーダー型
 *       - EI型: 実行力重視型
 *       - IE型: 思索的クリエイター型
 *       - II型: 分析的専門家型
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
 *         description: タイプ分布データ
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
 *                     distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           typeCode:
 *                             type: string
 *                           typeName:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     total:
 *                       type: integer
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get(
  '/:companyId/analysis/type-distribution',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  companyAnalysisController.getTypeDistribution.bind(companyAnalysisController)
);

/**
 * @openapi
 * /api/companies/{companyId}/analysis/all:
 *   get:
 *     tags:
 *       - Company Analysis
 *     summary: 全分析データを一括取得
 *     description: |
 *       企業の全分析データを一括で取得します。
 *       ダッシュボード表示などで複数のAPIを呼び出す代わりに使用できます。
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
 *         description: 全分析データ
 */
router.get(
  '/:companyId/analysis/all',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  companyAnalysisController.getAllAnalysis.bind(companyAnalysisController)
);

/**
 * @openapi
 * /api/companies/{companyId}/analysis/invalidate-cache:
 *   post:
 *     tags:
 *       - Company Analysis
 *     summary: 分析キャッシュを無効化
 *     description: |
 *       企業の分析キャッシュを手動で無効化します。
 *       システム管理者のみ実行可能です。
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
 *         description: キャッシュ無効化成功
 *       403:
 *         description: システム管理者のみ実行可能
 */
router.post(
  '/:companyId/analysis/invalidate-cache',
  authenticate,
  authorize(['SYSTEM_ADMIN']),
  companyAnalysisController.invalidateCache.bind(companyAnalysisController)
);

export default router;
