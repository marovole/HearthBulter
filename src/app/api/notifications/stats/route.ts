import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * 通知统计端点
 *
 * Note: 此端点直接使用 Supabase，未使用双写框架，因为：
 * 1. 统计查询是只读操作，不涉及数据修改
 * 2. NotificationRepository 接口中没有统计相关方法
 * 3. 需要使用聚合查询优化性能
 */

/**
 * GET /api/notifications/stats - 获取通知统计信息
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 },
      );
    }

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 365' },
        { status: 400 },
      );
    }

    const supabase = SupabaseClientManager.getInstance();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 并行查询所有统计数据
    const [summary, dailyStats, channelStats] = await Promise.all([
      getSummaryStats(memberId, startDate),
      getDailyStats(memberId, 7), // 固定查询最近7天
      getChannelStats(memberId, startDate),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        unreadCount: summary.unread,
        dailyStats,
        channelStats,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification stats' },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 获取汇总统计
 */
async function getSummaryStats(memberId: string, startDate: Date) {
  const supabase = SupabaseClientManager.getInstance();

  // 查询所有通知状态
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('status, read_at')
    .eq('member_id', memberId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error('查询汇总统计失败:', error);
    return {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      read: 0,
      unread: 0,
    };
  }

  // 内存中聚合统计（比多次数据库查询更高效）
  const summary = {
    total: notifications?.length || 0,
    sent: 0,
    failed: 0,
    pending: 0,
    read: 0,
    unread: 0,
  };

  notifications?.forEach((notif: any) => {
    // 统计状态
    switch (notif.status) {
      case 'SENT':
        summary.sent++;
        break;
      case 'FAILED':
        summary.failed++;
        break;
      case 'PENDING':
      case 'SENDING':
        summary.pending++;
        break;
    }

    // 统计已读/未读
    if (notif.read_at) {
      summary.read++;
    } else {
      summary.unread++;
    }
  });

  return summary;
}

/**
 * 获取每日统计
 *
 * 优化：使用单次查询 + 内存分组，替代多次循环查询
 */
async function getDailyStats(memberId: string, days: number) {
  const supabase = SupabaseClientManager.getInstance();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // 一次性查询所有数据
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('status, created_at')
    .eq('member_id', memberId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error('查询每日统计失败:', error);
    return [];
  }

  // 初始化每日统计容器
  const dailyStatsMap: Record<
    string,
    {
      date: string;
      total: number;
      sent: number;
      failed: number;
      pending: number;
    }
  > = {};

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];

    dailyStatsMap[dateKey] = {
      date: dateKey,
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
    };
  }

  // 分组统计
  notifications?.forEach((notif: any) => {
    const dateKey = new Date(notif.created_at).toISOString().split('T')[0];
    const stats = dailyStatsMap[dateKey];

    if (stats) {
      stats.total++;

      switch (notif.status) {
        case 'SENT':
          stats.sent++;
          break;
        case 'FAILED':
          stats.failed++;
          break;
        case 'PENDING':
        case 'SENDING':
          stats.pending++;
          break;
      }
    }
  });

  // 转换为数组并按日期正序排列
  return Object.values(dailyStatsMap).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * 获取渠道使用统计
 *
 * 优化：使用单次查询 + 内存分组
 */
async function getChannelStats(memberId: string, startDate: Date) {
  const supabase = SupabaseClientManager.getInstance();

  // 首先获取该用户的通知ID列表
  const { data: notifications, error: notiError } = await supabase
    .from('notifications')
    .select('id')
    .eq('member_id', memberId)
    .gte('created_at', startDate.toISOString());

  if (notiError || !notifications || notifications.length === 0) {
    return {};
  }

  const notificationIds = notifications.map((n: any) => n.id);

  // 查询这些通知的日志（一次性查询）
  const { data: logs, error: logsError } = await supabase
    .from('notification_logs')
    .select('channel, status')
    .in('notification_id', notificationIds)
    .gte('sent_at', startDate.toISOString());

  if (logsError) {
    console.error('查询渠道统计失败:', logsError);
    return {};
  }

  // 内存中分组统计
  const channelStats: Record<
    string,
    {
      total: number;
      sent: number;
      failed: number;
      successRate: number;
    }
  > = {};

  logs?.forEach((log: any) => {
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

    if (log.status === 'SENT') {
      channelStats[channel].sent++;
    } else if (log.status === 'FAILED') {
      channelStats[channel].failed++;
    }
  });

  // 计算成功率
  Object.values(channelStats).forEach((stats) => {
    stats.successRate =
      stats.total > 0
        ? Math.round((stats.sent / stats.total) * 100 * 100) / 100 // 保留2位小数
        : 0;
  });

  return channelStats;
}
