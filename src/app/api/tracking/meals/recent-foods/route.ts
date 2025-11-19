import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mealTrackingRepository } from '@/lib/repositories/meal-tracking-repository-singleton';

/**
 * GET /api/tracking/meals/recent-foods?memberId=xxx&limit=10
 * 获取最近常吃的食物
 *
 * 使用双写框架迁移
 * Note: Repository 当前只支持 memberId 和 limit 参数
 * 忽略 days 和 mealType 参数（Repository 默认查询最近30天）
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
    const memberId = searchParams.get('memberId');
    const limit = searchParams.get('limit');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    // 使用 Repository 获取最近常用食物
    const recentFoods = await mealTrackingRepository.getRecentFoods(
      memberId,
      limit ? parseInt(limit) : undefined
    );

    return NextResponse.json({ recentFoods });
  } catch (error) {
    console.error('Error fetching recent foods:', error);

    return NextResponse.json(
      { error: '获取最近食物失败' },
      { status: 500 }
    );
  }
}

