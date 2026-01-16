import {
  PrismaClient,
  UserRole,
  Gender,
  QuestionCategory,
  ReliabilityStatus,
  StressToleranceLevel,
  PotentialGrade,
  ExternalDiagnosisType,
  BrushUpTriggerType,
  CandidateStatus,
  InterviewType,
  InterviewStatus,
  InvoiceStatus,
  PaymentMethodType,
  AuditAction,
  NotificationType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ========================================
  // Create Plans
  // ========================================
  const starterPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'スターター',
      description: '小規模チーム向けの基本プラン',
      monthlyPrice: 29800,
      maxUsers: 10,
      maxDiagnoses: 50,
      features: ['性格診断', '基本レポート', 'メールサポート'],
    },
  });

  const basicPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'ベーシック',
      description: '中小企業向けの標準プラン',
      monthlyPrice: 59800,
      maxUsers: 50,
      maxDiagnoses: 200,
      features: ['性格診断', '詳細レポート', 'ATS機能', 'チャットサポート'],
    },
  });

  const professionalPlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'プロフェッショナル',
      description: '中規模企業向けの高機能プラン',
      monthlyPrice: 98000,
      maxUsers: 200,
      maxDiagnoses: 500,
      features: ['性格診断', '詳細レポート', 'ATS機能', 'AI分析', '優先サポート', 'API連携'],
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'エンタープライズ',
      description: '大企業向けのカスタマイズ可能なプラン',
      monthlyPrice: 298000,
      maxUsers: 1000,
      maxDiagnoses: 2000,
      features: ['性格診断', '詳細レポート', 'ATS機能', 'AI分析', '専任サポート', 'API連携', 'SSO', 'カスタムレポート'],
    },
  });

  console.log('✅ Plans created');

  // ========================================
  // Create System Admin
  // ========================================
  const systemAdminPassword = await bcrypt.hash('Admin123!@#', 12);
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@peoplebooster.com' },
    update: {},
    create: {
      email: 'admin@peoplebooster.com',
      passwordHash: systemAdminPassword,
      nickname: 'システム管理者',
      fullName: '管理者 太郎',
      role: UserRole.SYSTEM_ADMIN,
      isActive: true,
    },
  });

  console.log('✅ System admin created');

  // ========================================
  // Create Demo Company
  // ========================================
  const demoCompany = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: '株式会社デモ',
      planId: professionalPlan.id,
      diagnosisUrl: 'demo-company',
      contractStartDate: new Date('2024-01-01'),
      contractEndDate: new Date('2025-12-31'),
      isActive: true,
    },
  });

  console.log('✅ Demo company created');

  // ========================================
  // Create Departments
  // ========================================
  const hrDepartment = await prisma.department.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      name: '人事部',
      companyId: demoCompany.id,
    },
  });

  const engineeringDepartment = await prisma.department.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      name: 'エンジニアリング部',
      companyId: demoCompany.id,
    },
  });

  const salesDepartment = await prisma.department.upsert({
    where: { id: '00000000-0000-0000-0000-000000000022' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000022',
      name: '営業部',
      companyId: demoCompany.id,
    },
  });

  const frontendTeam = await prisma.department.upsert({
    where: { id: '00000000-0000-0000-0000-000000000023' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000023',
      name: 'フロントエンドチーム',
      companyId: demoCompany.id,
      parentDepartmentId: engineeringDepartment.id,
    },
  });

  console.log('✅ Departments created');

  // ========================================
  // Create Company Admin
  // ========================================
  const companyAdminPassword = await bcrypt.hash('Company123!@#', 12);
  const companyAdmin = await prisma.user.upsert({
    where: { email: 'company-admin@demo.com' },
    update: {},
    create: {
      email: 'company-admin@demo.com',
      passwordHash: companyAdminPassword,
      nickname: '企業管理者',
      fullName: '山田 花子',
      role: UserRole.COMPANY_ADMIN,
      companyId: demoCompany.id,
      departmentId: hrDepartment.id,
      age: 35,
      gender: Gender.FEMALE,
      isActive: true,
    },
  });

  console.log('✅ Company admin created');

  // ========================================
  // Create Company Users
  // ========================================
  const companyUserPassword = await bcrypt.hash('User123!@#', 12);

  const companyUser1 = await prisma.user.upsert({
    where: { email: 'company-user@demo.com' },
    update: {},
    create: {
      email: 'company-user@demo.com',
      passwordHash: companyUserPassword,
      nickname: '企業ユーザー',
      fullName: '鈴木 一郎',
      role: UserRole.COMPANY_USER,
      companyId: demoCompany.id,
      departmentId: engineeringDepartment.id,
      age: 28,
      gender: Gender.MALE,
      isActive: true,
    },
  });

  const companyUser2 = await prisma.user.upsert({
    where: { email: 'hr-user@demo.com' },
    update: {},
    create: {
      email: 'hr-user@demo.com',
      passwordHash: companyUserPassword,
      nickname: '人事担当',
      fullName: '田中 美咲',
      role: UserRole.COMPANY_USER,
      companyId: demoCompany.id,
      departmentId: hrDepartment.id,
      age: 32,
      gender: Gender.FEMALE,
      isActive: true,
    },
  });

  console.log('✅ Company users created');

  // ========================================
  // Create General User (Candidate User)
  // ========================================
  const generalUserPassword = await bcrypt.hash('General123!@#', 12);
  const generalUser = await prisma.user.upsert({
    where: { email: 'general-user@example.com' },
    update: {},
    create: {
      email: 'general-user@example.com',
      passwordHash: generalUserPassword,
      nickname: '一般ユーザー',
      fullName: '佐藤 次郎',
      role: UserRole.GENERAL_USER,
      age: 25,
      gender: Gender.MALE,
      isActive: true,
    },
  });

  console.log('✅ General user created');

  // ========================================
  // Create Sub-User
  // ========================================
  const subUserPassword = await bcrypt.hash('SubUser123!@#', 12);
  const subUser = await prisma.user.upsert({
    where: { email: 'sub-user@demo.com' },
    update: {},
    create: {
      email: 'sub-user@demo.com',
      passwordHash: subUserPassword,
      nickname: 'サブユーザー',
      fullName: '高橋 三郎',
      role: UserRole.COMPANY_USER,
      companyId: demoCompany.id,
      departmentId: hrDepartment.id,
      parentUserId: companyAdmin.id,
      subUserPermission: 'VIEW_ONLY',
      isActive: true,
    },
  });

  console.log('✅ Sub-user created');

  // ========================================
  // Create Sample Questions (90 questions, 3 pages)
  // ========================================
  const questionData = [
    // Page 1 (30 questions)
    { page: 1, orderNumber: 1, questionText: '良きアドバイスこそ行動の羅針盤だと思う', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 1, orderNumber: 2, questionText: '嫌いなことも難なく行い、やり遂げる方だと思う', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 1, orderNumber: 3, questionText: '知りたいことや興味のあることを努めて追究する方だ', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 1, orderNumber: 4, questionText: '周囲からは「落ち着いている」「慌てない」と言われる', category: QuestionCategory.NEUROTICISM, isReverse: true },
    { page: 1, orderNumber: 5, questionText: 'いわゆる「仲良しグループ」の一員になることは嫌だと思う', category: QuestionCategory.AGREEABLENESS, isReverse: true },
    { page: 1, orderNumber: 6, questionText: '一人の時間が長くなると物足りなくなってくる', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 1, orderNumber: 7, questionText: '会話においてテンポの速いやり取りは好きな方だ', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 1, orderNumber: 8, questionText: '物事は熟考するよりも直感で即断する方だ', category: QuestionCategory.THINKING, isReverse: false },
    { page: 1, orderNumber: 9, questionText: 'お金の使い方は計画的だと思う', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 1, orderNumber: 10, questionText: '他人の意見を尊重し、自分の考えを押し通すことは少ない', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 1, orderNumber: 11, questionText: '初対面の人とも気軽に話ができる', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 1, orderNumber: 12, questionText: '細かいことが気になる方だ', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 1, orderNumber: 13, questionText: '新しいことに挑戦するのが好きだ', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 1, orderNumber: 14, questionText: '約束は必ず守る', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 1, orderNumber: 15, questionText: '人の気持ちを察するのが得意だ', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 1, orderNumber: 16, questionText: 'パーティーや集まりでは中心にいることが多い', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 1, orderNumber: 17, questionText: 'ストレスを感じやすい方だ', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 1, orderNumber: 18, questionText: '芸術や音楽に深い関心がある', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 1, orderNumber: 19, questionText: '物事を最後までやり遂げる', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 1, orderNumber: 20, questionText: '他人を助けることに喜びを感じる', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 1, orderNumber: 21, questionText: '論理的に考えるのが得意だ', category: QuestionCategory.THINKING, isReverse: false },
    { page: 1, orderNumber: 22, questionText: '効率を重視して行動する', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 1, orderNumber: 23, questionText: '人との調和を大切にする', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 1, orderNumber: 24, questionText: '知識を深めることに興味がある', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 1, orderNumber: 25, questionText: '外見や印象を気にする方だ', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 1, orderNumber: 26, questionText: 'リスクを取ることを恐れない', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 1, orderNumber: 27, questionText: '分析的に物事を考える', category: QuestionCategory.THINKING, isReverse: false },
    { page: 1, orderNumber: 28, questionText: '直感を信じて行動することが多い', category: QuestionCategory.THINKING, isReverse: false },
    { page: 1, orderNumber: 29, questionText: '人をサポートする役割が好きだ', category: QuestionCategory.THINKING, isReverse: false },
    { page: 1, orderNumber: 30, questionText: 'エネルギッシュに活動する方だ', category: QuestionCategory.THINKING, isReverse: false },

    // Page 2 (30 questions)
    { page: 2, orderNumber: 1, questionText: '一人で黙々と作業するのが好きだ', category: QuestionCategory.EXTRAVERSION, isReverse: true },
    { page: 2, orderNumber: 2, questionText: '心配事があると眠れなくなることがある', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 2, orderNumber: 3, questionText: '想像力が豊かだと思う', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 2, orderNumber: 4, questionText: '時間を守ることを重視する', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 2, orderNumber: 5, questionText: '競争よりも協力を好む', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 2, orderNumber: 6, questionText: '話すよりも聞く方が好きだ', category: QuestionCategory.EXTRAVERSION, isReverse: true },
    { page: 2, orderNumber: 7, questionText: '些細なことでイライラすることがある', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 2, orderNumber: 8, questionText: '変化を楽しむことができる', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 2, orderNumber: 9, questionText: '整理整頓が得意だ', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 2, orderNumber: 10, questionText: '人の失敗を許すことができる', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 2, orderNumber: 11, questionText: '大勢の前で話すのは苦手だ', category: QuestionCategory.EXTRAVERSION, isReverse: true },
    { page: 2, orderNumber: 12, questionText: '将来のことを心配することが多い', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 2, orderNumber: 13, questionText: '抽象的な概念について考えるのが好きだ', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 2, orderNumber: 14, questionText: '計画を立ててから行動する', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 2, orderNumber: 15, questionText: '人の話に共感することが多い', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 2, orderNumber: 16, questionText: 'リーダーシップを発揮するのが好きだ', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 2, orderNumber: 17, questionText: '批判されると落ち込みやすい', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 2, orderNumber: 18, questionText: '哲学的な議論に興味がある', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 2, orderNumber: 19, questionText: '責任感が強い方だ', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 2, orderNumber: 20, questionText: '争いを避ける傾向がある', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 2, orderNumber: 21, questionText: '結果を重視して判断する', category: QuestionCategory.THINKING, isReverse: false },
    { page: 2, orderNumber: 22, questionText: '時間を効率的に使うことを心がける', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 2, orderNumber: 23, questionText: 'チームワークを大切にする', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 2, orderNumber: 24, questionText: '専門知識を身につけることに熱心だ', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 2, orderNumber: 25, questionText: '第一印象を大切にする', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 2, orderNumber: 26, questionText: '困難な状況でも前向きに取り組む', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 2, orderNumber: 27, questionText: 'データに基づいて判断する', category: QuestionCategory.THINKING, isReverse: false },
    { page: 2, orderNumber: 28, questionText: '感覚的に物事を捉えることが多い', category: QuestionCategory.THINKING, isReverse: false },
    { page: 2, orderNumber: 29, questionText: '他者の成長を支援するのが好きだ', category: QuestionCategory.THINKING, isReverse: false },
    { page: 2, orderNumber: 30, questionText: '行動力があると言われる', category: QuestionCategory.THINKING, isReverse: false },

    // Page 3 (30 questions)
    { page: 3, orderNumber: 1, questionText: '社交的な場面を楽しむことができる', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 3, orderNumber: 2, questionText: '感情の起伏が激しい方だ', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 3, orderNumber: 3, questionText: '創造的なアイデアを出すのが得意だ', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 3, orderNumber: 4, questionText: '目標に向かって努力を続けることができる', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 3, orderNumber: 5, questionText: '人を信頼する方だ', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 3, orderNumber: 6, questionText: '注目を浴びることが好きだ', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 3, orderNumber: 7, questionText: '不安を感じやすい', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 3, orderNumber: 8, questionText: '新しい経験を求める傾向がある', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 3, orderNumber: 9, questionText: '自分に厳しい方だ', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 3, orderNumber: 10, questionText: '思いやりがあると言われる', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 3, orderNumber: 11, questionText: '静かな環境を好む', category: QuestionCategory.EXTRAVERSION, isReverse: true },
    { page: 3, orderNumber: 12, questionText: '緊張しやすい方だ', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 3, orderNumber: 13, questionText: '多様な視点から物事を考えることができる', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 3, orderNumber: 14, questionText: '決めたことは最後まで実行する', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 3, orderNumber: 15, questionText: '他人の立場に立って考えることができる', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 3, orderNumber: 16, questionText: '人前で自分の意見を述べることができる', category: QuestionCategory.EXTRAVERSION, isReverse: false },
    { page: 3, orderNumber: 17, questionText: '失敗を引きずる傾向がある', category: QuestionCategory.NEUROTICISM, isReverse: false },
    { page: 3, orderNumber: 18, questionText: '知的好奇心が旺盛だ', category: QuestionCategory.OPENNESS, isReverse: false },
    { page: 3, orderNumber: 19, questionText: '細部にまで注意を払う', category: QuestionCategory.CONSCIENTIOUSNESS, isReverse: false },
    { page: 3, orderNumber: 20, questionText: '協調性があると思う', category: QuestionCategory.AGREEABLENESS, isReverse: false },
    { page: 3, orderNumber: 21, questionText: '戦略的に考えることが得意だ', category: QuestionCategory.THINKING, isReverse: false },
    { page: 3, orderNumber: 22, questionText: '無駄を省くことを心がける', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 3, orderNumber: 23, questionText: '人間関係を大切にする', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 3, orderNumber: 24, questionText: '学び続けることに価値を感じる', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 3, orderNumber: 25, questionText: '見た目や振る舞いに気を配る', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 3, orderNumber: 26, questionText: '新しいことに積極的に挑戦する', category: QuestionCategory.BEHAVIOR, isReverse: false },
    { page: 3, orderNumber: 27, questionText: '客観的な視点を持つことができる', category: QuestionCategory.THINKING, isReverse: false },
    { page: 3, orderNumber: 28, questionText: '直感的な判断を信頼する', category: QuestionCategory.THINKING, isReverse: false },
    { page: 3, orderNumber: 29, questionText: '人の成功を喜ぶことができる', category: QuestionCategory.THINKING, isReverse: false },
    { page: 3, orderNumber: 30, questionText: '積極的に行動する方だ', category: QuestionCategory.THINKING, isReverse: false },
  ];

  for (const q of questionData) {
    await prisma.question.upsert({
      where: { page_orderNumber: { page: q.page, orderNumber: q.orderNumber } },
      update: {},
      create: q,
    });
  }

  console.log('✅ Questions created (90 questions)');

  // ========================================
  // Create Sample Diagnosis Result
  // ========================================
  const diagnosisResult = await prisma.diagnosisResult.upsert({
    where: { id: '00000000-0000-0000-0000-000000000100' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      userId: generalUser.id,
      typeName: '感覚的タイプ',
      typeCode: 'EE',
      featureLabels: ['権力的', 'アイドル性', '不動心', '顧客志向'],
      reliabilityStatus: ReliabilityStatus.RELIABLE,
      stressTolerance: StressToleranceLevel.MEDIUM,
      thinkingPattern: {
        R: 52,
        A: 65,
        S: 48,
        E: 70,
      },
      behaviorPattern: {
        efficiency: 58,
        friendliness: 62,
        knowledge: 55,
        appearance: 45,
        challenge: 68,
      },
      bigFive: {
        extraversion: 62,
        neuroticism: 38,
        openness: 70,
        agreeableness: 55,
        conscientiousness: 58,
      },
      rawScores: {
        extraversion: 4.2,
        neuroticism: 2.8,
        openness: 5.1,
        agreeableness: 3.9,
        conscientiousness: 4.0,
        thinking_R: 3.5,
        thinking_A: 4.3,
        thinking_S: 3.2,
        thinking_E: 4.8,
        behavior_efficiency: 3.9,
        behavior_friendliness: 4.1,
        behavior_knowledge: 3.7,
        behavior_appearance: 3.0,
        behavior_challenge: 4.5,
      },
      version: '1.0',
      completedAt: new Date(),
    },
  });

  console.log('✅ Sample diagnosis result created');

  // ========================================
  // Create Sample Potential Scores
  // ========================================
  const jobTypes = [
    { jobType: 'エンジニア', score: 78, grade: PotentialGrade.B },
    { jobType: 'カスタマーサクセス', score: 85, grade: PotentialGrade.A },
    { jobType: '新規営業', score: 72, grade: PotentialGrade.B },
    { jobType: 'マーケティング', score: 68, grade: PotentialGrade.C },
    { jobType: 'デザイナー', score: 55, grade: PotentialGrade.C },
    { jobType: 'プロジェクトマネージャー', score: 82, grade: PotentialGrade.A },
    { jobType: 'データアナリスト', score: 75, grade: PotentialGrade.B },
    { jobType: 'コンサルタント', score: 88, grade: PotentialGrade.A },
  ];

  for (const job of jobTypes) {
    await prisma.potentialScore.upsert({
      where: {
        diagnosisResultId_jobType: {
          diagnosisResultId: diagnosisResult.id,
          jobType: job.jobType,
        },
      },
      update: {},
      create: {
        diagnosisResultId: diagnosisResult.id,
        jobType: job.jobType,
        score: job.score,
        grade: job.grade,
      },
    });
  }

  console.log('✅ Sample potential scores created');

  // ========================================
  // Create Sample External Diagnoses
  // ========================================
  const mbtiDiagnosis = await prisma.externalDiagnosis.upsert({
    where: {
      userId_type: {
        userId: generalUser.id,
        type: ExternalDiagnosisType.MBTI,
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000110',
      userId: generalUser.id,
      type: ExternalDiagnosisType.MBTI,
      result: {
        type: 'INTJ',
        indicators: {
          E_I: 45,
          S_N: 62,
          T_F: 78,
          J_P: 55,
        },
      },
      sourceUrl: 'https://www.16personalities.com/',
      diagnosedAt: new Date('2024-06-15'),
    },
  });

  const animalDiagnosis = await prisma.externalDiagnosis.upsert({
    where: {
      userId_type: {
        userId: generalUser.id,
        type: ExternalDiagnosisType.ANIMAL_FORTUNE,
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000111',
      userId: generalUser.id,
      type: ExternalDiagnosisType.ANIMAL_FORTUNE,
      result: {
        animal: '狼',
        color: 'ゴールド',
        detail60: '正直なこじか',
      },
      diagnosedAt: new Date('2024-07-01'),
    },
  });

  console.log('✅ Sample external diagnoses created');

  // ========================================
  // Create Sample BrushUp History
  // ========================================
  await prisma.brushUpHistory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000120' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000120',
      diagnosisResultId: diagnosisResult.id,
      version: 'v1.0',
      triggerType: BrushUpTriggerType.INITIAL,
      previousData: {},
      updatedData: {
        typeName: '感覚的タイプ',
        typeCode: 'EE',
      },
      aiReasoning: '初回診断結果として生成されました。',
      modelVersion: 'gpt-4-turbo-2024-04-09',
      confidence: 0.92,
      riskFlag: false,
      displayDecision: 'shown',
      inputSourceHash: 'abc123def456',
    },
  });

  await prisma.brushUpHistory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000121' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000121',
      diagnosisResultId: diagnosisResult.id,
      version: 'v1.1',
      triggerType: BrushUpTriggerType.MBTI_ADDED,
      triggerSourceId: mbtiDiagnosis.id,
      previousData: {
        featureLabels: ['権力的', 'アイドル性', '不動心', '顧客志向'],
      },
      updatedData: {
        featureLabels: ['権力的', 'アイドル性', '不動心', '顧客志向', '戦略的思考'],
      },
      aiReasoning: 'MBTI結果(INTJ)を考慮し、戦略的思考の特徴を追加しました。',
      modelVersion: 'gpt-4-turbo-2024-04-09',
      confidence: 0.88,
      riskFlag: false,
      displayDecision: 'shown',
      inputSourceHash: 'xyz789abc012',
    },
  });

  console.log('✅ Sample brush-up histories created');

  // ========================================
  // Create Sample Similarity Scores
  // ========================================
  await prisma.similarityScore.upsert({
    where: {
      userId_similarUserId: {
        userId: generalUser.id,
        similarUserId: companyUser1.id,
      },
    },
    update: {},
    create: {
      userId: generalUser.id,
      similarUserId: companyUser1.id,
      similarityPercentage: 78.5,
      differingFactors: [
        { factor: '外向性', difference: 15 },
        { factor: '挑戦', difference: 12 },
      ],
      calculatedAt: new Date(),
    },
  });

  await prisma.similarityScore.upsert({
    where: {
      userId_similarUserId: {
        userId: generalUser.id,
        similarUserId: companyUser2.id,
      },
    },
    update: {},
    create: {
      userId: generalUser.id,
      similarUserId: companyUser2.id,
      similarityPercentage: 65.2,
      differingFactors: [
        { factor: '神経症傾向', difference: 22 },
        { factor: '効率', difference: 18 },
        { factor: '知識', difference: 10 },
      ],
      calculatedAt: new Date(),
    },
  });

  console.log('✅ Sample similarity scores created');

  // ========================================
  // Create Sample Candidate
  // ========================================
  const candidate = await prisma.candidate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000200' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000200',
      companyId: demoCompany.id,
      userId: generalUser.id,
      status: CandidateStatus.FIRST_INTERVIEW,
      appliedPosition: 'シニアソフトウェアエンジニア',
      source: 'LinkedIn',
      tags: ['エンジニア', '中途採用', '即戦力'],
      notes: '前職でリードエンジニアとして3年間勤務。TypeScript、React、Node.jsに精通。',
      assignedTo: companyUser2.id,
    },
  });

  console.log('✅ Sample candidate created');

  // ========================================
  // Create Sample Interview
  // ========================================
  const interview = await prisma.interview.upsert({
    where: { id: '00000000-0000-0000-0000-000000000210' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000210',
      candidateId: candidate.id,
      interviewerId: companyUser2.id,
      scheduledAt: new Date('2024-12-20T14:00:00Z'),
      duration: 60,
      location: null,
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      type: InterviewType.VIDEO,
      status: InterviewStatus.COMPLETED,
      reminderSent: true,
    },
  });

  console.log('✅ Sample interview created');

  // ========================================
  // Create Sample Interview Comment
  // ========================================
  const interviewComment = await prisma.interviewComment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000220' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000220',
      candidateId: candidate.id,
      interviewerId: companyUser2.id,
      interviewDate: new Date('2024-12-20T14:00:00Z'),
      comment: '技術力が高く、コミュニケーション能力も優れている。チームへの適応も問題なさそう。',
      rating: 4,
      tags: ['技術力高い', 'コミュニケーション良好', '即戦力'],
      structuredEvaluation: {
        technicalSkill: 4,
        communication: 4,
        teamFit: 5,
        problemSolving: 4,
        leadership: 3,
      },
      extractedFeaturesJson: {
        starElements: {
          situation: true,
          task: true,
          action: true,
          result: true,
        },
        riskIndicators: [],
        communicationStyle: 'clear_and_structured',
        valueAlignment: 0.85,
      },
    },
  });

  console.log('✅ Sample interview comment created');

  // ========================================
  // Create Sample Invoices
  // ========================================
  const invoice1 = await prisma.invoice.upsert({
    where: { id: '00000000-0000-0000-0000-000000000300' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000300',
      companyId: demoCompany.id,
      invoiceNumber: 'INV-2024-001',
      billingPeriodStart: new Date('2024-11-01'),
      billingPeriodEnd: new Date('2024-11-30'),
      subtotal: 98000,
      tax: 9800,
      total: 107800,
      status: InvoiceStatus.PAID,
      dueDate: new Date('2024-12-15'),
      paidAt: new Date('2024-12-10'),
      stripeInvoiceId: 'in_1234567890abcdef',
      pdfUrl: 'https://storage.example.com/invoices/INV-2024-001.pdf',
    },
  });

  await prisma.invoiceLineItem.upsert({
    where: { id: '00000000-0000-0000-0000-000000000301' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000301',
      invoiceId: invoice1.id,
      description: 'プロフェッショナルプラン（2024年11月分）',
      quantity: 1,
      unitPrice: 98000,
      amount: 98000,
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: { id: '00000000-0000-0000-0000-000000000310' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000310',
      companyId: demoCompany.id,
      invoiceNumber: 'INV-2024-002',
      billingPeriodStart: new Date('2024-12-01'),
      billingPeriodEnd: new Date('2024-12-31'),
      subtotal: 98000,
      tax: 9800,
      total: 107800,
      status: InvoiceStatus.SENT,
      dueDate: new Date('2025-01-15'),
      stripeInvoiceId: 'in_abcdef1234567890',
    },
  });

  await prisma.invoiceLineItem.upsert({
    where: { id: '00000000-0000-0000-0000-000000000311' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000311',
      invoiceId: invoice2.id,
      description: 'プロフェッショナルプラン（2024年12月分）',
      quantity: 1,
      unitPrice: 98000,
      amount: 98000,
    },
  });

  console.log('✅ Sample invoices created');

  // ========================================
  // Create Sample Payment Method
  // ========================================
  await prisma.paymentMethod.upsert({
    where: { id: '00000000-0000-0000-0000-000000000320' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000320',
      companyId: demoCompany.id,
      type: PaymentMethodType.CREDIT_CARD,
      stripePaymentMethodId: 'pm_1234567890abcdef',
      last4: '4242',
      brand: 'Visa',
      isDefault: true,
    },
  });

  console.log('✅ Sample payment method created');

  // ========================================
  // Create Sample Audit Logs
  // ========================================
  await prisma.auditLog.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000400',
        userId: systemAdmin.id,
        action: AuditAction.CREATE,
        entityType: 'Company',
        entityId: demoCompany.id,
        newData: { name: '株式会社デモ', planId: professionalPlan.id },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date('2024-01-01T09:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000401',
        userId: companyAdmin.id,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: companyAdmin.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date('2024-12-15T08:30:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000402',
        userId: companyUser2.id,
        action: AuditAction.CANDIDATE_STATUS_CHANGE,
        entityType: 'Candidate',
        entityId: candidate.id,
        previousData: { status: 'DOCUMENT_SCREENING' },
        newData: { status: 'FIRST_INTERVIEW' },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date('2024-12-18T14:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000403',
        userId: generalUser.id,
        action: AuditAction.DIAGNOSIS_COMPLETE,
        entityType: 'DiagnosisResult',
        entityId: diagnosisResult.id,
        newData: { typeName: '感覚的タイプ', typeCode: 'EE' },
        ipAddress: '203.0.113.50',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        createdAt: new Date('2024-12-10T16:45:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000404',
        userId: companyAdmin.id,
        action: AuditAction.EXPORT,
        entityType: 'DiagnosisResult',
        entityId: null,
        newData: { exportType: 'CSV', recordCount: 25 },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date('2024-12-20T10:00:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Sample audit logs created');

  // ========================================
  // Create Sample Notifications
  // ========================================
  await prisma.notification.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000500',
        userId: companyUser2.id,
        type: NotificationType.INTERVIEW_REMINDER,
        title: '面接リマインダー',
        message: '本日14:00より佐藤次郎さんとの面接が予定されています。',
        link: '/interviews/00000000-0000-0000-0000-000000000210',
        isRead: true,
        readAt: new Date('2024-12-20T13:00:00Z'),
        createdAt: new Date('2024-12-20T09:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000501',
        userId: companyAdmin.id,
        type: NotificationType.CANDIDATE_NEW,
        title: '新規候補者登録',
        message: '新しい候補者「佐藤次郎」さんがシニアソフトウェアエンジニアに応募しました。',
        link: '/candidates/00000000-0000-0000-0000-000000000200',
        isRead: true,
        readAt: new Date('2024-12-15T10:00:00Z'),
        createdAt: new Date('2024-12-15T09:30:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000502',
        userId: generalUser.id,
        type: NotificationType.DIAGNOSIS_COMPLETE,
        title: '診断完了',
        message: '性格診断が完了しました。結果を確認してください。',
        link: '/diagnosis/result',
        isRead: true,
        readAt: new Date('2024-12-10T17:00:00Z'),
        createdAt: new Date('2024-12-10T16:45:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000503',
        userId: companyAdmin.id,
        type: NotificationType.INVOICE_ISSUED,
        title: '請求書発行',
        message: '2024年12月分の請求書が発行されました。',
        link: '/billing/invoices/00000000-0000-0000-0000-000000000310',
        isRead: false,
        createdAt: new Date('2024-12-25T09:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000504',
        userId: companyAdmin.id,
        type: NotificationType.CONTRACT_EXPIRING,
        title: '契約更新のお知らせ',
        message: '契約期間が2025年12月31日に終了します。更新手続きをお願いします。',
        link: '/settings/contract',
        isRead: false,
        createdAt: new Date('2025-01-01T09:00:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Sample notifications created');

  // ========================================
  // Create Sample Email Logs
  // ========================================
  await prisma.emailLog.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000600',
        toEmail: 'company-admin@demo.com',
        toUserId: companyAdmin.id,
        subject: 'PeopleBoosterへようこそ',
        templateId: 'welcome',
        status: 'delivered',
        sentAt: new Date('2024-01-01T09:00:00Z'),
        deliveredAt: new Date('2024-01-01T09:00:05Z'),
        openedAt: new Date('2024-01-01T09:15:00Z'),
        metadata: { companyName: '株式会社デモ' },
      },
      {
        id: '00000000-0000-0000-0000-000000000601',
        toEmail: 'general-user@example.com',
        toUserId: generalUser.id,
        subject: '診断完了のお知らせ',
        templateId: 'diagnosis_complete',
        status: 'delivered',
        sentAt: new Date('2024-12-10T16:45:00Z'),
        deliveredAt: new Date('2024-12-10T16:45:03Z'),
        metadata: { diagnosisType: '性格診断' },
      },
      {
        id: '00000000-0000-0000-0000-000000000602',
        toEmail: 'hr-user@demo.com',
        toUserId: companyUser2.id,
        subject: '面接リマインダー：佐藤次郎さん',
        templateId: 'interview_reminder',
        status: 'delivered',
        sentAt: new Date('2024-12-20T09:00:00Z'),
        deliveredAt: new Date('2024-12-20T09:00:02Z'),
        openedAt: new Date('2024-12-20T09:05:00Z'),
        metadata: { candidateName: '佐藤次郎', interviewTime: '14:00' },
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Sample email logs created');

  // ========================================
  // Summary
  // ========================================
  console.log('');
  console.log('✅ Seeding completed!');
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| Role           | Email                        | Password       |');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| System Admin   | admin@peoplebooster.com      | Admin123!@#    |');
  console.log('| Company Admin  | company-admin@demo.com       | Company123!@#  |');
  console.log('| Company User   | company-user@demo.com        | User123!@#     |');
  console.log('| HR User        | hr-user@demo.com             | User123!@#     |');
  console.log('| Sub User       | sub-user@demo.com            | SubUser123!@#  |');
  console.log('| General User   | general-user@example.com     | General123!@#  |');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📊 Sample Data:');
  console.log('  - 4 plans (Starter, Basic, Professional, Enterprise)');
  console.log('  - 90 questions (3 pages × 30 questions)');
  console.log('  - 1 diagnosis result with potential scores');
  console.log('  - 2 external diagnoses (MBTI, Animal Fortune)');
  console.log('  - 2 brush-up histories');
  console.log('  - 2 similarity scores');
  console.log('  - 1 candidate with interview and comment');
  console.log('  - 2 invoices with line items');
  console.log('  - 1 payment method');
  console.log('  - 5 audit logs');
  console.log('  - 5 notifications');
  console.log('  - 3 email logs');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
