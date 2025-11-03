/**
 * 社交成就API - 成就列表和统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { achievementSystem } from '@/lib/services/social/achievement-system';
import { prisma } from '@/lib/db';
import type { AchievementType } from '@prisma/client';

/**
 * 获取成就列表
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
    const rarity = searchParams.get('rarity');
    const all = searchParams.get('all') === 'true';

    // 如果请求所有可用的成就
    if (all) {
      const availableAchievements = achievementSystem.getAvailableAchievements();
      
      return NextResponse.json({
        success: true,
        data: {
          achievements: availableAchievements.map(trigger => ({
            type: trigger.type,
            name: trigger.name,
            description: trigger.description,
            icon: trigger.icon,
            color: trigger.color,
            rarity: trigger.rarity,
            points: trigger.points,
            conditions: trigger.conditions,
            isUnlocked: false,
          })),
        },
      });
    }

    // 验证用户权限
    if (memberId) {
      const member = await prisma.familyMember.findFirst({
        where: {
          id: memberId,
          user: {
            families: {
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
    }

    // 构建查询条件
    const where: any = {};
    
    if (memberId) {
      where.memberId = memberId;
    } else {
      where.member = {
        family: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      };
    }

    if (type) {
      where.type = type;
    }

    if (rarity) {
      where.rarity = rarity;
    }

    // 获取用户成就
    const userAchievements = await prisma.achievement.findMany({
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
      orderBy: [
        { rarity: 'desc' },
        { unlockedAt: 'desc' },
      ],
    });

    // 获取成就统计
    const stats = await getAchievementStats(memberId || undefined, session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        achievements: userAchievements,
        stats,
        filters: {
          type,
          rarity,
          memberId,
        },
      },
    });

  } catch (error) {
    console.error('获取成就列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 手动解锁成就（管理员功能）
 */
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
    const { memberId, type, reason, adminCode } = body;

    // 验证管理员权限
    const isAdmin = await checkAdminPermission(session.user.id, adminCode);
    if (!isAdmin) {
      return NextResponse.json(
        { error: '无管理员权限' },
        { status: 403 }
      );
    }

    // 验证用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        user: {
          families: {
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

    // 检查是否已解锁
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        memberId,
        type: type as AchievementType,
      },
    });

    if (existingAchievement) {
      return NextResponse.json(
        { error: '该成就已经解锁' },
        { status: 409 }
      );
    }

    // 手动解锁成就
    const achievement = await achievementSystem.unlockAchievement(
      memberId,
      {
        type: type as AchievementType,
        name: '手动解锁',
        description: reason || '管理员手动解锁',
        icon: '🏆',
        color: '#f59e0b',
        rarity: 'RARE',
        points: 100,
        conditions: [],
        checkFunction: async () => true,
      },
      'MANUAL_UNLOCK',
      { reason, adminId: session.user.id }
    );

    return NextResponse.json({
      success: true,
      data: {
        achievement,
        message: '成就解锁成功',
      },
    });

  } catch (error) {
    console.error('手动解锁成就失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取成就统计
 */
async function getAchievementStats(memberId?: string, userId?: string): Promise<any> {
  const whereClause = memberId
    ? { memberId }
    : userId
      ? {
        member: {
          family: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      }
      : {};

  const achievements = await prisma.achievement.findMany({
    where: whereClause,
  });

  const stats = {
    total: achievements.length,
    totalPoints: achievements.reduce((sum, a) => sum + a.points, 0),
    byRarity: {
      BRONZE: 0,
      SILVER: 0,
      GOLD: 0,
      PLATINUM: 0,
      DIAMOND: 0,
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      EPIC: 0,
      LEGENDARY: 0,
    },
    byType: {} as Record<AchievementType, number>,
    recentUnlocks: achievements
      .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
      .slice(0, 5),
  };

  // 统计稀有度
  achievements.forEach(achievement => {
    if (stats.byRarity[achievement.rarity] !== undefined) {
      stats.byRarity[achievement.rarity]++;
    }

    if (stats.byType[achievement.type] !== undefined) {
      stats.byType[achievement.type] = (stats.byType[achievement.type] || 0) + 1;
    } else {
      stats.byType[achievement.type] = 1;
    }
  });

  return stats;
}

/**
 * 检查管理员权限
 */
async function checkAdminPermission(userId: string, adminCode?: string): Promise<boolean> {
  // 这里应该检查用户是否有管理员权限
  // 可以检查用户角色、验证管理员码等

  if (!adminCode) {
    return false;
  }

  // 验证管理员码
  const validAdminCodes = process.env.ADMIN_CODES?.split(',') || [];
  return validAdminCodes.includes(adminCode);
}
