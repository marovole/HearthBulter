/**
 * Prisma 任务 Repository 占位实现
 *
 * 所有方法暂未实现,仅用于双写迁移期间占位
 *
 * @module prisma-task-repository
 */

import type { PrismaClient } from '@prisma/client';
import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  TaskDTO,
  TaskListQuery,
  TaskGetOptions,
  CreateTaskDTO,
  UpdateTaskDTO,
  UpdateTaskStatusDTO,
  TaskStatsDTO,
  TaskStatus,
} from '../types/task';
import type { TaskRepository } from '../interfaces/task-repository';

/**
 * Prisma 任务 Repository 占位实现
 *
 * 当前仅抛出未实现错误,后续将填充 Prisma 客户端逻辑
 */
export class PrismaTaskRepository implements TaskRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  /**
   * 查询任务列表
   */
  async listTasks(
    query: TaskListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<TaskDTO>> {
    return this.notImplemented('listTasks');
  }

  /**
   * 获取单个任务详情
   */
  async getTaskById(
    familyId: string,
    taskId: string,
    options?: TaskGetOptions,
  ): Promise<TaskDTO | null> {
    return this.notImplemented('getTaskById');
  }

  /**
   * 获取我的任务
   */
  async getMyTasks(
    familyId: string,
    memberId: string,
    status?: TaskStatus,
  ): Promise<TaskDTO[]> {
    return this.notImplemented('getMyTasks');
  }

  /**
   * 创建任务
   */
  async createTask(
    familyId: string,
    creatorId: string,
    payload: CreateTaskDTO,
  ): Promise<TaskDTO> {
    return this.notImplemented('createTask');
  }

  /**
   * 更新任务详情
   */
  async updateTask(
    familyId: string,
    taskId: string,
    payload: UpdateTaskDTO,
  ): Promise<TaskDTO> {
    return this.notImplemented('updateTask');
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    familyId: string,
    taskId: string,
    payload: UpdateTaskStatusDTO,
  ): Promise<TaskDTO> {
    return this.notImplemented('updateTaskStatus');
  }

  /**
   * 分配任务
   */
  async assignTask(
    familyId: string,
    taskId: string,
    assigneeId: string,
  ): Promise<TaskDTO> {
    return this.notImplemented('assignTask');
  }

  /**
   * 删除任务
   */
  async deleteTask(familyId: string, taskId: string): Promise<void> {
    return this.notImplemented('deleteTask');
  }

  /**
   * 获取任务统计
   */
  async getTaskStats(familyId: string): Promise<TaskStatsDTO> {
    return this.notImplemented('getTaskStats');
  }

  /**
   * 抛出未实现错误
   */
  private notImplemented(methodName: string): never {
    void this.client;
    throw new Error(`PrismaTaskRepository.${methodName} not implemented`);
  }
}
