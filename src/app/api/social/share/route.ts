/**
 * 社交分享API - 创建分享
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { shareContentGenerator } from '@/lib/services/social/share-generator';
import { shareImageGenerator } from '@/lib/services/social/image-generator';
import { shareTrackingService } from '@/lib/services/social/share-tracking';
import { achievementSystem } from '@/lib/services/social/achievement-system';
import type { ShareContentInput } from '@/types/social-sharing';
import { SocialPlatform } from '@/types/social-sharing';
import { ShareContentType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = validateShareInput(body);

    // 检查用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: validatedData.memberId,
        user: {
          createdFamilies: {
            some: {
              members: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    // 生成分享内容
    const shareResult = await shareContentGenerator.generateShareContent(validatedData);

    // 保存到数据库
    const savedContent = await prisma.sharedContent.create({
      data: {
        memberId: validatedData.memberId,
        contentType: validatedData.type,
        title: shareResult.content.title,
        description: shareResult.content.description,
        imageUrl: shareResult.imageUrl,
        targetId: validatedData.targetId,
        privacyLevel: validatedData.privacyLevel,
        shareToken: shareResult.shareUrl.split('/').pop()!,
        shareUrl: shareResult.shareUrl,
        sharedPlatforms: JSON.stringify(validatedData.platforms),
        metadata: shareResult.content.metadata ? JSON.parse(JSON.stringify(shareResult.content.metadata)) : undefined,
      },
    });

    // 检查是否有成就解锁
    await checkForShareAchievements(validatedData.memberId, validatedData.platforms.length);

    // 记录分享事件
    for (const platform of validatedData.platforms) {
      await shareTrackingService.trackShareEvent({
        shareToken: savedContent.shareToken,
        eventType: 'SHARE',
        platform,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        shareContent: savedContent,
        shareUrl: shareResult.shareUrl,
        imageUrl: shareResult.imageUrl,
        platforms: validatedData.platforms,
      },
      message: '分享创建成功',
    });

  } catch (error) {
    console.error('创建分享失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 验证分享输入数据
 */
function validateShareInput(data: any): ShareContentInput {
  const { memberId, type, title, description, imageUrl, targetId, privacyLevel, platforms, customMessage } = data;

  if (!memberId || !type || !privacyLevel || !platforms || !Array.isArray(platforms)) {
    throw new Error('缺少必要参数');
  }

  const validTypes = Object.values(ShareContentType);
  if (!validTypes.includes(type)) {
    throw new Error('无效的分享类型');
  }

  const validPlatforms = Object.values(SocialPlatform);
  const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
  if (invalidPlatforms.length > 0) {
    throw new Error(`不支持的平台: ${invalidPlatforms.join(', ')}`);
  }

  return {
    memberId,
    type,
    title: title || '',
    description,
    imageUrl,
    targetId,
    privacyLevel,
    platforms,
    customMessage,
  };
}

/**
 * 检查分享相关成就
 */
async function checkForShareAchievements(memberId: string, shareCount: number): Promise<void> {
  try {
    // 检查社交达人成就
    const totalShares = await prisma.sharedContent.count({
      where: { memberId },
    });

    if (totalShares >= 20) {
      await achievementSystem.checkAchievements(memberId, 'SHARE_CREATED', {
        shareCount: totalShares,
      });
    }
  } catch (error) {
    console.error('检查分享成就失败:', error);
  }
}

/**
 * 获取分享列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 构建查询条件
    const where: any = {
      member: {
        family: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      status: 'ACTIVE',
    };

    if (memberId) {
      // 验证用户权限
      const member = await prisma.familyMember.findFirst({
        where: {
          id: memberId,
          user: {
            createdFamilies: {
              some: {
                members: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }

      where.memberId = memberId;
    }

    if (type) {
      where.contentType = type;
    }

    const [contents, total] = await Promise.all([
      prisma.sharedContent.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sharedContent.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        contents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });

  } catch (error) {
    console.error('获取分享列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
