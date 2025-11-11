import { NextRequest, NextResponse } from 'next/server';
import { getDefaultContainer } from '@/lib/container/service-container';
import { NotificationUtils } from '@/lib/services/notification';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

const notificationManager = getDefaultContainer().getNotificationManager();

/**
 * GET /api/notifications/stats - 获取通知统计信息
 *
 * Migrated from Prisma to Supabase (partial - notificationManager still uses Prisma)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // 获取用户通知统计 (TODO: notificationManager methods need migration)
    // const userStats = await notificationManager.getUserNotificationStats(memberId, days);

    // 获取未读数量
    // const unreadCount = await notificationManager.getUnreadCount(memberId);

    // 格式化统计摘要
    // const summary = NotificationUtils.getStatsSummary(userStats);

    // 临时实现：直接查询未读数量
    const supabase = SupabaseClientManager.getInstance();
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('memberId', memberId)
      .eq('status', 'SENT')
      .eq('isRead', false);

    const summary = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      read: 0,
      unread: unreadCount || 0,
    };

    // 获取最近7天的每日统计
    const dailyStats = await getDailyStats(memberId, 7);

    // 获取渠道使用统计
    const channelStats = await getChannelStats(memberId, days);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        unreadCount,
        dailyStats,
        channelStats,
        period: {
          days,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification stats' },
      { status: 500 }
    );
  }
}

/**
 * 获取每日统计
 * Migrated from Prisma to Supabase
 */
async function getDailyStats(memberId: string, days: number) {
  const dailyStats = [];
  const supabase = SupabaseClientManager.getInstance();

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    // 查询当天的所有通知
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('status')
      .eq('memberId', memberId)
      .gte('createdAt', date.toISOString())
      .lt('createdAt', nextDate.toISOString());

    if (error) {
      console.error('查询每日统计失败:', error);
      continue;
    }

    const dayStats = {
      date: date.toISOString().split('T')[0],
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
    };

    // 手动分组统计
    (notifications || []).forEach((notif: any) => {
      dayStats.total++;

      switch (notif.status) {
      case 'SENT':
        dayStats.sent++;
        break;
      case 'FAILED':
        dayStats.failed++;
        break;
      case 'PENDING':
      case 'SENDING':
        dayStats.pending++;
        break;
      }
    });

    dailyStats.unshift(dayStats); // 按时间正序排列
  }

  return dailyStats;
}

/**
 * 获取渠道使用统计
 * Migrated from Prisma to Supabase
 */
async function getChannelStats(memberId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const supabase = SupabaseClientManager.getInstance();

  // 首先获取该用户的所有通知ID
  const { data: notifications, error: notiError } = await supabase
    .from('notifications')
    .select('id')
    .eq('memberId', memberId);

  if (notiError || !notifications || notifications.length === 0) {
    return {};
  }

  const notificationIds = notifications.map((n: any) => n.id);

  // 查询这些通知的日志
  const { data: logs, error: logsError } = await supabase
    .from('notification_logs')
    .select('channel, status')
    .in('notificationId', notificationIds)
    .gte('createdAt', startDate.toISOString());

  if (logsError) {
    console.error('查询渠道统计失败:', logsError);
    return {};
  }

  const channelStats: Record<string, {
    total: number;
    sent: number;
    failed: number;
    successRate: number;
  }> = {};

  // 手动分组统计
  (logs || []).forEach((log: any) => {
    const channel = log.channel;

    if (!channelStats[channel]) {
      channelStats[channel] = {
        total: 0,
        sent: 0,
        failed: 0,
        successRate: 0,
      };
    }

    channelStats[channel].total++;

    switch (log.status) {
    case 'SENT':
      channelStats[channel].sent++;
      break;
    case 'FAILED':
      channelStats[channel].failed++;
      break;
    }
  });

  // 计算成功率
  Object.keys(channelStats).forEach(channel => {
    const stats = channelStats[channel];
    if (stats) {
      stats.successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;
    }
  });

  return channelStats;
}
