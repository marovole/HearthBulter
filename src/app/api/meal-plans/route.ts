import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/meal-plans?startDate=...&endDate=...
// Returns the most recent active meal plan for the authenticated user that overlaps the range.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const rangeStart = startDateParam ? new Date(startDateParam) : undefined;
    const rangeEnd = endDateParam ? new Date(endDateParam) : undefined;

    // Find latest plan for any member belonging to this user
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        deletedAt: null,
        member: { userId: session.user.id, deletedAt: null },
        ...(rangeStart && rangeEnd
          ? {
            // overlap condition: plan.start <= rangeEnd AND plan.end >= rangeStart
            startDate: { lte: rangeEnd },
            endDate: { gte: rangeStart },
          }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        meals: {
          include: {
            ingredients: { include: { food: true } },
          },
          orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
        },
      },
    });

    if (!mealPlan) {
      return NextResponse.json({ message: '暂无食谱计划', plan: null }, { status: 200 });
    }

    // Shape minimal front-end expected structure
    return NextResponse.json(
      {
        id: mealPlan.id,
        startDate: mealPlan.startDate,
        endDate: mealPlan.endDate,
        goalType: mealPlan.goalType,
        targetCalories: mealPlan.targetCalories,
        targetProtein: mealPlan.targetProtein,
        targetCarbs: mealPlan.targetCarbs,
        targetFat: mealPlan.targetFat,
        meals: mealPlan.meals.map((m: any) => ({
          id: m.id,
          date: m.date,
          mealType: m.mealType,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          ingredients: m.ingredients.map((ing: any) => ({
            id: ing.id,
            amount: ing.amount,
            food: { id: ing.food.id, name: ing.food.name },
          })),
        })),
        nutritionSummary: null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取食谱计划失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
