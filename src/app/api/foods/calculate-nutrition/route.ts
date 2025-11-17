import { NextRequest, NextResponse } from 'next/server';
import { nutritionCalculator } from '@/lib/services/nutrition-calculator';
import { z } from 'zod';

/**
 * 营养计算请求验证schema
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
const calculateNutritionSchema = z.object({
  inputs: z
    .array(
      z.object({
        foodId: z.string(),
        amount: z.number().positive('重量必须大于0'),
      })
    )
    .min(1, '至少需要一个食物'),
});

/**
 * POST /api/foods/calculate-nutrition
 * 批量计算营养
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证输入
    const validation = calculateNutritionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: '输入数据无效',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { inputs } = validation.data;

    // 计算营养
    const summary = await nutritionCalculator.calculateBatch(inputs);

    return NextResponse.json(
      {
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('计算营养失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

