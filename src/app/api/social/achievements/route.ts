import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getMemberAchievements, 
  getAchievementProgress, 
  getAchievementStats,
  shareAchievement,
  checkAndUnlockAchievements
} from '@/lib/services/social/achievement-system';
import { AchievementType } from '@prisma/client';

/**
 * GET /api/social/achievements
 * 获取用户成就列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AchievementType;
    const unlocked = searchParams.get('unlocked');
    const progress = searchParams.get('progress') === 'true';

    const memberId = session.user?.id;
    if (!memberId) {
      return NextResponse.json({ error: '用户ID不存在' }, { status: 400 });
    }

    // 获取成就列表
    const achievements = await getMemberAchievements(memberId);
    
    // 过滤结果
    let filteredAchievements = achievements;
    
    if (type) {
      filteredAchievements = filteredAchievements.filter(ach => ach.type === type);
    }
    
    if (unlocked !== null) {
      const isUnlocked = unlocked === 'true';
      filteredAchievements = filteredAchievements.filter(ach => ach.isUnlocked === isUnlocked);
    }

    const result: any = {
      achievements: filteredAchievements.map(ach => ({
        id: ach.id,
        type: ach.type,
        title: ach.title,
        description: ach.description,
        iconUrl: ach.iconUrl,
        imageUrl: ach.imageUrl,
        rarity: ach.rarity,
        level: ach.level,
        points: ach.points,
        targetValue: ach.targetValue,
        currentValue: ach.currentValue,
        progress: ach.progress,
        isUnlocked: ach.isUnlocked,
        unlockedAt: ach.unlockedAt,
        isShared: ach.isShared,
        sharedAt: ach.sharedAt,
        rewardType: ach.rewardType,
        rewardValue: ach.rewardValue,
        rewardClaimed: ach.rewardClaimed,
        createdAt: ach.createdAt
      }))
    };

    // 如果请求进度信息
    if (progress) {
      result.progress = await getAchievementProgress(memberId);
    }

    // 获取统计信息
    result.stats = await getAchievementStats(memberId);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取成就列表失败:', error);
    return NextResponse.json(
      { error: '获取成就列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/achievements
 * 触发成就检查
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { triggerType, triggerData } = body;

    if (!triggerType || !triggerData) {
      return NextResponse.json(
        { error: '缺少必要参数：triggerType 和 triggerData' },
        { status: 400 }
      );
    }

    const memberId = session.user?.id;
    if (!memberId) {
      return NextResponse.json({ error: '用户ID不存在' }, { status: 400 });
    }

    // 检查并解锁成就
    const unlockedAchievements = await checkAndUnlockAchievements(
      memberId,
      triggerType,
      triggerData
    );

    return NextResponse.json({
      success: true,
      data: {
        unlockedAchievements: unlockedAchievements.map(ach => ({
          id: ach.id,
          type: ach.type,
          title: ach.title,
          description: ach.description,
          rarity: ach.rarity,
          points: ach.points,
          unlockedAt: ach.unlockedAt
        })),
        count: unlockedAchievements.length
      },
      message: `解锁了 ${unlockedAchievements.length} 个新成就`
    });
  } catch (error) {
    console.error('触发成就检查失败:', error);
    return NextResponse.json(
      { error: '触发成就检查失败' },
      { status: 500 }
    );
  }
}
