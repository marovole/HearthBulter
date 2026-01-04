import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/api-auth';
import { checkAIRateLimit } from '@/lib/middleware/api-rate-limit';
import { recipeOptimizer } from '@/lib/services/ai/recipe-optimizer';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    const { userId } = authResult.context;

    const rateLimitResult = await checkAIRateLimit(
      userId,
      'ai_optimize_recipe',
    );
    if (!rateLimitResult.success) return rateLimitResult.response;

    const body = await request.json();
    const {
      recipeId,
      memberId,
      targetNutrition,
      preferences,
      season,
      optimizationLevel = 'moderate',
    } = body;

    if (!recipeId || !memberId) {
      return NextResponse.json(
        { error: 'Recipe ID and Member ID are required' },
        { status: 400 },
      );
    }

    // 验证用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        OR: [
          { userId },
          {
            family: {
              members: {
                some: {
                  userId,
                  role: 'ADMIN',
                },
              },
            },
          },
        ],
      },
      include: {
        dietaryPreference: true,
        allergies: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 },
      );
    }

    // 获取食谱数据
    // 注意：使用类型断言，因为 Supabase 适配器类型定义不完整
    const recipe = await (prisma as any).meal.findFirst({
      where: {
        id: recipeId,
        plan: {
          memberId,
        },
      },
      include: {
        ingredients: {
          include: {
            food: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // 转换食谱数据为优化器格式
    const recipeData = {
      id: recipe.id,
      name: `Meal ${recipe.date.toISOString().split('T')[0]} ${recipe.mealType}`,
      ingredients: recipe.ingredients.map((ing: any) => ({
        id: ing.id,
        name: ing.food.name,
        amount: ing.amount,
        unit: 'g',
      })),
      nutrition: {
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
      },
    };

    // 构建用户偏好
    const userPreferences = {
      dietary_restrictions: [],
      allergies: member.allergies.map((a: any) => a.allergenName),
      disliked_ingredients: [],
      preferred_cuisines: [],
      budget_level: 'medium' as const,
      cooking_skill: 'intermediate' as const,
      ...preferences,
    };

    // 添加饮食偏好限制
    if (member.dietaryPreference) {
      const pref = member.dietaryPreference;
      if (pref.isVegetarian)
        userPreferences.dietary_restrictions.push('vegetarian');
      if (pref.isVegan) userPreferences.dietary_restrictions.push('vegan');
      if (pref.isKeto) userPreferences.dietary_restrictions.push('keto');
      if (pref.isLowCarb) userPreferences.dietary_restrictions.push('low_carb');
    }

    // 设置默认营养目标
    const defaultTargetNutrition = targetNutrition || {
      calories: 600, // 单餐目标
      protein: 25,
      carbs: 45,
      fat: 20,
    };

    // 执行食谱优化
    const optimizationResult = await recipeOptimizer.optimizeRecipe(
      recipeData,
      defaultTargetNutrition,
      userPreferences,
      season,
    );

    // 保存优化建议到数据库
    const aiAdvice = await prisma.aiAdvice.create({
      data: {
        memberId,
        type: 'RECIPE_OPTIMIZATION',
        content: {
          originalRecipe: recipeData,
          optimization: optimizationResult,
          targetNutrition: defaultTargetNutrition,
          preferences: userPreferences,
        },
        prompt: `Recipe optimization for ${optimizationLevel} level with seasonal considerations`,
        tokens: 0,
      },
    });

    return NextResponse.json({
      adviceId: aiAdvice.id,
      optimization: optimizationResult,
      generatedAt: aiAdvice.generatedAt,
    });
  } catch (error) {
    logger.error('Recipe optimization API error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET 方法用于获取食材替代建议
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    const { userId } = authResult.context;

    const { searchParams } = new URL(request.url);
    const ingredient = searchParams.get('ingredient');
    const reason = searchParams.get('reason') || 'general_optimization';
    const memberId = searchParams.get('memberId');

    if (!ingredient || !memberId) {
      return NextResponse.json(
        { error: 'Ingredient and memberId are required' },
        { status: 400 },
      );
    }

    // 验证用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        OR: [
          { userId },
          {
            family: {
              members: {
                some: {
                  userId,
                  role: 'ADMIN',
                },
              },
            },
          },
        ],
      },
      include: {
        dietaryPreference: true,
        allergies: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 },
      );
    }

    // 构建用户偏好
    const userPreferences = {
      dietary_restrictions: [],
      allergies: member.allergies.map((a: any) => a.allergenName),
      disliked_ingredients: [],
      preferred_cuisines: [],
      budget_level: 'medium' as const,
      cooking_skill: 'intermediate' as const,
    };

    // 生成替代建议
    const substitutions = await recipeOptimizer.generateIngredientSubstitutions(
      ingredient,
      reason,
      [], // 可用食材列表
      ['营养均衡', '健康饮食'], // 营养要求
      userPreferences,
    );

    return NextResponse.json({ substitutions });
  } catch (error) {
    logger.error('Ingredient substitution API error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
