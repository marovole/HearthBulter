import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdapter } from '@/lib/db/supabase-adapter';
import { auth } from '@/lib/auth';

/**
 * GET /api/social/share/[token]
 * 通过分享token获取分享内容（公开访问）
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: '缺少分享token' },
        { status: 400 }
      );
    }

    // 查找分享内容
    const sharedContent = await supabaseAdapter.sharedContent.findUnique({
      where: { shareToken: token },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!sharedContent) {
      return NextResponse.json(
        { error: '分享内容不存在' },
        { status: 404 }
      );
    }

    // 检查分享状态
    if (sharedContent.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '分享已失效' },
        { status: 410 }
      );
    }

    // 检查是否过期
    if (sharedContent.expiresAt && new Date(sharedContent.expiresAt) < new Date()) {
      // 自动标记为过期
      await supabaseAdapter.sharedContent.update({
        where: { id: sharedContent.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { error: '分享已过期' },
        { status: 410 }
      );
    }

    // 增加浏览次数
    await supabaseAdapter.sharedContent.update({
      where: { id: sharedContent.id },
      data: {
        viewCount: sharedContent.viewCount + 1,
      },
    });

    // 返回分享内容
    return NextResponse.json({
      success: true,
      data: {
        id: sharedContent.id,
        contentType: sharedContent.contentType,
        title: sharedContent.title,
        description: sharedContent.description,
        imageUrl: sharedContent.imageUrl,
        member: sharedContent.member,
        privacyLevel: sharedContent.privacyLevel,
        allowComment: sharedContent.allowComment,
        allowLike: sharedContent.allowLike,
        viewCount: sharedContent.viewCount + 1,
        likeCount: sharedContent.likeCount,
        commentCount: sharedContent.commentCount,
        shareCount: sharedContent.shareCount,
        createdAt: sharedContent.createdAt,
        metadata: sharedContent.metadata,
      },
    });
  } catch (error) {
    console.error('获取分享内容失败:', error);
    return NextResponse.json(
      { error: '获取分享内容失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/share/[token]
 * 记录分享链接点击
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action = 'click' } = body;

    // 查找分享内容
    const sharedContent = await supabaseAdapter.sharedContent.findUnique({
      where: { shareToken: token },
    });

    if (!sharedContent) {
      return NextResponse.json(
        { error: '分享内容不存在' },
        { status: 404 }
      );
    }

    // 根据动作类型更新统计
    const updateData: any = {};

    switch (action) {
    case 'click':
      updateData.clickCount = sharedContent.clickCount + 1;
      break;
    case 'share':
      updateData.shareCount = sharedContent.shareCount + 1;
      break;
    case 'conversion':
      updateData.conversionCount = sharedContent.conversionCount + 1;
      break;
    default:
      return NextResponse.json(
        { error: '不支持的动作类型' },
        { status: 400 }
      );
    }

    await supabaseAdapter.sharedContent.update({
      where: { id: sharedContent.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: '统计更新成功',
    });
  } catch (error) {
    console.error('更新分享统计失败:', error);
    return NextResponse.json(
      { error: '更新分享统计失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/share/[token]
 * 撤回分享（需要认证）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { token } = await params;
    const memberId = session.user?.id;

    if (!memberId) {
      return NextResponse.json({ error: '用户ID不存在' }, { status: 400 });
    }

    // 查找分享内容
    const sharedContent = await supabaseAdapter.sharedContent.findUnique({
      where: { shareToken: token },
    });

    if (!sharedContent) {
      return NextResponse.json(
        { error: '分享内容不存在' },
        { status: 404 }
      );
    }

    // 验证权限
    if (sharedContent.memberId !== memberId) {
      return NextResponse.json(
        { error: '无权操作该分享' },
        { status: 403 }
      );
    }

    // 撤回分享
    await supabaseAdapter.sharedContent.update({
      where: { id: sharedContent.id },
      data: { status: 'REVOKED' },
    });

    return NextResponse.json({
      success: true,
      message: '分享已撤回',
    });
  } catch (error) {
    console.error('撤回分享失败:', error);
    return NextResponse.json(
      { error: '撤回分享失败' },
      { status: 500 }
    );
  }
}
