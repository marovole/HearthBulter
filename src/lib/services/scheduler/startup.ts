/**
 * 调度器启动脚本
 * 在应用启动时初始化定时任务
 */

import { scheduler } from './index';
import { TaskLogger } from './logger';

const logger = new TaskLogger();

/**
 * 启动调度器
 * 这个函数应该在应用启动时调用
 */
export async function startScheduler(): Promise<void> {
  try {
    // 检查环境变量
    if (process.env.NODE_ENV === 'development') {
      logger.info('Running in development mode, scheduler will be started');
    } else if (process.env.VERCEL_ENV === 'production') {
      logger.info('Running in production mode on Vercel');
      // 在Vercel上，我们可能需要使用不同的策略
      // 因为serverless函数可能不会一直运行
      return;
    }

    await scheduler.start();
    logger.info('Scheduler started successfully');
  } catch (error) {
    logger.error('Failed to start scheduler:', error);
    // 不抛出错误，避免阻止应用启动
  }
}

/**
 * 停止调度器
 * 这个函数应该在应用关闭时调用
 */
export function stopScheduler(): void {
  try {
    scheduler.stop();
    logger.info('Scheduler stopped successfully');
  } catch (error) {
    logger.error('Failed to stop scheduler:', error);
  }
}
