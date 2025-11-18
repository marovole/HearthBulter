import { NextRequest, NextResponse } from 'next/server';
import { foodRepository } from '@/lib/repositories/food-repository-singleton';
import type { FoodCategory } from '@prisma/client';

/**
 * 模块级别的单例 - 避免每次请求都重新创建
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
const validCategories: FoodCategory[] = [
  'VEGETABLES',
  'FRUITS',
  'GRAINS',
  'PROTEIN',
  'SEAFOOD',
  'DAIRY',
  'OILS',
  'SNACKS',
  'BEVERAGES',
  'OTHER',
];

/**
 * GET /api/foods/categories/:category
 * 按类别查询食物（支持分页）
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // 验证 category 是否有效
    if (!validCategories.includes(category as FoodCategory)) {
      return NextResponse.json({ error: '无效的食物分类' }, { status: 400 });
    }

    // 计算分页范围
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 使用双写框架并行查询食材列表和总数
    const [foods, total] = await Promise.all([
      foodRepository.listByCategory(category as FoodCategory, from, to),
      foodRepository.countByCategory(category as FoodCategory),
    ]);

    return NextResponse.json(
      {
        foods,
        total,
        page,
        limit,
        category,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('按类别查询食物失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
