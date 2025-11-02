import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/meal-plans/meals/:mealId/ingredients/:ingredientId/replace
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string; ingredientId: string }> }
) {
  try {
    const { mealId, ingredientId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { newFoodId, newAmount } = body;

    if (!newFoodId || !newAmount) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证餐食权限
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        plan: {
          include: {
            member: {
              include: {
                family: {
                  select: {
                    creatorId: true,
                    members: {
                      where: { userId: session.user.id, deletedAt: null },
                      select: { role: true },
                    },
                  },
                },
              },
            },
          },
        },
        ingredients: {
          where: { id: ingredientId },
          include: { food: true },
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: '餐食不存在' }, { status: 404 });
    }

    const isCreator = meal.plan.member.family.creatorId === session.user.id;
    const isAdmin = meal.plan.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = meal.plan.member.userId === session.user.id;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    if (meal.ingredients.length === 0) {
      return NextResponse.json({ error: '食材不存在' }, { status: 404 });
    }

    const originalIngredient = meal.ingredients[0];

    // 验证新食材存在
    const newFood = await prisma.food.findUnique({
      where: { id: newFoodId },
    });

    if (!newFood) {
      return NextResponse.json({ error: '新食材不存在' }, { status: 404 });
    }

    // 更新食材
    const updatedIngredient = await prisma.mealIngredient.update({
      where: { id: ingredientId },
      data: {
        foodId: newFoodId,
        amount: newAmount,
      },
      include: {
        food: true,
      },
    });

    // 重新计算餐食营养
    const allIngredients = await prisma.mealIngredient.findMany({
      where: { mealId },
      include: { food: true },
    });

    const totalNutrition = allIngredients.reduce((acc, ing) => {
      const factor = ing.amount / 100; // 假设营养数据是每100g
      return {
        calories: acc.calories + (ing.food.calories || 0) * factor,
        protein: acc.protein + (ing.food.protein || 0) * factor,
        carbs: acc.carbs + (ing.food.carbs || 0) * factor,
        fat: acc.fat + (ing.food.fat || 0) * factor,
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // 更新餐食营养数据
    await prisma.meal.update({
      where: { id: mealId },
      data: {
        calories: totalNutrition.calories,
        protein: totalNutrition.protein,
        carbs: totalNutrition.carbs,
        fat: totalNutrition.fat,
      },
    });

    return NextResponse.json({
      message: '食材替换成功',
      originalIngredient: {
        id: originalIngredient.id,
        food: originalIngredient.food,
        amount: originalIngredient.amount,
      },
      newIngredient: updatedIngredient,
      updatedNutrition: totalNutrition,
    }, { status: 200 });

  } catch (error) {
    console.error('替换食材失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
