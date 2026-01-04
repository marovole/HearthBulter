import {
  PrismaClient,
  Notification,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';

export class NotificationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建通知
   */
  async create(data: {
    memberId: string;
    type: NotificationType;
    title: string;
    content: string;
    priority?: any;
    channels: string;
    metadata?: any;
    actionUrl?: string;
    actionText?: string;
    dedupKey?: string;
    batchId?: string;
  }): Promise<Notification> {
    return await this.prisma.notification.create({
      data: {
        ...data,
        status: NotificationStatus.PENDING,
        metadata: data.metadata || undefined,
      },
    });
  }

  /**
   * 根据ID查找通知
   */
  async findById(id: string): Promise<Notification | null> {
    return await this.prisma.notification.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(
    memberId: string,
    options: {
      type?: NotificationType;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
      includeRead?: boolean;
    } = {},
  ) {
    const where: any = { memberId };

    if (options.type) {
      where.type = options.type;
    }

    if (!options.includeRead) {
      where.readAt = null;
    }

    if (options.status) {
      where.status = options.status;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
        include: {
          logs: {
            select: {
              channel: true,
              status: true,
              sentAt: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      hasMore: (options.offset || 0) + notifications.length < total,
    };
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, memberId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        memberId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
      },
    });
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(memberId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        memberId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  /**
   * 删除通知
   */
  async delete(notificationId: string, memberId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        memberId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(memberId: string): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        memberId,
        readAt: null,
        status: {
          in: [NotificationStatus.SENT, NotificationStatus.SENDING],
        },
      },
    });
  }

  /**
   * 更新通知状态
   */
  async updateStatus(id: string, status: NotificationStatus): Promise<void> {
    const updateData: any = { status };

    if (status === NotificationStatus.SENT) {
      updateData.sentAt = new Date();
    }

    await this.prisma.notification.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 更新发送结果
   */
  async updateDeliveryResults(id: string, results: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        deliveryResults: results,
      },
    });
  }

  /**
   * 安排重试
   */
  async scheduleRetry(id: string, nextRetryAt: Date): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        retryCount: {
          increment: 1,
        },
        nextRetryAt,
      },
    });
  }

  /**
   * 获取待重试的通知
   */
  async getPendingRetryNotifications(): Promise<Notification[]> {
    return await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: {
          lt: this.prisma.notification.fields.maxRetries,
        },
        nextRetryAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        nextRetryAt: 'asc',
      },
      take: 50, // 限制批次大小
    });
  }

  /**
   * 获取待发送的通知
   */
  async getPendingNotifications(limit: number = 50): Promise<Notification[]> {
    return await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });
  }

  /**
   * 获取用户通知统计
   */
  async getUserNotificationStats(memberId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.notification.groupBy({
      by: ['type', 'status'],
      where: {
        memberId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const result: Record<string, any> = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      byType: {},
    };

    stats.forEach((stat) => {
      const count = stat._count.id;
      result.total += count;

      switch (stat.status) {
        case NotificationStatus.SENT:
          result.sent += count;
          break;
        case NotificationStatus.FAILED:
          result.failed += count;
          break;
        case NotificationStatus.PENDING:
        case NotificationStatus.SENDING:
          result.pending += count;
          break;
      }

      if (!result.byType[stat.type]) {
        result.byType[stat.type] = {
          total: 0,
          sent: 0,
          failed: 0,
          pending: 0,
        };
      }

      result.byType[stat.type].total += count;
      result.byType[stat.type][stat.status.toLowerCase()] += count;
    });

    return result;
  }

  /**
   * 清理过期通知
   */
  async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: [
            NotificationStatus.SENT,
            NotificationStatus.FAILED,
            NotificationStatus.CANCELLED,
          ],
        },
      },
    });

    return result.count;
  }

  /**
   * 批量更新通知状态
   */
  async batchUpdateStatus(
    notificationIds: string[],
    status: NotificationStatus,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: {
          in: notificationIds,
        },
      },
      data: {
        status,
        ...(status === NotificationStatus.SENT ? { sentAt: new Date() } : {}),
      },
    });

    return result.count;
  }

  /**
   * 搜索通知
   */
  async searchNotifications(
    memberId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ) {
    const where: any = {
      memberId,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    };

    if (options.dateFrom) {
      where.createdAt = {
        ...where.createdAt,
        gte: options.dateFrom,
      };
    }

    if (options.dateTo) {
      where.createdAt = {
        ...where.createdAt,
        lte: options.dateTo,
      };
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      hasMore: (options.offset || 0) + notifications.length < total,
    };
  }
}
