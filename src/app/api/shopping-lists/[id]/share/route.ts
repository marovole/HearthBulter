import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { randomBytes } from 'crypto';

/**
 * POST /api/shopping-lists/:id/share
 * 生成分享链接
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(
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
        { error: '无权限分享该购物清单' },
        { status: 403 }
      );
    }

    // 生成分享令牌
    const shareToken = randomBytes(32).toString('hex');
    const shareExpiry = new Date();
    shareExpiry.setDate(shareExpiry.getDate() + 7); // 7天后过期

    // 保存分享令牌
    const now = new Date().toISOString();
    const { error: createError } = await supabase
      .from('shopping_list_shares')
      .insert({
        listId,
        token: shareToken,
        expiresAt: shareExpiry.toISOString(),
        createdBy: session.user.id,
        createdAt: now,
        updatedAt: now,
      });

    if (createError) {
      console.error('创建分享记录失败:', createError);
      return NextResponse.json(
        { error: '创建分享记录失败' },
        { status: 500 }
      );
    }

    // 生成分享URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/shopping-list/${shareToken}`;

    return NextResponse.json({
      shareUrl,
      expiresAt: shareExpiry,
    });
  } catch (error) {
    console.error('生成分享链接失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
