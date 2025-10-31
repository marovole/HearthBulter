/**
 * 社交分享内容生成服务
 * 负责生成各种类型的分享内容，包括健康报告、目标达成、食谱等
 */

import { PrismaClient, ShareContentType, FamilyMember, HealthReport, Achievement, MealLog } from '@prisma/client';
import { generateHealthReportCard } from './templates/health-report-template';
import { generateAchievementCard } from './templates/achievement-template';
import { generateMealLogCard } from './templates/meal-log-template';
import { generateGoalAchievementCard } from './templates/goal-achievement-template';
import { generateRecipeCard } from './templates/recipe-template';
import { generateCheckInStreakCard } from './templates/check-in-streak-template';
import { generateWeightMilestoneCard } from './templates/weight-milestone-template';
import { generateInviteCode } from './share-link';

const prisma = new PrismaClient();

export interface ShareContentData {
  memberId: string;
  contentType: ShareContentType;
  contentId: string;
  title?: string;
  description?: string;
  customMessage?: string;
  privacyLevel?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  allowComment?: boolean;
  allowLike?: boolean;
  expiresAt?: Date;
}

export interface GeneratedShareContent {
  title: string;
  description: string;
  imageUrl?: string;
  metadata: Record<string, any>;
}

/**
 * 生成分享内容
 */
export async function generateShareContent(data: ShareContentData): Promise<GeneratedShareContent> {
  const { memberId, contentType, contentId, title, description, customMessage } = data;

  // 获取成员信息
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    include: { family: true }
  });

  if (!member) {
    throw new Error('成员不存在');
  }

  // 生成邀请码
  const inviteCode = await generateInviteCode();

  let contentData: GeneratedShareContent;

  switch (contentType) {
    case 'HEALTH_REPORT':
      contentData = await generateHealthReportContent(memberId, contentId, customMessage, inviteCode);
      break;
    case 'GOAL_ACHIEVEMENT':
      contentData = await generateGoalAchievementContent(memberId, contentId, customMessage, inviteCode);
      break;
    case 'MEAL_LOG':
      contentData = await generateMealLogContent(memberId, contentId, customMessage, inviteCode);
      break;
    case 'RECIPE':
      contentData = await generateRecipeContent(memberId, contentId, customMessage, inviteCode);
      break;
    case 'ACHIEVEMENT':
      contentData = await generateAchievementContent(memberId, contentId, customMessage, inviteCode);
      break;
    case 'CHECK_IN_STREAK':
      contentData = await generateCheckInStreakContent(memberId, contentId, customMessage, inviteCode);
      break;
    case 'WEIGHT_MILESTONE':
      contentData = await generateWeightMilestoneContent(memberId, contentId, customMessage, inviteCode);
      break;
    default:
      throw new Error(`不支持的分享内容类型: ${contentType}`);
  }

  // 应用自定义标题和描述
  if (title) contentData.title = title;
  if (description) contentData.description = description;

  // 添加邀请码到元数据
  contentData.metadata.inviteCode = inviteCode;

  return contentData;
}

/**
 * 生成健康报告分享内容
 */
async function generateHealthReportContent(memberId: string, reportId: string, customMessage?: string, inviteCode?: string): Promise<GeneratedShareContent> {
  const report = await prisma.healthReport.findFirst({
    where: {
      id: reportId,
      memberId
    }
  });

  if (!report) {
    throw new Error('健康报告不存在');
  }

  const imageUrl = await generateHealthReportCard({
    memberName: report.member?.name || '健康达人',
    reportType: report.reportType,
    period: `${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}`,
    overallScore: report.overallScore || 0,
    summary: report.summary || '',
    customMessage,
    inviteCode
  });

  return {
    title: `${report.member?.name || '我'}的${getReportTypeLabel(report.reportType)}健康报告`,
    description: `${report.summary || '健康生活，从记录开始'}📊 综合健康评分: ${report.overallScore || 0}分`,
    imageUrl,
    metadata: {
      reportId: report.id,
      reportType: report.reportType,
      period: {
        start: report.startDate,
        end: report.endDate
      },
      score: report.overallScore
    }
  };
}

/**
 * 生成目标达成分享内容
 */
async function generateGoalAchievementContent(memberId: string, goalId: string, customMessage?: string, inviteCode?: string): Promise<GeneratedShareContent> {
  const goal = await prisma.healthGoal.findFirst({
    where: {
      id: goalId,
      memberId,
      status: 'COMPLETED'
    }
  });

  if (!goal) {
    throw new Error('目标不存在或未完成');
  }

  const imageUrl = await generateGoalAchievementCard({
    memberName: goal.member?.name || '健康达人',
    goalType: goal.goalType,
    targetWeight: goal.targetWeight,
    currentWeight: goal.currentWeight,
    progress: goal.progress || 0,
    startDate: goal.startDate,
    targetDate: goal.targetDate,
    customMessage,
    inviteCode
  });

  return {
    title: `🎉 目标达成！${goal.member?.name || '我'}完成了${getGoalTypeLabel(goal.goalType)}`,
    description: `坚持就是胜利！${goal.progress || 0}%的进度达成${customMessage || '，继续加油！'}`,
    imageUrl,
    metadata: {
      goalId: goal.id,
      goalType: goal.goalType,
      progress: goal.progress,
      targetWeight: goal.targetWeight,
      currentWeight: goal.currentWeight
    }
  };
}

/**
 * 生成餐饮打卡分享内容
 */
async function generateMealLogContent(memberId: string, mealLogId: string, customMessage?: string, inviteCode?: string): Promise<GeneratedShareContent> {
  const mealLog = await prisma.mealLog.findFirst({
    where: {
      id: mealLogId,
      memberId
    },
    include: {
      foods: {
        include: {
          food: true
        }
      }
    }
  });

  if (!mealLog) {
    throw new Error('餐饮记录不存在');
  }

  const foodNames = mealLog.foods.map(f => f.food.name).join('、');
  const imageUrl = await generateMealLogCard({
    memberName: mealLog.member?.name || '美食家',
    mealType: mealLog.mealType,
    date: mealLog.date,
    foods: mealLog.foods.map(f => ({
      name: f.food.name,
      amount: f.amount
    })),
    calories: mealLog.calories,
    protein: mealLog.protein,
    carbs: mealLog.carbs,
    fat: mealLog.fat,
    customMessage,
    inviteCode
  });

  return {
    title: `${mealLog.member?.name || '我'}的${getMealTypeLabel(mealLog.mealType)}打卡`,
    description: `今日${getMealTypeLabel(mealLog.mealType)}：${foodNames} 🍽️ 营养均衡${mealLog.calories}千卡`,
    imageUrl,
    metadata: {
      mealLogId: mealLog.id,
      mealType: mealLog.mealType,
      date: mealLog.date,
      calories: mealLog.calories,
      protein: mealLog.protein,
      carbs: mealLog.carbs,
      fat: mealLog.fat
    }
  };
}

/**
 * 生成食谱分享内容
 */
async function generateRecipeContent(memberId: string, recipeId: string, customMessage?: string, inviteCode?: string): Promise<GeneratedShareContent> {
  // 这里需要根据实际的食谱模型来实现
  // 暂时返回模拟数据
  const imageUrl = await generateRecipeCard({
    memberName: '美食家',
    recipeName: '健康营养餐',
    description: '营养均衡，美味可口',
    calories: 450,
    protein: 25,
    carbs: 50,
    fat: 15,
    customMessage,
    inviteCode
  });

  return {
    title: '分享一道健康食谱：营养均衡餐',
    description: '美味又健康，营养搭配合理 🥗 蛋白质丰富，维生素充足',
    imageUrl,
    metadata: {
      recipeId,
      calories: 450,
      protein: 25,
      carbs: 50,
      fat: 15
    }
  };
}

/**
 * 生成成就徽章分享内容
 */
async function generateAchievementContent(memberId: string, achievementId: string, customMessage?: string, inviteCode?: string): Promise<GeneratedShareContent> {
  const achievement = await prisma.achievement.findFirst({
    where: {
      id: achievementId,
      memberId,
      isUnlocked: true
    }
  });

  if (!achievement) {
    throw new Error('成就不存在或未解锁');
  }

  const imageUrl = await generateAchievementCard({
    memberName: achievement.member?.name || '成就达人',
    achievementTitle: achievement.title,
    achievementDescription: achievement.description,
    rarity: achievement.rarity,
    points: achievement.points,
    unlockedAt: achievement.unlockedAt,
    customMessage,
    inviteCode
  });

  return {
    title: `🏆 ${achievement.member?.name || '我'}解锁了${achievement.title}！`,
    description: `${achievement.description} ${getRarityLabel(achievement.rarity)}成就 +${achievement.points}积分`,
    imageUrl,
    metadata: {
      achievementId: achievement.id,
      type: achievement.type,
      rarity: achievement.rarity,
      points: achievement.points,
      unlockedAt: achievement.unlockedAt
    }
  };
}

/**
 * 生成连续打卡分享内容
 */
async function generateCheckInStreakContent(memberId: string, streakId: string, customMessage?: string, inviteCode?: string): Promise<GeneratedShareContent> {
  const streak = await prisma.trackingStreak.findUnique({
    where: { memberId }
  });

  if (!streak || streak.currentStreak === 0) {
    throw new Error('暂无打卡记录');
  }

  const imageUrl = await generateCheckInStreakCard({
    memberName: streak.member?.name || '打卡达人',
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalDays: streak.totalDays,
    lastCheckIn: streak.lastCheckIn,
    customMessage,
    inviteCode
  });

  return {
    title: `🔥 ${streak.member?.name || '我'}已连续打卡${streak.currentStreak}天！`,
    description: `坚持就是胜利！连续${streak.currentStreak}天健康打卡，总计${streak.totalDays}天${customMessage || '，继续保持！'}`,
    imageUrl,
    metadata: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDays: streak.totalDays,
      lastCheckIn: streak.lastCheckIn
    }
  };
}

/**
 * 生成体重里程碑分享内容
 */
async function generateWeightMilestoneContent(memberId: string, milestoneId: string, customMessage?: string, inviteCode?: string): Promise<GeneratedShareContent> {
  // 获取最新的体重数据
  const latestWeight = await prisma.healthData.findFirst({
    where: { memberId },
    orderBy: { measuredAt: 'desc' }
  });

  if (!latestWeight || !latestWeight.weight) {
    throw new Error('暂无体重数据');
  }

  const imageUrl = await generateWeightMilestoneCard({
    memberName: latestWeight.member?.name || '减重达人',
    currentWeight: latestWeight.weight,
    measuredAt: latestWeight.measuredAt,
    customMessage,
    inviteCode
  });

  return {
    title: `⚖️ ${latestWeight.member?.name || '我'}的体重里程碑：${latestWeight.weight}kg`,
    description: `健康体重管理新纪录！${latestWeight.measuredAt.toLocaleDateString()}测量${customMessage || '，继续努力！'}`,
    imageUrl,
    metadata: {
      weight: latestWeight.weight,
      measuredAt: latestWeight.measuredAt
    }
  };
}

// 辅助函数：获取标签文本
function getReportTypeLabel(type: string): string {
  const labels = {
    'WEEKLY': '周',
    'MONTHLY': '月',
    'QUARTERLY': '季度',
    'CUSTOM': '自定义'
  };
  return labels[type as keyof typeof labels] || '';
}

function getGoalTypeLabel(type: string): string {
  const labels = {
    'LOSE_WEIGHT': '减重目标',
    'GAIN_MUSCLE': '增肌目标',
    'MAINTAIN': '体重维持',
    'IMPROVE_HEALTH': '健康改善'
  };
  return labels[type as keyof typeof labels] || '';
}

function getMealTypeLabel(type: string): string {
  const labels = {
    'BREAKFAST': '早餐',
    'LUNCH': '午餐',
    'DINNER': '晚餐',
    'SNACK': '加餐'
  };
  return labels[type as keyof typeof labels] || '';
}

function getRarityLabel(rarity: string): string {
  const labels = {
    'BRONZE': '青铜',
    'SILVER': '白银',
    'GOLD': '黄金',
    'PLATINUM': '白金',
    'DIAMOND': '钻石'
  };
  return labels[rarity as keyof typeof labels] || '';
}
