/**
 * 成就系统服务
 * 负责成就的触发检测、解锁、奖励发放等
 */

import { PrismaClient, AchievementType, AchievementRarity, FamilyMember } from '@prisma/client';

const prisma = new PrismaClient();

export interface AchievementRule {
  type: AchievementType;
  title: string;
  description: string;
  rarity: AchievementRarity;
  points: number;
  targetValue: number;
  checkCondition: (member: FamilyMember, data: any) => boolean;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  progress: number;
  isUnlocked: boolean;
}

/**
 * 成就规则定义
 */
const ACHIEVEMENT_RULES: AchievementRule[] = [
  // 连续打卡成就
  {
    type: 'CHECK_IN_STREAK',
    title: '初学者',
    description: '连续打卡3天',
    rarity: 'BRONZE',
    points: 10,
    targetValue: 3,
    checkCondition: (member, data) => data.currentStreak >= 3
  },
  {
    type: 'CHECK_IN_STREAK',
    title: '坚持者',
    description: '连续打卡7天',
    rarity: 'BRONZE',
    points: 25,
    targetValue: 7,
    checkCondition: (member, data) => data.currentStreak >= 7
  },
  {
    type: 'CHECK_IN_STREAK',
    title: '打卡达人',
    description: '连续打卡30天',
    rarity: 'SILVER',
    points: 100,
    targetValue: 30,
    checkCondition: (member, data) => data.currentStreak >= 30
  },
  {
    type: 'CHECK_IN_STREAK',
    title: '打卡大师',
    description: '连续打卡100天',
    rarity: 'GOLD',
    points: 500,
    targetValue: 100,
    checkCondition: (member, data) => data.currentStreak >= 100
  },
  
  // 减重成就
  {
    type: 'WEIGHT_LOSS',
    title: '减重新手',
    description: '减重1kg',
    rarity: 'BRONZE',
    points: 15,
    targetValue: 1,
    checkCondition: (member, data) => data.weightLoss >= 1
  },
  {
    type: 'WEIGHT_LOSS',
    title: '减重达人',
    description: '减重5kg',
    rarity: 'SILVER',
    points: 75,
    targetValue: 5,
    checkCondition: (member, data) => data.weightLoss >= 5
  },
  {
    type: 'WEIGHT_LOSS',
    title: '减重大师',
    description: '减重10kg',
    rarity: 'GOLD',
    points: 200,
    targetValue: 10,
    checkCondition: (member, data) => data.weightLoss >= 10
  },
  
  // 营养目标成就
  {
    type: 'NUTRITION_GOAL',
    title: '营养新手',
    description: '连续7天达成营养目标',
    rarity: 'BRONZE',
    points: 30,
    targetValue: 7,
    checkCondition: (member, data) => data.consecutiveDays >= 7
  },
  {
    type: 'NUTRITION_GOAL',
    title: '营养专家',
    description: '连续30天达成营养目标',
    rarity: 'SILVER',
    points: 150,
    targetValue: 30,
    checkCondition: (member, data) => data.consecutiveDays >= 30
  },
  
  // 运动目标成就
  {
    type: 'EXERCISE_TARGET',
    title: '运动新手',
    description: '单周运动超过150分钟',
    rarity: 'BRONZE',
    points: 20,
    targetValue: 150,
    checkCondition: (member, data) => data.weeklyMinutes >= 150
  },
  {
    type: 'EXERCISE_TARGET',
    title: '运动达人',
    description: '单周运动超过300分钟',
    rarity: 'SILVER',
    points: 60,
    targetValue: 300,
    checkCondition: (member, data) => data.weeklyMinutes >= 300
  },
  
  // 健康里程碑成就
  {
    type: 'HEALTH_MILESTONE',
    title: '健康先锋',
    description: '健康评分达到80分',
    rarity: 'SILVER',
    points: 80,
    targetValue: 80,
    checkCondition: (member, data) => data.healthScore >= 80
  },
  {
    type: 'HEALTH_MILESTONE',
    title: '健康大师',
    description: '健康评分达到90分',
    rarity: 'GOLD',
    points: 200,
    targetValue: 90,
    checkCondition: (member, data) => data.healthScore >= 90
  },
  {
    type: 'HEALTH_MILESTONE',
    title: '健康传奇',
    description: '健康评分达到95分',
    rarity: 'PLATINUM',
    points: 500,
    targetValue: 95,
    checkCondition: (member, data) => data.healthScore >= 95
  },
  
  // 社区贡献成就
  {
    type: 'COMMUNITY_CONTRIBUTION',
    title: '社区新人',
    description: '发布第一篇社区帖子',
    rarity: 'BRONZE',
    points: 10,
    targetValue: 1,
    checkCondition: (member, data) => data.postCount >= 1
  },
  {
    type: 'COMMUNITY_CONTRIBUTION',
    title: '社区活跃者',
    description: '发布10篇社区帖子',
    rarity: 'SILVER',
    points: 50,
    targetValue: 10,
    checkCondition: (member, data) => data.postCount >= 10
  },
  {
    type: 'COMMUNITY_CONTRIBUTION',
    title: '社区领袖',
    description: '发布50篇社区帖子',
    rarity: 'GOLD',
    points: 200,
    targetValue: 50,
    checkCondition: (member, data) => data.postCount >= 50
  }
];

/**
 * 检查并解锁成就
 */
export async function checkAndUnlockAchievements(
  memberId: string,
  triggerType: AchievementType,
  triggerData: any
): Promise<Achievement[]> {
  const unlockedAchievements: Achievement[] = [];
  
  // 获取成员信息
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId }
  });
  
  if (!member) {
    throw new Error('成员不存在');
  }
  
  // 获取该成员当前的所有成就
  const existingAchievements = await prisma.achievement.findMany({
    where: { memberId }
  });
  
  // 筛选出相关类型的规则
  const relevantRules = ACHIEVEMENT_RULES.filter(rule => rule.type === triggerType);
  
  for (const rule of relevantRules) {
    // 检查是否已经有这个成就
    const existingAchievement = existingAchievements.find(
      ach => ach.type === rule.type && ach.title === rule.title
    );
    
    if (existingAchievement && existingAchievement.isUnlocked) {
      continue; // 已经解锁，跳过
    }
    
    // 检查触发条件
    if (rule.checkCondition(member, triggerData)) {
      // 解锁成就
      const achievement = await unlockAchievement(memberId, rule);
      if (achievement) {
        unlockedAchievements.push(achievement);
      }
    } else {
      // 更新进度
      await updateAchievementProgress(memberId, rule, triggerData);
    }
  }
  
  return unlockedAchievements;
}

/**
 * 解锁成就
 */
async function unlockAchievement(memberId: string, rule: AchievementRule): Promise<Achievement | null> {
  try {
    // 查找或创建成就记录
    const achievement = await prisma.achievement.upsert({
      where: {
        memberId_type_level: {
          memberId,
          type: rule.type,
          level: 1 // 简化处理，所有成就都是1级
        }
      },
      update: {
        title: rule.title,
        description: rule.description,
        rarity: rule.rarity,
        points: rule.points,
        targetValue: rule.targetValue,
        currentValue: rule.targetValue,
        progress: 100,
        isUnlocked: true,
        unlockedAt: new Date()
      },
      create: {
        memberId,
        type: rule.type,
        title: rule.title,
        description: rule.description,
        rarity: rule.rarity,
        level: 1,
        points: rule.points,
        targetValue: rule.targetValue,
        currentValue: rule.targetValue,
        progress: 100,
        isUnlocked: true,
        unlockedAt: new Date()
      }
    });
    
    // 发放奖励
    await grantAchievementReward(memberId, achievement);
    
    return achievement;
  } catch (error) {
    console.error('解锁成就失败:', error);
    return null;
  }
}

/**
 * 更新成就进度
 */
async function updateAchievementProgress(memberId: string, rule: AchievementRule, triggerData: any): Promise<void> {
  try {
    // 计算当前进度
    const currentValue = calculateProgressValue(rule.type, triggerData);
    const progress = Math.min((currentValue / rule.targetValue) * 100, 99.9);
    
    // 查找或创建成就记录
    await prisma.achievement.upsert({
      where: {
        memberId_type_level: {
          memberId,
          type: rule.type,
          level: 1
        }
      },
      update: {
        title: rule.title,
        description: rule.description,
        rarity: rule.rarity,
        points: rule.points,
        targetValue: rule.targetValue,
        currentValue,
        progress
      },
      create: {
        memberId,
        type: rule.type,
        title: rule.title,
        description: rule.description,
        rarity: rule.rarity,
        level: 1,
        points: rule.points,
        targetValue: rule.targetValue,
        currentValue,
        progress,
        isUnlocked: false
      }
    });
  } catch (error) {
    console.error('更新成就进度失败:', error);
  }
}

/**
 * 计算进度值
 */
function calculateProgressValue(type: AchievementType, data: any): number {
  switch (type) {
    case 'CHECK_IN_STREAK':
      return data.currentStreak || 0;
    case 'WEIGHT_LOSS':
      return data.weightLoss || 0;
    case 'NUTRITION_GOAL':
      return data.consecutiveDays || 0;
    case 'EXERCISE_TARGET':
      return data.weeklyMinutes || 0;
    case 'HEALTH_MILESTONE':
      return data.healthScore || 0;
    case 'COMMUNITY_CONTRIBUTION':
      return data.postCount || 0;
    default:
      return 0;
  }
}

/**
 * 发放成就奖励
 */
async function grantAchievementReward(memberId: string, achievement: Achievement): Promise<void> {
  // 这里可以实现各种奖励机制
  // 例如：增加积分、发放优惠券、延长VIP等
  
  console.log(`发放成就奖励: 成就ID ${achievement.id}, 积分 ${achievement.points}`);
  
  // 示例：可以在这里调用积分系统
  // await addPointsToMember(memberId, achievement.points);
}

/**
 * 获取成员的所有成就
 */
export async function getMemberAchievements(memberId: string): Promise<Achievement[]> {
  return prisma.achievement.findMany({
    where: { memberId },
    orderBy: [
      { isUnlocked: 'desc' },
      { unlockedAt: 'desc' },
      { createdAt: 'desc' }
    ]
  });
}

/**
 * 获取成就进度
 */
export async function getAchievementProgress(memberId: string): Promise<AchievementProgress[]> {
  const achievements = await prisma.achievement.findMany({
    where: { memberId, isUnlocked: false }
  });
  
  return achievements.map(ach => ({
    achievementId: ach.id,
    currentValue: ach.currentValue || 0,
    targetValue: ach.targetValue || 0,
    progress: ach.progress,
    isUnlocked: ach.isUnlocked
  }));
}

/**
 * 分享成就
 */
export async function shareAchievement(achievementId: string): Promise<boolean> {
  try {
    await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        isShared: true,
        sharedAt: new Date()
      }
    });
    return true;
  } catch (error) {
    console.error('分享成就失败:', error);
    return false;
  }
}

/**
 * 获取成就统计
 */
export async function getAchievementStats(memberId: string): Promise<{
  totalAchievements: number;
  unlockedAchievements: number;
  totalPoints: number;
  rarityDistribution: Record<AchievementRarity, number>;
}> {
  const achievements = await prisma.achievement.findMany({
    where: { memberId }
  });
  
  const unlocked = achievements.filter(ach => ach.isUnlocked);
  const totalPoints = unlocked.reduce((sum, ach) => sum + ach.points, 0);
  
  const rarityDistribution = unlocked.reduce((acc, ach) => {
    acc[ach.rarity] = (acc[ach.rarity] || 0) + 1;
    return acc;
  }, {} as Record<AchievementRarity, number>);
  
  return {
    totalAchievements: achievements.length,
    unlockedAchievements: unlocked.length,
    totalPoints,
    rarityDistribution
  };
}
