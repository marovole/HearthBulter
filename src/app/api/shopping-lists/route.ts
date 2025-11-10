import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

// Type definitions
type ShoppingListStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

/**
 * GET /api/shopping-lists
 * 查询购物清单
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const status = searchParams.get('status') as ShoppingListStatus | null;

    const supabase = SupabaseClientManager.getInstance();

    if (planId) {
      // 验证权限：只有关联的家庭成员可以查询
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .select(`
          id,
          memberId,
          member:family_members!inner(
            id,
            name,
            userId,
            familyId,
            family:families!inner(
              id,
              creatorId
            )
          )
        `)
        .eq('id', planId)
        .is('deletedAt', null)
        .single();

      if (planError || !plan) {
        return NextResponse.json({ error: '食谱计划不存在' }, { status: 404 });
      }

      // Check if user is member of this family
      const { data: userMember } = await supabase
        .from('family_members')
        .select('role')
        .eq('familyId', plan.member.familyId)
        .eq('userId', session.user.id)
        .is('deletedAt', null)
        .maybeSingle();

      const isCreator = plan.member.family.creatorId === session.user.id;
      const isAdmin = userMember?.role === 'ADMIN' || isCreator;
      const isSelf = plan.member.userId === session.user.id;

      if (!isAdmin && !isSelf) {
        return NextResponse.json(
          { error: '无权限查看该购物清单' },
          { status: 403 }
        );
      }

      // Query shopping lists for this plan
      let query = supabase
        .from('shopping_lists')
        .select(`
          *,
          plan:meal_plans(
            id,
            name,
            member:family_members(id, name)
          ),
          items:shopping_list_items(
            *,
            food:foods(*)
          )
        `)
        .eq('planId', planId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('createdAt', { ascending: false });

      const { data: shoppingLists, error: listsError } = await query;

      if (listsError) {
        console.error('查询购物清单失败:', listsError);
        return NextResponse.json(
          { error: '查询购物清单失败' },
          { status: 500 }
        );
      }

      // Sort items within each shopping list
      const formattedLists = (shoppingLists || []).map((list: any) => ({
        ...list,
        items: (list.items || []).sort((a: any, b: any) => {
          // Sort by: category -> purchased -> food.name
          if (a.category !== b.category) {
            return (a.category || '').localeCompare(b.category || '');
          }
          if (a.purchased !== b.purchased) {
            return a.purchased ? 1 : -1;
          }
          return (a.food?.name || '').localeCompare(b.food?.name || '');
        }),
      }));

      return NextResponse.json({ shoppingLists: formattedLists }, { status: 200 });
    } else {
      // 如果没有指定 planId，只能查询当前用户相关的清单
      // 通过查找用户所属的家庭成员的食谱计划
      const { data: userMembers, error: membersError } = await supabase
        .from('family_members')
        .select('id')
        .eq('userId', session.user.id)
        .is('deletedAt', null);

      if (membersError || !userMembers || userMembers.length === 0) {
        return NextResponse.json({ shoppingLists: [] }, { status: 200 });
      }

      const memberIds = userMembers.map((m) => m.id);

      const { data: plans, error: plansError } = await supabase
        .from('meal_plans')
        .select('id')
        .in('memberId', memberIds)
        .is('deletedAt', null);

      if (plansError || !plans || plans.length === 0) {
        return NextResponse.json({ shoppingLists: [] }, { status: 200 });
      }

      const planIds = plans.map((p) => p.id);

      // Query shopping lists for these plans
      let query = supabase
        .from('shopping_lists')
        .select(`
          *,
          plan:meal_plans(
            id,
            name,
            member:family_members(id, name)
          ),
          items:shopping_list_items(
            *,
            food:foods(*)
          )
        `)
        .in('planId', planIds);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('createdAt', { ascending: false });

      const { data: shoppingLists, error: listsError } = await query;

      if (listsError) {
        console.error('查询购物清单失败:', listsError);
        return NextResponse.json(
          { error: '查询购物清单失败' },
          { status: 500 }
        );
      }

      // Sort items within each shopping list
      const formattedLists = (shoppingLists || []).map((list: any) => ({
        ...list,
        items: (list.items || []).sort((a: any, b: any) => {
          // Sort by: category -> purchased -> food.name
          if (a.category !== b.category) {
            return (a.category || '').localeCompare(b.category || '');
          }
          if (a.purchased !== b.purchased) {
            return a.purchased ? 1 : -1;
          }
          return (a.food?.name || '').localeCompare(b.food?.name || '');
        }),
      }));

      return NextResponse.json({ shoppingLists: formattedLists }, { status: 200 });
    }
  } catch (error) {
    console.error('查询购物清单失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

