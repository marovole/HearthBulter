import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { priceEstimator } from '@/lib/services/price-estimator';
import { shoppingListRepository } from '@/lib/repositories/shopping-list-repository-singleton';
import { z } from 'zod';

// 完成采购的验证 schema
const completeShoppingSchema = z.object({
  actualCost: z.number().min(0).optional(), // 实际花费（元）
});

/**
 * PATCH /api/shopping-lists/:id/complete
 * 完成采购
 *
 * 使用双写框架迁移
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json().catch(() => ({}));
    const validatedData = completeShoppingSchema.parse(body);

    const supabase = SupabaseClientManager.getInstance();

    // 查询购物清单并验证权限
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select(`
        id,
        actualCost,
        estimatedCost,
        planId,
        plan:meal_plans!inner(
          id,
          memberId,
          member:family_members!inner(
            id,
            userId,
            familyId,
            family:families!inner(
              id,
              creatorId
            )
          )
        )
      `)
      .eq('id', listId)
      .single();

    if (listError || !shoppingList) {
      return NextResponse.json({ error: '购物清单不存在' }, { status: 404 });
    }

    // Check if user is member of this family
    const { data: userMember } = await supabase
      .from('family_members')
      .select('role')
      .eq('familyId', shoppingList.plan.member.familyId)
      .eq('userId', session.user.id)
      .is('deletedAt', null)
      .maybeSingle();

    // 验证权限
    const isCreator = shoppingList.plan.member.family.creatorId === session.user.id;
    const isAdmin = userMember?.role === 'ADMIN' || isCreator;
    const isSelf = shoppingList.plan.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限完成该购物清单' },
        { status: 403 }
      );
    }

    // 使用 Repository 完成购物清单
    const updatedList = await shoppingListRepository.decorateMethod(
      'completeShoppingList',
      listId,
      validatedData
    );

    // 如果提供了实际花费，更新价格估算器的记录
    if (validatedData.actualCost !== undefined) {
      await priceEstimator.updateActualCost(listId, validatedData.actualCost);
    }

    // 生成价格趋势建议
    let priceAdvice: string | undefined;
    if (
      updatedList.estimatedCost !== null &&
      updatedList.actualCost !== null
    ) {
      priceAdvice = priceEstimator.getPriceTrendAdvice(
        updatedList.estimatedCost,
        updatedList.actualCost
      );
    }

    return NextResponse.json(
      {
        message: '购物清单已完成',
        shoppingList: updatedList,
        priceAdvice,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('完成购物清单失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

