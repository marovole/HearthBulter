import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { PrismaFoodRepository } from '@/lib/repositories/prisma/prisma-food-repository';
import { SupabaseFoodRepository } from '@/lib/repositories/supabase/supabase-food-repository';
import type { FoodRepository } from '@/lib/repositories/interfaces/food-repository';

/**
 * 模块级别的单例 - 避免每次请求都重新创建
 */
const supabaseClient = SupabaseClientManager.getInstance();
const foodRepository = createDualWriteDecorator<FoodRepository>(
  new PrismaFoodRepository(),
  new SupabaseFoodRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/foods/popular',
  }
);

/**
 * GET /api/foods/popular
 * 获取热门食材（按创建时间排序，未来可以改为按使用频率）
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
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
