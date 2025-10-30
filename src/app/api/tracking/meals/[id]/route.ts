import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateMealLog, deleteMealLog } from '@/lib/services/tracking/meal-tracker';
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
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = updateMealLogSchema.parse(body);

    const mealLog = await updateMealLog(params.id, validatedData);

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
 * 删除餐饮记录
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    await deleteMealLog(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal log:', error);

    return NextResponse.json(
      { error: '删除餐饮记录失败' },
      { status: 500 }
    );
  }
}

