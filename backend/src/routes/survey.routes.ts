import { Router } from 'express';
import { surveyController } from '../controllers/survey.controller';
import { authenticate } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// レート制限設定
const surveyRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 60, // 1分間に60リクエストまで
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'リクエスト数が制限を超えました。しばらく待ってから再試行してください。',
    },
  },
});

const completeRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分
  max: 5, // 5分間に5リクエストまで
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '診断完了リクエストの制限を超えました。しばらく待ってから再試行してください。',
    },
  },
});

/**
 * @openapi
 * /api/survey/questions:
 *   get:
 *     tags:
 *       - Survey
 *     summary: 設問一覧取得
 *     description: 指定したページの設問一覧を取得します。各ページには30問の設問が含まれます。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 3
 *           default: 1
 *         description: ページ番号（1-3）
 *     responses:
 *       200:
 *         description: 設問一覧
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
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     questionsPerPage:
 *                       type: integer
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           orderNumber:
 *                             type: integer
 *                           questionText:
 *                             type: string
 *                           category:
 *                             type: string
 *                             enum: [EXTRAVERSION, OPENNESS, AGREEABLENESS, CONSCIENTIOUSNESS, NEUROTICISM, THINKING, BEHAVIOR]
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 */
router.get(
  '/questions',
  authenticate,
  surveyRateLimiter,
  (req, res) => surveyController.getQuestions(req, res)
);

/**
 * @openapi
 * /api/survey/answers:
 *   post:
 *     tags:
 *       - Survey
 *     summary: 回答送信
 *     description: 指定したページの設問に対する回答を送信します。30問全ての回答が必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - page
 *               - answers
 *             properties:
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *                 description: ページ番号
 *               answers:
 *                 type: array
 *                 minItems: 30
 *                 maxItems: 30
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                     - score
 *                   properties:
 *                     questionId:
 *                       type: string
 *                       format: uuid
 *                       description: 設問ID
 *                     score:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 7
 *                       description: 回答スコア（1-7）
 *     responses:
 *       200:
 *         description: 回答保存成功
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
 *                     saved:
 *                       type: integer
 *                       description: 保存された回答数
 *                     reliability:
 *                       type: object
 *                       properties:
 *                         isReliable:
 *                           type: boolean
 *                         issues:
 *                           type: array
 *                           items:
 *                             type: string
 *                 warning:
 *                   type: object
 *                   description: 信頼性に問題がある場合の警告
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 */
router.post(
  '/answers',
  authenticate,
  surveyRateLimiter,
  (req, res) => surveyController.submitAnswers(req, res)
);

/**
 * @openapi
 * /api/survey/progress:
 *   get:
 *     tags:
 *       - Survey
 *     summary: 回答進捗取得
 *     description: 現在のユーザーの回答進捗を取得します。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 回答進捗
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
 *                     completedPages:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: 完了したページ番号の配列
 *                     remainingPages:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: 残りのページ番号の配列
 *                     totalAnswered:
 *                       type: integer
 *                       description: 回答済み設問数
 *                     totalQuestions:
 *                       type: integer
 *                       description: 全設問数
 *                     isComplete:
 *                       type: boolean
 *                       description: 全設問回答済みかどうか
 *       401:
 *         description: 認証エラー
 */
router.get(
  '/progress',
  authenticate,
  surveyRateLimiter,
  (req, res) => surveyController.getProgress(req, res)
);

/**
 * @openapi
 * /api/survey/complete:
 *   post:
 *     tags:
 *       - Survey
 *     summary: 診断完了
 *     description: 全90問の回答が完了した後、診断結果を計算します。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 maxLength: 100
 *                 description: ニックネーム（オプション）
 *               email:
 *                 type: string
 *                 format: email
 *                 description: メールアドレス（オプション）
 *               currentJob:
 *                 type: string
 *                 maxLength: 100
 *                 description: 現在の職種（オプション）
 *     responses:
 *       201:
 *         description: 診断完了
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
 *                       format: uuid
 *                     typeName:
 *                       type: string
 *                       description: タイプ名
 *                     typeCode:
 *                       type: string
 *                       description: タイプコード
 *                     featureLabels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 特徴ラベル
 *                     reliabilityStatus:
 *                       type: string
 *                       enum: [RELIABLE, UNRELIABLE, NEEDS_REVIEW]
 *                     stressTolerance:
 *                       type: string
 *                       enum: [HIGH, MEDIUM, LOW]
 *                     thinkingPattern:
 *                       type: object
 *                       description: 思考パターン（R,A,S,E偏差値）
 *                     behaviorPattern:
 *                       type: object
 *                       description: 行動パターン偏差値
 *                     bigFive:
 *                       type: object
 *                       description: BigFive偏差値
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: 全設問未回答エラー
 *       401:
 *         description: 認証エラー
 */
router.post(
  '/complete',
  authenticate,
  completeRateLimiter,
  (req, res) => surveyController.completeSurvey(req, res)
);

export default router;
