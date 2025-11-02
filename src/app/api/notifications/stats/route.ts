import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NotificationManager, NotificationUtils } from '@/lib/services/notification';

const prisma = new PrismaClient();
const notificationManager = new NotificationManager(prisma);

// GET /api/notifications/stats - 获取通知统计信息
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

    // 获取用户通知统计
    const userStats = await notificationManager.getUserNotificationStats(memberId, days);
    
    // 获取未读数量
    const unreadCount = await notificationManager.getUnreadCount(memberId);

    // 格式化统计摘要
    const summary = NotificationUtils.getStatsSummary(userStats);

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

// 获取每日统计
async function getDailyStats(memberId: string, days: number) {
  const dailyStats = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const stats = await prisma.notification.groupBy({
      by: ['status'],
      where: {
        memberId,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const dayStats = {
      date: date.toISOString().split('T')[0],
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
    };

    stats.forEach(stat => {
      const count = stat._count.id;
      dayStats.total += count;

      switch (stat.status) {
      case 'SENT':
        dayStats.sent += count;
        break;
      case 'FAILED':
        dayStats.failed += count;
        break;
      case 'PENDING':
      case 'SENDING':
        dayStats.pending += count;
        break;
      }
    });

    dailyStats.unshift(dayStats); // 按时间正序排列
  }

  return dailyStats;
}

// 获取渠道使用统计
async function getChannelStats(memberId: string, days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.notificationLog.groupBy({
    by: ['channel', 'status'],
    where: {
      notification: {
        memberId,
      },
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
  });

  const channelStats: Record<string, {
    total: number;
    sent: number;
    failed: number;
    successRate: number;
  }> = {};

  logs.forEach(log => {
    const channel = log.channel;
    const count = log._count.id;

    if (!channelStats[channel]) {
      channelStats[channel] = {
        total: 0,
        sent: 0,
        failed: 0,
        successRate: 0,
      };
    }

    channelStats[channel].total += count;

    switch (log.status) {
    case 'SENT':
      channelStats[channel].sent += count;
      break;
    case 'FAILED':
      channelStats[channel].failed += count;
      break;
    }
  });

  // 计算成功率
  Object.keys(channelStats).forEach(channel => {
    const stats = channelStats[channel];
    stats.successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;
  });

  return channelStats;
}
