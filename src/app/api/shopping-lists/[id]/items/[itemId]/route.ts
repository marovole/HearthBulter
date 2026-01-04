import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { shoppingListRepository } from '@/lib/repositories/shopping-list-repository-singleton';

/**
 * PATCH /api/shopping-lists/:id/items/:itemId
 * 标记已购
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
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
      .select(
        `
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
      `,
      )
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
    const isCreator =
      shoppingList.plan.member.family.creatorId === session.user.id;
    const isAdmin = userMember?.role === 'ADMIN' || isCreator;
    const isSelf = shoppingList.plan.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限修改该购物清单' },
        { status: 403 },
      );
    }

    // 使用 Repository 更新购物项
    const updatedItem = await shoppingListRepository.updateShoppingListItem(
      listId,
      itemId,
      { purchased },
    );

    // 智能状态更新：检查是否所有项都已购买，如果是则更新清单状态
    const { data: allItems } = await supabase
      .from('shopping_list_items')
      .select('id, purchased')
      .eq('shopping_list_id', listId);

    if (allItems) {
      const allPurchased = allItems.every((item) => item.purchased);

      if (allPurchased && shoppingList.status !== 'COMPLETED') {
        await shoppingListRepository.updateShoppingList(listId, {
          status: 'COMPLETED',
        });
      } else if (!allPurchased && shoppingList.status === 'DRAFT') {
        await shoppingListRepository.updateShoppingList(listId, {
          status: 'ACTIVE',
        });
      }
    }

    return NextResponse.json(
      {
        message: '清单项更新成功',
        item: updatedItem,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('更新清单项失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
