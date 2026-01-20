import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  SHARE_CONTENT_TYPE_LABELS,
  SHARE_TEMPLATE_CONFIGS,
  ShareContentType,
  SharePrivacyLevel,
  ShareTemplate,
  SocialPlatform,
  type OpenGraphMetadata,
  type TwitterCardMetadata,
  type ShareContentInput,
  type ShareContentResult,
  type ShareMetadata,
} from "@/types/social-sharing";

export class ShareContentGenerator {
  private static instance: ShareContentGenerator;

  static getInstance(): ShareContentGenerator {
    if (!ShareContentGenerator.instance) {
      ShareContentGenerator.instance = new ShareContentGenerator();
    }
    return ShareContentGenerator.instance;
  }

  async generateShareContent(
    input: ShareContentInput,
    options: { shareToken?: string; baseUrl?: string; shareUrl?: string } = {}
  ): Promise<ShareContentResult> {
    const shareToken = options.shareToken || this.generateShareToken();
    const baseUrl =
      options.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://health-butler.com";
    const shareUrl = options.shareUrl || `${baseUrl}/share/${shareToken}`;

    const contentResult = await this.generateContentByType(input, shareUrl, shareToken);

    const metadata = this.generateMetadata(input, shareUrl);

    const contentObj = contentResult as { content: any; imageUrl: string };

    return {
      content: contentObj.content,
      imageUrl: contentObj.imageUrl,
      shareUrl,
      platforms: input.platforms,
      metadata,
    } as ShareContentResult;
  }

  private mapToConvexContentType(type: ShareContentType): string {
    switch (type) {
      case ShareContentType.HEALTH_REPORT:
        return "HEALTH_REPORT";
      case ShareContentType.GOAL_ACHIEVED:
        return "GOAL_ACHIEVEMENT";
      case ShareContentType.RECIPE_CREATED:
        return "RECIPE";
      case ShareContentType.ACHIEVEMENT_UNLOCKED:
        return "ACHIEVEMENT";
      case ShareContentType.MEAL_PLAN_COMPLETED:
        return "MEAL_LOG";
      case ShareContentType.WEIGHT_MILESTONE:
        return "WEIGHT_MILESTONE";
      case ShareContentType.CHECKIN_STREAK:
        return "CHECK_IN_STREAK";
      case ShareContentType.PERSONAL_RECORD:
        return "WEEKLY_SUMMARY";
      case ShareContentType.COMMUNITY_POST:
        return "WEEKLY_SUMMARY";
      default:
        return "HEALTH_REPORT";
    }
  }

  private buildSharedContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string,
    data: {
      title: string;
      description?: string;
      imageUrl?: string;
      targetId?: string;
      communityPostId?: string;
      metadata?: Record<string, unknown>;
    }
  ): unknown {
    const now = Date.now();
    const metadata = {
      ...(data.metadata ?? {}),
      ...(data.targetId ? { targetId: data.targetId } : {}),
    };

    return {
      id: "",
      memberId: input.memberId,
      contentType: this.mapToConvexContentType(input.type),
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      metadata: Object.keys(metadata).length ? metadata : null,
      shareToken,
      shareUrl,
      inviteCode: null,
      sharedPlatforms: JSON.stringify(input.platforms),
      privacyLevel: input.privacyLevel,
      allowComment: true,
      allowLike: true,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      clickCount: 0,
      downloadCount: 0,
      conversionCount: 0,
      status: "ACTIVE",
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      communityPostId: data.communityPostId ?? null,
    };
  }

  private async generateContentByType(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    switch (input.type) {
      case ShareContentType.HEALTH_REPORT:
        return this.generateHealthReportContent(input, shareUrl, shareToken);
      case ShareContentType.GOAL_ACHIEVED:
        return this.generateGoalAchievedContent(input, shareUrl, shareToken);
      case ShareContentType.RECIPE_CREATED:
        return this.generateRecipeCreatedContent(input, shareUrl, shareToken);
      case ShareContentType.ACHIEVEMENT_UNLOCKED:
        return this.generateAchievementUnlockedContent(input, shareUrl, shareToken);
      case ShareContentType.CHECKIN_STREAK:
        return this.generateCheckinStreakContent(input, shareUrl, shareToken);
      case ShareContentType.WEIGHT_MILESTONE:
        return this.generateWeightMilestoneContent(input, shareUrl, shareToken);
      case ShareContentType.PERSONAL_RECORD:
        return this.generatePersonalRecordContent(input, shareUrl, shareToken);
      case ShareContentType.COMMUNITY_POST:
        return this.generateCommunityPostContent(input, shareUrl, shareToken);
      default:
        return this.generateDefaultContent(input, shareUrl, shareToken);
    }
  }

  private async generateHealthReportContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const member = await convexClient.query<Record<string, unknown> | null>(api.members.getById, {
      memberId: input.memberId as Id<"familyMembers">,
    });

    if (!member) {
      throw new Error("用户未找到");
    }

    const healthDataResult = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.health.listHealthData, {
      memberId: input.memberId as Id<"familyMembers">,
      startDate: thirtyDaysAgo,
      endDate: undefined,
      page: 1,
      limit: 30,
      sortOrder: "desc",
    });

    const healthData = healthDataResult.data;

    const goalsResult = await convexClient.query<Array<Record<string, unknown>>>(
      api.health.listGoals,
      {
        memberId: input.memberId as Id<"familyMembers">,
        includeInactive: false,
      }
    );

    const activeGoals = goalsResult.filter(
      (g) => (g as Record<string, unknown>).status === "ACTIVE"
    );

    const latestData = healthData[0] as Record<string, unknown> | undefined;
    const healthScore = this.calculateHealthScore(healthData);
    const weightChange = this.calculateWeightChange(healthData);

    const title = "我的健康报告";
    const description = this.generateHealthDescription(
      healthScore,
      weightChange,
      healthData.length
    );
    const imageUrl = await this.generateHealthReportImage({
      memberName: (member as Record<string, unknown>).name as string,
      healthScore,
      weightChange,
      dataPoints: healthData.length,
      latestData,
      period: "最近30天",
    });

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
      targetId: input.targetId,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generateGoalAchievedContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    if (!input.targetId) {
      throw new Error("目标ID不能为空");
    }

    const healthGoal = await convexClient.query<Record<string, unknown> | null>(
      api.health.getGoalById,
      {
        goalId: input.targetId as Id<"healthGoals">,
      }
    );

    if (!healthGoal) {
      throw new Error("健康目标未找到");
    }

    const member = await convexClient.query<Record<string, unknown> | null>(api.members.getById, {
      memberId: input.memberId as Id<"familyMembers">,
    });

    const title = `🎯 ${(healthGoal as Record<string, unknown>).title} 目标达成！`;
    const description = this.generateGoalAchievementDescription(
      healthGoal as Record<string, unknown>
    );
    const imageUrl = await this.generateGoalAchievedImage({
      memberName: member ? ((member as Record<string, unknown>).name as string) : "用户",
      goalTitle: (healthGoal as Record<string, unknown>).title as string,
      progress: 100,
      achievedDate: (healthGoal as Record<string, unknown>).endDate || new Date(),
      metric: (healthGoal as Record<string, unknown>).goalType as string,
    });

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
      targetId: input.targetId,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generateRecipeCreatedContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    if (!input.targetId) {
      throw new Error("食谱ID不能为空");
    }

    const recipe = await convexClient.query<Record<string, unknown> | null>(api.recipes.getById, {
      recipeId: input.targetId as Id<"recipes">,
    });

    if (!recipe) {
      throw new Error("食谱未找到");
    }

    const member = await convexClient.query<Record<string, unknown> | null>(api.members.getById, {
      memberId: input.memberId as Id<"familyMembers">,
    });

    const title = `🍽️ 我创建的健康食谱：${(recipe as Record<string, unknown>).name}`;
    const description = this.generateRecipeDescription(recipe as Record<string, unknown>);

    const ingredients = (recipe as Record<string, unknown>).ingredients as
      | Array<{
          food: { name: string };
        }>
      | undefined;
    const ingredientNames = ingredients?.map((i) => i.food.name) ?? [];

    const imageUrl = await this.generateRecipeImage({
      recipeName: (recipe as Record<string, unknown>).name as string,
      memberName: member ? ((member as Record<string, unknown>).name as string) : "用户",
      calories: (recipe as Record<string, unknown>).calories as number,
      protein: (recipe as Record<string, unknown>).protein as number,
      ingredients: ingredientNames,
      createdAt: (recipe as Record<string, unknown>).createdAt as number,
    });

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
      targetId: input.targetId,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generateAchievementUnlockedContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    if (!input.targetId) {
      throw new Error("成就ID不能为空");
    }

    const achievement = await convexClient.query<Record<string, unknown> | null>(
      api.achievements.getById,
      {
        id: input.targetId as Id<"achievements">,
      }
    );

    if (!achievement) {
      throw new Error("成就未找到");
    }

    const { ACHIEVEMENT_TYPE_CONFIGS } = await import("@/types/social-sharing");
    const type = (achievement as Record<string, unknown>).type as string;
    const config = ACHIEVEMENT_TYPE_CONFIGS[type as keyof typeof ACHIEVEMENT_TYPE_CONFIGS];

    const member = await convexClient.query<Record<string, unknown> | null>(api.members.getById, {
      memberId: input.memberId as Id<"familyMembers">,
    });

    const title = `🏆 解锁成就：${config.label}`;
    const description = `${config.description} - ${(achievement as Record<string, unknown>).points}积分`;
    const imageUrl = await this.generateAchievementImage({
      memberName: member ? ((member as Record<string, unknown>).name as string) : "用户",
      achievementType: type,
      achievementTitle: config.label,
      achievementDescription: config.description,
      points: (achievement as Record<string, unknown>).points as number,
      rarity: (achievement as Record<string, unknown>).rarity as string,
      unlockedAt: (achievement as Record<string, unknown>).unlockedAt || new Date(),
      icon: config.icon,
      color: config.color,
    });

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
      targetId: input.targetId,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generateCheckinStreakContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const healthDataResult = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.health.listHealthData, {
      memberId: input.memberId as Id<"familyMembers">,
      startDate: thirtyDaysAgo,
      endDate: undefined,
      page: 1,
      limit: 100,
      sortOrder: "desc",
    });

    const healthData = healthDataResult.data;

    const member = await convexClient.query<Record<string, unknown> | null>(api.members.getById, {
      memberId: input.memberId as Id<"familyMembers">,
    });

    if (!member) {
      throw new Error("用户未找到");
    }

    const streakDays = this.calculateStreakDays(healthData);
    const title = `🔥 连续打卡${streakDays}天！`;
    const description = `坚持记录健康数据${streakDays}天，继续保持！`;
    const imageUrl = await this.generateStreakImage({
      memberName: (member as Record<string, unknown>).name as string,
      streakDays,
      currentStreak: streakDays,
      bestStreak: streakDays,
      period: "当前",
      icon: "🔥",
    });

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generateWeightMilestoneContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    const healthDataResult = await convexClient.query<{
      data: Array<Record<string, unknown>>;
      total: number;
    }>(api.health.listHealthData, {
      memberId: input.memberId as Id<"familyMembers">,
      startDate: undefined,
      endDate: undefined,
      page: 1,
      limit: 100,
      sortOrder: "desc",
    });

    const healthData = healthDataResult.data;

    const member = await convexClient.query<Record<string, unknown> | null>(api.members.getById, {
      memberId: input.memberId as Id<"familyMembers">,
    });

    if (!member) {
      throw new Error("用户未找到");
    }

    const weightData = healthData.filter((d) => (d as Record<string, unknown>).weight !== null);
    if (weightData.length < 2) {
      throw new Error("体重数据不足");
    }

    const currentWeight = weightData[0]?.weight as number | null;
    const initialWeight = weightData[weightData.length - 1]?.weight as number | null;

    if (currentWeight == null || initialWeight == null) {
      throw new Error("体重数据不足");
    }
    const weightLoss = initialWeight - currentWeight;
    const weightLossPercent = (weightLoss / initialWeight) * 100;

    const title = `🎯 减重${weightLoss.toFixed(1)}kg里程碑达成！`;
    const description = `从${initialWeight.toFixed(1)}kg减到${currentWeight.toFixed(1)}kg，减重${weightLossPercent.toFixed(1)}%`;
    const imageUrl = await this.generateWeightMilestoneImage({
      memberName: (member as Record<string, unknown>).name as string,
      initialWeight,
      currentWeight,
      weightLoss,
      weightLossPercent,
      period: "累计",
      icon: "📉",
    });

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generatePersonalRecordContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    const member = await convexClient.query<Record<string, unknown> | null>(api.members.getById, {
      memberId: input.memberId as Id<"familyMembers">,
    });

    if (!member) {
      throw new Error("用户未找到");
    }

    const title = "⭐ 创造个人新纪录！";
    const description = input.customMessage || "在健康管理的道路上又迈出了重要一步";
    const imageUrl = await this.generatePersonalRecordImage({
      memberName: (member as Record<string, unknown>).name as string,
      title,
      description,
      recordDate: new Date(),
      icon: "⭐",
    });

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generateCommunityPostContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    const title = input.title || "分享到社区";
    const description = input.customMessage || "分享我的健康生活";
    const imageUrl = (input.imageUrl || "/images/default-community-share.jpg") as string;

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
      targetId: input.targetId,
      communityPostId: input.targetId,
    });

    return {
      content,
      imageUrl,
    };
  }

  private async generateDefaultContent(
    input: ShareContentInput,
    shareUrl: string,
    shareToken: string
  ): Promise<{ content: unknown; imageUrl: string }> {
    const title = input.title || "健康生活分享";
    const description = input.customMessage || "分享我的健康数据";
    const imageUrl = (input.imageUrl || "/images/default-share.jpg") as string;

    const content = this.buildSharedContent(input, shareUrl, shareToken, {
      title,
      description,
      imageUrl,
      targetId: input.targetId,
    });

    return {
      content,
      imageUrl,
    };
  }

  private generateMetadata(input: ShareContentInput, shareUrl: string): ShareMetadata {
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

  private generateOpenGraphMetadata(input: ShareContentInput, shareUrl: string): OpenGraphMetadata {
    return {
      title: input.title,
      description: input.description || `Health Butler - ${SHARE_CONTENT_TYPE_LABELS[input.type]}`,
      image: (input.imageUrl || "/images/og-default.jpg") as string,
      url: shareUrl,
      type: "website",
      siteName: "Health Butler",
    };
  }

  private generateTwitterCardMetadata(
    input: ShareContentInput,
    shareUrl: string
  ): TwitterCardMetadata {
    return {
      card: "summary_large_image",
      title: input.title,
      description: input.description || `Health Butler - ${SHARE_CONTENT_TYPE_LABELS[input.type]}`,
      image: (input.imageUrl || "/images/og-default.jpg") as string,
      site: "@healthbutler",
    };
  }

  private generateShareToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }

  private calculateHealthScore(healthData: Array<Record<string, unknown>>): number {
    if (healthData.length === 0) return 50;

    const latestData = healthData[0] as Record<string, unknown>;
    let score = 50;

    if (
      latestData.weight &&
      (latestData.weight as number) > 40 &&
      (latestData.weight as number) < 100
    ) {
      score += 10;
    }

    if (
      latestData.heartRate &&
      (latestData.heartRate as number) > 60 &&
      (latestData.heartRate as number) < 100
    ) {
      score += 10;
    }

    if (latestData.bloodPressureSystolic && latestData.bloodPressureDiastolic) {
      const systolic = latestData.bloodPressureSystolic as number;
      const diastolic = latestData.bloodPressureDiastolic as number;
      if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
        score += 15;
      }
    }

    if (healthData.length >= 7) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private calculateWeightChange(healthData: Array<Record<string, unknown>>): {
    lost: number;
    period: string;
  } {
    const weightData = healthData.filter((d) => d.weight !== null);
    if (weightData.length < 2) return { lost: 0, period: "暂无数据" };

    const currentWeight = weightData[0]?.weight as number;
    const initialWeight = weightData[weightData.length - 1]?.weight as number;
    const weightLoss = initialWeight - currentWeight;

    const latestMeasuredAt = weightData[0]?.measuredAt as number;
    const earliestMeasuredAt = weightData[weightData.length - 1]?.measuredAt as number;

    const daysDiff = Math.floor((latestMeasuredAt - earliestMeasuredAt) / (1000 * 60 * 60 * 24));

    return {
      lost: weightLoss || 0,
      period: `${daysDiff}天`,
    };
  }

  private generateHealthDescription(
    healthScore: number,
    weightChange: { lost: number; period: string },
    dataPoints: number
  ): string {
    const descriptions: string[] = [];

    descriptions.push(`健康评分${healthScore}分`);

    if (weightChange.lost > 0) {
      descriptions.push(`${weightChange.period}减重${weightChange.lost.toFixed(1)}kg`);
    }

    descriptions.push(`记录健康数据${dataPoints}次`);

    return `${descriptions.join("，")}。`;
  }

  private generateGoalAchievementDescription(goal: Record<string, unknown>): string {
    const achievedDate = goal.endDate || new Date();
    const dateStr = format(achievedDate as Date, "yyyy年MM月dd日", {
      locale: zhCN,
    });

    return `在${dateStr}成功达成了"${goal.title}"目标，为我的健康管理增添了动力！`;
  }

  private generateRecipeDescription(recipe: Record<string, unknown>): string {
    const nutrition: string[] = [];

    if (recipe.calories) nutrition.push(`${Math.round(recipe.calories as number)}卡路里`);
    if (recipe.protein) nutrition.push(`${Math.round(recipe.protein as number)}g蛋白质`);
    if (recipe.carbs) nutrition.push(`${Math.round(recipe.carbs as number)}g碳水`);
    if (recipe.fat) nutrition.push(`${Math.round(recipe.fat as number)}g脂肪`);

    const nutritionText = nutrition.join("，");
    const ingredients = recipe.ingredients as Array<unknown>;
    const ingredientsCount = ingredients?.length ?? 0;

    return `营养丰富的${recipe.name}，${ingredientsCount}种食材，${nutritionText}。快来试试这道健康美食吧！`;
  }

  private calculateStreakDays(healthData: Array<Record<string, unknown>>): number {
    if (healthData.length === 0) return 0;

    const sortedData = healthData.sort(
      (a, b) => (b.measuredAt as number) - (a.measuredAt as number)
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedData.length; i++) {
      const dataPoint = sortedData[i];
      if (!dataPoint) break;
      const dataDate = new Date(dataPoint.measuredAt as number);
      dataDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async generateHealthReportImage(_data: unknown): Promise<string> {
    return "/images/share/health-report.jpg";
  }

  private async generateGoalAchievedImage(_data: unknown): Promise<string> {
    return "/images/share/goal-achieved.jpg";
  }

  private async generateRecipeImage(_data: unknown): Promise<string> {
    return "/images/share/recipe-card.jpg";
  }

  private async generateAchievementImage(_data: unknown): Promise<string> {
    return "/images/share/achievement-unlocked.jpg";
  }

  private async generateStreakImage(_data: unknown): Promise<string> {
    return "/images/share/checkin-streak.jpg";
  }

  private async generateWeightMilestoneImage(_data: unknown): Promise<string> {
    return "/images/share/weight-milestone.jpg";
  }

  private async generatePersonalRecordImage(_data: unknown): Promise<string> {
    return "/images/share/personal-record.jpg";
  }
}

export const shareContentGenerator = ShareContentGenerator.getInstance();

export async function createShareContent(
  input: ShareContentInput,
  options: { shareToken?: string; baseUrl?: string; shareUrl?: string } = {}
): Promise<ShareContentResult> {
  const generator = ShareContentGenerator.getInstance();
  return generator.generateShareContent(input, options);
}

export const generateShareContent = createShareContent;

export async function generateSharePreview(
  input: Partial<ShareContentInput>
): Promise<ShareContentResult> {
  const generator = ShareContentGenerator.getInstance();
  const fullInput: ShareContentInput = {
    memberId: (input.memberId || "preview") as Id<"familyMembers">,
    type: input.type || ShareContentType.HEALTH_REPORT,
    title: input.title || "预览标题",
    description: input.description,
    privacyLevel: input.privacyLevel || SharePrivacyLevel.PUBLIC,
    platforms: input.platforms || [SocialPlatform.COPY_LINK],
    ...input,
  };

  return generator.generateShareContent(fullInput);
}
