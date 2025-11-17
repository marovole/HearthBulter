import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFamilyStreakLeaderboard } from '@/lib/services/tracking/streak-manager';

/**
 * GET /api/tracking/streak/leaderboard?familyId=xxx
 * 获取家庭打卡排行榜
 *
 * Note: 暂时保留服务层调用
 * 这是跨家庭成员的聚合排行功能，超出单个 MealTracking Repository 的职责范围
 * 未来可考虑创建专门的 Leaderboard Repository
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
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
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json(
        { error: '缺少familyId参数' },
        { status: 400 }
      );
    }

    const leaderboard = await getFamilyStreakLeaderboard(familyId);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);

    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    );
  }
}

