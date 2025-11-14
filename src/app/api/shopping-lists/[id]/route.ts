import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { shoppingListRepository } from '@/lib/repositories/shopping-list-repository-singleton';
import { z } from 'zod';

// 更新购物清单的验证 schema
const updateShoppingListSchema = z.object({
  name: z.string().optional(), // 清单名称
  budget: z.number().min(0).nullable().optional(), // 预算（元）
});

/**
 * PATCH /api/shopping-lists/:id
 * 更新购物清单
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

    const supabase = SupabaseClientManager.getInstance();

    // 查询购物清单并验证权限
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select(`
        id,
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
        { error: '无权限修改该购物清单' },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = updateShoppingListSchema.parse(body);

    // 使用 ShoppingListRepository 更新
    const updatedList = await shoppingListRepository.decorateMethod(
      'updateShoppingList',
      listId,
      validatedData
    );

    return NextResponse.json(
      {
        message: '购物清单更新成功',
        shoppingList: updatedList,
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

    console.error('更新购物清单失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shopping-lists/:id
 * 删除购物清单
 *
 * 使用双写框架迁移
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查询购物清单并验证权限
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select(`
        id,
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
        { error: '无权限删除该购物清单' },
        { status: 403 }
      );
    }

    // 使用 ShoppingListRepository 删除（级联删除清单项）
    await shoppingListRepository.decorateMethod('deleteShoppingList', listId);

    return NextResponse.json(
      {
        message: '购物清单删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除购物清单失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

