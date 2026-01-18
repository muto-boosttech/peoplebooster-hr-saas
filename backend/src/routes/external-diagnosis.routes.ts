import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import externalDiagnosisController from '../controllers/external-diagnosis.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

// レート制限設定
const externalDiagnosisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 30, // 15分あたり30リクエスト
  message: {
    success: false,
    error: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
  },
});

const consistencyCheckLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分
  max: 10, // 5分あたり10リクエスト
  message: {
    success: false,
    error: '整合性チェックのリクエストが多すぎます。しばらく待ってから再試行してください。',
  },
});

/**
 * @openapi
 * tags:
 *   - name: External Diagnosis
 *     description: 外部診断連携API（MBTI、動物占い）
 */

/**
 * @openapi
 * /api/external-diagnosis/mbti:
 *   post:
 *     tags: [External Diagnosis]
 *     summary: MBTI診断を登録/更新
 *     description: |
 *       ユーザーのMBTI診断結果を登録または更新します。
 *       登録後、AIブラッシュアップが自動的にトリガーされます。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [INTJ, INTP, ENTJ, ENTP, INFJ, INFP, ENFJ, ENFP, ISTJ, ISFJ, ESTJ, ESFJ, ISTP, ISFP, ESTP, ESFP]
 *                 description: MBTIタイプ（16タイプ）
 *               indicators:
 *                 type: object
 *                 description: 各指標のスコア（オプション）
 *                 properties:
 *                   E_I:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 100
 *                     description: 外向性-内向性スコア（0=I寄り、100=E寄り）
 *                   S_N:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 100
 *                     description: 感覚-直観スコア（0=S寄り、100=N寄り）
 *                   T_F:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 100
 *                     description: 思考-感情スコア（0=T寄り、100=F寄り）
 *                   J_P:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 100
 *                     description: 判断-知覚スコア（0=J寄り、100=P寄り）
 *               sourceUrl:
 *                 type: string
 *                 format: uri
 *                 description: 診断元URL
 *               diagnosedAt:
 *                 type: string
 *                 format: date
 *                 description: 診断日
 *           example:
 *             type: "INTJ"
 *             indicators:
 *               E_I: 45
 *               S_N: 62
 *               T_F: 78
 *               J_P: 55
 *             sourceUrl: "https://www.16personalities.com/profiles/xxx"
 *             diagnosedAt: "2026-01-10"
 *     responses:
 *       201:
 *         description: MBTI診断を登録しました
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 */
router.post(
  '/mbti',
  authenticate,
  externalDiagnosisLimiter,
  externalDiagnosisController.createMBTIDiagnosis
);

/**
 * @openapi
 * /api/external-diagnosis/animal-fortune:
 *   post:
 *     tags: [External Diagnosis]
 *     summary: 動物占い診断を登録/更新
 *     description: |
 *       ユーザーの動物占い診断結果を登録または更新します。
 *       登録後、AIブラッシュアップが自動的にトリガーされます。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - animal
 *             properties:
 *               animal:
 *                 type: string
 *                 enum: [狼, こじか, 猿, チータ, 黒ひょう, ライオン, 虎, たぬき, コアラ, ゾウ, ひつじ, ペガサス]
 *                 description: 動物キャラクター（12種類）
 *               color:
 *                 type: string
 *                 enum: [ブラウン, オレンジ, パープル, ブルー, レッド, ゴールド, シルバー, グリーン, イエロー, ブラック]
 *                 description: カラー（オプション）
 *               detail60:
 *                 type: string
 *                 description: 60分類の詳細キャラクター（オプション）
 *               sourceUrl:
 *                 type: string
 *                 format: uri
 *                 description: 診断元URL
 *               diagnosedAt:
 *                 type: string
 *                 format: date
 *                 description: 診断日
 *           example:
 *             animal: "狼"
 *             color: "ゴールド"
 *             detail60: "正直なこじか"
 *     responses:
 *       201:
 *         description: 動物占い診断を登録しました
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 */
router.post(
  '/animal-fortune',
  authenticate,
  externalDiagnosisLimiter,
  externalDiagnosisController.createAnimalFortuneDiagnosis
);

/**
 * @openapi
 * /api/external-diagnosis:
 *   get:
 *     tags: [External Diagnosis]
 *     summary: 外部診断一覧を取得
 *     description: ユーザーの外部診断一覧を取得します
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ユーザーID（管理者のみ指定可能）
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MBTI, ANIMAL_FORTUNE]
 *         description: 診断タイプでフィルタ
 *     responses:
 *       200:
 *         description: 外部診断一覧
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 */
router.get(
  '/',
  authenticate,
  externalDiagnosisController.getExternalDiagnoses
);

/**
 * @openapi
 * /api/external-diagnosis/{id}:
 *   delete:
 *     tags: [External Diagnosis]
 *     summary: 外部診断を削除
 *     description: 指定した外部診断を削除します（本人のみ）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 外部診断ID
 *     responses:
 *       200:
 *         description: 外部診断を削除しました
 *       401:
 *         description: 認証エラー
 *       403:
 *         description: 権限エラー
 *       404:
 *         description: 外部診断が見つかりません
 */
router.delete(
  '/:id',
  authenticate,
  externalDiagnosisController.deleteExternalDiagnosis
);

/**
 * @openapi
 * /api/external-diagnosis/mbti/consistency:
 *   get:
 *     tags: [External Diagnosis]
 *     summary: MBTIと診断結果の整合性をチェック
 *     description: |
 *       MBTI診断結果と性格診断結果の整合性をチェックします。
 *       整合性スコアと不一致のある因子を返します。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 整合性チェック結果
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
 *                     isConsistent:
 *                       type: boolean
 *                       description: 整合性があるかどうか
 *                     consistencyScore:
 *                       type: number
 *                       description: 整合性スコア（0-100）
 *                     discrepancies:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 不一致のある因子の説明
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: MBTI診断または性格診断結果が見つかりません
 */
router.get(
  '/mbti/consistency',
  authenticate,
  consistencyCheckLimiter,
  externalDiagnosisController.checkMBTIConsistency
);

/**
 * @openapi
 * /api/external-diagnosis/animal-fortune/consistency:
 *   get:
 *     tags: [External Diagnosis]
 *     summary: 動物占いと診断結果の整合性をチェック
 *     description: |
 *       動物占い診断結果と性格診断結果の整合性をチェックします。
 *       整合性スコアと不一致のある因子を返します。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 整合性チェック結果
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: 動物占い診断または性格診断結果が見つかりません
 */
router.get(
  '/animal-fortune/consistency',
  authenticate,
  consistencyCheckLimiter,
  externalDiagnosisController.checkAnimalConsistency
);

/**
 * @openapi
 * /api/external-diagnosis/brush-up-history:
 *   get:
 *     tags: [External Diagnosis]
 *     summary: ブラッシュアップ履歴を取得
 *     description: |
 *       外部診断や面接コメントに基づく診断結果のブラッシュアップ履歴を取得します。
 *       各履歴には、トリガーとなったイベント、更新前後のデータ、AIの判断根拠が含まれます。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ブラッシュアップ履歴一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       version:
 *                         type: string
 *                         description: バージョン番号（例：v1.1）
 *                       triggerType:
 *                         type: string
 *                         enum: [INITIAL, MBTI_ADDED, ANIMAL_ADDED, INTERVIEW_COMMENT, MANUAL]
 *                       previousData:
 *                         type: object
 *                         description: 更新前のデータ
 *                       updatedData:
 *                         type: object
 *                         description: 更新後のデータ
 *                       aiReasoning:
 *                         type: string
 *                         description: AIの判断根拠
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 認証エラー
 */
router.get(
  '/brush-up-history',
  authenticate,
  externalDiagnosisController.getBrushUpHistory
);

export default router;
