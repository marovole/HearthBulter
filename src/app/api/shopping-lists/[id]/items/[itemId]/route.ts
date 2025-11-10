import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * PATCH /api/shopping-lists/:id/items/:itemId
 * 标记已购
 *
 * Migrated from Prisma to Supabase
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: listId, itemId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();
    const purchased = body.purchased !== undefined ? body.purchased : true;

    const supabase = SupabaseClientManager.getInstance();

    // 查询购物清单并验证权限
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .select(`
        id,
        status,
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

    // 检查清单项是否存在
    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .select('id, purchased')
      .eq('id', itemId)
      .eq('listId', listId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: '清单项不存在' }, { status: 404 });
    }

    // 更新清单项
    const { data: updatedItem, error: updateError } = await supabase
      .from('shopping_list_items')
      .update({
        purchased,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select(`
        *,
        food:foods(*)
      `)
      .single();

    if (updateError) {
      console.error('更新清单项失败:', updateError);
      return NextResponse.json(
        { error: '更新清单项失败' },
        { status: 500 }
      );
    }

    // 检查是否所有项都已购买，如果是则更新清单状态
    const { data: allItems } = await supabase
      .from('shopping_list_items')
      .select('id, purchased')
      .eq('listId', listId);

    if (allItems) {
      const allPurchased = allItems.every((item) => item.purchased);

      if (allPurchased && shoppingList.status !== 'COMPLETED') {
        await supabase
          .from('shopping_lists')
          .update({
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', listId);
      } else if (!allPurchased && shoppingList.status === 'PENDING') {
        await supabase
          .from('shopping_lists')
          .update({
            status: 'IN_PROGRESS',
            updatedAt: new Date().toISOString(),
          })
          .eq('id', listId);
      }
    }

    return NextResponse.json(
      {
        message: '清单项更新成功',
        item: updatedItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新清单项失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

