import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCheckInStats } from '@/lib/services/tracking/streak-manager';

/**
 * GET /api/tracking/streak/stats?memberId=xxx&period=week
 * 获取打卡统计
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
    const period = (searchParams.get('period') || 'week') as 'week' | 'month' | 'year';

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    const stats = await getCheckInStats(memberId, period);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching check-in stats:', error);

    return NextResponse.json(
      { error: '获取打卡统计失败' },
      { status: 500 }
    );
  }
}

