/**
 * MBTI-性格特性マッピングサービス
 * MBTIタイプとビッグファイブの相関マッピングを提供
 */

// MBTI 16タイプの定義
export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

export type MBTIType = typeof MBTI_TYPES[number];

// MBTI指標の定義
export interface MBTIIndicators {
  E_I: number;  // 0-100 (0: I寄り, 100: E寄り)
  S_N: number;  // 0-100 (0: S寄り, 100: N寄り)
  T_F: number;  // 0-100 (0: T寄り, 100: F寄り)
  J_P: number;  // 0-100 (0: J寄り, 100: P寄り)
}

// BigFive特性の定義
export interface BigFiveTraits {
  extraversion: number;      // 外向性
  openness: number;          // 開放性
  agreeableness: number;     // 協調性
  conscientiousness: number; // 誠実性
  neuroticism: number;       // 神経症傾向
}

// MBTI-BigFive相関係数（研究に基づく推定値）
const MBTI_BIGFIVE_CORRELATIONS = {
  // E/I → 外向性との相関 (強い正の相関)
  E_I_extraversion: 0.74,
  
  // S/N → 開放性との相関 (中程度の正の相関)
  S_N_openness: 0.72,
  
  // T/F → 協調性との相関 (F側が協調性と正の相関)
  T_F_agreeableness: 0.44,
  
  // J/P → 誠実性との相関 (J側が誠実性と正の相関)
  J_P_conscientiousness: -0.49,
  
  // 神経症傾向への影響（複合的）
  neuroticism_base: 50, // ベースライン
};

// MBTIタイプ別の特性プロファイル
const MBTI_TYPE_PROFILES: Record<MBTIType, {
  description: string;
  strengths: string[];
  challenges: string[];
  workStyle: string;
  communicationStyle: string;
  bigFiveEstimate: Partial<BigFiveTraits>;
}> = {
  INTJ: {
    description: '戦略的な思考家。独立心が強く、長期的なビジョンを持つ',
    strengths: ['戦略的思考', '独立性', '決断力', '知識欲'],
    challenges: ['感情表現', 'チームワーク', '柔軟性'],
    workStyle: '一人で深く考え、計画を立てて実行する',
    communicationStyle: '論理的で簡潔。感情よりも事実を重視',
    bigFiveEstimate: { extraversion: 35, openness: 70, agreeableness: 40, conscientiousness: 65, neuroticism: 45 },
  },
  INTP: {
    description: '論理的な思索家。知的好奇心が強く、理論を追求する',
    strengths: ['分析力', '創造性', '客観性', '問題解決'],
    challenges: ['実行力', '対人関係', '感情理解'],
    workStyle: '理論的な問題を深く分析し、独自の解決策を見出す',
    communicationStyle: '抽象的で理論的。詳細な説明を好む',
    bigFiveEstimate: { extraversion: 30, openness: 75, agreeableness: 45, conscientiousness: 45, neuroticism: 50 },
  },
  ENTJ: {
    description: '指揮官タイプ。リーダーシップを発揮し、目標達成に向けて組織を導く',
    strengths: ['リーダーシップ', '効率性', '決断力', '自信'],
    challenges: ['忍耐力', '感情配慮', '柔軟性'],
    workStyle: '明確な目標を設定し、チームを率いて達成する',
    communicationStyle: '直接的で明確。結果志向',
    bigFiveEstimate: { extraversion: 70, openness: 65, agreeableness: 40, conscientiousness: 70, neuroticism: 35 },
  },
  ENTP: {
    description: '討論者タイプ。知的な議論を好み、新しいアイデアを生み出す',
    strengths: ['創造性', '適応力', '知的好奇心', '議論力'],
    challenges: ['継続性', '細部への注意', 'ルール遵守'],
    workStyle: 'ブレインストーミングを好み、革新的なアプローチを追求',
    communicationStyle: '活発で挑戦的。議論を楽しむ',
    bigFiveEstimate: { extraversion: 65, openness: 80, agreeableness: 45, conscientiousness: 40, neuroticism: 40 },
  },
  INFJ: {
    description: '提唱者タイプ。理想主義的で、他者の成長を支援する',
    strengths: ['洞察力', '共感力', '創造性', '献身性'],
    challenges: ['自己主張', '現実対応', '批判への耐性'],
    workStyle: '意義のある仕事に情熱を注ぎ、深い人間関係を築く',
    communicationStyle: '思慮深く、相手の感情に配慮',
    bigFiveEstimate: { extraversion: 35, openness: 70, agreeableness: 65, conscientiousness: 60, neuroticism: 55 },
  },
  INFP: {
    description: '仲介者タイプ。理想主義的で、自分の価値観に忠実',
    strengths: ['創造性', '共感力', '誠実さ', '適応力'],
    challenges: ['現実対応', '決断力', '批判への耐性'],
    workStyle: '自分の価値観に合った仕事に深く没頭する',
    communicationStyle: '穏やかで思いやりがある。本音を大切にする',
    bigFiveEstimate: { extraversion: 30, openness: 75, agreeableness: 70, conscientiousness: 45, neuroticism: 60 },
  },
  ENFJ: {
    description: '主人公タイプ。カリスマ性があり、他者を鼓舞する',
    strengths: ['リーダーシップ', '共感力', 'コミュニケーション', '献身性'],
    challenges: ['自己犠牲', '批判への耐性', '境界設定'],
    workStyle: 'チームを率い、メンバーの成長を支援する',
    communicationStyle: '温かく説得力がある。相手を励ます',
    bigFiveEstimate: { extraversion: 70, openness: 65, agreeableness: 75, conscientiousness: 60, neuroticism: 50 },
  },
  ENFP: {
    description: '運動家タイプ。熱意があり、可能性を追求する',
    strengths: ['創造性', '熱意', '適応力', '対人スキル'],
    challenges: ['集中力', '継続性', '細部への注意'],
    workStyle: '新しいプロジェクトに情熱を注ぎ、人々を巻き込む',
    communicationStyle: '熱意があり、インスピレーションを与える',
    bigFiveEstimate: { extraversion: 75, openness: 80, agreeableness: 65, conscientiousness: 40, neuroticism: 50 },
  },
  ISTJ: {
    description: '管理者タイプ。責任感が強く、信頼性が高い',
    strengths: ['責任感', '正確性', '忍耐力', '組織力'],
    challenges: ['柔軟性', '変化への適応', '感情表現'],
    workStyle: '計画的に仕事を進め、期限を守る',
    communicationStyle: '事実に基づき、簡潔で明確',
    bigFiveEstimate: { extraversion: 35, openness: 35, agreeableness: 50, conscientiousness: 75, neuroticism: 45 },
  },
  ISFJ: {
    description: '擁護者タイプ。献身的で、他者のニーズに敏感',
    strengths: ['献身性', '信頼性', '観察力', '忍耐力'],
    challenges: ['自己主張', '変化への適応', '過度の自己犠牲'],
    workStyle: '安定した環境で、他者をサポートする仕事を好む',
    communicationStyle: '穏やかで思いやりがある。聞き上手',
    bigFiveEstimate: { extraversion: 35, openness: 40, agreeableness: 70, conscientiousness: 70, neuroticism: 55 },
  },
  ESTJ: {
    description: '幹部タイプ。組織的で、秩序を重んじる',
    strengths: ['組織力', '決断力', '責任感', '効率性'],
    challenges: ['柔軟性', '感情配慮', '新しいアイデアへの開放性'],
    workStyle: '明確なルールと手順に従い、チームを管理する',
    communicationStyle: '直接的で明確。結果を重視',
    bigFiveEstimate: { extraversion: 65, openness: 35, agreeableness: 45, conscientiousness: 75, neuroticism: 40 },
  },
  ESFJ: {
    description: '領事タイプ。社交的で、調和を大切にする',
    strengths: ['社交性', '協調性', '献身性', '組織力'],
    challenges: ['批判への耐性', '変化への適応', '自己主張'],
    workStyle: 'チームの調和を保ちながら、サポート役を果たす',
    communicationStyle: '温かく、相手を気遣う。社交的',
    bigFiveEstimate: { extraversion: 70, openness: 40, agreeableness: 75, conscientiousness: 65, neuroticism: 50 },
  },
  ISTP: {
    description: '巨匠タイプ。実践的で、問題解決に長ける',
    strengths: ['問題解決', '適応力', '冷静さ', '実践力'],
    challenges: ['長期計画', '感情表現', 'コミットメント'],
    workStyle: '手を動かして問題を解決する。柔軟に対応',
    communicationStyle: '簡潔で実用的。必要なことだけ伝える',
    bigFiveEstimate: { extraversion: 35, openness: 50, agreeableness: 40, conscientiousness: 45, neuroticism: 35 },
  },
  ISFP: {
    description: '冒険家タイプ。芸術的で、自由を愛する',
    strengths: ['創造性', '適応力', '共感力', '審美眼'],
    challenges: ['長期計画', '自己主張', '批判への耐性'],
    workStyle: '自分のペースで、創造的な仕事を好む',
    communicationStyle: '穏やかで控えめ。行動で示す',
    bigFiveEstimate: { extraversion: 35, openness: 65, agreeableness: 65, conscientiousness: 40, neuroticism: 50 },
  },
  ESTP: {
    description: '起業家タイプ。行動的で、リスクを恐れない',
    strengths: ['行動力', '適応力', '問題解決', '社交性'],
    challenges: ['長期計画', '忍耐力', '感情への配慮'],
    workStyle: '即座に行動し、結果を出す。変化を楽しむ',
    communicationStyle: '直接的で活発。実用的な話を好む',
    bigFiveEstimate: { extraversion: 75, openness: 55, agreeableness: 45, conscientiousness: 40, neuroticism: 35 },
  },
  ESFP: {
    description: 'エンターテイナータイプ。社交的で、楽しさを追求する',
    strengths: ['社交性', '適応力', '楽観性', '実践力'],
    challenges: ['長期計画', '集中力', '深い分析'],
    workStyle: '人と関わりながら、楽しく仕事をする',
    communicationStyle: '明るく社交的。場を盛り上げる',
    bigFiveEstimate: { extraversion: 80, openness: 55, agreeableness: 60, conscientiousness: 35, neuroticism: 40 },
  },
};

// 動物占い12キャラクターの定義
export const ANIMAL_CHARACTERS = [
  '狼', 'こじか', '猿', 'チータ', '黒ひょう', 'ライオン',
  '虎', 'たぬき', 'コアラ', 'ゾウ', 'ひつじ', 'ペガサス',
] as const;

export type AnimalCharacter = typeof ANIMAL_CHARACTERS[number];

// 動物占いカラーの定義
export const ANIMAL_COLORS = [
  'ゴールド', 'シルバー', 'グリーン', 'レッド', 'オレンジ',
  'ブルー', 'ブラウン', 'パープル', 'ブラック', 'イエロー',
] as const;

export type AnimalColor = typeof ANIMAL_COLORS[number];

// 動物占いキャラクター別の特性プロファイル
const ANIMAL_PROFILES: Record<AnimalCharacter, {
  description: string;
  strengths: string[];
  challenges: string[];
  workStyle: string;
  bigFiveEstimate: Partial<BigFiveTraits>;
}> = {
  '狼': {
    description: '独自の世界観を持ち、マイペースで行動する',
    strengths: ['独創性', '集中力', '専門性', '自立心'],
    challenges: ['協調性', '柔軟性', 'コミュニケーション'],
    workStyle: '自分のペースで専門的な仕事に取り組む',
    bigFiveEstimate: { extraversion: 35, openness: 65, agreeableness: 40, conscientiousness: 55, neuroticism: 45 },
  },
  'こじか': {
    description: '純粋で素直、人の気持ちに敏感',
    strengths: ['純粋さ', '共感力', '適応力', '学習意欲'],
    challenges: ['自己主張', '決断力', 'ストレス耐性'],
    workStyle: '信頼できる人のもとで、サポート役として活躍',
    bigFiveEstimate: { extraversion: 45, openness: 55, agreeableness: 70, conscientiousness: 50, neuroticism: 60 },
  },
  '猿': {
    description: '好奇心旺盛で、器用に何でもこなす',
    strengths: ['器用さ', '社交性', '適応力', '好奇心'],
    challenges: ['継続性', '深さ', '忍耐力'],
    workStyle: '多様なタスクを器用にこなし、人間関係を築く',
    bigFiveEstimate: { extraversion: 70, openness: 70, agreeableness: 55, conscientiousness: 45, neuroticism: 45 },
  },
  'チータ': {
    description: 'スピード感があり、直感で行動する',
    strengths: ['行動力', '直感力', '決断力', 'スピード'],
    challenges: ['忍耐力', '計画性', '継続性'],
    workStyle: '素早く判断し、即座に行動に移す',
    bigFiveEstimate: { extraversion: 65, openness: 60, agreeableness: 45, conscientiousness: 40, neuroticism: 40 },
  },
  '黒ひょう': {
    description: '感性豊かで、美意識が高い',
    strengths: ['感性', '美意識', '情熱', '直感力'],
    challenges: ['現実対応', '忍耐力', '妥協'],
    workStyle: '美しさや感性を活かした仕事で力を発揮',
    bigFiveEstimate: { extraversion: 50, openness: 75, agreeableness: 50, conscientiousness: 50, neuroticism: 55 },
  },
  'ライオン': {
    description: 'リーダーシップがあり、堂々としている',
    strengths: ['リーダーシップ', '自信', '決断力', '責任感'],
    challenges: ['柔軟性', '謙虚さ', '細部への配慮'],
    workStyle: 'チームを率い、大きな目標に向かって進む',
    bigFiveEstimate: { extraversion: 70, openness: 55, agreeableness: 45, conscientiousness: 65, neuroticism: 35 },
  },
  '虎': {
    description: '義理人情に厚く、面倒見が良い',
    strengths: ['責任感', '面倒見', '忍耐力', '信頼性'],
    challenges: ['柔軟性', '自己表現', '変化への適応'],
    workStyle: '後輩や部下の面倒を見ながら、着実に仕事を進める',
    bigFiveEstimate: { extraversion: 55, openness: 45, agreeableness: 60, conscientiousness: 70, neuroticism: 45 },
  },
  'たぬき': {
    description: '愛嬌があり、人間関係を大切にする',
    strengths: ['社交性', '愛嬌', '調整力', '忍耐力'],
    challenges: ['自己主張', '決断力', '効率性'],
    workStyle: '人間関係を活かして、調整役として活躍',
    bigFiveEstimate: { extraversion: 65, openness: 50, agreeableness: 70, conscientiousness: 55, neuroticism: 50 },
  },
  'コアラ': {
    description: 'マイペースで、安定を好む',
    strengths: ['安定性', '忍耐力', '観察力', '堅実さ'],
    challenges: ['スピード', '変化への適応', '積極性'],
    workStyle: '自分のペースで、着実に仕事を進める',
    bigFiveEstimate: { extraversion: 40, openness: 45, agreeableness: 55, conscientiousness: 60, neuroticism: 50 },
  },
  'ゾウ': {
    description: '努力家で、コツコツと積み上げる',
    strengths: ['忍耐力', '努力', '誠実さ', '計画性'],
    challenges: ['柔軟性', 'スピード', '自己主張'],
    workStyle: '長期的な視点で、着実に目標を達成する',
    bigFiveEstimate: { extraversion: 45, openness: 40, agreeableness: 55, conscientiousness: 75, neuroticism: 50 },
  },
  'ひつじ': {
    description: '協調性があり、チームワークを大切にする',
    strengths: ['協調性', '共感力', '献身性', '調和'],
    challenges: ['自己主張', '決断力', '独立性'],
    workStyle: 'チームの一員として、サポート役を果たす',
    bigFiveEstimate: { extraversion: 50, openness: 50, agreeableness: 75, conscientiousness: 55, neuroticism: 55 },
  },
  'ペガサス': {
    description: '自由奔放で、束縛を嫌う',
    strengths: ['創造性', '自由さ', '直感力', '独創性'],
    challenges: ['継続性', '協調性', 'ルール遵守'],
    workStyle: '自由な環境で、創造的な仕事に取り組む',
    bigFiveEstimate: { extraversion: 55, openness: 80, agreeableness: 45, conscientiousness: 35, neuroticism: 50 },
  },
};

class MBTIMappingService {
  /**
   * MBTIタイプからBigFive特性を推定
   */
  estimateBigFiveFromMBTI(
    type: MBTIType,
    indicators?: Partial<MBTIIndicators>
  ): BigFiveTraits {
    const profile = MBTI_TYPE_PROFILES[type];
    const baseEstimate = profile.bigFiveEstimate;

    // 指標がある場合は、より精密な推定を行う
    if (indicators) {
      const adjustedEstimate: BigFiveTraits = {
        extraversion: this.adjustTrait(
          baseEstimate.extraversion || 50,
          indicators.E_I,
          MBTI_BIGFIVE_CORRELATIONS.E_I_extraversion
        ),
        openness: this.adjustTrait(
          baseEstimate.openness || 50,
          indicators.S_N,
          MBTI_BIGFIVE_CORRELATIONS.S_N_openness
        ),
        agreeableness: this.adjustTrait(
          baseEstimate.agreeableness || 50,
          indicators.T_F,
          MBTI_BIGFIVE_CORRELATIONS.T_F_agreeableness
        ),
        conscientiousness: this.adjustTrait(
          baseEstimate.conscientiousness || 50,
          100 - (indicators.J_P || 50), // J側が高いほど誠実性が高い
          Math.abs(MBTI_BIGFIVE_CORRELATIONS.J_P_conscientiousness)
        ),
        neuroticism: this.estimateNeuroticism(type, indicators),
      };
      return adjustedEstimate;
    }

    return {
      extraversion: baseEstimate.extraversion || 50,
      openness: baseEstimate.openness || 50,
      agreeableness: baseEstimate.agreeableness || 50,
      conscientiousness: baseEstimate.conscientiousness || 50,
      neuroticism: baseEstimate.neuroticism || 50,
    };
  }

  /**
   * 動物占いからBigFive特性を推定
   */
  estimateBigFiveFromAnimal(
    animal: AnimalCharacter,
    color?: AnimalColor
  ): BigFiveTraits {
    const profile = ANIMAL_PROFILES[animal];
    const baseEstimate = profile.bigFiveEstimate;

    // カラーによる微調整（オプション）
    let colorAdjustment = { extraversion: 0, openness: 0, agreeableness: 0, conscientiousness: 0, neuroticism: 0 };
    if (color) {
      colorAdjustment = this.getColorAdjustment(color);
    }

    return {
      extraversion: Math.min(80, Math.max(20, (baseEstimate.extraversion || 50) + colorAdjustment.extraversion)),
      openness: Math.min(80, Math.max(20, (baseEstimate.openness || 50) + colorAdjustment.openness)),
      agreeableness: Math.min(80, Math.max(20, (baseEstimate.agreeableness || 50) + colorAdjustment.agreeableness)),
      conscientiousness: Math.min(80, Math.max(20, (baseEstimate.conscientiousness || 50) + colorAdjustment.conscientiousness)),
      neuroticism: Math.min(80, Math.max(20, (baseEstimate.neuroticism || 50) + colorAdjustment.neuroticism)),
    };
  }

  /**
   * MBTIタイプのプロファイルを取得
   */
  getMBTIProfile(type: MBTIType) {
    return MBTI_TYPE_PROFILES[type];
  }

  /**
   * 動物占いキャラクターのプロファイルを取得
   */
  getAnimalProfile(animal: AnimalCharacter) {
    return ANIMAL_PROFILES[animal];
  }

  /**
   * MBTIと診断結果の整合性をチェック
   */
  checkMBTIConsistency(
    mbtiType: MBTIType,
    diagnosisBigFive: BigFiveTraits
  ): {
    isConsistent: boolean;
    consistencyScore: number;
    discrepancies: string[];
  } {
    const estimatedBigFive = this.estimateBigFiveFromMBTI(mbtiType);
    const discrepancies: string[] = [];
    let totalDiff = 0;

    const traits: (keyof BigFiveTraits)[] = [
      'extraversion', 'openness', 'agreeableness', 'conscientiousness', 'neuroticism'
    ];

    const traitNames: Record<keyof BigFiveTraits, string> = {
      extraversion: '外向性',
      openness: '開放性',
      agreeableness: '協調性',
      conscientiousness: '誠実性',
      neuroticism: '神経症傾向',
    };

    for (const trait of traits) {
      const diff = Math.abs(estimatedBigFive[trait] - diagnosisBigFive[trait]);
      totalDiff += diff;

      if (diff > 20) {
        discrepancies.push(
          `${traitNames[trait]}: MBTI推定値 ${estimatedBigFive[trait]} vs 診断結果 ${diagnosisBigFive[trait]} (差: ${diff})`
        );
      }
    }

    const consistencyScore = Math.max(0, 100 - (totalDiff / 5));
    const isConsistent = consistencyScore >= 60;

    return { isConsistent, consistencyScore, discrepancies };
  }

  /**
   * 動物占いと診断結果の整合性をチェック
   */
  checkAnimalConsistency(
    animal: AnimalCharacter,
    diagnosisBigFive: BigFiveTraits
  ): {
    isConsistent: boolean;
    consistencyScore: number;
    discrepancies: string[];
  } {
    const estimatedBigFive = this.estimateBigFiveFromAnimal(animal);
    const discrepancies: string[] = [];
    let totalDiff = 0;

    const traits: (keyof BigFiveTraits)[] = [
      'extraversion', 'openness', 'agreeableness', 'conscientiousness', 'neuroticism'
    ];

    const traitNames: Record<keyof BigFiveTraits, string> = {
      extraversion: '外向性',
      openness: '開放性',
      agreeableness: '協調性',
      conscientiousness: '誠実性',
      neuroticism: '神経症傾向',
    };

    for (const trait of traits) {
      const diff = Math.abs(estimatedBigFive[trait] - diagnosisBigFive[trait]);
      totalDiff += diff;

      if (diff > 25) { // 動物占いは相関が弱いため、閾値を高めに設定
        discrepancies.push(
          `${traitNames[trait]}: 動物占い推定値 ${estimatedBigFive[trait]} vs 診断結果 ${diagnosisBigFive[trait]} (差: ${diff})`
        );
      }
    }

    const consistencyScore = Math.max(0, 100 - (totalDiff / 5));
    const isConsistent = consistencyScore >= 50; // 動物占いは閾値を低めに設定

    return { isConsistent, consistencyScore, discrepancies };
  }

  /**
   * ブラッシュアップ用の調整係数を計算
   */
  calculateBrushUpAdjustments(
    originalBigFive: BigFiveTraits,
    mbtiEstimate?: BigFiveTraits,
    animalEstimate?: BigFiveTraits
  ): {
    adjustments: Partial<BigFiveTraits>;
    confidence: number;
    reasoning: string;
  } {
    const adjustments: Partial<BigFiveTraits> = {};
    let totalWeight = 1; // 元の診断結果の重み
    let reasoning = '元の診断結果をベースに';

    // MBTIがある場合、重み0.3で加味
    if (mbtiEstimate) {
      totalWeight += 0.3;
      reasoning += '、MBTIの特性を考慮し';
    }

    // 動物占いがある場合、重み0.15で加味
    if (animalEstimate) {
      totalWeight += 0.15;
      reasoning += '、動物占いの特性を参考に';
    }

    const traits: (keyof BigFiveTraits)[] = [
      'extraversion', 'openness', 'agreeableness', 'conscientiousness', 'neuroticism'
    ];

    for (const trait of traits) {
      let weightedSum = originalBigFive[trait];
      
      if (mbtiEstimate) {
        weightedSum += mbtiEstimate[trait] * 0.3;
      }
      
      if (animalEstimate) {
        weightedSum += animalEstimate[trait] * 0.15;
      }

      const adjustedValue = Math.round(weightedSum / totalWeight);
      const diff = adjustedValue - originalBigFive[trait];

      if (Math.abs(diff) >= 2) {
        adjustments[trait] = adjustedValue;
      }
    }

    // 信頼度の計算
    let confidence = 70; // ベース信頼度
    if (mbtiEstimate) confidence += 15;
    if (animalEstimate) confidence += 10;

    reasoning += '、総合的な性格特性を推定しました。';

    return { adjustments, confidence, reasoning };
  }

  // Private methods

  private adjustTrait(
    baseValue: number,
    indicatorValue: number | undefined,
    correlation: number
  ): number {
    if (indicatorValue === undefined) return baseValue;

    // 指標値を-25〜+25の調整値に変換
    const adjustment = ((indicatorValue - 50) / 50) * 25 * correlation;
    return Math.min(80, Math.max(20, Math.round(baseValue + adjustment)));
  }

  private estimateNeuroticism(type: MBTIType, indicators: Partial<MBTIIndicators>): number {
    const profile = MBTI_TYPE_PROFILES[type];
    let base = profile.bigFiveEstimate.neuroticism || 50;

    // F型は神経症傾向がやや高い傾向
    if (indicators.T_F !== undefined && indicators.T_F > 50) {
      base += (indicators.T_F - 50) / 10;
    }

    // I型は神経症傾向がやや高い傾向
    if (indicators.E_I !== undefined && indicators.E_I < 50) {
      base += (50 - indicators.E_I) / 15;
    }

    return Math.min(80, Math.max(20, Math.round(base)));
  }

  private getColorAdjustment(color: AnimalColor): Partial<BigFiveTraits> {
    // カラーによる微調整（研究に基づく推定）
    const colorAdjustments: Record<AnimalColor, Partial<BigFiveTraits>> = {
      'ゴールド': { conscientiousness: 3, extraversion: 2 },
      'シルバー': { openness: 3, neuroticism: -2 },
      'グリーン': { agreeableness: 3, conscientiousness: 2 },
      'レッド': { extraversion: 4, neuroticism: 2 },
      'オレンジ': { extraversion: 3, openness: 2 },
      'ブルー': { conscientiousness: 3, neuroticism: -2 },
      'ブラウン': { conscientiousness: 4, agreeableness: 2 },
      'パープル': { openness: 4, neuroticism: 2 },
      'ブラック': { conscientiousness: 2, neuroticism: 3 },
      'イエロー': { extraversion: 3, agreeableness: 2 },
    };

    return colorAdjustments[color] || {};
  }
}

export const mbtiMappingService = new MBTIMappingService();
