/**
 * Task Generator Service
 * 任务生成引擎
 *
 * 根据规则自动生成任务，将系统提醒转换为可执行的任务
 *
 * @module task-generator-service
 */

import { prisma } from '@/lib/db';
import { taskService } from './task-service';
import { TaskCategory, TaskPriority } from '@prisma/client';
import { addDays, differenceInDays } from 'date-fns';

/**
 * 任务类型定义
 */
interface GeneratedTask {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  dueDate: Date | null;
  metadata: Record<string, unknown>;
}

/**
 * 任务生成规则配置
 */
interface GeneratorConfig {
  enabled: boolean;
  rules: {
    expiringInventoryDays: number; // 库存临期提醒天数
    healthCheckInTime: string; // 健康打卡提醒时间
    nutritionDeviationThreshold: number; // 营养偏差阈值（百分比）
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: GeneratorConfig = {
  enabled: true,
  rules: {
    expiringInventoryDays: 3, // 3天内过期
    healthCheckInTime: '08:00', // 早上8点
    nutritionDeviationThreshold: 20, // 偏差超过20%
  },
};

/**
 * Task Generator Service 类
 */
export class TaskGeneratorService {
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * 生成所有自动任务
   *
   * @param familyId 家庭ID
   * @returns 生成的任务列表
   */
  async generateTasks(familyId: string): Promise<GeneratedTask[]> {
    if (!this.config.enabled) {
      return [];
    }

    const generatedTasks: GeneratedTask[] = [];

    try {
      // 1. 检查库存临期
      const inventoryTasks = await this.checkExpiringInventory(familyId);
      generatedTasks.push(...inventoryTasks);

      // 2. 生成健康打卡提醒
      const healthTasks = await this.generateHealthCheckInTasks(familyId);
      generatedTasks.push(...healthTasks);

      // 3. 检查营养偏差
      const nutritionTasks = await this.checkNutritionDeviations();
      generatedTasks.push(...nutritionTasks);

      return generatedTasks;
    } catch {
      return [];
    }
  }

  /**
   * 检查库存临期情况并生成任务
   *
   * @param familyId 家庭ID
   * @returns 生成的任务列表
   */
  async checkExpiringInventory(familyId: string): Promise<GeneratedTask[]> {
    const tasks: GeneratedTask[] = [];

    try {
      // 查询即将过期的库存项
      const expiringItems = await prisma.inventoryItem.findMany({
        where: {
          familyId,
          deletedAt: null,
          expiryDate: {
            lte: addDays(
              new Date(),
              this.config.rules.expiringInventoryDays,
            ).toISOString(),
          },
        },
        include: {
          member: true,
        },
      });

      // 为每个临期项生成任务
      for (const item of expiringItems) {
        // 检查是否已经存在相关任务
        const existingTask = await prisma.task.findFirst({
          where: {
            relatedItemId: item.id,
            relatedItemType: 'INVENTORY',
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
        });

        if (existingTask) {
          continue; // 跳过已存在的任务
        }

        // 计算剩余天数
        const daysUntilExpiry = differenceInDays(
          new Date(item.expiryDate!),
          new Date(),
        );

        // 生成任务
        const task = await taskService.createTask(
          familyId,
          item.memberId || familyId, // 如果没有指定成员，使用家庭ID
          {
            title: `处理临期库存：${item.name}`,
            description: item.quantity
              ? `库存还剩 ${item.quantity} ${item.unit || ''}，将在 ${daysUntilExpiry} 天后过期`
              : `将在 ${daysUntilExpiry} 天后过期`,
            category: TaskCategory.SHOPPING,
            priority:
              daysUntilExpiry <= 1 ? TaskPriority.URGENT : TaskPriority.HIGH,
            dueDate: addDays(new Date(), Math.max(1, daysUntilExpiry - 1)),
            estimatedMinutes: 10,
            metadata: {
              reason: `库存将在 ${daysUntilExpiry} 天后过期`,
              evidence: {
                itemId: item.id,
                itemName: item.name,
                expiryDate: item.expiryDate,
                currentQuantity: item.quantity,
                daysUntilExpiry,
              },
              rule: 'EXPIRING_INVENTORY',
            },
            actionUrl: `/inventory/item/${item.id}`,
            relatedItemId: item.id,
            relatedItemType: 'INVENTORY',
          },
        );

        tasks.push(task);
      }
    } catch {}

    return tasks;
  }

  /**
   * 生成健康打卡提醒任务
   *
   * @param familyId 家庭ID
   * @returns 生成的任务列表
   */
  async generateHealthCheckInTasks(familyId: string): Promise<GeneratedTask[]> {
    const tasks: GeneratedTask[] = [];

    try {
      // 获取家庭成员
      const members = await prisma.familyMember.findMany({
        where: {
          familyId,
          deletedAt: null,
        },
      });

      for (const member of members) {
        // 检查今天是否已经存在健康打卡任务
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingTask = await prisma.task.findFirst({
          where: {
            assigneeId: member.id,
            category: TaskCategory.HEALTH,
            title: { contains: '健康打卡' },
            createdAt: {
              gte: today.toISOString(),
              lt: tomorrow.toISOString(),
            },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
        });

        if (existingTask) {
          continue; // 跳过已存在的任务
        }

        // 生成健康打卡任务
        const task = await taskService.createTask(familyId, member.id, {
          title: '记录今日健康数据',
          description: '记录体重、血压、睡眠等健康指标，保持健康数据连续性',
          category: TaskCategory.HEALTH,
          priority: TaskPriority.MEDIUM,
          dueDate: new Date(),
          estimatedMinutes: 5,
          metadata: {
            reason: '每日健康数据记录，保持数据连续性',
            evidence: {
              lastCheckIn: null, // TODO: 查询最后一次打卡时间
            },
            rule: 'HEALTH_CHECK_IN',
          },
          actionUrl: `/health-data/add?memberId=${member.id}`,
        });

        tasks.push(task);
      }
    } catch {}

    return tasks;
  }

  /**
   * 检查营养偏差并生成调整任务
   *
   * TODO: 实现营养偏差检查逻辑
   * @returns 生成的任务列表
   */
  async checkNutritionDeviations(): Promise<GeneratedTask[]> {
    const tasks: GeneratedTask[] = [];

    try {
      // TODO: 实现营养偏差检查逻辑
      // 这里需要：
      // 1. 获取每日营养目标
      // 2. 获取最近几天的实际摄入
      // 3. 计算偏差
      // 4. 如果偏差超过阈值，生成调整任务
      // 简化版：暂时返回空数组
      // 实际实现需要营养分析服务的支持
    } catch {}

    return tasks;
  }

  /**
   * 更新生成器配置
   *
   * @param config 新配置
   */
  updateConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   *
   * @returns 当前配置
   */
  getConfig(): GeneratorConfig {
    return { ...this.config };
  }
}

// 导出单例实例
export const taskGeneratorService = new TaskGeneratorService();
