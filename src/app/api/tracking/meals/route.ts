import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mealTrackingRepository } from '@/lib/repositories/meal-tracking-repository-singleton';
import { z } from 'zod';


// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
const createMealLogSchema = z.object({
  memberId: z.string(),
  date: z.string().transform((val) => new Date(val)),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  foods: z.array(
    z.object({
      foodId: z.string(),
      amount: z.number().positive(),
    })
  ),
  notes: z.string().optional(),
});

/**
 * POST /api/tracking/meals
 * 创建餐饮记录
 *
 * 使用双写框架迁移
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = createMealLogSchema.parse(body);

    // 使用 Repository 创建膳食记录
    // Repository 会自动：计算营养、创建记录、更新连续打卡
    const mealLog = await mealTrackingRepository.createMealLog(validatedData);

    return NextResponse.json(mealLog, { status: 201 });
  } catch (error) {
    console.error('Error creating meal log:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的请求数据', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建餐饮记录失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tracking/meals?memberId=xxx&period=today|history&startDate=xxx&endDate=xxx
 * 获取餐饮记录
 *
 * 使用双写框架迁移
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
    const period = searchParams.get('period') || 'today';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    if (period === 'today') {
      // 使用 Repository 获取今日记录
      const logs = await mealTrackingRepository.getTodayMealLogs(memberId);
      return NextResponse.json({ logs });
    } else {
      // 使用 Repository 获取历史记录
      const filter: any = {};
      if (startDate) filter.startDate = new Date(startDate);
      if (endDate) filter.endDate = new Date(endDate);

      const pagination: any = {};
      if (limit) pagination.limit = parseInt(limit);
      if (offset) pagination.offset = parseInt(offset);

      const result = await mealTrackingRepository.getMealLogHistory(
        memberId,
        Object.keys(filter).length > 0 ? filter : undefined,
        Object.keys(pagination).length > 0 ? pagination : undefined
      );

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching meal logs:', error);

    return NextResponse.json(
      { error: '获取餐饮记录失败' },
      { status: 500 }
    );
  }
}

