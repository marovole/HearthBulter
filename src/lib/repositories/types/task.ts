/**
 * 任务管理域 DTO 类型定义
 *
 * 本模块定义任务管理系统相关的数据传输对象
 *
 * @module task
 */

import { z } from 'zod';
import type { SortInput } from './common';

/**
 * 任务状态枚举
 */
export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

/**
 * 任务分类枚举
 */
export const taskCategorySchema = z.enum([
  'SHOPPING',
  'COOKING',
  'CLEANING',
  'HEALTH',
  'EXERCISE',
  'OTHER',
]);
export type TaskCategory = z.infer<typeof taskCategorySchema>;

/**
 * 任务优先级枚举
 */
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

/**
 * 任务关联的成员信息
 */
export const taskMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  avatar: z.string().url().optional().nullable(),
  role: z.string().optional(),
});

export type TaskMemberDTO = z.infer<typeof taskMemberSchema>;

/**
 * 任务评论 DTO（简化版）
 */
export const taskCommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  author: taskMemberSchema,
  createdAt: z.coerce.date(),
});

export type TaskCommentDTO = z.infer<typeof taskCommentSchema>;

/**
 * 任务 DTO
 */
export const taskSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  category: taskCategorySchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  assigneeId: z.string().uuid().optional().nullable(),
  creatorId: z.string().uuid(),
  dueDate: z.coerce.date().optional().nullable(),
  startedAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  reminderSent: z.boolean(),
  remindedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable(),
  // 关联数据
  assignee: taskMemberSchema.optional().nullable(),
  creator: taskMemberSchema.optional().nullable(),
  comments: z.array(taskCommentSchema).optional(),
  commentCount: z.number().optional(),
});

export type TaskDTO = z.infer<typeof taskSchema>;

/**
 * 查询任务参数
 */
export interface TaskListQuery {
  /**
   * 家庭ID
   */
  familyId: string;
  /**
   * 过滤指定状态
   */
  status?: TaskStatus;
  /**
   * 过滤指定分类
   */
  category?: TaskCategory;
  /**
   * 过滤指定优先级
   */
  priority?: TaskPriority;
  /**
   * 过滤指定分配人
   */
  assigneeId?: string;
  /**
   * 过滤指定创建人
   */
  creatorId?: string;
  /**
   * 截止日期范围
   */
  dueDate?: {
    from?: Date;
    to?: Date;
  };
  /**
   * 是否包含已删除的任务
   */
  includeDeleted?: boolean;
  /**
   * 是否在结果中展开分配人信息
   */
  includeAssignee?: boolean;
  /**
   * 是否在结果中展开创建人信息
   */
  includeCreator?: boolean;
  /**
   * 是否在结果中展开评论
   */
  includeComments?: boolean;
  /**
   * 排序选项
   */
  sort?: SortInput<'priority' | 'dueDate' | 'createdAt' | 'updatedAt'>;
}

/**
 * 获取单个任务的选项
 */
export interface TaskGetOptions {
  /**
   * 是否展开分配人信息
   */
  includeAssignee?: boolean;
  /**
   * 是否展开创建人信息
   */
  includeCreator?: boolean;
  /**
   * 是否展开评论
   */
  includeComments?: boolean;
}

/**
 * 创建任务 DTO
 */
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: taskCategorySchema,
  priority: taskPrioritySchema.default('MEDIUM'),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
});

export type CreateTaskDTO = z.infer<typeof createTaskSchema>;

/**
 * 更新任务 DTO
 */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: taskCategorySchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

export type UpdateTaskDTO = z.infer<typeof updateTaskSchema>;

/**
 * 更新任务状态 DTO
 */
export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
  note: z.string().optional(),
});

export type UpdateTaskStatusDTO = z.infer<typeof updateTaskStatusSchema>;

/**
 * 任务统计 DTO
 */
export interface TaskStatsDTO {
  total: number;
  byStatus: {
    todo: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  byCategory: Record<TaskCategory, number>;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  overdue: number;
  dueToday: number;
  byAssignee: Record<string, { name: string; count: number; avatar?: string }>;
  byCreator: Record<string, { name: string; count: number; avatar?: string }>;
}
