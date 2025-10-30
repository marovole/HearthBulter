import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCheckInCalendar } from '@/lib/services/tracking/streak-manager';

/**
 * GET /api/tracking/streak/calendar?memberId=xxx&year=2024&month=1
 * 获取打卡日历
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
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!memberId || !year || !month) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const calendar = await getCheckInCalendar(
      memberId,
      parseInt(year),
      parseInt(month)
    );

    return NextResponse.json(calendar);
  } catch (error) {
    console.error('Error fetching calendar:', error);

    return NextResponse.json(
      { error: '获取打卡日历失败' },
      { status: 500 }
    );
  }
}

