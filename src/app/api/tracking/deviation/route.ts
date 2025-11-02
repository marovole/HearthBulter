import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  analyzeDailyDeviation,
  analyzePeriodDeviation,
  generateWeeklyReport,
  getRemainingMealSuggestion,
} from '@/lib/services/tracking/deviation-analyzer';

/**
 * GET /api/tracking/deviation?memberId=xxx&date=2024-01-01&type=daily
 * 获取营养偏差分析
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
    const date = searchParams.get('date');
    const type = searchParams.get('type') || 'daily';
    const days = searchParams.get('days');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
    case 'daily':
      {
        if (!date) {
          return NextResponse.json(
            { error: '缺少date参数' },
            { status: 400 }
          );
        }
        result = await analyzeDailyDeviation(memberId, new Date(date));
      }
      break;

    case 'period':
      {
        result = await analyzePeriodDeviation(
          memberId,
          days ? parseInt(days) : 7
        );
      }
      break;

    case 'weekly_report':
      {
        result = await generateWeeklyReport(memberId);
      }
      break;

    case 'remaining':
      {
        const targetDate = date ? new Date(date) : new Date();
        result = await getRemainingMealSuggestion(memberId, targetDate);
      }
      break;

    default:
      return NextResponse.json(
        { error: '无效的分析类型' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing deviation:', error);

    return NextResponse.json(
      { error: '分析营养偏差失败' },
      { status: 500 }
    );
  }
}

