/**
 * 成就系统服务测试
 */

import {
  checkAndUnlockAchievements,
  getMemberAchievements,
  getAchievementProgress,
  getAchievementStats,
} from '@/lib/services/social/achievement-system';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    familyMember: {
      findUnique: jest.fn(),
    },
    achievement: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  })),
  AchievementType: {
    CHECK_IN_STREAK: 'CHECK_IN_STREAK',
    WEIGHT_LOSS: 'WEIGHT_LOSS',
    NUTRITION_GOAL: 'NUTRITION_GOAL',
    EXERCISE_TARGET: 'EXERCISE_TARGET',
    HEALTH_MILESTONE: 'HEALTH_MILESTONE',
    COMMUNITY_CONTRIBUTION: 'COMMUNITY_CONTRIBUTION',
  },
}));

describe('AchievementSystem', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  describe('checkAndUnlockAchievements', () => {
    const mockMember = {
      id: 'member-1',
      name: '测试用户',
    };

    it('应该解锁连续打卡成就', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.achievement.findMany.mockResolvedValue([]); // 没有现有成就

      const mockAchievement = {
        id: 'achievement-1',
        type: 'CHECK_IN_STREAK',
        title: '初学者',
        isUnlocked: true,
        points: 10,
      };

      mockPrisma.achievement.upsert.mockResolvedValue(mockAchievement);

      const result = await checkAndUnlockAchievements(
        'member-1',
        'CHECK_IN_STREAK',
        { currentStreak: 3 },
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('初学者');
      expect(result[0].points).toBe(10);
    });

    it('应该解锁减重成就', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.achievement.findMany.mockResolvedValue([]);

      const mockAchievement = {
        id: 'achievement-2',
        type: 'WEIGHT_LOSS',
        title: '减重新手',
        isUnlocked: true,
        points: 15,
      };

      mockPrisma.achievement.upsert.mockResolvedValue(mockAchievement);

      const result = await checkAndUnlockAchievements(
        'member-1',
        'WEIGHT_LOSS',
        { weightLoss: 1.5 },
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('减重新手');
      expect(result[0].points).toBe(15);
    });

    it('应该跳过已解锁的成就', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);

      const existingAchievement = {
        id: 'achievement-1',
        type: 'CHECK_IN_STREAK',
        title: '初学者',
        isUnlocked: true,
      };

      mockPrisma.achievement.findMany.mockResolvedValue([existingAchievement]);

      const result = await checkAndUnlockAchievements(
        'member-1',
        'CHECK_IN_STREAK',
        { currentStreak: 5 },
      );

      expect(result).toHaveLength(0);
      expect(mockPrisma.achievement.upsert).not.toHaveBeenCalled();
    });

    it('应该在成员不存在时抛出错误', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        checkAndUnlockAchievements('member-1', 'CHECK_IN_STREAK', {
          currentStreak: 3,
        }),
      ).rejects.toThrow('成员不存在');
    });

    it('应该更新未达成成就的进度', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.achievement.findMany.mockResolvedValue([]);

      // Mock upsert 返回未解锁的成就
      mockPrisma.achievement.upsert.mockResolvedValue({
        id: 'achievement-progress',
        type: 'CHECK_IN_STREAK',
        title: '坚持者',
        isUnlocked: false,
        progress: 50,
      });

      const result = await checkAndUnlockAchievements(
        'member-1',
        'CHECK_IN_STREAK',
        { currentStreak: 3.5 }, // 未达到7天的目标
      );

      expect(result).toHaveLength(0); // 没有解锁新成就
      expect(mockPrisma.achievement.upsert).toHaveBeenCalled();
    });
  });

  describe('getMemberAchievements', () => {
    it('应该返回用户的成就列表', async () => {
      const mockAchievements = [
        {
          id: 'achievement-1',
          type: 'CHECK_IN_STREAK',
          title: '初学者',
          isUnlocked: true,
          points: 10,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'achievement-2',
          type: 'CHECK_IN_STREAK',
          title: '坚持者',
          isUnlocked: false,
          points: 25,
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.achievement.findMany.mockResolvedValue(mockAchievements);

      const result = await getMemberAchievements('member-1');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('初学者');
      expect(result[1].title).toBe('坚持者');
      expect(mockPrisma.achievement.findMany).toHaveBeenCalledWith({
        where: { memberId: 'member-1' },
        orderBy: [
          { isUnlocked: 'desc' },
          { unlockedAt: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    });
  });

  describe('getAchievementProgress', () => {
    it('应该返回未解锁成就的进度', async () => {
      const mockAchievements = [
        {
          id: 'achievement-1',
          currentValue: 3,
          targetValue: 7,
          progress: 42.8,
          isUnlocked: false,
        },
        {
          id: 'achievement-2',
          currentValue: 5,
          targetValue: 10,
          progress: 50,
          isUnlocked: false,
        },
      ];

      mockPrisma.achievement.findMany.mockResolvedValue(mockAchievements);

      const result = await getAchievementProgress('member-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        achievementId: 'achievement-1',
        currentValue: 3,
        targetValue: 7,
        progress: 42.8,
        isUnlocked: false,
      });
    });
  });

  describe('getAchievementStats', () => {
    it('应该返回成就统计信息', async () => {
      const mockAchievements = [
        {
          id: 'achievement-1',
          isUnlocked: true,
          points: 10,
          rarity: 'BRONZE',
        },
        {
          id: 'achievement-2',
          isUnlocked: true,
          points: 25,
          rarity: 'SILVER',
        },
        {
          id: 'achievement-3',
          isUnlocked: false,
          points: 50,
          rarity: 'GOLD',
        },
      ];

      mockPrisma.achievement.findMany.mockResolvedValue(mockAchievements);

      const result = await getAchievementStats('member-1');

      expect(result).toEqual({
        totalAchievements: 3,
        unlockedAchievements: 2,
        totalPoints: 35,
        rarityDistribution: {
          BRONZE: 1,
          SILVER: 1,
        },
      });
    });

    it('应该处理空成就列表', async () => {
      mockPrisma.achievement.findMany.mockResolvedValue([]);

      const result = await getAchievementStats('member-1');

      expect(result).toEqual({
        totalAchievements: 0,
        unlockedAchievements: 0,
        totalPoints: 0,
        rarityDistribution: {},
      });
    });
  });

  describe('成就规则测试', () => {
    const mockMember = {
      id: 'member-1',
      name: '测试用户',
    };

    beforeEach(() => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrisma.achievement.findMany.mockResolvedValue([]);
    });

    it('应该正确计算连续打卡成就', async () => {
      mockPrisma.achievement.upsert.mockResolvedValue({
        id: 'achievement-streak',
        isUnlocked: true,
        points: 25,
      });

      const result = await checkAndUnlockAchievements(
        'member-1',
        'CHECK_IN_STREAK',
        { currentStreak: 7 },
      );

      expect(result).toHaveLength(2); // 3天和7天成就
      expect(result.map((a) => a.points)).toEqual([10, 25]);
    });

    it('应该正确计算减重成就', async () => {
      mockPrisma.achievement.upsert.mockResolvedValue({
        id: 'achievement-weight',
        isUnlocked: true,
        points: 75,
      });

      const result = await checkAndUnlockAchievements(
        'member-1',
        'WEIGHT_LOSS',
        { weightLoss: 5.2 },
      );

      expect(result).toHaveLength(2); // 1kg和5kg成就
      expect(result.map((a) => a.points)).toEqual([15, 75]);
    });

    it('应该正确计算营养目标成就', async () => {
      mockPrisma.achievement.upsert.mockResolvedValue({
        id: 'achievement-nutrition',
        isUnlocked: true,
        points: 30,
      });

      const result = await checkAndUnlockAchievements(
        'member-1',
        'NUTRITION_GOAL',
        { consecutiveDays: 7 },
      );

      expect(result).toHaveLength(1);
      expect(result[0].points).toBe(30);
    });

    it('应该正确计算运动目标成就', async () => {
      mockPrisma.achievement.upsert.mockResolvedValue({
        id: 'achievement-exercise',
        isUnlocked: true,
        points: 20,
      });

      const result = await checkAndUnlockAchievements(
        'member-1',
        'EXERCISE_TARGET',
        { weeklyMinutes: 180 },
      );

      expect(result).toHaveLength(2); // 150分钟和300分钟成就
      expect(result.map((a) => a.points)).toEqual([20, 60]);
    });
  });
});
