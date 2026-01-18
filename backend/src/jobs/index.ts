/**
 * ジョブモジュールのエントリーポイント
 * 
 * このモジュールは、バックグラウンドジョブの管理を行います。
 * Bull + Redisを使用してジョブキューを管理します。
 */

import interviewReminderJob, {
  interviewReminderQueue,
  scheduleInterviewReminders,
  startReminderCronJob,
  getQueueStats,
  sendManualReminder,
} from './interview-reminder.job';

/**
 * すべてのジョブを初期化
 */
export function initializeJobs(): void {
  console.log('[Jobs] Initializing background jobs...');

  // 面接リマインダージョブを開始
  startReminderCronJob();

  console.log('[Jobs] All background jobs initialized');
}

/**
 * すべてのジョブキューを停止
 */
export async function shutdownJobs(): Promise<void> {
  console.log('[Jobs] Shutting down background jobs...');

  await interviewReminderQueue.close();

  console.log('[Jobs] All background jobs shut down');
}

export {
  interviewReminderJob,
  interviewReminderQueue,
  scheduleInterviewReminders,
  startReminderCronJob,
  getQueueStats,
  sendManualReminder,
};
