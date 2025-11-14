import { NextRequest, NextResponse } from 'next/server';
import { foodRepository } from '@/lib/repositories/food-repository-singleton';

/**
 * GET /api/foods/popular
 * 获取热门食材（按创建时间排序）
 *
 * 使用双写框架迁移
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const foods = await foodRepository.decorateMethod('findPopular', limit);

    return NextResponse.json(
      {
        foods,
        total: foods.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取热门食材失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
