import OpenAI from 'openai';
import { config } from '../config';

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseUrl || undefined,
});

// リトライ設定
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // ms
const RATE_LIMIT_RETRY_DELAY = 60000; // 1分

// コスト計算用のトークン単価（概算）
const TOKEN_COSTS = {
  'gpt-4.1-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4.1-nano': { input: 0.0001, output: 0.0004 },
  'gemini-2.5-flash': { input: 0.0001, output: 0.0004 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
};

// レスポンス型
interface OpenAIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  model: string;
  latencyMs: number;
}

// 構造化出力のスキーマ型
interface StructuredOutputSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

// ブラッシュアップ結果の型
export interface BrushUpAIResponse {
  updatedFeatureLabels: string[];
  adjustedScores: {
    thinkingPattern?: {
      leader?: number;
      analyst?: number;
      supporter?: number;
      energetic?: number;
    };
    behaviorPattern?: {
      efficiency?: number;
      friendliness?: number;
      knowledge?: number;
      appearance?: number;
      challenge?: number;
    };
    bigFive?: {
      extraversion?: number;
      openness?: number;
      agreeableness?: number;
      conscientiousness?: number;
      neuroticism?: number;
    };
  };
  reasoning: string;
  confidence: number;
  riskFlags: string[];
}

// ブラッシュアップ入力の型
export interface BrushUpInput {
  currentDiagnosis: {
    typeName: string;
    typeCode: string;
    featureLabels: string[];
    bigFive: Record<string, number>;
    thinkingPattern: Record<string, number>;
    behaviorPattern: Record<string, number>;
  };
  mbti?: {
    type: string;
    indicators?: Record<string, number>;
  };
  animalFortune?: {
    animal: string;
    color?: string;
    detail60?: string;
  };
  interviewComments?: Array<{
    comment: string;
    rating: number;
    tags: string[];
    structuredEvaluation?: Record<string, any>;
  }>;
  triggerType: string;
}

class OpenAIService {
  private defaultModel: string;

  constructor() {
    this.defaultModel = config.openai.model || 'gpt-4.1-mini';
  }

  /**
   * 汎用的なChat Completion呼び出し
   */
  async chatCompletion<T = string>(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      structuredOutput?: StructuredOutputSchema;
      maxRetries?: number;
    } = {}
  ): Promise<OpenAIResponse<T>> {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2000,
      structuredOutput,
      maxRetries = DEFAULT_MAX_RETRIES,
    } = options;

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const requestParams: any = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        };

        // 構造化出力を要求する場合
        if (structuredOutput) {
          requestParams.response_format = {
            type: 'json_object',
          };
          // システムメッセージにJSONスキーマを追加
          const schemaInstruction = `\n\nYou must respond with a valid JSON object that conforms to this schema:\n${JSON.stringify(structuredOutput, null, 2)}`;
          if (messages[0]?.role === 'system') {
            messages[0].content += schemaInstruction;
          } else {
            messages.unshift({
              role: 'system',
              content: `You are a helpful assistant.${schemaInstruction}`,
            });
          }
        }

        const response = await openai.chat.completions.create(requestParams);

        const latencyMs = Date.now() - startTime;
        const usage = response.usage;
        const content = response.choices[0]?.message?.content || '';

        // コスト計算
        const tokenCost = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS] || TOKEN_COSTS['gpt-4.1-mini'];
        const estimatedCost = usage
          ? (usage.prompt_tokens * tokenCost.input + usage.completion_tokens * tokenCost.output) / 1000
          : 0;

        // 構造化出力の場合はJSONをパース
        let data: T;
        if (structuredOutput) {
          try {
            data = JSON.parse(content) as T;
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return {
              success: false,
              error: 'AIレスポンスのJSONパースに失敗しました',
              model,
              latencyMs,
            };
          }
        } else {
          data = content as unknown as T;
        }

        return {
          success: true,
          data,
          usage: usage
            ? {
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
                estimatedCost,
              }
            : undefined,
          model,
          latencyMs,
        };
      } catch (error: any) {
        lastError = error;

        // レート制限エラーの場合は長めに待機
        if (error.status === 429) {
          console.warn(`Rate limit hit, waiting ${RATE_LIMIT_RETRY_DELAY}ms before retry...`);
          await this.sleep(RATE_LIMIT_RETRY_DELAY);
          continue;
        }

        // その他のエラーは通常のリトライ
        if (attempt < maxRetries - 1) {
          const delay = DEFAULT_RETRY_DELAY * Math.pow(2, attempt);
          console.warn(`OpenAI API error, retrying in ${delay}ms...`, error.message);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'OpenAI API呼び出しに失敗しました',
      model: this.defaultModel,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * ブラッシュアップ用のAI呼び出し
   */
  async generateBrushUp(input: BrushUpInput): Promise<OpenAIResponse<BrushUpAIResponse>> {
    const systemPrompt = this.buildBrushUpSystemPrompt();
    const userPrompt = this.buildBrushUpUserPrompt(input);

    const structuredOutputSchema: StructuredOutputSchema = {
      type: 'object',
      properties: {
        updatedFeatureLabels: {
          type: 'array',
          items: { type: 'string' },
          description: '更新後の特徴ラベル（3-5個）',
        },
        adjustedScores: {
          type: 'object',
          properties: {
            thinkingPattern: {
              type: 'object',
              properties: {
                leader: { type: 'number' },
                analyst: { type: 'number' },
                supporter: { type: 'number' },
                energetic: { type: 'number' },
              },
            },
            behaviorPattern: {
              type: 'object',
              properties: {
                efficiency: { type: 'number' },
                friendliness: { type: 'number' },
                knowledge: { type: 'number' },
                appearance: { type: 'number' },
                challenge: { type: 'number' },
              },
            },
            bigFive: {
              type: 'object',
              properties: {
                extraversion: { type: 'number' },
                openness: { type: 'number' },
                agreeableness: { type: 'number' },
                conscientiousness: { type: 'number' },
                neuroticism: { type: 'number' },
              },
            },
          },
          description: '調整後のスコア（偏差値、20-80の範囲）',
        },
        reasoning: {
          type: 'string',
          description: '調整の根拠と理由（日本語で詳細に）',
        },
        confidence: {
          type: 'number',
          description: '調整の信頼度（0-100）',
        },
        riskFlags: {
          type: 'array',
          items: { type: 'string' },
          description: 'リスクフラグ（矛盾がある場合など）',
        },
      },
      required: ['updatedFeatureLabels', 'adjustedScores', 'reasoning', 'confidence', 'riskFlags'],
    };

    return this.chatCompletion<BrushUpAIResponse>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3, // 一貫性を重視
        maxTokens: 2000,
        structuredOutput: structuredOutputSchema,
      }
    );
  }

  /**
   * ブラッシュアップ用システムプロンプトを構築
   */
  private buildBrushUpSystemPrompt(): string {
    return `あなたは性格診断の専門家AIアシスタントです。
ユーザーの性格診断結果を、追加情報（MBTI、動物占い、面接コメント）に基づいて精緻化（ブラッシュアップ）する役割を担います。

## 重要な制約事項

1. **倫理的制約**
   - 年齢、性別、国籍、宗教などの保護属性に基づく推定や調整は絶対に行わないでください
   - 採用の合否判断に直接使用されることを想定した出力は行わないでください
   - すべての出力は「参考情報」として扱われることを前提としてください

2. **調整の制約**
   - 各スコアの調整幅は最大±5ポイントまでとしてください
   - 調整後のスコアは20-80の範囲内に収めてください
   - 根拠が薄い場合は調整を控えめにしてください

3. **信頼度の判断基準**
   - 90-100: 複数の情報源が一致し、強い根拠がある
   - 70-89: 主要な情報源が一致している
   - 50-69: 一部の情報源のみで判断
   - 50未満: 矛盾する情報があり、調整を推奨しない

4. **リスクフラグの付与基準**
   - 情報源間で大きな矛盾がある場合
   - 調整幅が大きい場合
   - 信頼度が低い場合

## 分析観点

1. **MBTI情報がある場合**
   - E/I → 外向性との相関を確認
   - S/N → 開放性との相関を確認
   - T/F → 協調性との逆相関を確認
   - J/P → 誠実性との相関を確認

2. **動物占い情報がある場合**
   - 各動物キャラクターの特性とBigFiveの対応を確認
   - 科学的根拠は限定的なため、調整は控えめに

3. **面接コメントがある場合**
   - 構造化された評価項目を重視
   - 自由記述は参考程度に
   - 複数の面接官の評価が一致する場合は信頼度を上げる`;
  }

  /**
   * ブラッシュアップ用ユーザープロンプトを構築
   */
  private buildBrushUpUserPrompt(input: BrushUpInput): string {
    let prompt = `## 現在の診断結果

タイプ: ${input.currentDiagnosis.typeName}（${input.currentDiagnosis.typeCode}）
特徴ラベル: ${input.currentDiagnosis.featureLabels.join('、')}

### BigFive偏差値
- 外向性: ${input.currentDiagnosis.bigFive.extraversion}
- 開放性: ${input.currentDiagnosis.bigFive.openness}
- 協調性: ${input.currentDiagnosis.bigFive.agreeableness}
- 誠実性: ${input.currentDiagnosis.bigFive.conscientiousness}
- 神経症傾向: ${input.currentDiagnosis.bigFive.neuroticism}

### 思考パターン偏差値
- リーダー: ${input.currentDiagnosis.thinkingPattern.leader}
- アナリスト: ${input.currentDiagnosis.thinkingPattern.analyst}
- サポーター: ${input.currentDiagnosis.thinkingPattern.supporter}
- エネルギッシュ: ${input.currentDiagnosis.thinkingPattern.energetic}

### 行動パターン偏差値
- 効率重視: ${input.currentDiagnosis.behaviorPattern.efficiency}
- 友好重視: ${input.currentDiagnosis.behaviorPattern.friendliness}
- 知識重視: ${input.currentDiagnosis.behaviorPattern.knowledge}
- 体裁重視: ${input.currentDiagnosis.behaviorPattern.appearance}
- 挑戦重視: ${input.currentDiagnosis.behaviorPattern.challenge}

## トリガー: ${input.triggerType}

`;

    if (input.mbti) {
      prompt += `## MBTI診断結果
タイプ: ${input.mbti.type}
`;
      if (input.mbti.indicators) {
        prompt += `指標:
- E/I: ${input.mbti.indicators.E_I ?? '不明'}（0=I寄り、100=E寄り）
- S/N: ${input.mbti.indicators.S_N ?? '不明'}（0=S寄り、100=N寄り）
- T/F: ${input.mbti.indicators.T_F ?? '不明'}（0=T寄り、100=F寄り）
- J/P: ${input.mbti.indicators.J_P ?? '不明'}（0=J寄り、100=P寄り）
`;
      }
      prompt += '\n';
    }

    if (input.animalFortune) {
      prompt += `## 動物占い診断結果
動物: ${input.animalFortune.animal}
`;
      if (input.animalFortune.color) {
        prompt += `カラー: ${input.animalFortune.color}\n`;
      }
      if (input.animalFortune.detail60) {
        prompt += `60分類: ${input.animalFortune.detail60}\n`;
      }
      prompt += '\n';
    }

    if (input.interviewComments && input.interviewComments.length > 0) {
      prompt += `## 面接コメント\n`;
      input.interviewComments.forEach((comment, index) => {
        prompt += `### コメント ${index + 1}
評価: ${comment.rating}/5
タグ: ${comment.tags.join('、')}
コメント: ${comment.comment}
`;
        if (comment.structuredEvaluation) {
          prompt += `構造化評価: ${JSON.stringify(comment.structuredEvaluation, null, 2)}\n`;
        }
        prompt += '\n';
      });
    }

    prompt += `## 依頼事項
上記の情報を総合的に分析し、診断結果のブラッシュアップを行ってください。
調整が必要な場合のみスコアを変更し、根拠を明確に示してください。
矛盾する情報がある場合は、リスクフラグを付与してください。`;

    return prompt;
  }

  /**
   * スリープ関数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 利用可能なモデル一覧を取得
   */
  getAvailableModels(): string[] {
    return Object.keys(TOKEN_COSTS);
  }

  /**
   * 現在のデフォルトモデルを取得
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
}

export const openaiService = new OpenAIService();
