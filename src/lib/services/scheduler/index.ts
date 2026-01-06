/**
 * 定时任务调度器
 * 负责管理所有定时任务的创建、启动和停止
 *
 * 注意：node-cron 使用动态导入以避免在 Next.js 构建时出现
 * "Cannot set property crypto" 错误（Node.js 20+ 兼容性问题）
 */

import { TaskLogger } from "./logger";

// 动态导入类型
type CronModule = typeof import("node-cron");
type ScheduledCronTask = ReturnType<CronModule["schedule"]>;

interface ScheduledTask {
  name: string;
  cronExpression: string;
  task: () => Promise<void>;
  description: string;
  enabled: boolean;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledCronTask> = new Map();
  private logger = new TaskLogger();
  private isRunning = false;
  private cronModule: CronModule | null = null;

  /**
   * 任务定义（不包含具体的 task 函数，这些将在运行时动态加载）
   */
  private readonly taskDefinitions: Array<Omit<ScheduledTask, "task">> = [
    {
      name: "weekly-reports",
      cronExpression: "0 9 * * 0", // 每周日上午9点
      description: "生成周报",
      enabled: true,
    },
    {
      name: "monthly-reports",
      cronExpression: "0 9 1 * *", // 每月1号上午9点
      description: "生成月报",
      enabled: true,
    },
    {
      name: "anomaly-detection",
      cronExpression: "0 */6 * * *", // 每6小时执行一次
      description: "异常检测扫描",
      enabled: true,
    },
  ];

  /**
   * 动态加载 node-cron 模块
   */
  private async loadCronModule(): Promise<CronModule> {
    if (!this.cronModule) {
      this.cronModule = await import("node-cron");
    }
    return this.cronModule;
  }

  /**
   * 动态加载任务函数
   */
  private async loadTaskFunction(
    taskName: string,
  ): Promise<() => Promise<void>> {
    switch (taskName) {
      case "weekly-reports": {
        const { generateWeeklyReports } = await import("./weekly-reports");
        return generateWeeklyReports;
      }
      case "monthly-reports": {
        const { generateMonthlyReports } = await import("./monthly-reports");
        return generateMonthlyReports;
      }
      case "anomaly-detection": {
        const { runAnomalyDetection } = await import("./anomaly-detection");
        return runAnomalyDetection;
      }
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }

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
  private async scheduleTask(
    taskDef: Omit<ScheduledTask, "task">,
  ): Promise<void> {
    try {
      const cron = await this.loadCronModule();
      const taskFunction = await this.loadTaskFunction(taskDef.name);

      const scheduledTask = cron.schedule(
        taskDef.cronExpression,
        async () => {
          await this.executeTaskWithFunction(taskDef.name, taskFunction);
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
   * 执行任务（使用提供的函数）
   */
  private async executeTaskWithFunction(
    taskName: string,
    taskFunction: () => Promise<void>,
  ): Promise<void> {
    const startTime = Date.now();
    this.logger.info(`Executing task: ${taskName}`);

    try {
      await taskFunction();
      const duration = Date.now() - startTime;
      this.logger.info(`Task completed: ${taskName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Task failed: ${taskName} (${duration}ms):`, error);
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
    const taskFunction = await this.loadTaskFunction(taskName);
    await this.executeTaskWithFunction(taskName, taskFunction);
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
