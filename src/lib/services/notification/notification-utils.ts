import { NotificationType, NotificationPriority, NotificationStatus } from '@prisma/client';

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
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  /**
   * 获取通知类型图标
   */
  static getTypeIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.CHECK_IN_REMINDER]: '📝',
      [NotificationType.TASK_NOTIFICATION]: '📋',
      [NotificationType.EXPIRY_ALERT]: '⏰',
      [NotificationType.BUDGET_WARNING]: '💰',
      [NotificationType.HEALTH_ALERT]: '⚠️',
      [NotificationType.GOAL_ACHIEVEMENT]: '🎉',
      [NotificationType.FAMILY_ACTIVITY]: '👨‍👩‍👧‍👦',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: '📢',
      [NotificationType.MARKETING]: '🎯',
      [NotificationType.OTHER]: '📄',
    };
    
    return iconMap[type] || '📄';
  }

  /**
   * 获取通知类型名称
   */
  static getTypeName(type: NotificationType): string {
    const nameMap: Record<NotificationType, string> = {
      [NotificationType.CHECK_IN_REMINDER]: '打卡提醒',
      [NotificationType.TASK_NOTIFICATION]: '任务通知',
      [NotificationType.EXPIRY_ALERT]: '过期提醒',
      [NotificationType.BUDGET_WARNING]: '预算预警',
      [NotificationType.HEALTH_ALERT]: '健康异常提醒',
      [NotificationType.GOAL_ACHIEVEMENT]: '目标达成',
      [NotificationType.FAMILY_ACTIVITY]: '家庭活动',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: '系统公告',
      [NotificationType.MARKETING]: '营销通知',
      [NotificationType.OTHER]: '其他',
    };
    
    return nameMap[type] || '其他';
  }

  /**
   * 获取优先级颜色
   */
  static getPriorityColor(priority: NotificationPriority): string {
    const colorMap: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: '#6c757d', // 灰色
      [NotificationPriority.MEDIUM]: '#28a745', // 绿色
      [NotificationPriority.HIGH]: '#ffc107', // 黄色
      [NotificationPriority.URGENT]: '#dc3545', // 红色
    };
    
    return colorMap[priority] || '#6c757d';
  }

  /**
   * 获取优先级名称
   */
  static getPriorityName(priority: NotificationPriority): string {
    const nameMap: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: '低优先级',
      [NotificationPriority.MEDIUM]: '中优先级',
      [NotificationPriority.HIGH]: '高优先级',
      [NotificationPriority.URGENT]: '紧急',
    };
    
    return nameMap[priority] || '中优先级';
  }

  /**
   * 格式化通知内容
   */
  static formatContent(content: string, maxLength: number = 100): string {
    if (!content) return '';
    
    // 移除多余的空白字符
    const formatted = content.replace(/\s+/g, ' ').trim();
    
    // 截断长内容
    if (formatted.length > maxLength) {
      return `${formatted.substring(0, maxLength)}...`;
    }
    
    return formatted;
  }

  /**
   * 验证通知内容
   */
  static validateNotificationContent(title: string, content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // 验证标题
    if (!title || title.trim().length === 0) {
      errors.push('标题不能为空');
    } else if (title.length > 200) {
      errors.push('标题长度不能超过200字符');
    }
    
    // 验证内容
    if (!content || content.trim().length === 0) {
      errors.push('内容不能为空');
    } else if (content.length > 2000) {
      errors.push('内容长度不能超过2000字符');
    }
    
    // 检查是否包含敏感词（简单实现）
    const sensitiveWords = ['测试', 'test'];
    const combinedText = (`${title} ${content}`).toLowerCase();
    
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
    const nameMap: Record<NotificationStatus, string> = {
      [NotificationStatus.PENDING]: '待发送',
      [NotificationStatus.SENDING]: '发送中',
      [NotificationStatus.SENT]: '已发送',
      [NotificationStatus.FAILED]: '发送失败',
      [NotificationStatus.CANCELLED]: '已取消',
    };
    
    return nameMap[status] || '未知';
  }

  /**
   * 获取状态颜色
   */
  static getStatusColor(status: NotificationStatus): string {
    const colorMap: Record<NotificationStatus, string> = {
      [NotificationStatus.PENDING]: '#6c757d', // 灰色
      [NotificationStatus.SENDING]: '#17a2b8', // 青色
      [NotificationStatus.SENT]: '#28a745', // 绿色
      [NotificationStatus.FAILED]: '#dc3545', // 红色
      [NotificationStatus.CANCELLED]: '#6c757d', // 灰色
    };
    
    return colorMap[status] || '#6c757d';
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
    return notifications.filter(notification => !notification.readAt);
  }

  /**
   * 过滤紧急通知
   */
  static filterUrgent(notifications: any[]): any[] {
    return notifications.filter(notification => 
      notification.priority === NotificationPriority.URGENT
    );
  }

  /**
   * 生成通知预览
   */
  static generatePreview(type: NotificationType, data: any = {}): {
    title: string;
    content: string;
    icon: string;
    priority: NotificationPriority;
  } {
    const previews: Record<NotificationType, any> = {
      [NotificationType.CHECK_IN_REMINDER]: {
        title: `打卡提醒 - ${data.userName || '用户'}`,
        content: `Hi ${data.userName || '用户'}, 该记录${data.mealType || '晚餐'}了！`,
        icon: '📝',
        priority: NotificationPriority.MEDIUM,
      },
      [NotificationType.TASK_NOTIFICATION]: {
        title: '任务通知',
        content: `您有一个新任务：${data.taskTitle || '任务名称'}`,
        icon: '📋',
        priority: NotificationPriority.MEDIUM,
      },
      [NotificationType.EXPIRY_ALERT]: {
        title: '过期提醒',
        content: `您的食材 ${data.foodName || '食材名称'} 即将过期`,
        icon: '⏰',
        priority: NotificationPriority.HIGH,
      },
      [NotificationType.BUDGET_WARNING]: {
        title: '预算预警',
        content: `您的${data.budgetName || '预算'}已使用${data.usagePercentage || '80'}%`,
        icon: '💰',
        priority: NotificationPriority.HIGH,
      },
      [NotificationType.HEALTH_ALERT]: {
        title: '健康异常提醒',
        content: `检测到您的${data.healthMetric || '健康指标'}出现异常`,
        icon: '⚠️',
        priority: NotificationPriority.URGENT,
      },
      [NotificationType.GOAL_ACHIEVEMENT]: {
        title: '目标达成',
        content: `恭喜！您已达成目标：${data.goalTitle || '目标名称'}`,
        icon: '🎉',
        priority: NotificationPriority.MEDIUM,
      },
      [NotificationType.FAMILY_ACTIVITY]: {
        title: '家庭活动',
        content: `${data.memberName || '家庭成员'} ${data.activityDescription || '进行了一项活动'}`,
        icon: '👨‍👩‍👧‍👦',
        priority: NotificationPriority.LOW,
      },
      [NotificationType.SYSTEM_ANNOUNCEMENT]: {
        title: '系统公告',
        content: data.announcementContent || '系统公告内容',
        icon: '📢',
        priority: NotificationPriority.MEDIUM,
      },
      [NotificationType.MARKETING]: {
        title: '优惠推荐',
        content: data.promotionContent || '推广内容',
        icon: '🎯',
        priority: NotificationPriority.LOW,
      },
      [NotificationType.OTHER]: {
        title: '通知',
        content: data.notificationContent || '通知内容',
        icon: '📄',
        priority: NotificationPriority.MEDIUM,
      },
    };
    
    return previews[type] || previews[NotificationType.OTHER];
  }

  /**
   * 计算通知得分（用于排序）
   */
  static calculateNotificationScore(notification: any): number {
    let score = 0;
    
    // 基于优先级
    const priorityScores = {
      [NotificationPriority.URGENT]: 100,
      [NotificationPriority.HIGH]: 75,
      [NotificationPriority.MEDIUM]: 50,
      [NotificationPriority.LOW]: 25,
    };
    score += priorityScores[notification.priority] || 0;
    
    // 基于时间（越新越重要）
    const hoursSinceCreation = (Date.now() - notification.createdAt.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 50 - hoursSinceCreation);
    
    // 基于未读状态
    if (!notification.readAt) {
      score += 30;
    }
    
    return score;
  }

  /**
   * 排序通知
   */
  static sortNotifications(notifications: any[], sortBy: 'priority' | 'time' | 'score' = 'score'): any[] {
    const sortedNotifications = [...notifications];
    
    switch (sortBy) {
    case 'priority':
      return sortedNotifications.sort((a, b) => {
        const priorityOrder = {
          [NotificationPriority.URGENT]: 4,
          [NotificationPriority.HIGH]: 3,
          [NotificationPriority.MEDIUM]: 2,
          [NotificationPriority.LOW]: 1,
        };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });
        
    case 'time':
      return sortedNotifications.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
        
    case 'score':
    default:
      return sortedNotifications.sort((a, b) => 
        this.calculateNotificationScore(b) - this.calculateNotificationScore(a)
      );
    }
  }
}
