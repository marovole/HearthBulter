import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecentFoods } from '@/lib/services/tracking/meal-tracker';

/**
 * GET /api/tracking/meals/recent-foods?memberId=xxx&days=7&limit=10&mealType=BREAKFAST
 * 获取最近常吃的食物
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
    const days = searchParams.get('days');
    const limit = searchParams.get('limit');
    const mealType = searchParams.get('mealType');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    const options: any = {};
    if (days) options.days = parseInt(days);
    if (limit) options.limit = parseInt(limit);
    if (mealType) options.mealType = mealType;

    const recentFoods = await getRecentFoods(memberId, options);

    return NextResponse.json({ recentFoods });
  } catch (error) {
    console.error('Error fetching recent foods:', error);

    return NextResponse.json(
      { error: '获取最近食物失败' },
      { status: 500 }
    );
  }
}

