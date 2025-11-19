import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mealTrackingRepository } from '@/lib/repositories/meal-tracking-repository-singleton';
import {

  getCheckInStats,
  getCheckInCalendar,
  getFamilyStreakLeaderboard,
  checkAndUnlockBadges,
} from '@/lib/services/tracking/streak-manager';

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';

/**
 * GET /api/tracking/streak?memberId=xxx
 * 获取连续打卡记录
 *
 * 使用双写框架迁移
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

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

    // 使用 Repository 获取连续打卡记录
    const streak = await mealTrackingRepository.getTrackingStreak(memberId);

    return NextResponse.json(streak);
  } catch (error) {
    console.error('Error fetching streak:', error);

    return NextResponse.json(
      { error: '获取连续打卡记录失败' },
      { status: 500 }
    );
  }
}

