import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { mealPlanRepository } from '@/lib/repositories/meal-plan-repository-singleton';

// POST /api/meal-plans/meals/:mealId/ingredients/:ingredientId/replace
//
// 使用双写框架迁移（部分）

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
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

    // 验证餐食权限（保留 Prisma 权限验证）
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

    const supabase = SupabaseClientManager.getInstance();

    // 查询原始 ingredient
    const { data: originalIngredient, error: origError } = await supabase
      .from('meal_ingredients')
      .select('*, food:foods(*)')
      .eq('id', ingredientId)
      .eq('mealId', mealId)
      .maybeSingle();

    if (origError || !originalIngredient) {
      return NextResponse.json({ error: '食材不存在' }, { status: 404 });
    }

    // 验证新食材存在
    const { data: newFood, error: foodError } = await supabase
      .from('foods')
      .select('*')
      .eq('id', newFoodId)
      .maybeSingle();

    if (foodError || !newFood) {
      return NextResponse.json({ error: '新食材不存在' }, { status: 404 });
    }

    // 更新食材（使用 Supabase）
    const { data: updatedIngredient, error: updateError } = await supabase
      .from('meal_ingredients')
      .update({
        foodId: newFoodId,
        amount: newAmount,
      })
      .eq('id', ingredientId)
      .select('*, food:foods(*)')
      .single();

    if (updateError) {
      console.error('更新食材失败:', updateError);
      return NextResponse.json({ error: '更新食材失败' }, { status: 500 });
    }

    // 重新查询所有 ingredients 和对应的 foods
    const { data: allIngredients, error: ingredientsError } = await supabase
      .from('meal_ingredients')
      .select('*, food:foods(*)')
      .eq('mealId', mealId);

    if (ingredientsError) {
      console.error('查询食材失败:', ingredientsError);
      return NextResponse.json({ error: '查询食材失败' }, { status: 500 });
    }

    // 计算总营养（假设营养数据是每100g）
    const totalNutrition = (allIngredients || []).reduce((acc, ing: any) => {
      const factor = ing.amount / 100;
      const food = ing.food;
      return {
        calories: acc.calories + (food?.calories || 0) * factor,
        protein: acc.protein + (food?.protein || 0) * factor,
        carbs: acc.carbs + (food?.carbs || 0) * factor,
        fat: acc.fat + (food?.fat || 0) * factor,
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // 使用 Repository 更新餐食营养数据
    await mealPlanRepository.decorateMethod('updateMeal', mealId, {
      calories: totalNutrition.calories,
      protein: totalNutrition.protein,
      carbs: totalNutrition.carbs,
      fat: totalNutrition.fat,
    });

    return NextResponse.json({
      message: '食材替换成功',
      originalIngredient: {
        id: originalIngredient.id,
        food: originalIngredient.food,
        amount: originalIngredient.amount,
      },
      newIngredient: {
        id: updatedIngredient.id,
        food: updatedIngredient.food,
        amount: updatedIngredient.amount,
      },
      updatedNutrition: totalNutrition,
    }, { status: 200 });

  } catch (error) {
    console.error('替换食材失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
