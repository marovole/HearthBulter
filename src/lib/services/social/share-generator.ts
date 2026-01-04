/**
 * 分享内容生成服务
 * 生成各种类型的分享内容和描述
 */

import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  ShareContentInput,
  ShareContentResult,
  ShareMetadata,
  OpenGraphMetadata,
  TwitterCardMetadata,
} from '@/types/social-sharing';
import {
  ShareContentType,
  SHARE_CONTENT_TYPE_LABELS,
  SHARE_TEMPLATE_CONFIGS,
  ShareTemplate,
} from '@/types/social-sharing';
import { prisma } from '@/lib/db';

/**
 * 分享内容生成器类
 */
export class ShareContentGenerator {
  private static instance: ShareContentGenerator;

  static getInstance(): ShareContentGenerator {
    if (!ShareContentGenerator.instance) {
      ShareContentGenerator.instance = new ShareContentGenerator();
    }
    return ShareContentGenerator.instance;
  }

  /**
   * 生成分享内容
   */
  async generateShareContent(
    input: ShareContentInput,
    options: { shareToken?: string; baseUrl?: string; shareUrl?: string } = {},
  ): Promise<ShareContentResult> {
    const shareToken = options.shareToken || this.generateShareToken();
    const baseUrl =
      options.baseUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://health-butler.com';
    const shareUrl = options.shareUrl || `${baseUrl}/share/${shareToken}`;

    // 根据类型生成内容
    const content = await this.generateContentByType(input, shareUrl);

    // 生成元数据
    const metadata = this.generateMetadata(input, shareUrl);

    return {
      content: content.content,
      imageUrl: content.imageUrl,
      shareUrl,
      platforms: input.platforms,
      metadata,
    };
  }

  /**
   * 根据类型生成内容
   */
  private async generateContentByType(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    switch (input.type) {
      case ShareContentType.HEALTH_REPORT:
        return this.generateHealthReportContent(input, shareUrl);
      case ShareContentType.GOAL_ACHIEVED:
        return this.generateGoalAchievedContent(input, shareUrl);
      case ShareContentType.RECIPE_CREATED:
        return this.generateRecipeCreatedContent(input, shareUrl);
      case ShareContentType.ACHIEVEMENT_UNLOCKED:
        return this.generateAchievementUnlockedContent(input, shareUrl);
      case ShareContentType.CHECKIN_STREAK:
        return this.generateCheckinStreakContent(input, shareUrl);
      case ShareContentType.WEIGHT_MILESTONE:
        return this.generateWeightMilestoneContent(input, shareUrl);
      case ShareContentType.PERSONAL_RECORD:
        return this.generatePersonalRecordContent(input, shareUrl);
      case ShareContentType.COMMUNITY_POST:
        return this.generateCommunityPostContent(input, shareUrl);
      default:
        return this.generateDefaultContent(input, shareUrl);
    }
  }

  /**
   * 生成健康报告分享内容
   */
  private async generateHealthReportContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    // 获取用户健康数据
    const member = await prisma.familyMember.findUnique({
      where: { id: input.memberId },
      include: {
        healthData: {
          orderBy: { measuredAt: 'desc' },
          take: 30,
        },
        healthGoals: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!member) {
      throw new Error('用户未找到');
    }

    // 计算健康指标
    const latestData = member.healthData[0];
    const healthScore = this.calculateHealthScore(member.healthData);
    const weightChange = this.calculateWeightChange(member.healthData);

    const title = '我的健康报告';
    const description = this.generateHealthDescription(
      healthScore,
      weightChange,
      member.healthData.length,
    );
    const imageUrl = await this.generateHealthReportImage({
      memberName: member.name,
      healthScore,
      weightChange,
      dataPoints: member.healthData.length,
      latestData,
      period: '最近30天',
    });

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        targetId: input.targetId,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成目标达成分享内容
   */
  private async generateGoalAchievedContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    if (!input.targetId) {
      throw new Error('目标ID不能为空');
    }

    const healthGoal = await prisma.healthGoal.findUnique({
      where: { id: input.targetId },
      include: {
        member: {
          select: { name: true },
        },
      },
    });

    if (!healthGoal) {
      throw new Error('健康目标未找到');
    }

    const title = `🎯 ${healthGoal.title} 目标达成！`;
    const description = this.generateGoalAchievementDescription(healthGoal);
    const imageUrl = await this.generateGoalAchievedImage({
      memberName: healthGoal.member.name,
      goalTitle: healthGoal.title,
      progress: 100,
      achievedDate: healthGoal.endDate || new Date(),
      metric: healthGoal.goalType,
    });

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        targetId: input.targetId,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成食谱分享内容
   */
  private async generateRecipeCreatedContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    if (!input.targetId) {
      throw new Error('食谱ID不能为空');
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id: input.targetId },
      include: {
        member: {
          select: { name: true },
        },
        ingredients: {
          include: {
            food: {
              select: { name: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new Error('食谱未找到');
    }

    const title = `🍽️ 我创建的健康食谱：${recipe.name}`;
    const description = this.generateRecipeDescription(recipe);
    const imageUrl = await this.generateRecipeImage({
      recipeName: recipe.name,
      memberName: recipe.member.name,
      calories: recipe.calories,
      protein: recipe.protein,
      ingredients: recipe.ingredients.map((i) => i.food.name),
      createdAt: recipe.createdAt,
    });

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        targetId: input.targetId,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成成就解锁分享内容
   */
  private async generateAchievementUnlockedContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    if (!input.targetId) {
      throw new Error('成就ID不能为空');
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id: input.targetId },
      include: {
        member: {
          select: { name: true },
        },
      },
    });

    if (!achievement) {
      throw new Error('成就未找到');
    }

    const { ACHIEVEMENT_TYPE_CONFIGS } = await import('@/types/social-sharing');
    const config = ACHIEVEMENT_TYPE_CONFIGS[achievement.type];

    const title = `🏆 解锁成就：${config.label}`;
    const description = `${config.description} - ${achievement.points}积分`;
    const imageUrl = await this.generateAchievementImage({
      memberName: achievement.member.name,
      achievementType: achievement.type,
      achievementTitle: config.label,
      achievementDescription: config.description,
      points: achievement.points,
      rarity: achievement.rarity,
      unlockedAt: achievement.unlockedAt || new Date(),
      icon: config.icon,
      color: config.color,
    });

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        targetId: input.targetId,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成连续打卡分享内容
   */
  private async generateCheckinStreakContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    const member = await prisma.familyMember.findUnique({
      where: { id: input.memberId },
      include: {
        healthData: {
          where: {
            measuredAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
            },
          },
          orderBy: { measuredAt: 'desc' },
        },
      },
    });

    if (!member) {
      throw new Error('用户未找到');
    }

    const streakDays = this.calculateStreakDays(member.healthData);
    const title = `🔥 连续打卡${streakDays}天！`;
    const description = `坚持记录健康数据${streakDays}天，继续保持！`;
    const imageUrl = await this.generateStreakImage({
      memberName: member.name,
      streakDays,
      currentStreak: streakDays,
      bestStreak: streakDays,
      period: '当前',
      icon: '🔥',
    });

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成体重里程碑分享内容
   */
  private async generateWeightMilestoneContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    const member = await prisma.familyMember.findUnique({
      where: { id: input.memberId },
      include: {
        healthData: {
          where: { weight: { not: null } },
          orderBy: { measuredAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!member) {
      throw new Error('用户未找到');
    }

    const weightData = member.healthData.filter((d) => d.weight !== null);
    if (weightData.length < 2) {
      throw new Error('体重数据不足');
    }

    const currentWeight = weightData[0].weight!;
    const initialWeight = weightData[weightData.length - 1].weight!;
    const weightLoss = initialWeight - currentWeight;
    const weightLossPercent = (weightLoss / initialWeight) * 100;

    const title = `🎯 减重${weightLoss.toFixed(1)}kg里程碑达成！`;
    const description = `从${initialWeight.toFixed(1)}kg减到${currentWeight.toFixed(1)}kg，减重${weightLossPercent.toFixed(1)}%`;
    const imageUrl = await this.generateWeightMilestoneImage({
      memberName: member.name,
      initialWeight,
      currentWeight,
      weightLoss,
      weightLossPercent,
      period: '累计',
      icon: '📉',
    });

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成个人记录分享内容
   */
  private async generatePersonalRecordContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    // 这里可以根据具体的记录类型生成不同内容
    // 暂时生成通用的个人记录内容
    const member = await prisma.familyMember.findUnique({
      where: { id: input.memberId },
      select: { name: true },
    });

    if (!member) {
      throw new Error('用户未找到');
    }

    const title = '⭐ 创造个人新纪录！';
    const description =
      input.customMessage || '在健康管理的道路上又迈出了重要一步';
    const imageUrl = await this.generatePersonalRecordImage({
      memberName: member.name,
      title,
      description,
      recordDate: new Date(),
      icon: '⭐',
    });

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成社区帖子分享内容
   */
  private async generateCommunityPostContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    // 社区帖子通常已经有完整内容，这里主要是生成分享卡片
    const title = input.title || '分享到社区';
    const description = input.customMessage || '分享我的健康生活';
    const imageUrl = input.imageUrl || '/images/default-community-share.jpg';

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        targetId: input.targetId,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成默认分享内容
   */
  private async generateDefaultContent(
    input: ShareContentInput,
    shareUrl: string,
  ) {
    const title = input.title || '健康生活分享';
    const description = input.customMessage || '分享我的健康数据';
    const imageUrl = input.imageUrl || '/images/default-share.jpg';

    return {
      content: {
        id: '', // 会在API中生成
        memberId: input.memberId,
        type: input.type,
        title,
        description,
        imageUrl,
        targetId: input.targetId,
        privacyLevel: input.privacyLevel,
        createdAt: new Date(),
      },
      imageUrl,
    };
  }

  /**
   * 生成分享元数据
   */
  private generateMetadata(
    input: ShareContentInput,
    shareUrl: string,
  ): ShareMetadata {
    const openGraph = this.generateOpenGraphMetadata(input, shareUrl);
    const twitterCard = this.generateTwitterCardMetadata(input, shareUrl);

    return {
      openGraph,
      twitterCard,
      customParams: {
        platforms: input.platforms,
        privacyLevel: input.privacyLevel,
        customMessage: input.customMessage,
      },
    };
  }

  /**
   * 生成Open Graph元数据
   */
  private generateOpenGraphMetadata(
    input: ShareContentInput,
    shareUrl: string,
  ): OpenGraphMetadata {
    return {
      title: input.title,
      description:
        input.description ||
        `Health Butler - ${SHARE_CONTENT_TYPE_LABELS[input.type]}`,
      image: input.imageUrl || '/images/og-default.jpg',
      url: shareUrl,
      type: 'website',
      siteName: 'Health Butler',
    };
  }

  /**
   * 生成Twitter Card元数据
   */
  private generateTwitterCardMetadata(
    input: ShareContentInput,
    shareUrl: string,
  ): TwitterCardMetadata {
    return {
      card: 'summary_large_image',
      title: input.title,
      description:
        input.description ||
        `Health Butler - ${SHARE_CONTENT_TYPE_LABELS[input.type]}`,
      image: input.imageUrl || '/images/og-default.jpg',
      site: '@healthbutler',
    };
  }

  /**
   * 生成分享令牌
   */
  private generateShareToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(healthData: any[]): number {
    if (healthData.length === 0) return 50;

    // 简化的健康评分算法
    const latestData = healthData[0];
    let score = 50;

    // 体重指标
    if (
      latestData.weight &&
      latestData.weight > 40 &&
      latestData.weight < 100
    ) {
      score += 10;
    }

    // 心率指标
    if (
      latestData.heartRate &&
      latestData.heartRate > 60 &&
      latestData.heartRate < 100
    ) {
      score += 10;
    }

    // 血压指标
    if (latestData.bloodPressureSystolic && latestData.bloodPressureDiastolic) {
      const systolic = latestData.bloodPressureSystolic;
      const diastolic = latestData.bloodPressureDiastolic;
      if (
        systolic >= 90 &&
        systolic <= 120 &&
        diastolic >= 60 &&
        diastolic <= 80
      ) {
        score += 15;
      }
    }

    // 数据连续性
    if (healthData.length >= 7) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * 计算体重变化
   */
  private calculateWeightChange(healthData: any[]): {
    lost: number;
    period: string;
  } {
    const weightData = healthData.filter((d) => d.weight !== null);
    if (weightData.length < 2) return { lost: 0, period: '暂无数据' };

    const currentWeight = weightData[0].weight;
    const initialWeight = weightData[weightData.length - 1].weight;
    const weightLoss = initialWeight - currentWeight;

    const daysDiff = Math.floor(
      (new Date(weightData[0].measuredAt).getTime() -
        new Date(weightData[weightData.length - 1].measuredAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      lost: weightLoss || 0,
      period: `${daysDiff}天`,
    };
  }

  /**
   * 生成健康描述
   */
  private generateHealthDescription(
    healthScore: number,
    weightChange: any,
    dataPoints: number,
  ): string {
    const descriptions = [];

    descriptions.push(`健康评分${healthScore}分`);

    if (weightChange.lost > 0) {
      descriptions.push(
        `${weightChange.period}减重${weightChange.lost.toFixed(1)}kg`,
      );
    }

    descriptions.push(`记录健康数据${dataPoints}次`);

    return `${descriptions.join('，')}。`;
  }

  /**
   * 生成目标达成描述
   */
  private generateGoalAchievementDescription(goal: any): string {
    const achievedDate = goal.endDate || new Date();
    const dateStr = format(achievedDate, 'yyyy年MM月dd日', { locale: zhCN });

    return `在${dateStr}成功达成了"${goal.title}"目标，为我的健康管理增添了动力！`;
  }

  /**
   * 生成食谱描述
   */
  private generateRecipeDescription(recipe: any): string {
    const nutrition = [];

    if (recipe.calories) nutrition.push(`${Math.round(recipe.calories)}卡路里`);
    if (recipe.protein) nutrition.push(`${Math.round(recipe.protein)}g蛋白质`);
    if (recipe.carbs) nutrition.push(`${Math.round(recipe.carbs)}g碳水`);
    if (recipe.fat) nutrition.push(`${Math.round(recipe.fat)}g脂肪`);

    const nutritionText = nutrition.join('，');
    const ingredientsCount = recipe.ingredients.length;

    return `营养丰富的${recipe.name}，${ingredientsCount}种食材，${nutritionText}。快来试试这道健康美食吧！`;
  }

  /**
   * 计算连续打卡天数
   */
  private calculateStreakDays(healthData: any[]): number {
    if (healthData.length === 0) return 0;

    const sortedData = healthData.sort(
      (a, b) =>
        new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedData.length; i++) {
      const dataDate = new Date(sortedData[i].measuredAt);
      dataDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // 图片生成方法（简化版本，实际实现中会调用图片生成服务）
  private async generateHealthReportImage(data: any): Promise<string> {
    // 临时返回默认图片URL，实际会生成个性化图片
    return '/images/share/health-report.jpg';
  }

  private async generateGoalAchievedImage(data: any): Promise<string> {
    return '/images/share/goal-achieved.jpg';
  }

  private async generateRecipeImage(data: any): Promise<string> {
    return '/images/share/recipe-card.jpg';
  }

  private async generateAchievementImage(data: any): Promise<string> {
    return '/images/share/achievement-unlocked.jpg';
  }

  private async generateStreakImage(data: any): Promise<string> {
    return '/images/share/checkin-streak.jpg';
  }

  private async generateWeightMilestoneImage(data: any): Promise<string> {
    return '/images/share/weight-milestone.jpg';
  }

  private async generatePersonalRecordImage(data: any): Promise<string> {
    return '/images/share/personal-record.jpg';
  }
}

// 导出单例实例
export const shareContentGenerator = ShareContentGenerator.getInstance();

// 导出工具函数
export async function createShareContent(
  input: ShareContentInput,
  options: { shareToken?: string; baseUrl?: string; shareUrl?: string } = {},
): Promise<ShareContentResult> {
  const generator = ShareContentGenerator.getInstance();
  return generator.generateShareContent(input, options);
}

// 别名导出，用于测试和向后兼容
export const generateShareContent = createShareContent;

export async function generateSharePreview(
  input: Partial<ShareContentInput>,
): Promise<any> {
  const generator = ShareContentGenerator.getInstance();
  const fullInput: ShareContentInput = {
    memberId: input.memberId || 'preview',
    type: input.type || ShareContentType.HEALTH_REPORT,
    title: input.title || '预览标题',
    description: input.description,
    privacyLevel: input.privacyLevel || 'PUBLIC',
    platforms: input.platforms || ['COPY_LINK'],
    ...input,
  };

  return generator.generateShareContent(fullInput);
}
