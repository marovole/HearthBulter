/**
 * Task Service
 * 任务业务逻辑层
 *
 * 封装任务管理的核心业务逻辑，包括创建、完成、跳过、查询等操作
 * 负责任务状态转换、活动日志记录等业务规则
 *
 * @module task-service
 */

import { prisma } from '@/lib/db';
import { taskRepository } from '@/lib/repositories/task-repository-singleton';
import type {
  TaskDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskStatus,
} from '@/lib/repositories/types/task';
import { TaskCategory, TaskPriority } from '@prisma/client';

/**
 * 任务创建时的扩展选项
 */
export interface CreateTaskOptions extends CreateTaskDTO {
  metadata?: Record<string, any>;
  actionUrl?: string;
  estimatedMinutes?: number;
  relatedItemId?: string;
  relatedItemType?: string;
}

/**
 * 今日焦点任务结果
 */
export interface TodayFocusResult {
  priority: TaskDTO[];
  normal: TaskDTO[];
  overdue: TaskDTO[];
}

/**
 * Task Service 类
 */
export class TaskService {
  /**
   * 创建任务
   *
   * @param familyId 家庭ID
   * @param creatorId 创建人成员ID
   * @param data 任务数据
   * @returns 创建的任务对象
   */
  async createTask(
    familyId: string,
    creatorId: string,
    data: CreateTaskOptions,
  ): Promise<TaskDTO> {
    const {
      metadata,
      actionUrl,
      estimatedMinutes,
      relatedItemId,
      relatedItemType,
      ...baseData
    } = data;

    // 使用 Repository 创建任务
    const task = await taskRepository.createTask(familyId, creatorId, {
      ...baseData,
      metadata,
      actionUrl,
      estimatedMinutes,
      relatedItemId,
      relatedItemType,
    } as any);

    // 记录活动日志
    await this.logActivity(familyId, creatorId, 'TASK_CREATED', {
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      assigneeId: data.assigneeId,
    });

    return task;
  }

  /**
   * 完成任务
   *
   * @param taskId 任务ID
   * @param memberId 操作人成员ID
   * @param note 完成备注（可选）
   * @returns 更新后的任务对象
   */
  async completeTask(
    taskId: string,
    memberId: string,
    note?: string,
  ): Promise<TaskDTO> {
    // 获取任务信息
    const task = await taskRepository.getTaskById('', taskId, {
      includeAssignee: true,
      includeCreator: true,
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // 更新任务状态为已完成
    const updatedTask = await taskRepository.updateTaskStatus(
      task.familyId,
      taskId,
      {
        status: 'COMPLETED' as TaskStatus,
        note,
      },
    );

    // 记录活动日志
    await this.logActivity(task.familyId, memberId, 'TASK_COMPLETED', {
      taskId: task.id,
      taskTitle: task.title,
      note,
    });

    return updatedTask;
  }

  /**
   * 跳过任务
   *
   * @param taskId 任务ID
   * @param memberId 操作人成员ID
   * @param reason 跳过原因（可选）
   * @returns 更新后的任务对象
   */
  async skipTask(
    taskId: string,
    memberId: string,
    reason?: string,
  ): Promise<TaskDTO> {
    // 获取任务信息
    const task = await taskRepository.getTaskById('', taskId, {
      includeAssignee: true,
      includeCreator: true,
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // 更新任务状态和跳过原因
    const now = new Date();
    const updatedTask = await taskRepository.updateTask(task.familyId, taskId, {
      status: 'CANCELLED' as TaskStatus,
      skipReason: reason,
      skippedAt: now,
      completedAt: now, // 跳过也记录完成时间
    } as any);

    // 记录活动日志
    await this.logActivity(task.familyId, memberId, 'TASK_SKIPPED', {
      taskId: task.id,
      taskTitle: task.title,
      skipReason: reason,
    });

    return updatedTask;
  }

  /**
   * 获取今日任务
   *
   * @param memberId 成员ID
   * @returns 今日任务列表
   */
  async getTodayTasks(memberId: string): Promise<TaskDTO[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 获取成员信息以获取 familyId
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyId: true },
    });

    if (!member) {
      return [];
    }

    // 查询分配给该成员的所有任务
    const allTasks = await taskRepository.listTasks({
      familyId: member.familyId,
      assigneeId: memberId,
    });

    // 过滤出今天的未完成任务
    const todayTasks = allTasks.items.filter((task) => {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
        return false;
      }

      if (!task.dueDate) {
        return false;
      }

      const dueDate = new Date(task.dueDate);
      return dueDate >= today && dueDate < tomorrow;
    });

    return todayTasks;
  }

  /**
   * 获取今日焦点（Next Best Action）
   *
   * 根据评分算法返回优先级最高的任务
   *
   * @param memberId 成员ID
   * @returns 今日焦点任务分组
   */
  async getTodayFocus(memberId: string): Promise<TodayFocusResult> {
    // 获取成员信息以获取 familyId
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyId: true },
    });

    if (!member) {
      return {
        priority: [],
        normal: [],
        overdue: [],
      };
    }

    // 获取所有未完成的任务
    const allTasks = await taskRepository.listTasks({
      familyId: member.familyId,
      assigneeId: memberId,
    });

    const pendingTasks = allTasks.items.filter(
      (task) => task.status !== 'COMPLETED' && task.status !== 'CANCELLED',
    );

    // 计算逾期任务
    const now = new Date();
    const overdueTasks = pendingTasks.filter((task) => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < now && task.status !== 'COMPLETED';
    });

    // 对任务进行评分和排序
    const scoredTasks = await this.scoreTasks(pendingTasks);

    // 分离高优先级和普通任务
    const priorityTasks = scoredTasks
      .filter((task) => task.priority === 'URGENT' || task.priority === 'HIGH')
      .slice(0, 2); // 最多 2 个高优先级任务

    const normalTasks = scoredTasks.filter(
      (task) => task.priority !== 'URGENT' && task.priority !== 'HIGH',
    );

    return {
      priority: priorityTasks,
      normal: normalTasks,
      overdue: overdueTasks,
    };
  }

  /**
   * 更新任务
   *
   * @param taskId 任务ID
   * @param data 更新数据
   * @returns 更新后的任务对象
   */
  async updateTask(taskId: string, data: UpdateTaskDTO): Promise<TaskDTO> {
    // 先获取任务以获取 familyId
    const task = await taskRepository.getTaskById('', taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    return taskRepository.updateTask(task.familyId, taskId, data);
  }

  /**
   * 删除任务（软删除）
   *
   * @param taskId 任务ID
   */
  async deleteTask(taskId: string): Promise<void> {
    const task = await taskRepository.getTaskById('', taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    await taskRepository.deleteTask(task.familyId, taskId);
  }

  /**
   * 为任务计算评分
   *
   * 评分因子：
   * - 紧迫性：截止时间距离现在的时间
   * - 重要性：优先级
   * - 难度：预计耗时
   * - 新鲜度：创建时间
   *
   * @param tasks 任务列表
   * @returns 评分并排序后的任务列表
   */
  private async scoreTasks(tasks: TaskDTO[]): Promise<TaskDTO[]> {
    const now = Date.now();

    const scoredTasks = tasks.map((task) => {
      let score = 0;

      // 1. 优先级评分（0-40分）
      const priorityScore =
        {
          URGENT: 40,
          HIGH: 30,
          MEDIUM: 20,
          LOW: 10,
        }[task.priority] || 20;
      score += priorityScore;

      // 2. 截止时间紧迫性（0-30分）
      if (task.dueDate) {
        const dueTime = new Date(task.dueDate).getTime();
        const hoursUntilDue = (dueTime - now) / (1000 * 60 * 60);

        if (hoursUntilDue < 0) {
          score += 30; // 已逾期
        } else if (hoursUntilDue < 24) {
          score += 25; // 24小时内
        } else if (hoursUntilDue < 72) {
          score += 15; // 3天内
        } else if (hoursUntilDue < 168) {
          score += 5; // 1周内
        }
      }

      // 3. 难度评分（0-20分，越简单分数越高）
      if (task.estimatedMinutes) {
        if (task.estimatedMinutes <= 5) {
          score += 20;
        } else if (task.estimatedMinutes <= 15) {
          score += 15;
        } else if (task.estimatedMinutes <= 30) {
          score += 10;
        } else {
          score += 5;
        }
      }

      // 4. 新鲜度（0-10分，越新分数越高）
      const daysSinceCreation =
        (now - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 1) {
        score += 10;
      } else if (daysSinceCreation < 3) {
        score += 7;
      } else if (daysSinceCreation < 7) {
        score += 4;
      }

      // 将评分存入 metadata
      return {
        ...task,
        metadata: {
          ...((task.metadata as any) || {}),
          score,
          scoredAt: now,
        },
      };
    });

    // 按评分降序排序
    return scoredTasks.sort((a, b) => {
      const scoreA = (a.metadata as any)?.score || 0;
      const scoreB = (b.metadata as any)?.score || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * 记录活动日志
   *
   * @param familyId 家庭ID
   * @param memberId 成员ID
   * @param activityType 活动类型
   * @param metadata 元数据
   */
  private async logActivity(
    familyId: string,
    memberId: string,
    activityType: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      await prisma.activity.create({
        data: {
          familyId,
          memberId,
          activityType: activityType as any,
          title: this.getActivityTitle(activityType),
          description: metadata.taskTitle || '',
          metadata,
        },
      });
    } catch (error) {
      // 不抛出错误，避免影响主要操作
    }
  }

  /**
   * 获取活动标题
   *
   * @param activityType 活动类型
   * @returns 活动标题
   */
  private getActivityTitle(activityType: string): string {
    const titles: Record<string, string> = {
      TASK_CREATED: '创建了任务',
      TASK_COMPLETED: '完成了任务',
      TASK_SKIPPED: '跳过了任务',
      TASK_UPDATED: '更新了任务',
    };

    return titles[activityType] || '任务操作';
  }
}

// 导出单例实例
export const taskService = new TaskService();
