/**
 * 任务 Repository 接口
 *
 * 提供任务管理系统所需的数据访问契约
 *
 * @module task-repository
 */

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

/**
 * 任务 Repository 接口
 *
 * 实施建议：
 * - 权限验证应该在业务层或中间件处理，Repository 专注数据访问
 * - 活动日志（Activity）的记录建议在 Service 层完成，避免 Repository 承担过多职责
 * - 嵌套数据（assignee, creator, comments）通过 include 选项控制，避免过度加载
 * - 软删除通过 deletedAt 字段实现
 */
export interface TaskRepository {
  /**
   * 查询任务列表
   *
   * 支持按状态、分类、优先级、分配人等多维度筛选
   *
   * @param query - 查询参数
   * @param pagination - 分页参数
   * @returns 分页的任务列表
   */
  listTasks(
    query: TaskListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<TaskDTO>>;

  /**
   * 获取单个任务详情
   *
   * 可按需展开关联数据（分配人、创建人、评论）
   *
   * @param familyId - 家庭ID
   * @param taskId - 任务ID
   * @param options - 数据展开选项
   * @returns 任务对象，不存在时返回 null
   */
  getTaskById(
    familyId: string,
    taskId: string,
    options?: TaskGetOptions,
  ): Promise<TaskDTO | null>;

  /**
   * 获取我的任务
   *
   * 查询分配给指定成员的任务
   *
   * @param familyId - 家庭ID
   * @param memberId - 成员ID
   * @param status - 可选的状态过滤
   * @returns 任务列表
   */
  getMyTasks(
    familyId: string,
    memberId: string,
    status?: TaskStatus,
  ): Promise<TaskDTO[]>;

  /**
   * 创建任务
   *
   * @param familyId - 家庭ID
   * @param creatorId - 创建人成员ID
   * @param payload - 创建参数
   * @returns 创建的任务对象
   */
  createTask(
    familyId: string,
    creatorId: string,
    payload: CreateTaskDTO,
  ): Promise<TaskDTO>;

  /**
   * 更新任务详情
   *
   * @param familyId - 家庭ID
   * @param taskId - 任务ID
   * @param payload - 更新参数
   * @returns 更新后的任务对象
   */
  updateTask(
    familyId: string,
    taskId: string,
    payload: UpdateTaskDTO,
  ): Promise<TaskDTO>;

  /**
   * 更新任务状态
   *
   * 自动记录状态转换时间（startedAt, completedAt）
   *
   * @param familyId - 家庭ID
   * @param taskId - 任务ID
   * @param payload - 状态更新参数
   * @returns 更新后的任务对象
   */
  updateTaskStatus(
    familyId: string,
    taskId: string,
    payload: UpdateTaskStatusDTO,
  ): Promise<TaskDTO>;

  /**
   * 分配任务
   *
   * @param familyId - 家庭ID
   * @param taskId - 任务ID
   * @param assigneeId - 分配人成员ID
   * @returns 更新后的任务对象
   */
  assignTask(
    familyId: string,
    taskId: string,
    assigneeId: string,
  ): Promise<TaskDTO>;

  /**
   * 删除任务（软删除）
   *
   * @param familyId - 家庭ID
   * @param taskId - 任务ID
   */
  deleteTask(familyId: string, taskId: string): Promise<void>;

  /**
   * 获取任务统计
   *
   * 提供多维度统计数据：按状态、分类、优先级、分配人、创建人
   *
   * @param familyId - 家庭ID
   * @returns 统计数据
   */
  getTaskStats(familyId: string): Promise<TaskStatsDTO>;
}
