export type NotificationType =
  | "CHECK_IN_REMINDER"
  | "TASK_NOTIFICATION"
  | "EXPIRY_ALERT"
  | "BUDGET_WARNING"
  | "HEALTH_ALERT"
  | "GOAL_ACHIEVEMENT"
  | "FAMILY_ACTIVITY"
  | "SYSTEM_ANNOUNCEMENT"
  | "MARKETING"
  | "OTHER";

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type NotificationStatus =
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export class NotificationUtils {
  /**
   * 格式化时间显示
   */
  static formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return "刚刚";
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString("zh-CN");
    }
  }

  /**
   * 获取通知类型图标
   */
  static getTypeIcon(type: NotificationType): string {
    const iconMap: { [key in NotificationType]?: string } = {
      CHECK_IN_REMINDER: "📝",
      TASK_NOTIFICATION: "📋",
      EXPIRY_ALERT: "⏰",
      BUDGET_WARNING: "💰",
      HEALTH_ALERT: "⚠️",
      GOAL_ACHIEVEMENT: "🎉",
      FAMILY_ACTIVITY: "👨‍👩‍👧‍👦",
      SYSTEM_ANNOUNCEMENT: "📢",
      MARKETING: "🎯",
      OTHER: "📄",
    };

    return iconMap[type] || "📄";
  }

  /**
   * 获取通知类型名称
   */
  static getTypeName(type: NotificationType): string {
    const nameMap: { [key in NotificationType]?: string } = {
      CHECK_IN_REMINDER: "打卡提醒",
      TASK_NOTIFICATION: "任务通知",
      EXPIRY_ALERT: "过期提醒",
      BUDGET_WARNING: "预算预警",
      HEALTH_ALERT: "健康异常提醒",
      GOAL_ACHIEVEMENT: "目标达成",
      FAMILY_ACTIVITY: "家庭活动",
      SYSTEM_ANNOUNCEMENT: "系统公告",
      MARKETING: "营销通知",
      OTHER: "其他",
    };

    return nameMap[type] || "其他";
  }

  /**
   * 获取优先级颜色
   */
  static getPriorityColor(priority: NotificationPriority): string {
    const colorMap: { [key in NotificationPriority]?: string } = {
      LOW: "#6c757d",
      MEDIUM: "#28a745",
      HIGH: "#ffc107",
      URGENT: "#dc3545",
    };

    return colorMap[priority] || "#6c757d";
  }

  /**
   * 获取优先级名称
   */
  static getPriorityName(priority: NotificationPriority): string {
    const nameMap: { [key in NotificationPriority]?: string } = {
      LOW: "低优先级",
      MEDIUM: "中优先级",
      HIGH: "高优先级",
      URGENT: "紧急",
    };

    return nameMap[priority] || "中优先级";
  }

  /**
   * 格式化通知内容
   */
  static formatContent(content: string, maxLength: number = 100): string {
    if (!content) return "";

    // 移除多余的空白字符
    const formatted = content.replace(/\s+/g, " ").trim();

    // 截断长内容
    if (formatted.length > maxLength) {
      return `${formatted.substring(0, maxLength)}...`;
    }

    return formatted;
  }

  /**
   * 验证通知内容
   */
  static validateNotificationContent(
    title: string,
    content: string,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证标题
    if (!title || title.trim().length === 0) {
      errors.push("标题不能为空");
    } else if (title.length > 200) {
      errors.push("标题长度不能超过200字符");
    }

    // 验证内容
    if (!content || content.trim().length === 0) {
      errors.push("内容不能为空");
    } else if (content.length > 2000) {
      errors.push("内容长度不能超过2000字符");
    }

    // 检查是否包含敏感词（简单实现）
    const sensitiveWords = ["测试", "test"];
    const combinedText = `${title} ${content}`.toLowerCase();

    for (const word of sensitiveWords) {
      if (combinedText.includes(word.toLowerCase())) {
        errors.push(`内容包含敏感词: ${word}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取状态名称
   */
  static getStatusName(status: NotificationStatus): string {
    const nameMap: { [key in NotificationStatus]?: string } = {
      PENDING: "待发送",
      SENDING: "发送中",
      SENT: "已发送",
      FAILED: "发送失败",
      CANCELLED: "已取消",
    };

    return nameMap[status] || "未知";
  }

  /**
   * 获取状态颜色
   */
  static getStatusColor(status: NotificationStatus): string {
    const colorMap: { [key in NotificationStatus]?: string } = {
      PENDING: "#6c757d",
      SENDING: "#17a2b8",
      SENT: "#28a745",
      FAILED: "#dc3545",
      CANCELLED: "#6c757d",
    };

    return colorMap[status] || "#6c757d";
  }

  /**
   * 获取统计摘要
   */
  static getStatsSummary(stats: any): {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    successRate: number;
    averagePerDay: number;
  } {
    const total = stats.total || 0;
    const sent = stats.sent || 0;
    const failed = stats.failed || 0;
    const pending = stats.pending || 0;

    return {
      total,
      sent,
      failed,
      pending,
      successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
      averagePerDay: Math.round(total / 30), // 假设30天统计
    };
  }

  /**
   * 按类型分组通知
   */
  static groupByType(notifications: any[]): Record<string, any[]> {
    return notifications.reduce((groups, notification) => {
      const type = notification.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
      return groups;
    }, {});
  }

  /**
   * 按优先级分组通知
   */
  static groupByPriority(notifications: any[]): Record<string, any[]> {
    return notifications.reduce((groups, notification) => {
      const priority = notification.priority;
      if (!groups[priority]) {
        groups[priority] = [];
      }
      groups[priority].push(notification);
      return groups;
    }, {});
  }

  /**
   * 过滤未读通知
   */
  static filterUnread(notifications: any[]): any[] {
    return notifications.filter((notification) => !notification.readAt);
  }

  /**
   * 过滤紧急通知
   */
  static filterUrgent(notifications: any[]): any[] {
    return notifications.filter(
      (notification) => notification.priority === "URGENT",
    );
  }

  /**
   * 生成通知预览
   */
  static generatePreview(
    type: NotificationType,
    data: any = {},
  ): {
    title: string;
    content: string;
    icon: string;
    priority: NotificationPriority;
  } {
    const previews: {
      [key in NotificationType]?: {
        title: string;
        content: string;
        icon: string;
        priority: NotificationPriority;
      };
    } = {
      CHECK_IN_REMINDER: {
        title: `打卡提醒 - ${data.userName || "用户"}`,
        content: `Hi ${data.userName || "用户"}, 该记录${data.mealType || "晚餐"}了！`,
        icon: "📝",
        priority: "MEDIUM",
      },
      TASK_NOTIFICATION: {
        title: "任务通知",
        content: `您有一个新任务：${data.taskTitle || "任务名称"}`,
        icon: "📋",
        priority: "MEDIUM",
      },
      EXPIRY_ALERT: {
        title: "过期提醒",
        content: `您的食材 ${data.foodName || "食材名称"} 即将过期`,
        icon: "⏰",
        priority: "HIGH",
      },
      BUDGET_WARNING: {
        title: "预算预警",
        content: `您的${data.budgetName || "预算"}已使用${data.usagePercentage || "80"}%`,
        icon: "💰",
        priority: "HIGH",
      },
      HEALTH_ALERT: {
        title: "健康异常提醒",
        content: `检测到您的${data.healthMetric || "健康指标"}出现异常`,
        icon: "⚠️",
        priority: "URGENT",
      },
      GOAL_ACHIEVEMENT: {
        title: "目标达成",
        content: `恭喜！您已达成目标：${data.goalTitle || "目标名称"}`,
        icon: "🎉",
        priority: "MEDIUM",
      },
      FAMILY_ACTIVITY: {
        title: "家庭活动",
        content: `${data.memberName || "家庭成员"} ${data.activityDescription || "进行了一项活动"}`,
        icon: "👨‍👩‍👧‍👦",
        priority: "LOW",
      },
      SYSTEM_ANNOUNCEMENT: {
        title: "系统公告",
        content: data.announcementContent || "系统公告内容",
        icon: "📢",
        priority: "MEDIUM",
      },
      MARKETING: {
        title: "优惠推荐",
        content: data.promotionContent || "推广内容",
        icon: "🎯",
        priority: "LOW",
      },
      OTHER: {
        title: "通知",
        content: data.notificationContent || "通知内容",
        icon: "📄",
        priority: "MEDIUM",
      },
    };

    return previews[type] || previews.OTHER!;
  }

  /**
   * 计算通知得分（用于排序）
   */
  static calculateNotificationScore(notification: any): number {
    let score = 0;

    const priorityScores: { [key in NotificationPriority]?: number } = {
      URGENT: 100,
      HIGH: 75,
      MEDIUM: 50,
      LOW: 25,
    };
    const priorityValue =
      priorityScores[notification.priority as NotificationPriority] ?? 0;
    score += priorityValue;

    const hoursSinceCreation =
      (Date.now() - notification.createdAt.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 50 - hoursSinceCreation);

    if (!notification.readAt) {
      score += 30;
    }

    return score;
  }

  /**
   * 排序通知
   */
  static sortNotifications(
    notifications: any[],
    sortBy: "priority" | "time" | "score" = "score",
  ): any[] {
    const sortedNotifications = [...notifications];

    switch (sortBy) {
    case "priority":
      return sortedNotifications.sort((a, b) => {
        const priorityOrder: { [key in NotificationPriority]?: number } = {
          URGENT: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        };
        const bScore = priorityOrder[b.priority as NotificationPriority] ?? 0;
        const aScore = priorityOrder[a.priority as NotificationPriority] ?? 0;
        return bScore - aScore;
      });

    case "time":
      return sortedNotifications.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

    case "score":
    default:
      return sortedNotifications.sort(
        (a, b) =>
          this.calculateNotificationScore(b) -
            this.calculateNotificationScore(a),
      );
    }
  }
}
