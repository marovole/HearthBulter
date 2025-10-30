import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getTrackingStreak,
  getCheckInStats,
  getCheckInCalendar,
  getFamilyStreakLeaderboard,
  checkAndUnlockBadges,
} from '@/lib/services/tracking/streak-manager';

/**
 * GET /api/tracking/streak?memberId=xxx
 * 获取连续打卡记录
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    const streak = await getTrackingStreak(memberId);

    return NextResponse.json(streak);
  } catch (error) {
    console.error('Error fetching streak:', error);

    return NextResponse.json(
      { error: '获取连续打卡记录失败' },
      { status: 500 }
    );
  }
}

