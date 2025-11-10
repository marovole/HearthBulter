import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { mealPlanner } from '@/lib/services/meal-planner';
import { z } from 'zod';

// 创建食谱计划的验证 schema
const createMealPlanSchema = z.object({
  days: z.number().min(1).max(14).default(7), // 默认7天
  startDate: z.string().datetime().optional(), // ISO 8601 格式
});

/**
 * 验证用户是否有权限访问成员的膳食计划
 *
 * Migrated from Prisma to Supabase
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: any }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from('family_members')
    .select(`
      id,
      userId,
      familyId,
      family:families!inner(
        id,
        creatorId
      )
    `)
    .eq('id', memberId)
    .is('deletedAt', null)
    .single();

  if (!member) {
    return { hasAccess: false, member: null };
  }

  const isCreator = member.family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const { data: adminMember } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('familyId', member.familyId)
      .eq('userId', userId)
      .eq('role', 'ADMIN')
      .is('deletedAt', null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    member,
  };
}

/**
 * POST /api/members/:memberId/meal-plans
 * 生成新食谱计划
 *
 * Migrated from Prisma to Supabase (endpoint layer)
 * Note: mealPlanner service still uses Prisma
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess, member } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess || !member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = createMealPlanSchema.parse(body);

    const startDate = validatedData.startDate
      ? new Date(validatedData.startDate)
      : undefined;

    // 生成食谱计划
    // Note: mealPlanner service still uses Prisma for complex business logic
    const planData = await mealPlanner.generateMealPlan(
      memberId,
      validatedData.days,
      startDate
    );

    return NextResponse.json(
      {
        message: '食谱计划生成成功',
        plan: planData,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('生成食谱计划失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/members/:memberId/meal-plans
 * 查询历史食谱
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess, member } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess || !member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查询膳食计划
    const { data: mealPlans, error: plansError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (plansError) {
      console.error('查询膳食计划失败:', plansError);
      return NextResponse.json(
        { error: '查询膳食计划失败' },
        { status: 500 }
      );
    }

    if (!mealPlans || mealPlans.length === 0) {
      return NextResponse.json({ mealPlans: [] }, { status: 200 });
    }

    const planIds = mealPlans.map(p => p.id);

    // 查询所有相关的 meals
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .in('planId', planIds)
      .order('date', { ascending: true });

    if (mealsError) {
      console.error('查询膳食失败:', mealsError);
      return NextResponse.json(
        { error: '查询膳食失败' },
        { status: 500 }
      );
    }

    // 如果有 meals，查询所有相关的 ingredients
    let ingredients: any[] = [];
    let foods: any[] = [];

    if (meals && meals.length > 0) {
      const mealIds = meals.map(m => m.id);

      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('meal_ingredients')
        .select('*')
        .in('mealId', mealIds);

      if (ingredientsError) {
        console.error('查询食材失败:', ingredientsError);
      } else {
        ingredients = ingredientsData || [];
      }

      // 如果有 ingredients，查询所有相关的 foods
      if (ingredients.length > 0) {
        const foodIds = [...new Set(ingredients.map(i => i.foodId))];

        const { data: foodsData, error: foodsError } = await supabase
          .from('foods')
          .select('*')
          .in('id', foodIds);

        if (foodsError) {
          console.error('查询食物失败:', foodsError);
        } else {
          foods = foodsData || [];
        }
      }
    }

    // 手动组装数据
    const foodsMap = new Map(foods.map(f => [f.id, f]));
    const ingredientsMap = new Map<string, any[]>();

    ingredients.forEach(ingredient => {
      if (!ingredientsMap.has(ingredient.mealId)) {
        ingredientsMap.set(ingredient.mealId, []);
      }
      ingredientsMap.get(ingredient.mealId)!.push({
        ...ingredient,
        food: foodsMap.get(ingredient.foodId),
      });
    });

    const mealsMap = new Map<string, any[]>();
    meals?.forEach(meal => {
      if (!mealsMap.has(meal.planId)) {
        mealsMap.set(meal.planId, []);
      }
      mealsMap.get(meal.planId)!.push({
        ...meal,
        ingredients: ingredientsMap.get(meal.id) || [],
      });
    });

    // 组装最终数据
    const assembledMealPlans = mealPlans.map(plan => ({
      ...plan,
      meals: mealsMap.get(plan.id) || [],
    }));

    return NextResponse.json({ mealPlans: assembledMealPlans }, { status: 200 });
  } catch (error) {
    console.error('查询食谱计划失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
