/**
 * 社交分享内容生成服务测试
 */

import { generateShareContent } from "@/lib/services/social/share-generator";
import { PrismaClient } from "@prisma/client";
import { ShareContentType } from "@/types/enums";

// Mock Prisma Client
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    familyMember: {
      findUnique: jest.fn(),
    },
    healthReport: {
      findFirst: jest.fn(),
    },
    healthGoal: {
      findFirst: jest.fn(),
    },
    mealLog: {
      findFirst: jest.fn(),
    },
    achievement: {
      findFirst: jest.fn(),
    },
    trackingStreak: {
      findUnique: jest.fn(),
    },
    healthData: {
      findFirst: jest.fn(),
    },
  })),
  ShareContentType: {
    HEALTH_REPORT: "HEALTH_REPORT",
    GOAL_ACHIEVEMENT: "GOAL_ACHIEVEMENT",
    MEAL_LOG: "MEAL_LOG",
    RECIPE: "RECIPE",
    ACHIEVEMENT: "ACHIEVEMENT",
    CHECK_IN_STREAK: "CHECK_IN_STREAK",
    WEIGHT_MILESTONE: "WEIGHT_MILESTONE",
  },
  AchievementType: {
    CHECK_IN_STREAK: "CHECK_IN_STREAK",
    WEIGHT_LOSS: "WEIGHT_LOSS",
    NUTRITION_GOAL: "NUTRITION_GOAL",
    EXERCISE_TARGET: "EXERCISE_TARGET",
    HEALTH_MILESTONE: "HEALTH_MILESTONE",
    COMMUNITY_CONTRIBUTION: "COMMUNITY_CONTRIBUTION",
  },
  AchievementRarity: {
    BRONZE: "BRONZE",
    SILVER: "SILVER",
    GOLD: "GOLD",
    PLATINUM: "PLATINUM",
    DIAMOND: "DIAMOND",
  },
  LeaderboardType: {
    WEIGHT_LOSS: "WEIGHT_LOSS",
    NUTRITION_SCORE: "NUTRITION_SCORE",
    ACTIVITY_POINTS: "ACTIVITY_POINTS",
    CHECK_IN_STREAK: "CHECK_IN_STREAK",
    GLOBAL: "GLOBAL",
    FRIENDS: "FRIENDS",
    FAMILY: "FAMILY",
    HEALTH_SCORE: "HEALTH_SCORE",
  },
}));

// Mock 模板生成函数
jest.mock("@/lib/services/social/image-generator", () => ({
  generateHealthReportCard: jest.fn().mockResolvedValue("data:image/png;base64,test"),
  generateGoalAchievementCard: jest.fn().mockResolvedValue("data:image/png;base64,test"),
  generateMealLogCard: jest.fn().mockResolvedValue("data:image/png;base64,test"),
  generateRecipeCard: jest.fn().mockResolvedValue("data:image/png;base64,test"),
  generateAchievementCard: jest.fn().mockResolvedValue("data:image/png;base64,test"),
  generateCheckInStreakCard: jest.fn().mockResolvedValue("data:image/png;base64,test"),
  generateWeightMilestoneCard: jest.fn().mockResolvedValue("data:image/png;base64,test"),
}));

describe("ShareGenerator", () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  describe("generateShareContent", () => {
    const mockMember = {
      id: "member-1",
      name: "测试用户",
      family: { id: "family-1" },
    };

    const mockShareData = {
      memberId: "member-1",
      contentType: "HEALTH_REPORT" as ShareContentType,
      contentId: "report-1",
      title: "测试分享",
      description: "测试描述",
    };

    it("应该成功生成健康报告分享内容", async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);

      const mockReport = {
        id: "report-1",
        memberId: "member-1",
        member: { name: "测试用户" },
        reportType: "WEEKLY",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-07"),
        summary: "健康状况良好",
        overallScore: 85,
      };

      mockPrisma.healthReport.findFirst.mockResolvedValue(mockReport);

      const result = await generateShareContent(mockShareData);

      expect(result).toEqual({
        title: "测试用户的周健康报告",
        description: "健康状况良好📊 综合健康评分: 85分",
        imageUrl: "data:image/png;base64,test",
        metadata: {
          reportId: "report-1",
          reportType: "WEEKLY",
          period: {
            start: new Date("2024-01-01"),
            end: new Date("2024-01-07"),
          },
          score: 85,
        },
      });
    });

    it("应该在成员不存在时抛出错误", async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(generateShareContent(mockShareData)).rejects.toThrow("成员不存在");
    });

    it("应该在内容不存在时抛出错误", async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.healthReport.findFirst.mockResolvedValue(null);

      await expect(generateShareContent(mockShareData)).rejects.toThrow("健康报告不存在");
    });

    it("应该支持自定义标题和描述", async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.healthReport.findFirst.mockResolvedValue({
        id: "report-1",
        memberId: "member-1",
        member: { name: "测试用户" },
        reportType: "WEEKLY",
        summary: "健康状况良好",
        overallScore: 85,
      });

      const result = await generateShareContent({
        ...mockShareData,
        title: "自定义标题",
        description: "自定义描述",
      });

      expect(result.title).toBe("自定义标题");
      expect(result.description).toBe("自定义描述");
    });
  });

  describe("内容类型支持", () => {
    const mockMember = {
      id: "member-1",
      name: "测试用户",
      family: { id: "family-1" },
    };

    beforeEach(() => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
    });

    it("应该支持目标达成分享", async () => {
      mockPrisma.healthGoal.findFirst.mockResolvedValue({
        id: "goal-1",
        memberId: "member-1",
        member: { name: "测试用户" },
        goalType: "LOSE_WEIGHT",
        progress: 100,
      });

      const result = await generateShareContent({
        memberId: "member-1",
        contentType: "GOAL_ACHIEVEMENT",
        contentId: "goal-1",
      });

      expect(result.title).toContain("目标达成");
    });

    it("应该支持餐饮打卡分享", async () => {
      mockPrisma.mealLog.findFirst.mockResolvedValue({
        id: "meal-1",
        memberId: "member-1",
        member: { name: "测试用户" },
        mealType: "BREAKFAST",
        date: new Date(),
        calories: 450,
        foods: [],
      });

      const result = await generateShareContent({
        memberId: "member-1",
        contentType: "MEAL_LOG",
        contentId: "meal-1",
      });

      expect(result.title).toContain("早餐打卡");
    });

    it("应该支持成就徽章分享", async () => {
      mockPrisma.achievement.findFirst.mockResolvedValue({
        id: "achievement-1",
        memberId: "member-1",
        member: { name: "测试用户" },
        title: "新成就",
        description: "成就描述",
        rarity: "GOLD",
        points: 100,
        isUnlocked: true,
      });

      const result = await generateShareContent({
        memberId: "member-1",
        contentType: "ACHIEVEMENT",
        contentId: "achievement-1",
      });

      expect(result.title).toContain("解锁了新成就");
    });

    it("应该在不支持的内容类型时抛出错误", async () => {
      await expect(
        generateShareContent({
          memberId: "member-1",
          contentType: "INVALID_TYPE" as ShareContentType,
          contentId: "test-1",
        })
      ).rejects.toThrow("不支持的分享内容类型");
    });
  });
});
