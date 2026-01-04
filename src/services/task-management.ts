import { prisma } from "@/lib/db";
import { TaskCategory, TaskStatus, TaskPriority } from "@prisma/client";
import { hasPermission, Permission, FamilyMemberRole } from "@/lib/permissions";

// 任务管理服务
export class TaskManagementService {
  // 获取家庭任务列表
  static async getFamilyTasks(
    familyId: string,
    userId: string,
    filters?: {
      status?: TaskStatus;
      category?: TaskCategory;
      assigneeId?: string;
      priority?: TaskPriority;
      dueDate?: {
        from?: Date;
        to?: Date;
      };
    },
  ) {
    try {
      // 验证用户权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 构建查询条件
      const whereCondition: any = {
        familyId,
        deletedAt: null,
      };

      if (filters) {
        if (filters.status) whereCondition.status = filters.status;
        if (filters.category) whereCondition.category = filters.category;
        if (filters.assigneeId) whereCondition.assigneeId = filters.assigneeId;
        if (filters.priority) whereCondition.priority = filters.priority;
        if (filters.dueDate) {
          whereCondition.dueDate = {};
          if (filters.dueDate.from)
            whereCondition.dueDate.gte = filters.dueDate.from;
          if (filters.dueDate.to)
            whereCondition.dueDate.lte = filters.dueDate.to;
        }
      }

      // 获取任务列表
      const tasks = await prisma.task.findMany({
        where: whereCondition,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
      });

      // 添加权限信息
      const tasksWithPermissions = tasks.map((task) => ({
        ...task,
        permissions: {
          canUpdate: hasPermission(
            member.role,
            Permission.UPDATE_TASK,
            task.creatorId,
            member.id,
          ),
          canDelete: hasPermission(
            member.role,
            Permission.DELETE_TASK,
            task.creatorId,
            member.id,
          ),
          canAssign: hasPermission(member.role, Permission.ASSIGN_TASK),
          canComment: hasPermission(member.role, Permission.CREATE_COMMENT),
        },
      }));

      return tasksWithPermissions;
    } catch (error) {
      console.error("Error getting family tasks:", error);
      throw error;
    }
  }

  // 创建任务
  static async createTask(
    familyId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      category: TaskCategory;
      assigneeId?: string;
      priority?: TaskPriority;
      dueDate?: Date;
    },
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.CREATE_TASK)) {
        throw new Error("Insufficient permissions");
      }

      // 验证被分配人
      if (data.assigneeId) {
        const assignee = await prisma.familyMember.findFirst({
          where: {
            id: data.assigneeId,
            familyId,
            deletedAt: null,
          },
        });

        if (!assignee) {
          throw new Error("Assignee is not a family member");
        }
      }

      // 创建任务
      const task = await prisma.task.create({
        data: {
          familyId,
          title: data.title,
          description: data.description,
          category: data.category,
          assigneeId: data.assigneeId,
          creatorId: member.id,
          priority: data.priority || TaskPriority.MEDIUM,
          dueDate: data.dueDate,
          status: TaskStatus.TODO,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "TASK_CREATED", {
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        assigneeId: data.assigneeId,
      });

      return task;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  // 分配任务
  static async assignTask(
    familyId: string,
    userId: string,
    taskId: string,
    assigneeId: string,
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.ASSIGN_TASK)) {
        throw new Error("Insufficient permissions");
      }

      // 验证任务
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          familyId,
          deletedAt: null,
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // 验证被分配人
      const assignee = await prisma.familyMember.findFirst({
        where: {
          id: assigneeId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!assignee) {
        throw new Error("Assignee is not a family member");
      }

      // 更新任务分配
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: { assigneeId },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "TASK_UPDATED", {
        taskId: task.id,
        taskTitle: task.title,
        action: "ASSIGNED",
        assigneeName: assignee.name,
      });

      return updatedTask;
    } catch (error) {
      console.error("Error assigning task:", error);
      throw error;
    }
  }

  // 更新任务状态
  static async updateTaskStatus(
    familyId: string,
    userId: string,
    taskId: string,
    status: TaskStatus,
    note?: string,
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 验证任务
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          familyId,
          deletedAt: null,
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // 检查更新权限
      if (
        !hasPermission(
          member.role,
          Permission.UPDATE_TASK,
          task.creatorId,
          member.id,
        )
      ) {
        // 如果不是创建者，检查是否是分配人
        if (task.assigneeId !== member.id) {
          throw new Error("Insufficient permissions to update this task");
        }
      }

      // 准备更新数据
      const updateData: any = { status };

      // 根据状态更新时间字段
      const now = new Date();
      switch (status) {
      case TaskStatus.IN_PROGRESS:
        updateData.startedAt = now;
        break;
      case TaskStatus.COMPLETED:
        updateData.completedAt = now;
        break;
      case TaskStatus.CANCELLED:
        updateData.completedAt = now;
        break;
      }

      // 更新任务
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "TASK_UPDATED", {
        taskId: task.id,
        taskTitle: task.title,
        action: "STATUS_CHANGED",
        newStatus: status,
        note,
      });

      // 如果任务完成，记录完成活动
      if (status === TaskStatus.COMPLETED) {
        await this.logActivity(familyId, member.id, "TASK_COMPLETED", {
          taskId: task.id,
          taskTitle: task.title,
        });
      }

      return updatedTask;
    } catch (error) {
      console.error("Error updating task status:", error);
      throw error;
    }
  }

  // 更新任务
  static async updateTask(
    familyId: string,
    userId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string;
      category?: TaskCategory;
      priority?: TaskPriority;
      dueDate?: Date;
    },
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 验证任务
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          familyId,
          deletedAt: null,
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // 检查更新权限
      if (
        !hasPermission(
          member.role,
          Permission.UPDATE_TASK,
          task.creatorId,
          member.id,
        )
      ) {
        throw new Error("Insufficient permissions to update this task");
      }

      // 更新任务
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "TASK_UPDATED", {
        taskId: task.id,
        taskTitle: task.title,
        action: "DETAILS_CHANGED",
        changes: data,
      });

      return updatedTask;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  // 删除任务
  static async deleteTask(familyId: string, userId: string, taskId: string) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 验证任务
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          familyId,
          deletedAt: null,
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // 检查删除权限
      if (
        !hasPermission(
          member.role,
          Permission.DELETE_TASK,
          task.creatorId,
          member.id,
        )
      ) {
        throw new Error("Insufficient permissions to delete this task");
      }

      // 软删除任务
      await prisma.task.update({
        where: { id: taskId },
        data: {
          deletedAt: new Date(),
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "TASK_UPDATED", {
        taskId: task.id,
        taskTitle: task.title,
        action: "DELETED",
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }

  // 获取任务统计
  static async getTaskStats(familyId: string, userId: string) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 获取任务统计
      const tasks = await prisma.task.findMany({
        where: {
          familyId,
          deletedAt: null,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      const stats = {
        total: tasks.length,
        byStatus: {
          todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
          inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS)
            .length,
          completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED)
            .length,
          cancelled: tasks.filter((t) => t.status === TaskStatus.CANCELLED)
            .length,
        },
        byCategory: {} as Record<TaskCategory, number>,
        byPriority: {
          low: tasks.filter((t) => t.priority === TaskPriority.LOW).length,
          medium: tasks.filter((t) => t.priority === TaskPriority.MEDIUM)
            .length,
          high: tasks.filter((t) => t.priority === TaskPriority.HIGH).length,
          urgent: tasks.filter((t) => t.priority === TaskPriority.URGENT)
            .length,
        },
        overdue: tasks.filter(
          (t) =>
            t.dueDate &&
            t.dueDate < new Date() &&
            t.status !== TaskStatus.COMPLETED &&
            t.status !== TaskStatus.CANCELLED,
        ).length,
        dueToday: tasks.filter(
          (t) =>
            t.dueDate &&
            t.dueDate.toDateString() === new Date().toDateString() &&
            t.status !== TaskStatus.COMPLETED &&
            t.status !== TaskStatus.CANCELLED,
        ).length,
        byAssignee: {} as Record<
          string,
          { name: string; count: number; avatar?: string }
        >,
        byCreator: {} as Record<
          string,
          { name: string; count: number; avatar?: string }
        >,
      };

      // 按分类统计
      tasks.forEach((task) => {
        stats.byCategory[task.category] =
          (stats.byCategory[task.category] || 0) + 1;
      });

      // 按分配人统计
      tasks.forEach((task) => {
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
      });

      // 按创建人统计
      tasks.forEach((task) => {
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
    } catch (error) {
      console.error("Error getting task stats:", error);
      throw error;
    }
  }

  // 获取我的任务
  static async getMyTasks(
    familyId: string,
    userId: string,
    status?: TaskStatus,
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 获取分配给我的任务
      const whereCondition: any = {
        familyId,
        assigneeId: member.id,
        deletedAt: null,
      };

      if (status) {
        whereCondition.status = status;
      }

      const tasks = await prisma.task.findMany({
        where: whereCondition,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
      });

      return tasks;
    } catch (error) {
      console.error("Error getting my tasks:", error);
      throw error;
    }
  }

  // 辅助方法：记录活动
  private static async logActivity(
    familyId: string,
    memberId: string,
    activityType: string,
    metadata: any,
  ) {
    try {
      await prisma.activity.create({
        data: {
          familyId,
          memberId,
          activityType: activityType as any,
          title: this.getActivityTitle(activityType, metadata),
          description: this.getActivityDescription(activityType, metadata),
          metadata,
        },
      });
    } catch (error) {
      console.error("Error logging activity:", error);
      // 不抛出错误，避免影响主要操作
    }
  }

  private static getActivityTitle(activityType: string, metadata: any): string {
    switch (activityType) {
    case "TASK_CREATED":
      return "创建了任务";
    case "TASK_UPDATED":
      switch (metadata.action) {
      case "ASSIGNED":
        return "分配了任务";
      case "STATUS_CHANGED":
        return "更新了任务状态";
      case "DETAILS_CHANGED":
        return "更新了任务详情";
      case "DELETED":
        return "删除了任务";
      default:
        return "更新了任务";
      }
    case "TASK_COMPLETED":
      return "完成了任务";
    default:
      return "任务更新";
    }
  }

  private static getActivityDescription(
    activityType: string,
    metadata: any,
  ): string {
    switch (activityType) {
    case "TASK_CREATED":
    case "TASK_UPDATED":
    case "TASK_COMPLETED":
      return metadata.taskTitle || "";
    default:
      return "";
    }
  }
}
