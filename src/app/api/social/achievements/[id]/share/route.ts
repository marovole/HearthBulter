import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shareAchievement } from '@/lib/services/social/achievement-system';
import { generateShareContent } from '@/lib/services/social/share-generator';
import { generateShareToken } from '@/lib/services/social/share-link';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/social/achievements/[id]/share
 * 分享成就
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id: achievementId } = params;
    const body = await request.json();
    const { customMessage, privacyLevel = 'PUBLIC' } = body;

    const memberId = session.user?.id;
    if (!memberId) {
      return NextResponse.json({ error: '用户ID不存在' }, { status: 400 });
    }

    // 验证成就是否存在且属于该用户
    const achievement = await prisma.achievement.findFirst({
      where: {
        id: achievementId,
        memberId,
        isUnlocked: true,
      },
    });

    if (!achievement) {
      return NextResponse.json(
        { error: '成就不存在或未解锁' },
        { status: 404 }
      );
    }

    // 生成分享内容
    const shareContent = await generateShareContent({
      memberId,
      contentType: 'ACHIEVEMENT',
      contentId: achievementId,
      customMessage,
      privacyLevel,
    });

    // 生成分享token
    const shareToken = await generateShareToken();

    // 创建分享记录
    const sharedContent = await prisma.sharedContent.create({
      data: {
        memberId,
        contentType: 'ACHIEVEMENT',
        title: shareContent.title,
        description: shareContent.description,
        imageUrl: shareContent.imageUrl,
        shareToken,
        shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/${shareToken}`,
        privacyLevel,
        metadata: shareContent.metadata,
      },
    });

    // 标记成就已分享
    await shareAchievement(achievementId);

    return NextResponse.json({
      success: true,
      data: {
        id: sharedContent.id,
        shareToken: sharedContent.shareToken,
        shareUrl: sharedContent.shareUrl,
        title: sharedContent.title,
        description: sharedContent.description,
        imageUrl: sharedContent.imageUrl,
        achievement: {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          rarity: achievement.rarity,
          points: achievement.points,
          unlockedAt: achievement.unlockedAt,
        },
      },
      message: '成就分享成功',
    });
  } catch (error) {
    console.error('分享成就失败:', error);
    return NextResponse.json(
      { error: '分享成就失败' },
      { status: 500 }
    );
  }
}
