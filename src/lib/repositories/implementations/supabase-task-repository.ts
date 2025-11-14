/**
 * Supabase 任务 Repository 实现
 *
 * @module supabase-task-repository
 */

import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { TaskRepository } from '../interfaces/task-repository';
import type {
  TaskDTO,
  TaskListQuery,
  TaskGetOptions,
  CreateTaskDTO,
  UpdateTaskDTO,
  UpdateTaskStatusDTO,
  TaskStatsDTO,
  TaskStatus,
  TaskMemberDTO,
  TaskCommentDTO,
  TaskCategory,
  TaskPriority,
} from '../types/task';
import type { PaginatedResult, PaginationInput } from '../types/common';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type FamilyMemberRow = Database['public']['Tables']['family_members']['Row'];
type CommentRow = Database['public']['Tables']['comments']['Row'];

/**
 * Supabase 任务 Repository 实现
 */
export class SupabaseTaskRepository implements TaskRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = '[SupabaseTaskRepository]';

  constructor(client: SupabaseClient<Database> = SupabaseClientManager.getInstance()) {
    this.client = client;
  }

  async listTasks(
    query: TaskListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<TaskDTO>> {
    const {
      familyId,
      status,
      category,
      priority,
      assigneeId,
      creatorId,
      dueDate,
      includeDeleted = false,
      includeAssignee = true,
      includeCreator = true,
      includeComments = false,
      sort,
    } = query;

    // 构建 select 字符串
    let selectStr = '*';
    if (includeAssignee) {
      selectStr += `, assignee:family_members!tasks_assignee_id_fkey(id, name, avatar, role)`;
    }
    if (includeCreator) {
      selectStr += `, creator:family_members!tasks_creator_id_fkey(id, name, avatar, role)`;
    }
    if (includeComments) {
      selectStr += `, comments(id, content, author:family_members(id, name, avatar), created_at)`;
    }

    // 构建查询
    let supabaseQuery = this.client
      .from('tasks')
      .select(selectStr, { count: 'exact' })
      .eq('family_id', familyId);

    // 应用筛选条件
    if (status) supabaseQuery = supabaseQuery.eq('status', status);
    if (category) supabaseQuery = supabaseQuery.eq('category', category);
    if (priority) supabaseQuery = supabaseQuery.eq('priority', priority);
    if (assigneeId) supabaseQuery = supabaseQuery.eq('assignee_id', assigneeId);
    if (creatorId) supabaseQuery = supabaseQuery.eq('creator_id', creatorId);
    if (!includeDeleted) supabaseQuery = supabaseQuery.is('deleted_at', null);

    // 截止日期范围
    if (dueDate) {
      if (dueDate.from) {
        supabaseQuery = supabaseQuery.gte('due_date', dueDate.from.toISOString());
      }
      if (dueDate.to) {
        supabaseQuery = supabaseQuery.lte('due_date', dueDate.to.toISOString());
      }
    }

    // 排序
    if (sort) {
      const direction = { ascending: sort.direction === 'asc' };
      supabaseQuery = supabaseQuery.order(this.mapSortField(sort.field), direction);
    } else {
      // 默认排序：优先级降序 -> 截止日期升序 -> 创建时间降序
      supabaseQuery = supabaseQuery
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
    }

    // 分页
    const offset = pagination?.offset || 0;
    const limit = pagination?.limit || 20;
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      this.handleError('listTasks', error);
    }

    const items = (data || []).map(row => this.mapTaskRow(row));

    return {
      items,
      total: count || 0,
      hasMore: offset + items.length < (count || 0),
    };
  }

  async getTaskById(
    familyId: string,
    taskId: string,
    options?: TaskGetOptions
  ): Promise<TaskDTO | null> {
    const { includeAssignee = true, includeCreator = true, includeComments = false } = options || {};

    // 构建 select 字符串
    let selectStr = '*';
    if (includeAssignee) {
      selectStr += `, assignee:family_members!tasks_assignee_id_fkey(id, name, avatar, role)`;
    }
    if (includeCreator) {
      selectStr += `, creator:family_members!tasks_creator_id_fkey(id, name, avatar, role)`;
    }
    if (includeComments) {
      selectStr += `, comments(id, content, author:family_members(id, name, avatar), created_at)`;
    }

    const { data, error } = await this.client
      .from('tasks')
      .select(selectStr)
      .eq('id', taskId)
      .eq('family_id', familyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      this.handleError('getTaskById', error);
    }

    if (!data) {
      return null;
    }

    return this.mapTaskRow(data);
  }

  async getMyTasks(
    familyId: string,
    memberId: string,
    status?: TaskStatus
  ): Promise<TaskDTO[]> {
    let query = this.client
      .from('tasks')
      .select(`
        *,
        creator:family_members!tasks_creator_id_fkey(id, name, avatar, role),
        comments(id, content, author:family_members(id, name, avatar), created_at)
      `)
      .eq('family_id', familyId)
      .eq('assignee_id', memberId)
      .is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      this.handleError('getMyTasks', error);
    }

    return (data || []).map(row => this.mapTaskRow(row));
  }

  async createTask(
    familyId: string,
    creatorId: string,
    payload: CreateTaskDTO
  ): Promise<TaskDTO> {
    const { data, error } = await this.client
      .from('tasks')
      .insert({
        family_id: familyId,
        creator_id: creatorId,
        title: payload.title,
        description: payload.description || null,
        category: payload.category,
        priority: payload.priority || 'MEDIUM',
        assignee_id: payload.assigneeId || null,
        due_date: payload.dueDate?.toISOString() || null,
        status: 'TODO',
        reminder_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        assignee:family_members!tasks_assignee_id_fkey(id, name, avatar, role),
        creator:family_members!tasks_creator_id_fkey(id, name, avatar, role)
      `)
      .single();

    if (error) {
      this.handleError('createTask', error);
    }

    return this.mapTaskRow(data!);
  }

  async updateTask(
    familyId: string,
    taskId: string,
    payload: UpdateTaskDTO
  ): Promise<TaskDTO> {
    const updateData: Partial<TaskRow> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.dueDate !== undefined) {
      updateData.due_date = payload.dueDate ? payload.dueDate.toISOString() : null;
    }

    const { data, error } = await this.client
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('family_id', familyId)
      .select(`
        *,
        assignee:family_members!tasks_assignee_id_fkey(id, name, avatar, role),
        creator:family_members!tasks_creator_id_fkey(id, name, avatar, role)
      `)
      .single();

    if (error) {
      this.handleError('updateTask', error);
    }

    return this.mapTaskRow(data!);
  }

  async updateTaskStatus(
    familyId: string,
    taskId: string,
    payload: UpdateTaskStatusDTO
  ): Promise<TaskDTO> {
    const updateData: Partial<TaskRow> = {
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    // 根据状态自动设置时间字段
    const now = new Date().toISOString();
    switch (payload.status) {
      case 'IN_PROGRESS':
        updateData.started_at = now;
        break;
      case 'COMPLETED':
      case 'CANCELLED':
        updateData.completed_at = now;
        break;
    }

    const { data, error } = await this.client
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('family_id', familyId)
      .select(`
        *,
        assignee:family_members!tasks_assignee_id_fkey(id, name, avatar, role),
        creator:family_members!tasks_creator_id_fkey(id, name, avatar, role)
      `)
      .single();

    if (error) {
      this.handleError('updateTaskStatus', error);
    }

    return this.mapTaskRow(data!);
  }

  async assignTask(
    familyId: string,
    taskId: string,
    assigneeId: string
  ): Promise<TaskDTO> {
    const { data, error } = await this.client
      .from('tasks')
      .update({
        assignee_id: assigneeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('family_id', familyId)
      .select(`
        *,
        assignee:family_members!tasks_assignee_id_fkey(id, name, avatar, role),
        creator:family_members!tasks_creator_id_fkey(id, name, avatar, role)
      `)
      .single();

    if (error) {
      this.handleError('assignTask', error);
    }

    return this.mapTaskRow(data!);
  }

  async deleteTask(familyId: string, taskId: string): Promise<void> {
    const { error } = await this.client
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('family_id', familyId);

    if (error) {
      this.handleError('deleteTask', error);
    }
  }

  async getTaskStats(familyId: string): Promise<TaskStatsDTO> {
    const { data: tasks, error } = await this.client
      .from('tasks')
      .select(`
        id,
        status,
        category,
        priority,
        due_date,
        assignee:family_members!tasks_assignee_id_fkey(id, name, avatar),
        creator:family_members!tasks_creator_id_fkey(id, name, avatar)
      `)
      .eq('family_id', familyId)
      .is('deleted_at', null);

    if (error) {
      this.handleError('getTaskStats', error);
    }

    const taskList = tasks || [];

    // 初始化统计对象
    const stats: TaskStatsDTO = {
      total: taskList.length,
      byStatus: {
        todo: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      },
      byCategory: {
        SHOPPING: 0,
        COOKING: 0,
        CLEANING: 0,
        HEALTH: 0,
        EXERCISE: 0,
        OTHER: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      overdue: 0,
      dueToday: 0,
      byAssignee: {},
      byCreator: {},
    };

    const now = new Date();
    const today = now.toDateString();

    taskList.forEach((task: any) => {
      // 按状态统计
      const statusKey = task.status.toLowerCase().replace('_', '') as keyof typeof stats.byStatus;
      if (stats.byStatus[statusKey] !== undefined) {
        stats.byStatus[statusKey]++;
      }

      // 按分类统计
      stats.byCategory[task.category as TaskCategory]++;

      // 按优先级统计
      const priorityKey = task.priority.toLowerCase() as keyof typeof stats.byPriority;
      if (stats.byPriority[priorityKey] !== undefined) {
        stats.byPriority[priorityKey]++;
      }

      // 过期任务统计
      if (
        task.due_date &&
        new Date(task.due_date) < now &&
        task.status !== 'COMPLETED' &&
        task.status !== 'CANCELLED'
      ) {
        stats.overdue++;
      }

      // 今日到期任务统计
      if (
        task.due_date &&
        new Date(task.due_date).toDateString() === today &&
        task.status !== 'COMPLETED' &&
        task.status !== 'CANCELLED'
      ) {
        stats.dueToday++;
      }

      // 按分配人统计
      if (task.assignee) {
        const key = task.assignee.id;
        if (!stats.byAssignee[key]) {
          stats.byAssignee[key] = {
            name: task.assignee.name,
            count: 0,
            avatar: task.assignee.avatar,
          };
        }
        stats.byAssignee[key].count++;
      }

      // 按创建人统计
      if (task.creator) {
        const key = task.creator.id;
        if (!stats.byCreator[key]) {
          stats.byCreator[key] = {
            name: task.creator.name,
            count: 0,
            avatar: task.creator.avatar,
          };
        }
        stats.byCreator[key].count++;
      }
    });

    return stats;
  }

  // ==================== 辅助方法 ====================

  /**
   * 映射排序字段名
   */
  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      priority: 'priority',
      dueDate: 'due_date',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };
    return fieldMap[field] || 'created_at';
  }

  /**
   * 映射 TaskRow -> TaskDTO
   */
  private mapTaskRow(row: TaskRow): TaskDTO {
    const rowWithRelations = row as any;

    return {
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      description: row.description || undefined,
      category: row.category as any,
      status: row.status as any,
      priority: row.priority as any,
      assigneeId: row.assignee_id || undefined,
      creatorId: row.creator_id,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      reminderSent: row.reminder_sent,
      remindedAt: row.reminded_at ? new Date(row.reminded_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      assignee: rowWithRelations.assignee ? this.mapMemberRow(rowWithRelations.assignee) : undefined,
      creator: rowWithRelations.creator ? this.mapMemberRow(rowWithRelations.creator) : undefined,
      comments: rowWithRelations.comments
        ? rowWithRelations.comments.map((c: any) => this.mapCommentRow(c))
        : undefined,
      commentCount: rowWithRelations.comments ? rowWithRelations.comments.length : undefined,
    };
  }

  /**
   * 映射 MemberRow -> TaskMemberDTO
   */
  private mapMemberRow(row: any): TaskMemberDTO {
    return {
      id: row.id,
      name: row.name,
      avatar: row.avatar || undefined,
      role: row.role || undefined,
    };
  }

  /**
   * 映射 CommentRow -> TaskCommentDTO
   */
  private mapCommentRow(row: any): TaskCommentDTO {
    return {
      id: row.id,
      content: row.content,
      author: this.mapMemberRow(row.author),
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? 'Unknown Supabase error';
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`TaskRepository.${operation} failed: ${message}`);
  }
}
