import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@/lib/repositories/types/notification';

/**
 * Utility functions for notifications (migrated from NotificationUtils)
 */
const NotificationFormatters = {
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(date).toLocaleDateString('zh-CN');
  },

  getTypeIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      CHECK_IN_REMINDER: '📝',
      TASK_NOTIFICATION: '📋',
      EXPIRY_ALERT: '⏰',
      BUDGET_WARNING: '💰',
      HEALTH_ALERT: '⚠️',
      GOAL_ACHIEVEMENT: '🎉',
      FAMILY_ACTIVITY: '👨‍👩‍👧‍👦',
      SYSTEM_ANNOUNCEMENT: '📢',
      MARKETING: '🎯',
      OTHER: '📄',
    };
    return iconMap[type] || '📄';
  },

  getTypeName(type: NotificationType): string {
    const nameMap: Record<NotificationType, string> = {
      CHECK_IN_REMINDER: '打卡提醒',
      TASK_NOTIFICATION: '任务通知',
      EXPIRY_ALERT: '过期提醒',
      BUDGET_WARNING: '预算预警',
      HEALTH_ALERT: '健康异常提醒',
      GOAL_ACHIEVEMENT: '目标达成',
      FAMILY_ACTIVITY: '家庭活动',
      SYSTEM_ANNOUNCEMENT: '系统公告',
      MARKETING: '营销通知',
      OTHER: '其他',
    };
    return nameMap[type] || '其他';
  },

  getPriorityColor(priority: NotificationPriority): string {
    const colorMap: Record<NotificationPriority, string> = {
      LOW: '#6c757d',
      MEDIUM: '#28a745',
      HIGH: '#ffc107',
      URGENT: '#dc3545',
    };
    return colorMap[priority] || '#6c757d';
  },

  formatContent(content: string, maxLength: number = 100): string {
    if (!content) return '';
    const formatted = content.replace(/\s+/g, ' ').trim();
    if (formatted.length > maxLength) {
      return `${formatted.substring(0, maxLength)}...`;
    }
    return formatted;
  },

  validateNotificationContent(title: string, content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!title || title.trim().length === 0) {
      errors.push('标题不能为空');
    } else if (title.length > 200) {
      errors.push('标题长度不能超过200字符');
    }

    if (!content || content.trim().length === 0) {
      errors.push('内容不能为空');
    } else if (content.length > 2000) {
      errors.push('内容长度不能超过2000字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

/**
 * GET /api/notifications
 * 获取用户通知列表
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type') as NotificationType | null;
    const status = searchParams.get('status') as NotificationStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeRead = searchParams.get('includeRead') === 'true';

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('memberId', memberId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters
    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (!includeRead) {
      query = query.is('readAt', null);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Format notifications
    const formattedNotifications = (notifications || []).map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      status: notification.status,
      priority: notification.priority,
      channels: Array.isArray(notification.channels)
        ? notification.channels
        : JSON.parse(notification.channels || '["IN_APP"]'),
      metadata: notification.metadata,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      sentAt: notification.sentAt,
      read: Boolean(notification.readAt),
      formattedTime: NotificationFormatters.formatTime(notification.createdAt),
      typeIcon: NotificationFormatters.getTypeIcon(notification.type as NotificationType),
      typeName: NotificationFormatters.getTypeName(notification.type as NotificationType),
      priorityColor: NotificationFormatters.getPriorityColor(notification.priority as NotificationPriority),
      formattedContent: NotificationFormatters.formatContent(notification.content),
    }));

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * 创建通知
 *
 * Migrated from Prisma to Supabase
 * Note: This simplified version only creates notification records in the database.
 * For full notification delivery (Email, SMS, WeChat, Push), use NotificationManager service.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      type,
      title,
      content,
      priority = 'MEDIUM' as NotificationPriority,
      channels = ['IN_APP'] as NotificationChannel[],
      metadata,
      actionUrl,
      actionText,
      dedupKey,
      batchId,
    } = body;

    // 验证必需字段
    if (!memberId || !type) {
      return NextResponse.json(
        { error: 'Member ID and type are required' },
        { status: 400 }
      );
    }

    // 验证通知类型
    const validTypes: NotificationType[] = [
      'CHECK_IN_REMINDER',
      'TASK_NOTIFICATION',
      'EXPIRY_ALERT',
      'BUDGET_WARNING',
      'HEALTH_ALERT',
      'GOAL_ACHIEVEMENT',
      'FAMILY_ACTIVITY',
      'SYSTEM_ANNOUNCEMENT',
      'MARKETING',
      'OTHER',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // 验证渠道
    if (channels && !Array.isArray(channels)) {
      return NextResponse.json(
        { error: 'Channels must be an array' },
        { status: 400 }
      );
    }

    // 验证通知内容
    if (title || content) {
      const validation = NotificationFormatters.validateNotificationContent(
        title || '',
        content || ''
      );
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Invalid content', details: validation.errors },
          { status: 400 }
        );
      }
    }

    const supabase = SupabaseClientManager.getInstance();

    // Check if member exists
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Prepare notification data
    const notificationData = {
      memberId,
      type,
      title: title || '',
      content: content || '',
      priority,
      channels: Array.isArray(channels) ? channels : ['IN_APP'],
      metadata: metadata || null,
      actionUrl: actionUrl || null,
      actionText: actionText || null,
      dedupKey: dedupKey || null,
      batchId: batchId || null,
      status: 'PENDING' as NotificationStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create notification
    const { data: notification, error: createError } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating notification:', createError);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        notificationId: notification.id,
        notification: {
          ...notification,
          channels: Array.isArray(notification.channels)
            ? notification.channels
            : JSON.parse(notification.channels || '["IN_APP"]'),
        },
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
