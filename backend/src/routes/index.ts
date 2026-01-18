import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import companyRoutes from './company.routes';
import departmentRoutes from './department.routes';
import surveyRoutes from './survey.routes';
import diagnosisRoutes from './diagnosis.routes';
import companyAnalysisRoutes from './company-analysis.routes';
import externalDiagnosisRoutes from './external-diagnosis.routes';
import brushUpRoutes from './brushup.routes';
import candidateRoutes from './candidate.routes';
import interviewCommentRoutes from './interview-comment.routes';
import interviewRoutes from './interview.routes';
import reportRoutes from './report.routes';
import adminBillingRoutes from './admin-billing.routes';
import billingRoutes from './billing.routes';
import webhookRoutes from './webhook.routes';
import healthRoutes from './health.routes';

const router = Router();

// Health check routes (comprehensive)
router.use('/health', healthRoutes);

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/companies', companyAnalysisRoutes); // 企業分析ルート（/companies/:companyId/analysis/*）
router.use('/departments', departmentRoutes);
router.use('/survey', surveyRoutes);
router.use('/diagnosis', diagnosisRoutes);
router.use('/diagnosis', brushUpRoutes); // ブラッシュアップルート（/diagnosis/:userId/brushup*）
router.use('/external-diagnosis', externalDiagnosisRoutes);
router.use('/candidates', candidateRoutes);
router.use('/', interviewCommentRoutes); // 面接コメントルート（/candidates/:candidateId/comments, /comments/:id）
router.use('/interviews', interviewRoutes); // 面接スケジュールルート
router.use('/reports', reportRoutes); // レポート生成ルート
router.use('/admin', adminBillingRoutes); // システム管理者向け請求管理ルート
router.use('/billing', billingRoutes); // 企業管理者向け請求管理ルート
router.use('/webhooks', webhookRoutes); // Webhookルート

export default router;
