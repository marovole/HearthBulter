import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, ShareContentType, SharePrivacyLevel } from '@prisma/client';
import { generateShareContent } from '@/lib/services/social/share-generator';
import { generateShareToken } from '@/lib/services/social/share-link';

const prisma = new PrismaClient();

/**
 * POST /api/social/share
 * 创建分享内容
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contentType,
      contentId,
      title,
      description,
      customMessage,
      privacyLevel = 'PUBLIC',
      allowComment = true,
      allowLike = true,
      expiresAt
    } = body;

    // 验证必要参数
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: '缺少必要参数：contentType 和 contentId' },
        { status: 400 }
      );
    }

    // 验证内容类型
    if (!Object.values(ShareContentType).includes(contentType)) {
      return NextResponse.json(
        { error: '不支持的内容类型' },
        { status: 400 }
      );
    }

    // 获取用户ID（这里需要根据实际的session结构来获取）
    const memberId = session.user?.id;
    if (!memberId) {
      return NextResponse.json({ error: '用户ID不存在' }, { status: 400 });
    }

    // 验证内容是否存在且属于该用户
    const hasAccess = await validateContentAccess(memberId, contentType, contentId);
    if (!hasAccess) {
      return NextResponse.json({ error: '无权访问该内容' }, { status: 403 });
    }

    // 生成分享内容
    const shareContent = await generateShareContent({
      memberId,
      contentType,
      contentId,
      title,
      description,
      customMessage,
      privacyLevel,
      allowComment,
      allowLike,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    // 生成分享token
    const shareToken = await generateShareToken();

    // 创建分享记录
    const sharedContent = await prisma.sharedContent.create({
      data: {
        memberId,
        contentType,
        title: shareContent.title,
        description: shareContent.description,
        imageUrl: shareContent.imageUrl,
        shareToken,
        shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/${shareToken}`,
        privacyLevel,
        allowComment,
        allowLike,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: shareContent.metadata
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: sharedContent.id,
        shareToken: sharedContent.shareToken,
        shareUrl: sharedContent.shareUrl,
        title: sharedContent.title,
        description: sharedContent.description,
        imageUrl: sharedContent.imageUrl,
        expiresAt: sharedContent.expiresAt
      },
      message: '分享创建成功'
    });
  } catch (error) {
    console.error('创建分享失败:', error);
    return NextResponse.json(
      { error: '创建分享失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/share
 * 获取用户的分享列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const contentType = searchParams.get('contentType') as ShareContentType;
    const status = searchParams.get('status');

    const memberId = session.user?.id;
    if (!memberId) {
      return NextResponse.json({ error: '用户ID不存在' }, { status: 400 });
    }

    // 构建查询条件
    const where: any = { memberId };
    if (contentType) where.contentType = contentType;
    if (status) where.status = status.toUpperCase();

    // 获取分享列表
    const [shares, total] = await Promise.all([
      prisma.sharedContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      }),
      prisma.sharedContent.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        shares: shares.map(share => ({
          id: share.id,
          contentType: share.contentType,
          title: share.title,
          description: share.description,
          imageUrl: share.imageUrl,
          shareUrl: share.shareUrl,
          shareToken: share.shareToken,
          privacyLevel: share.privacyLevel,
          status: share.status,
          viewCount: share.viewCount,
          likeCount: share.likeCount,
          commentCount: share.commentCount,
          shareCount: share.shareCount,
          clickCount: share.clickCount,
          conversionCount: share.conversionCount,
          expiresAt: share.expiresAt,
          createdAt: share.createdAt,
          updatedAt: share.updatedAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取分享列表失败:', error);
    return NextResponse.json(
      { error: '获取分享列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 验证用户是否有权访问内容
 */
async function validateContentAccess(
  memberId: string,
  contentType: ShareContentType,
  contentId: string
): Promise<boolean> {
  try {
    switch (contentType) {
      case 'HEALTH_REPORT':
        const report = await prisma.healthReport.findFirst({
          where: { id: contentId, memberId }
        });
        return !!report;
      
      case 'GOAL_ACHIEVEMENT':
        const goal = await prisma.healthGoal.findFirst({
          where: { id: contentId, memberId }
        });
        return !!goal;
      
      case 'MEAL_LOG':
        const mealLog = await prisma.mealLog.findFirst({
          where: { id: contentId, memberId }
        });
        return !!mealLog;
      
      case 'ACHIEVEMENT':
        const achievement = await prisma.achievement.findFirst({
          where: { id: contentId, memberId }
        });
        return !!achievement;
      
      case 'CHECK_IN_STREAK':
        const streak = await prisma.trackingStreak.findUnique({
          where: { memberId }
        });
        return !!streak;
      
      case 'WEIGHT_MILESTONE':
        const weightData = await prisma.healthData.findFirst({
          where: { id: contentId, memberId }
        });
        return !!weightData;
      
      case 'RECIPE':
        // 这里需要根据实际的食谱模型来实现
        // 暂时返回true
        return true;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('验证内容访问权限失败:', error);
    return false;
  }
}
