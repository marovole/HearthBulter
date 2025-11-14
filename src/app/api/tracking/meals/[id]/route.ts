import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { mealTrackingRepository } from '@/lib/repositories/meal-tracking-repository-singleton';
import { z } from 'zod';

const updateMealLogSchema = z.object({
  foods: z
    .array(
      z.object({
        foodId: z.string(),
        amount: z.number().positive(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

/**
 * PATCH /api/tracking/meals/[id]
 * 更新餐饮记录
 *
 * 使用双写框架迁移
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = updateMealLogSchema.parse(body);

    // 使用 Repository 更新膳食记录
    // Repository 会自动重新计算营养（如果更新了食物列表）
    const mealLog = await mealTrackingRepository.decorateMethod('updateMealLog', id, validatedData);

    return NextResponse.json(mealLog);
  } catch (error) {
    console.error('Error updating meal log:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '无效的请求数据', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '更新餐饮记录失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tracking/meals/[id]
 * 软删除餐饮记录
 *
 * 使用双写框架迁移
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // 使用 Repository 软删除膳食记录
    await mealTrackingRepository.decorateMethod('deleteMealLog', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal log:', error);

    return NextResponse.json(
      { error: '删除餐饮记录失败' },
      { status: 500 }
    );
  }
}

