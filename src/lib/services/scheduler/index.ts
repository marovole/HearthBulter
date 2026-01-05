/**
 * 定时任务调度器
 * 负责管理所有定时任务的创建、启动和停止
 */

import * as cron from "node-cron";
import { generateWeeklyReports } from "./weekly-reports";
import { generateMonthlyReports } from "./monthly-reports";
import { runAnomalyDetection } from "./anomaly-detection";
import { TaskLogger } from "./logger";

interface ScheduledTask {
  name: string;
  cronExpression: string;
  task: () => Promise<void>;
  description: string;
  enabled: boolean;
}

class TaskScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private logger = new TaskLogger();
  private isRunning = false;

  /**
   * 定义所有定时任务
   */
  private readonly taskDefinitions: ScheduledTask[] = [
    {
      name: "weekly-reports",
      cronExpression: "0 9 * * 0", // 每周日上午9点
      task: generateWeeklyReports,
      description: "生成周报",
      enabled: true,
    },
    {
      name: "monthly-reports",
      cronExpression: "0 9 1 * *", // 每月1号上午9点
      task: generateMonthlyReports,
      description: "生成月报",
      enabled: true,
    },
    {
      name: "anomaly-detection",
      cronExpression: "0 */6 * * *", // 每6小时执行一次
      task: runAnomalyDetection,
      description: "异常检测扫描",
      enabled: true,
    },
  ];

  /**
   * 启动所有定时任务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Scheduler is already running");
      return;
    }

    this.logger.info("Starting task scheduler...");

    for (const taskDef of this.taskDefinitions) {
      if (taskDef.enabled) {
        await this.scheduleTask(taskDef);
      }
    }

    this.isRunning = true;
    this.logger.info(`Scheduler started with ${this.tasks.size} active tasks`);
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn("Scheduler is not running");
      return;
    }

    this.logger.info("Stopping task scheduler...");

    for (const [name, task] of this.tasks) {
      task.stop();
      this.logger.info(`Stopped task: ${name}`);
    }

    this.tasks.clear();
    this.isRunning = false;
    this.logger.info("Scheduler stopped");
  }

  /**
   * 调度单个任务
   */
  private async scheduleTask(taskDef: ScheduledTask): Promise<void> {
    try {
      const scheduledTask = cron.schedule(
        taskDef.cronExpression,
        async () => {
          await this.executeTask(taskDef);
        },
        {
          scheduled: false,
          timezone: "Asia/Shanghai",
        },
      );

      this.tasks.set(taskDef.name, scheduledTask);
      scheduledTask.start();

      this.logger.info(
        `Scheduled task: ${taskDef.name} (${taskDef.cronExpression}) - ${taskDef.description}`,
      );
    } catch (error) {
      this.logger.error(`Failed to schedule task ${taskDef.name}:`, error);
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(taskDef: ScheduledTask): Promise<void> {
    const startTime = Date.now();
    this.logger.info(`Executing task: ${taskDef.name}`);

    try {
      await taskDef.task();
      const duration = Date.now() - startTime;
      this.logger.info(`Task completed: ${taskDef.name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Task failed: ${taskDef.name} (${duration}ms):`, error);
    }
  }

  /**
   * 手动执行任务
   */
  async executeTaskManually(taskName: string): Promise<void> {
    const taskDef = this.taskDefinitions.find((t) => t.name === taskName);
    if (!taskDef) {
      throw new Error(`Task not found: ${taskName}`);
    }

    this.logger.info(`Manually executing task: ${taskName}`);
    await this.executeTask(taskDef);
  }

  /**
   * 获取任务状态
   */
  getStatus(): Array<{
    name: string;
    cronExpression: string;
    description: string;
    enabled: boolean;
    running: boolean;
  }> {
    return this.taskDefinitions.map((taskDef) => ({
      name: taskDef.name,
      cronExpression: taskDef.cronExpression,
      description: taskDef.description,
      enabled: taskDef.enabled,
      running: this.tasks.has(taskDef.name),
    }));
  }

  /**
   * 启用/禁用任务
   */
  async toggleTask(taskName: string, enabled: boolean): Promise<void> {
    const taskDef = this.taskDefinitions.find((t) => t.name === taskName);
    if (!taskDef) {
      throw new Error(`Task not found: ${taskName}`);
    }

    const currentTask = this.tasks.get(taskName);
    if (currentTask) {
      currentTask.stop();
      this.tasks.delete(taskName);
    }

    taskDef.enabled = enabled;

    if (enabled) {
      await this.scheduleTask(taskDef);
      this.logger.info(`Enabled task: ${taskName}`);
    } else {
      this.logger.info(`Disabled task: ${taskName}`);
    }
  }
}

// 创建全局调度器实例
export const scheduler = new TaskScheduler();

// 导出类型
export type { ScheduledTask };
