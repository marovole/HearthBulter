import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getWeightTrend,
  getSleepStats,
  getExerciseStats,
  getWaterStats,
} from '@/lib/services/tracking/auxiliary-tracker';

/**
 * GET /api/tracking/auxiliary/stats?memberId=xxx&type=weight&days=30
 * 获取辅助打卡统计数据
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
    const type = searchParams.get('type');
    const days = parseInt(searchParams.get('days') || '7');

    if (!memberId || !type) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'weight':
        result = await getWeightTrend(memberId, days);
        break;

      case 'sleep':
        result = await getSleepStats(memberId, days);
        break;

      case 'exercise':
        result = await getExerciseStats(memberId, days);
        break;

      case 'water':
        result = await getWaterStats(memberId, days);
        break;

      default:
        return NextResponse.json(
          { error: '无效的统计类型' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching auxiliary stats:', error);

    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}

