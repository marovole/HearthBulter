import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  CreateTaskDTO,
  TaskDTO,
  TaskGetOptions,
  TaskListQuery,
  TaskMemberDTO,
  TaskStatsDTO,
  TaskStatus,
  UpdateTaskDTO,
  UpdateTaskStatusDTO,
} from "../types/task";
import type { TaskRepository } from "../interfaces/task-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const DEFAULT_LIMIT = 20;

export class ConvexTaskRepository implements TaskRepository {
  async listTasks(
    query: TaskListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<TaskDTO>> {
    const tasks = await convexClient.query<Doc<"tasks">[]>(api.tasks.list, {
      familyId: query.familyId as Id<"families">,
    });

    const filtered = tasks.filter((task) => {
      if (query.status && task.status !== query.status) return false;
      if (query.category && task.category !== query.category) return false;
      if (query.priority && task.priority !== query.priority) return false;
      if (query.assigneeId && task.assigneeId !== query.assigneeId) return false;
      if (query.creatorId && task.creatorId !== query.creatorId) return false;
      if (!query.includeDeleted && task.deletedAt) return false;

      if (query.dueDate?.from && task.dueDate) {
        if (task.dueDate < query.dueDate.from.getTime()) return false;
      }
      if (query.dueDate?.to && task.dueDate) {
        if (task.dueDate > query.dueDate.to.getTime()) return false;
      }

      return true;
    });

    const sorted = applyTaskSort(filtered, query);
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? DEFAULT_LIMIT;
    const items = sorted.slice(offset, offset + limit).map(mapTask);

    return {
      items,
      total: sorted.length,
      hasMore: offset + items.length < sorted.length,
    };
  }

  async getTaskById(
    familyId: string,
    taskId: string,
    _options?: TaskGetOptions
  ): Promise<TaskDTO | null> {
    const task = await convexClient.query<Doc<"tasks"> | null>(api.tasks.getById, {
      familyId: familyId as Id<"families">,
      taskId: taskId as Id<"tasks">,
    });

    return task ? mapTask(task) : null;
  }

  async getMyTasks(familyId: string, memberId: string, status?: TaskStatus): Promise<TaskDTO[]> {
    const tasks = await convexClient.query<Doc<"tasks">[]>(api.tasks.list, {
      familyId: familyId as Id<"families">,
    });

    return tasks
      .filter((task) => task.assigneeId === memberId)
      .filter((task) => (status ? task.status === status : true))
      .filter((task) => !task.deletedAt)
      .map(mapTask);
  }

  async createTask(familyId: string, creatorId: string, payload: CreateTaskDTO): Promise<TaskDTO> {
    const taskId = await convexClient.mutation(api.tasks.create, {
      familyId: familyId as Id<"families">,
      creatorId: creatorId as Id<"familyMembers">,
      title: payload.title,
      description: payload.description ?? undefined,
      category: payload.category,
      priority: payload.priority ?? "MEDIUM",
      assigneeId: payload.assigneeId ? (payload.assigneeId as Id<"familyMembers">) : undefined,
      dueDate: payload.dueDate?.getTime(),
    });

    const task = await convexClient.query<Doc<"tasks"> | null>(api.tasks.getById, {
      familyId: familyId as Id<"families">,
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      throw new Error("任务创建失败");
    }

    return mapTask(task);
  }

  async updateTask(familyId: string, taskId: string, payload: UpdateTaskDTO): Promise<TaskDTO> {
    await convexClient.mutation(api.tasks.update, {
      taskId: taskId as Id<"tasks">,
      title: payload.title,
      description: payload.description ?? undefined,
      category: payload.category,
      priority: payload.priority,
      dueDate: payload.dueDate?.getTime(),
    });

    const task = await convexClient.query<Doc<"tasks"> | null>(api.tasks.getById, {
      familyId: familyId as Id<"families">,
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      throw new Error("任务不存在");
    }

    return mapTask(task);
  }

  async updateTaskStatus(
    familyId: string,
    taskId: string,
    payload: UpdateTaskStatusDTO
  ): Promise<TaskDTO> {
    await convexClient.mutation(api.tasks.updateStatus, {
      taskId: taskId as Id<"tasks">,
      status: payload.status,
    });

    const task = await convexClient.query<Doc<"tasks"> | null>(api.tasks.getById, {
      familyId: familyId as Id<"families">,
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      throw new Error("任务不存在");
    }

    return mapTask(task);
  }

  async assignTask(familyId: string, taskId: string, assigneeId: string): Promise<TaskDTO> {
    await convexClient.mutation(api.tasks.assign, {
      taskId: taskId as Id<"tasks">,
      assigneeId: assigneeId as Id<"familyMembers">,
    });

    const task = await convexClient.query<Doc<"tasks"> | null>(api.tasks.getById, {
      familyId: familyId as Id<"families">,
      taskId: taskId as Id<"tasks">,
    });

    if (!task) {
      throw new Error("任务不存在");
    }

    return mapTask(task);
  }

  async deleteTask(familyId: string, taskId: string): Promise<void> {
    await convexClient.mutation(api.tasks.softDelete, {
      taskId: taskId as Id<"tasks">,
    });
  }

  async getTaskStats(familyId: string): Promise<TaskStatsDTO> {
    const stats = await convexClient.query<TaskStatsDTO>(api.tasks.stats, {
      familyId: familyId as Id<"families">,
    });

    return stats;
  }
}

function mapTask(task: Doc<"tasks">): TaskDTO {
  return {
    id: task._id,
    familyId: task.familyId,
    title: task.title,
    description: task.description ?? null,
    category: task.category as TaskDTO["category"],
    status: task.status as TaskDTO["status"],
    priority: task.priority as TaskDTO["priority"],
    assigneeId: task.assigneeId ?? null,
    creatorId: task.creatorId,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    startedAt: task.startedAt ? new Date(task.startedAt) : null,
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
    reminderSent: task.reminderSent ?? false,
    remindedAt: task.remindedAt ? new Date(task.remindedAt) : null,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
    assignee: null,
    creator: null,
    comments: undefined,
    commentCount: undefined,
  };
}

function mapTaskMember(member: Doc<"familyMembers">): TaskMemberDTO {
  return {
    id: member._id,
    name: member.name,
    avatar: member.avatar ?? null,
    role: member.role ?? undefined,
  };
}

function applyTaskSort(tasks: Doc<"tasks">[], query: TaskListQuery) {
  const sort = query.sort;
  if (!sort) {
    return [...tasks].sort((a, b) => {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
      const priorityDiff =
        (priorityOrder[a.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW"] ?? 2) -
        (priorityOrder[b.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW"] ?? 2);

      if (priorityDiff !== 0) return priorityDiff;

      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }

      return b.createdAt - a.createdAt;
    });
  }

  const direction = sort.direction === "asc" ? 1 : -1;
  const field = sort.field;
  return [...tasks].sort((a, b) => {
    const aValue = taskSortValue(a, field);
    const bValue = taskSortValue(b, field);
    if (aValue === bValue) return 0;
    return aValue > bValue ? direction : -direction;
  });
}

function taskSortValue(task: Doc<"tasks">, field: NonNullable<TaskListQuery["sort"]>["field"]) {
  switch (field) {
  case "priority":
    return task.priority ?? "MEDIUM";
  case "dueDate":
    return task.dueDate ?? 0;
  case "createdAt":
    return task.createdAt;
  case "updatedAt":
    return task.updatedAt;
  default:
    return task.createdAt;
  }
}
