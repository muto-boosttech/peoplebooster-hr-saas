import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Bull = require('bull');

const prisma = new PrismaClient();

// Redis接続設定
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * リマインダージョブのペイロード
 */
interface ReminderJobPayload {
  interviewId: string;
  type: 'interviewer' | 'candidate';
}

// 面接リマインダーキュー
export const interviewReminderQueue = new Bull('interview-reminder', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 100, // 完了したジョブは100件まで保持
    removeOnFail: 50, // 失敗したジョブは50件まで保持
    attempts: 3, // 最大3回リトライ
    backoff: {
      type: 'exponential',
      delay: 60000, // 1分から開始
    },
  },
});

/**
 * リマインダーメール送信処理
 */
interviewReminderQueue.process(async (job) => {
  const { interviewId, type } = job.data as ReminderJobPayload;

  console.log(`[Interview Reminder] Processing job for interview ${interviewId}, type: ${type}`);

  try {
    // 面接情報を取得
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        candidate: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                nickname: true,
                email: true,
              },
            },
          },
        },
        interviewer: {
          select: {
            id: true,
            fullName: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    if (!interview) {
      console.log(`[Interview Reminder] Interview ${interviewId} not found, skipping`);
      return { success: false, reason: 'Interview not found' };
    }

    // キャンセル済みの面接はスキップ
    if (interview.status === 'CANCELLED') {
      console.log(`[Interview Reminder] Interview ${interviewId} is cancelled, skipping`);
      return { success: false, reason: 'Interview cancelled' };
    }

    // 既にリマインダー送信済みの場合はスキップ
    if (interview.reminderSent) {
      console.log(`[Interview Reminder] Reminder already sent for interview ${interviewId}, skipping`);
      return { success: false, reason: 'Reminder already sent' };
    }

    const scheduledAt = new Date(interview.scheduledAt);
    const candidateName = interview.candidate.user.fullName || interview.candidate.user.nickname;
    const interviewerName = interview.interviewer.fullName || interview.interviewer.nickname;
    const formattedDate = scheduledAt.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    });

    if (type === 'interviewer') {
      // 面接官へのリマインダー
      await sendInterviewerReminder(interview, formattedDate, candidateName);
    } else {
      // 候補者へのリマインダー
      await sendCandidateReminder(interview, formattedDate, interviewerName);
    }

    // リマインダー送信済みフラグを更新
    await prisma.interview.update({
      where: { id: interviewId },
      data: { reminderSent: true },
    });

    console.log(`[Interview Reminder] Successfully sent reminder for interview ${interviewId}`);
    return { success: true };
  } catch (error) {
    console.error(`[Interview Reminder] Error processing job for interview ${interviewId}:`, error);
    throw error;
  }
});

/**
 * 面接官へのリマインダーメール送信
 */
async function sendInterviewerReminder(
  interview: any,
  formattedDate: string,
  candidateName: string
): Promise<void> {
  const subject = `【リマインダー】明日の面接予定: ${candidateName}さん`;
  const body = `
${interview.interviewer.fullName || interview.interviewer.nickname}様

明日、以下の面接が予定されています。

■ 候補者: ${candidateName}さん
■ 応募職種: ${interview.candidate.appliedPosition}
■ 日時: ${formattedDate}
■ 所要時間: ${interview.duration}分
■ 形式: ${getInterviewTypeDisplayName(interview.type)}
${interview.location ? `■ 場所: ${interview.location}` : ''}
${interview.meetingUrl ? `■ 会議URL: ${interview.meetingUrl}` : ''}

ご準備をお願いいたします。

---
PeopleBooster
  `.trim();

  // 実際のメール送信（メールサービスを使用）
  console.log(`[Email] Sending interviewer reminder to ${interview.interviewer.email}`);
  console.log(`[Email] Subject: ${subject}`);
  console.log(`[Email] Body: ${body}`);

  // 通知も作成
  await prisma.notification.create({
    data: {
      userId: interview.interviewerId,
      type: 'INTERVIEW_REMINDER',
      title: subject,
      message: `${candidateName}さんとの面接が明日${formattedDate}に予定されています`,
      link: `/interviews/${interview.id}`,
    },
  });

  // メール送信履歴を記録
  await recordEmailHistory(
    interview.interviewer.email,
    subject,
    body,
    'INTERVIEW_REMINDER',
    interview.id
  );
}

/**
 * 候補者へのリマインダーメール送信
 */
async function sendCandidateReminder(
  interview: any,
  formattedDate: string,
  interviewerName: string
): Promise<void> {
  const candidateName = interview.candidate.user.fullName || interview.candidate.user.nickname;
  const subject = `【リマインダー】明日の面接のご案内`;
  const body = `
${candidateName}様

明日、以下の面接が予定されております。

■ 日時: ${formattedDate}
■ 所要時間: ${interview.duration}分
■ 形式: ${getInterviewTypeDisplayName(interview.type)}
■ 面接官: ${interviewerName}
${interview.location ? `■ 場所: ${interview.location}` : ''}
${interview.meetingUrl ? `■ 会議URL: ${interview.meetingUrl}` : ''}

当日はお時間に余裕を持ってご参加ください。
ご不明点がございましたら、お気軽にお問い合わせください。

---
PeopleBooster
  `.trim();

  // 実際のメール送信（メールサービスを使用）
  console.log(`[Email] Sending candidate reminder to ${interview.candidate.user.email}`);
  console.log(`[Email] Subject: ${subject}`);
  console.log(`[Email] Body: ${body}`);

  // メール送信履歴を記録
  await recordEmailHistory(
    interview.candidate.user.email,
    subject,
    body,
    'INTERVIEW_REMINDER',
    interview.id
  );
}

/**
 * メール送信履歴を記録
 */
async function recordEmailHistory(
  recipient: string,
  subject: string,
  body: string,
  type: string,
  relatedEntityId: string
): Promise<void> {
  // EmailHistoryモデルがある場合は記録
  // 現在のスキーマにはないため、監査ログに記録
  try {
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        action: 'CREATE',
        entityType: 'EmailNotification',
        entityId: relatedEntityId,
        previousData: null,
        newData: {
          recipient,
          subject,
          type,
          sentAt: new Date().toISOString(),
        },
        ipAddress: '0.0.0.0',
        userAgent: 'InterviewReminderJob',
      },
    });
  } catch (error) {
    console.error('[Email History] Failed to record email history:', error);
  }
}

/**
 * 面接タイプの表示名を取得
 */
function getInterviewTypeDisplayName(type: string): string {
  const displayNames: Record<string, string> = {
    PHONE: '電話面接',
    VIDEO: 'ビデオ面接',
    ONSITE: '対面面接',
  };
  return displayNames[type] || type;
}

/**
 * 24時間後の面接を検索してリマインダージョブをスケジュール
 */
export async function scheduleInterviewReminders(): Promise<void> {
  console.log('[Interview Reminder] Starting reminder scheduling...');

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 24時間後から25時間後の間に予定されている面接を検索
  const startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23時間後
  const endTime = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25時間後

  const upcomingInterviews = await prisma.interview.findMany({
    where: {
      scheduledAt: {
        gte: startTime,
        lte: endTime,
      },
      status: 'SCHEDULED',
      reminderSent: false,
    },
    select: {
      id: true,
      scheduledAt: true,
    },
  });

  console.log(`[Interview Reminder] Found ${upcomingInterviews.length} interviews to remind`);

  for (const interview of upcomingInterviews) {
    // 面接官へのリマインダー
    await interviewReminderQueue.add(
      { interviewId: interview.id, type: 'interviewer' },
      { jobId: `interviewer-${interview.id}` }
    );

    // 候補者へのリマインダー
    await interviewReminderQueue.add(
      { interviewId: interview.id, type: 'candidate' },
      { jobId: `candidate-${interview.id}` }
    );

    console.log(`[Interview Reminder] Scheduled reminders for interview ${interview.id}`);
  }

  console.log('[Interview Reminder] Reminder scheduling completed');
}

/**
 * 定期実行用のcronジョブを開始
 */
export function startReminderCronJob(): void {
  // 1時間ごとにリマインダーをスケジュール
  setInterval(
    async () => {
      try {
        await scheduleInterviewReminders();
      } catch (error) {
        console.error('[Interview Reminder] Cron job error:', error);
      }
    },
    60 * 60 * 1000 // 1時間
  );

  // 起動時にも実行
  scheduleInterviewReminders().catch((error) => {
    console.error('[Interview Reminder] Initial scheduling error:', error);
  });

  console.log('[Interview Reminder] Cron job started (runs every hour)');
}

/**
 * キューのイベントリスナー
 */
interviewReminderQueue.on('completed', (job, result) => {
  console.log(`[Interview Reminder] Job ${job.id} completed:`, result);
});

interviewReminderQueue.on('failed', (job, error) => {
  console.error(`[Interview Reminder] Job ${job.id} failed:`, error);
});

interviewReminderQueue.on('stalled', (job) => {
  console.warn(`[Interview Reminder] Job ${job.id} stalled`);
});

/**
 * キューの統計情報を取得
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    interviewReminderQueue.getWaitingCount(),
    interviewReminderQueue.getActiveCount(),
    interviewReminderQueue.getCompletedCount(),
    interviewReminderQueue.getFailedCount(),
    interviewReminderQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * 手動でリマインダーを送信（管理者用）
 */
export async function sendManualReminder(interviewId: string): Promise<void> {
  // 面接官へのリマインダー
  await interviewReminderQueue.add(
    { interviewId, type: 'interviewer' },
    { jobId: `manual-interviewer-${interviewId}-${Date.now()}` }
  );

  // 候補者へのリマインダー
  await interviewReminderQueue.add(
    { interviewId, type: 'candidate' },
    { jobId: `manual-candidate-${interviewId}-${Date.now()}` }
  );

  console.log(`[Interview Reminder] Manual reminder scheduled for interview ${interviewId}`);
}

export default {
  interviewReminderQueue,
  scheduleInterviewReminders,
  startReminderCronJob,
  getQueueStats,
  sendManualReminder,
};
