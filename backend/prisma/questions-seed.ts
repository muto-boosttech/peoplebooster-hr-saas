import { QuestionCategory } from '@prisma/client';

/**
 * 90問の設問シードデータ
 * 
 * カテゴリ分布:
 * - EXTRAVERSION（外向性）: 15問
 * - OPENNESS（開放性）: 15問
 * - AGREEABLENESS（協調性）: 15問
 * - CONSCIENTIOUSNESS（誠実性）: 15問
 * - NEUROTICISM（神経症傾向）: 15問
 * - THINKING（思考パターン）: 15問
 * 
 * 各ページ30問、全3ページ
 */

export interface QuestionSeedData {
  page: number;
  orderNumber: number;
  questionText: string;
  category: QuestionCategory;
  isReverse: boolean;
}

export const questionsSeedData: QuestionSeedData[] = [
  // ========================================
  // ページ1: 30問
  // ========================================
  
  // 外向性 (EXTRAVERSION) - 5問
  { page: 1, orderNumber: 1, questionText: '初対面の人とも気軽に会話を始めることができる', category: 'EXTRAVERSION', isReverse: false },
  { page: 1, orderNumber: 2, questionText: '大勢の人がいるパーティーや集まりに参加するのが好きだ', category: 'EXTRAVERSION', isReverse: false },
  { page: 1, orderNumber: 3, questionText: '一人で過ごす時間よりも、人と一緒にいる時間の方が好きだ', category: 'EXTRAVERSION', isReverse: false },
  { page: 1, orderNumber: 4, questionText: '静かな環境で一人で作業する方が落ち着く', category: 'EXTRAVERSION', isReverse: true },
  { page: 1, orderNumber: 5, questionText: 'グループの中で自然とリーダーシップを取ることが多い', category: 'EXTRAVERSION', isReverse: false },
  
  // 開放性 (OPENNESS) - 5問
  { page: 1, orderNumber: 6, questionText: '新しいアイデアや考え方に触れることにワクワクする', category: 'OPENNESS', isReverse: false },
  { page: 1, orderNumber: 7, questionText: '芸術作品や音楽に深く感動することがある', category: 'OPENNESS', isReverse: false },
  { page: 1, orderNumber: 8, questionText: '慣れ親しんだ方法を変えることに抵抗を感じる', category: 'OPENNESS', isReverse: true },
  { page: 1, orderNumber: 9, questionText: '様々な文化や価値観に興味がある', category: 'OPENNESS', isReverse: false },
  { page: 1, orderNumber: 10, questionText: '想像力を使って新しいものを考えるのが好きだ', category: 'OPENNESS', isReverse: false },
  
  // 協調性 (AGREEABLENESS) - 5問
  { page: 1, orderNumber: 11, questionText: '他人の気持ちを理解し、共感することができる', category: 'AGREEABLENESS', isReverse: false },
  { page: 1, orderNumber: 12, questionText: '困っている人を見ると、助けたいと思う', category: 'AGREEABLENESS', isReverse: false },
  { page: 1, orderNumber: 13, questionText: '自分の意見を通すために議論することを厭わない', category: 'AGREEABLENESS', isReverse: true },
  { page: 1, orderNumber: 14, questionText: 'チームの和を大切にし、対立を避けようとする', category: 'AGREEABLENESS', isReverse: false },
  { page: 1, orderNumber: 15, questionText: '他人の成功を心から喜ぶことができる', category: 'AGREEABLENESS', isReverse: false },
  
  // 誠実性 (CONSCIENTIOUSNESS) - 5問
  { page: 1, orderNumber: 16, questionText: '計画を立ててから行動することが多い', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 1, orderNumber: 17, questionText: '締め切りは必ず守るようにしている', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 1, orderNumber: 18, questionText: '細かいことにはあまりこだわらない方だ', category: 'CONSCIENTIOUSNESS', isReverse: true },
  { page: 1, orderNumber: 19, questionText: '一度始めたことは最後までやり遂げる', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 1, orderNumber: 20, questionText: '整理整頓された環境で仕事をするのが好きだ', category: 'CONSCIENTIOUSNESS', isReverse: false },
  
  // 神経症傾向 (NEUROTICISM) - 5問
  { page: 1, orderNumber: 21, questionText: '小さなことでも心配になることがある', category: 'NEUROTICISM', isReverse: false },
  { page: 1, orderNumber: 22, questionText: 'ストレスを感じると、なかなか落ち着けない', category: 'NEUROTICISM', isReverse: false },
  { page: 1, orderNumber: 23, questionText: '困難な状況でも冷静さを保つことができる', category: 'NEUROTICISM', isReverse: true },
  { page: 1, orderNumber: 24, questionText: '失敗したことをいつまでも引きずってしまう', category: 'NEUROTICISM', isReverse: false },
  { page: 1, orderNumber: 25, questionText: '気分の浮き沈みが激しい方だと思う', category: 'NEUROTICISM', isReverse: false },
  
  // 思考パターン (THINKING) - 5問
  { page: 1, orderNumber: 26, questionText: '良きアドバイスこそ行動の羅針盤だと思う', category: 'THINKING', isReverse: false },
  { page: 1, orderNumber: 27, questionText: '問題を解決する際、論理的に考えることを重視する', category: 'THINKING', isReverse: false },
  { page: 1, orderNumber: 28, questionText: 'データや事実に基づいて判断することが多い', category: 'THINKING', isReverse: false },
  { page: 1, orderNumber: 29, questionText: '直感よりも分析を信頼する', category: 'THINKING', isReverse: false },
  { page: 1, orderNumber: 30, questionText: '長期的な視点で物事を考えることが得意だ', category: 'THINKING', isReverse: false },
  
  // ========================================
  // ページ2: 30問
  // ========================================
  
  // 外向性 (EXTRAVERSION) - 5問
  { page: 2, orderNumber: 1, questionText: '人前で話すことに抵抗がない', category: 'EXTRAVERSION', isReverse: false },
  { page: 2, orderNumber: 2, questionText: '新しい人間関係を築くことを楽しんでいる', category: 'EXTRAVERSION', isReverse: false },
  { page: 2, orderNumber: 3, questionText: '休日は家でゆっくり過ごすことが多い', category: 'EXTRAVERSION', isReverse: true },
  { page: 2, orderNumber: 4, questionText: '自分から積極的に話しかけることが多い', category: 'EXTRAVERSION', isReverse: false },
  { page: 2, orderNumber: 5, questionText: '注目を浴びることに心地よさを感じる', category: 'EXTRAVERSION', isReverse: false },
  
  // 開放性 (OPENNESS) - 5問
  { page: 2, orderNumber: 6, questionText: '抽象的な概念について考えることが好きだ', category: 'OPENNESS', isReverse: false },
  { page: 2, orderNumber: 7, questionText: '新しい場所を訪れることにワクワクする', category: 'OPENNESS', isReverse: false },
  { page: 2, orderNumber: 8, questionText: '実用的なことよりも理論的なことに興味がある', category: 'OPENNESS', isReverse: false },
  { page: 2, orderNumber: 9, questionText: '伝統や慣習を大切にする方だ', category: 'OPENNESS', isReverse: true },
  { page: 2, orderNumber: 10, questionText: '常識にとらわれない発想をすることがある', category: 'OPENNESS', isReverse: false },
  
  // 協調性 (AGREEABLENESS) - 5問
  { page: 2, orderNumber: 11, questionText: '人の話を最後まで聞くことを心がけている', category: 'AGREEABLENESS', isReverse: false },
  { page: 2, orderNumber: 12, questionText: '相手の立場に立って考えることができる', category: 'AGREEABLENESS', isReverse: false },
  { page: 2, orderNumber: 13, questionText: '競争よりも協力を重視する', category: 'AGREEABLENESS', isReverse: false },
  { page: 2, orderNumber: 14, questionText: '自分の利益を優先することがある', category: 'AGREEABLENESS', isReverse: true },
  { page: 2, orderNumber: 15, questionText: '人を信頼することが多い', category: 'AGREEABLENESS', isReverse: false },
  
  // 誠実性 (CONSCIENTIOUSNESS) - 5問
  { page: 2, orderNumber: 16, questionText: '目標を設定し、それに向かって努力する', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 2, orderNumber: 17, questionText: '約束は必ず守るようにしている', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 2, orderNumber: 18, questionText: '衝動的に行動することがある', category: 'CONSCIENTIOUSNESS', isReverse: true },
  { page: 2, orderNumber: 19, questionText: '仕事や勉強に対して真剣に取り組む', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 2, orderNumber: 20, questionText: '効率的に物事を進めることを重視する', category: 'CONSCIENTIOUSNESS', isReverse: false },
  
  // 神経症傾向 (NEUROTICISM) - 5問
  { page: 2, orderNumber: 21, questionText: '将来のことを考えると不安になることがある', category: 'NEUROTICISM', isReverse: false },
  { page: 2, orderNumber: 22, questionText: '批判されると落ち込みやすい', category: 'NEUROTICISM', isReverse: false },
  { page: 2, orderNumber: 23, questionText: '大抵のことは楽観的に考えられる', category: 'NEUROTICISM', isReverse: true },
  { page: 2, orderNumber: 24, questionText: '緊張しやすい方だと思う', category: 'NEUROTICISM', isReverse: false },
  { page: 2, orderNumber: 25, questionText: '些細なことでイライラすることがある', category: 'NEUROTICISM', isReverse: false },
  
  // 思考パターン (THINKING) - 5問
  { page: 2, orderNumber: 26, questionText: '複雑な問題を分解して考えることが得意だ', category: 'THINKING', isReverse: false },
  { page: 2, orderNumber: 27, questionText: '戦略的に物事を考えることが多い', category: 'THINKING', isReverse: false },
  { page: 2, orderNumber: 28, questionText: '感情よりも理性で判断することを好む', category: 'THINKING', isReverse: false },
  { page: 2, orderNumber: 29, questionText: '物事の本質を見抜くことが得意だと思う', category: 'THINKING', isReverse: false },
  { page: 2, orderNumber: 30, questionText: '多角的な視点から物事を検討する', category: 'THINKING', isReverse: false },
  
  // ========================================
  // ページ3: 30問
  // ========================================
  
  // 外向性 (EXTRAVERSION) - 5問
  { page: 3, orderNumber: 1, questionText: '社交的な場面でエネルギーを得ることができる', category: 'EXTRAVERSION', isReverse: false },
  { page: 3, orderNumber: 2, questionText: '一人で過ごす時間が長いと寂しさを感じる', category: 'EXTRAVERSION', isReverse: false },
  { page: 3, orderNumber: 3, questionText: '深い関係よりも広い人間関係を好む', category: 'EXTRAVERSION', isReverse: false },
  { page: 3, orderNumber: 4, questionText: '自分の考えを積極的に発言する方だ', category: 'EXTRAVERSION', isReverse: false },
  { page: 3, orderNumber: 5, questionText: '静かな環境の方が集中できる', category: 'EXTRAVERSION', isReverse: true },
  
  // 開放性 (OPENNESS) - 5問
  { page: 3, orderNumber: 6, questionText: '未知の体験に挑戦することを楽しむ', category: 'OPENNESS', isReverse: false },
  { page: 3, orderNumber: 7, questionText: '哲学的な議論に興味がある', category: 'OPENNESS', isReverse: false },
  { page: 3, orderNumber: 8, questionText: '現実的で実践的なアプローチを好む', category: 'OPENNESS', isReverse: true },
  { page: 3, orderNumber: 9, questionText: '創造的な活動に時間を費やすことが多い', category: 'OPENNESS', isReverse: false },
  { page: 3, orderNumber: 10, questionText: '既存の枠組みにとらわれずに考えることができる', category: 'OPENNESS', isReverse: false },
  
  // 協調性 (AGREEABLENESS) - 5問
  { page: 3, orderNumber: 11, questionText: '他人の意見を尊重することを心がけている', category: 'AGREEABLENESS', isReverse: false },
  { page: 3, orderNumber: 12, questionText: '争いごとを避けるために譲歩することがある', category: 'AGREEABLENESS', isReverse: false },
  { page: 3, orderNumber: 13, questionText: '自分の意見をはっきり主張する方だ', category: 'AGREEABLENESS', isReverse: true },
  { page: 3, orderNumber: 14, questionText: '人の良いところを見つけるのが得意だ', category: 'AGREEABLENESS', isReverse: false },
  { page: 3, orderNumber: 15, questionText: 'ボランティア活動に興味がある', category: 'AGREEABLENESS', isReverse: false },
  
  // 誠実性 (CONSCIENTIOUSNESS) - 5問
  { page: 3, orderNumber: 16, questionText: '物事を先延ばしにしないようにしている', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 3, orderNumber: 17, questionText: '責任感が強い方だと思う', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 3, orderNumber: 18, questionText: '気分によって行動が変わることがある', category: 'CONSCIENTIOUSNESS', isReverse: true },
  { page: 3, orderNumber: 19, questionText: '自己管理ができている方だと思う', category: 'CONSCIENTIOUSNESS', isReverse: false },
  { page: 3, orderNumber: 20, questionText: '規則やルールを守ることを重視する', category: 'CONSCIENTIOUSNESS', isReverse: false },
  
  // 神経症傾向 (NEUROTICISM) - 5問
  { page: 3, orderNumber: 21, questionText: '自分に自信が持てないことがある', category: 'NEUROTICISM', isReverse: false },
  { page: 3, orderNumber: 22, questionText: '他人の評価を気にしすぎることがある', category: 'NEUROTICISM', isReverse: false },
  { page: 3, orderNumber: 23, questionText: 'プレッシャーの中でも力を発揮できる', category: 'NEUROTICISM', isReverse: true },
  { page: 3, orderNumber: 24, questionText: '過去の失敗を思い出して落ち込むことがある', category: 'NEUROTICISM', isReverse: false },
  { page: 3, orderNumber: 25, questionText: '感情のコントロールが難しいと感じることがある', category: 'NEUROTICISM', isReverse: false },
  
  // 思考パターン (THINKING) - 5問
  { page: 3, orderNumber: 26, questionText: '情報を収集してから判断することを好む', category: 'THINKING', isReverse: false },
  { page: 3, orderNumber: 27, questionText: '因果関係を明確にすることを重視する', category: 'THINKING', isReverse: false },
  { page: 3, orderNumber: 28, questionText: '感覚や直感を大切にする方だ', category: 'THINKING', isReverse: true },
  { page: 3, orderNumber: 29, questionText: '客観的な視点で物事を見ることができる', category: 'THINKING', isReverse: false },
  { page: 3, orderNumber: 30, questionText: '論理的な説明を求める傾向がある', category: 'THINKING', isReverse: false },
];

export default questionsSeedData;
