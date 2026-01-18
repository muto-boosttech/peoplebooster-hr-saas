import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     IndividualReportRequest:
 *       type: object
 *       properties:
 *         includeDetail:
 *           type: boolean
 *           default: true
 *           description: 詳細情報を含めるか
 *         includePotential:
 *           type: boolean
 *           default: true
 *           description: 活躍可能性スコアを含めるか
 *         includeSimilarity:
 *           type: boolean
 *           default: false
 *           description: 類似性分析を含めるか
 *         companyLogo:
 *           type: boolean
 *           default: false
 *           description: 企業ロゴを含めるか（COMPANY_ADMIN以上のみ）
 *
 *     CandidateSummaryReportRequest:
 *       type: object
 *       properties:
 *         includeComments:
 *           type: boolean
 *           default: true
 *         includeInterviews:
 *           type: boolean
 *           default: true
 *         includeDiagnosis:
 *           type: boolean
 *           default: true
 *
 *     OrganizationReportRequest:
 *       type: object
 *       properties:
 *         departmentId:
 *           type: string
 *           format: uuid
 *           description: 特定部署のみを対象にする場合
 *         includeIndividualScores:
 *           type: boolean
 *           default: false
 *
 *     RecruitmentSummaryReportRequest:
 *       type: object
 *       required:
 *         - startDate
 *         - endDate
 *       properties:
 *         startDate:
 *           type: string
 *           format: date
 *           description: 集計開始日
 *         endDate:
 *           type: string
 *           format: date
 *           description: 集計終了日
 *         includeDetails:
 *           type: boolean
 *           default: false
 *           description: 候補者詳細を含めるか
 *
 *     ReportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               description: 署名付きダウンロードURL
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               description: URLの有効期限
 *             key:
 *               type: string
 *               description: S3オブジェクトキー
 *         message:
 *           type: string
 */

/**
 * @openapi
 * /api/reports/individual/{userId}:
 *   post:
 *     summary: 個人診断レポートを生成
 *     description: 指定したユーザーの診断結果をPDFレポートとして生成します
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IndividualReportRequest'
 *     responses:
 *       200:
 *         description: レポート生成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportResponse'
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: ユーザーまたは診断結果が見つからない
 */
router.post(
  '/individual/:userId',
  authenticate,
  reportController.generateIndividualReport.bind(reportController)
);

/**
 * @openapi
 * /api/reports/candidate-summary/{candidateId}:
 *   post:
 *     summary: 候補者評価サマリーレポートを生成
 *     description: 候補者の評価情報をまとめたPDFレポートを生成します
 *     tags:
 *       - Reports
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
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CandidateSummaryReportRequest'
 *     responses:
 *       200:
 *         description: レポート生成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportResponse'
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 候補者が見つからない
 */
router.post(
  '/candidate-summary/:candidateId',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER']),
  reportController.generateCandidateSummaryReport.bind(reportController)
);

/**
 * @openapi
 * /api/reports/organization/{companyId}:
 *   post:
 *     summary: 組織傾向分析レポートを生成
 *     description: 会社または部署の診断傾向を分析したPDFレポートを生成します
 *     tags:
 *       - Reports
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
 *         description: 特定部署のみを対象にする場合
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrganizationReportRequest'
 *     responses:
 *       200:
 *         description: レポート生成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportResponse'
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 会社が見つからない
 */
router.post(
  '/organization/:companyId',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  reportController.generateOrganizationReport.bind(reportController)
);

/**
 * @openapi
 * /api/reports/recruitment-summary/{companyId}:
 *   post:
 *     summary: 採用活動サマリーレポートを生成
 *     description: 指定期間の採用活動をまとめたPDFレポートを生成します
 *     tags:
 *       - Reports
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
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecruitmentSummaryReportRequest'
 *     responses:
 *       200:
 *         description: レポート生成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportResponse'
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 会社が見つからない
 */
router.post(
  '/recruitment-summary/:companyId',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  reportController.generateRecruitmentSummaryReport.bind(reportController)
);

/**
 * @openapi
 * /api/reports/export/csv:
 *   get:
 *     summary: CSVエクスポート
 *     description: 指定したデータをCSV形式でエクスポートします
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [diagnosis, candidates, interviews]
 *         description: エクスポートするデータの種類
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 期間の開始日
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 期間の終了日
 *     responses:
 *       200:
 *         description: CSVファイル
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/export/csv',
  authenticate,
  authorize(['SYSTEM_ADMIN', 'COMPANY_ADMIN']),
  reportController.exportCsv.bind(reportController)
);

export default router;
