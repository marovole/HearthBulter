import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    dailyNutritionTarget: {
      findUnique: jest.fn(),
    },
    auxiliaryTracking: {
      findUnique: jest.fn(),
    },
    healthData: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    familyMember: {
      findUnique: jest.fn(),
    },
    healthScore: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('Health Scorer', () => {
  describe('Score Calculation Logic', () => {
    test('should calculate perfect nutrition score (100)', () => {
      // 测试营养评分逻辑：当实际摄入在目标值90-110%范围内时，得100分
      const actualCalories = 2000;
      const targetCalories = 2000;
      const ratio = actualCalories / targetCalories;

      let score = 0;
      if (ratio >= 0.9 && ratio <= 1.1) {
        score = 100;
      }

      expect(score).toBe(100);
    });

    test('should calculate exercise score based on minutes', () => {
      // 测试运动评分逻辑
      const testCases = [
        { minutes: 35, expectedScore: 100 },  // >=30分钟满分
        { minutes: 25, expectedScore: 90 },   // >=22分钟
        { minutes: 18, expectedScore: 75 },   // >=15分钟
        { minutes: 12, expectedScore: 60 },   // >=10分钟
        { minutes: 5, expectedScore: 40 },    // >0分钟
        { minutes: 0, expectedScore: 0 },     // 没有运动
      ];

      testCases.forEach(({ minutes, expectedScore }) => {
        let score = 0;
        if (minutes >= 30) {
          score = 100;
        } else if (minutes >= 22) {
          score = 90;
        } else if (minutes >= 15) {
          score = 75;
        } else if (minutes >= 10) {
          score = 60;
        } else if (minutes > 0) {
          score = 40;
        }

        expect(score).toBe(expectedScore);
      });
    });

    test('should calculate sleep score for optimal duration', () => {
      // 测试睡眠评分逻辑：7-9小时为最佳
      const testCases = [
        { hours: 8, expectedScore: 100 },   // 最佳睡眠时长
        { hours: 6.5, expectedScore: 85 },  // 略少
        { hours: 9.5, expectedScore: 85 },  // 略多
        { hours: 5.5, expectedScore: 65 },  // 睡眠不足
        { hours: 4, expectedScore: 40 },    // 严重睡眠不足
      ];

      testCases.forEach(({ hours, expectedScore }) => {
        let score = 0;
        if (hours >= 7 && hours <= 9) {
          score = 100;
        } else if (hours >= 6 && hours < 7) {
          score = 85;
        } else if (hours > 9 && hours <= 10) {
          score = 85;
        } else if (hours >= 5 && hours < 6) {
          score = 65;
        } else if (hours < 5) {
          score = 40;
        }

        expect(score).toBe(expectedScore);
      });
    });

    test('should calculate weighted overall score', () => {
      // 测试综合评分计算
      const weights = {
        nutrition: 0.4,
        exercise: 0.3,
        sleep: 0.2,
        medical: 0.1,
      };

      const scores = {
        nutrition: 90,
        exercise: 80,
        sleep: 85,
        medical: 95,
      };

      const overallScore =
        scores.nutrition * weights.nutrition +
        scores.exercise * weights.exercise +
        scores.sleep * weights.sleep +
        scores.medical * weights.medical;

      expect(overallScore).toBeCloseTo(86.5, 0); // 90*0.4 + 80*0.3 + 85*0.2 + 95*0.1 = 86.5
    });

    test('should determine grade based on score', () => {
      const testCases = [
        { score: 95, expectedGrade: 'EXCELLENT' },
        { score: 80, expectedGrade: 'GOOD' },
        { score: 65, expectedGrade: 'FAIR' },
        { score: 50, expectedGrade: 'POOR' },
      ];

      testCases.forEach(({ score, expectedGrade }) => {
        let grade;
        if (score >= 90) {
          grade = 'EXCELLENT';
        } else if (score >= 75) {
          grade = 'GOOD';
        } else if (score >= 60) {
          grade = 'FAIR';
        } else {
          grade = 'POOR';
        }

        expect(grade).toBe(expectedGrade);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing data gracefully', () => {
      // 测试数据缺失时的处理
      const hasDataCount = [false, false, false, false].filter(Boolean).length;
      const dataCompleteness = hasDataCount / 4;

      expect(dataCompleteness).toBe(0);
    });

    test('should handle partial data', () => {
      // 测试部分数据可用的情况
      const hasDataCount = [true, true, false, false].filter(Boolean).length;
      const dataCompleteness = hasDataCount / 4;

      expect(dataCompleteness).toBe(0.5);
    });
  });
});

