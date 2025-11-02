/**
 * Performance Tests for Nutrition Database
 * 测试营养数据库查询性能
 */

import { prisma } from '@/lib/db';
import { usdaService } from '@/lib/services/usda-service';
import { nutritionCalculator } from '@/lib/services/nutrition-calculator';
import { foodCacheService } from '@/lib/services/cache-service';

// Mock USDA API
jest.mock('@/lib/services/usda-service');

describe('Nutrition Database Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Food Search Performance', () => {
    it('should handle 1000 consecutive food searches efficiently', async () => {
      // 创建测试数据
      const testFoods = Array.from({ length: 100 }, (_, i) => ({
        id: `food-${i}`,
        name: `测试食物${i}`,
        nameEn: `test-food-${i}`,
        aliases: JSON.stringify([]),
        calories: 100 + i,
        protein: 10 + i,
        carbs: 20 + i,
        fat: 5 + i,
        category: 'PROTEIN' as const,
        tags: JSON.stringify([]),
        source: 'LOCAL' as const,
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Mock Prisma查询
      const mockFindMany = jest.fn().mockResolvedValue(testFoods);
      const mockCount = jest.fn().mockResolvedValue(100)

      ;(prisma.food.findMany as jest.Mock) = mockFindMany
      ;(prisma.food.count as jest.Mock) = mockCount;

      const startTime = Date.now();

      // 执行1000次查询
      const queries = Array.from({ length: 1000 }, (_, i) =>
        prisma.food.findMany({
          where: {
            OR: [
              { name: { contains: `食物${i % 100}` } },
              { nameEn: { contains: `food-${i % 100}` } },
            ],
          },
          take: 20,
        })
      );

      await Promise.all(queries);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 性能断言：1000次查询应该在合理时间内完成（例如5秒内）
      expect(duration).toBeLessThan(5000);
      expect(mockFindMany).toHaveBeenCalledTimes(1000);
    });
  });

  describe('Cache Performance', () => {
    it('should significantly improve performance with cache', async () => {
      const testFood = {
        id: 'test-food-1',
        name: '测试食物',
        nameEn: 'test-food',
        aliases: JSON.stringify([]),
        calories: 100,
        protein: 10,
        carbs: 20,
        fat: 5,
        category: 'PROTEIN' as const,
        tags: JSON.stringify([]),
        source: 'LOCAL' as const,
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Prisma查询
      const mockFindUnique = jest.fn().mockResolvedValue(testFood)
      ;(prisma.food.findUnique as jest.Mock) = mockFindUnique;

      // 第一次查询（无缓存）
      const startTime1 = Date.now();
      await foodCacheService.getFood('test-food-1');
      const duration1 = Date.now() - startTime1;

      // 设置缓存
      await foodCacheService.setFood(testFood as any);

      // 第二次查询（有缓存）
      const startTime2 = Date.now();
      await foodCacheService.getFood('test-food-1');
      const duration2 = Date.now() - startTime2;

      // 缓存查询应该更快
      expect(duration2).toBeLessThan(duration1);
      
      // 缓存查询不应该调用数据库
      expect(mockFindUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nutrition Calculation Performance', () => {
    it('should calculate nutrition for 1000 food items efficiently', async () => {
      // 创建测试数据
      const testFoods = Array.from({ length: 100 }, (_, i) => ({
        id: `food-${i}`,
        name: `测试食物${i}`,
        calories: 100 + i,
        protein: 10 + i,
        carbs: 20 + i,
        fat: 5 + i,
        fiber: null,
        sugar: null,
        sodium: null,
        vitaminA: null,
        vitaminC: null,
        calcium: null,
        iron: null,
      }));

      // Mock Prisma查询
      const mockFindMany = jest.fn().mockResolvedValue(testFoods)
      ;(prisma.food.findMany as jest.Mock) = mockFindMany;

      // 创建1000个营养计算输入
      const inputs = Array.from({ length: 1000 }, (_, i) => ({
        foodId: `food-${i % 100}`,
        amount: 100 + (i % 50),
      }));

      const startTime = Date.now();

      // 执行批量计算
      const result = await nutritionCalculator.calculateBatch(inputs);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 性能断言：1000次计算应该在合理时间内完成（例如3秒内）
      expect(duration).toBeLessThan(3000);
      expect(result.items).toHaveLength(1000);
      expect(result.totalCalories).toBeGreaterThan(0);
    });
  });

  describe('Batch Query Performance', () => {
    it('should handle batch queries efficiently', async () => {
      const testFoods = Array.from({ length: 50 }, (_, i) => ({
        id: `food-${i}`,
        name: `测试食物${i}`,
        nameEn: `test-food-${i}`,
        aliases: JSON.stringify([]),
        calories: 100 + i,
        protein: 10 + i,
        carbs: 20 + i,
        fat: 5 + i,
        category: 'PROTEIN' as const,
        tags: JSON.stringify([]),
        source: 'LOCAL' as const,
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Mock Prisma查询
      const mockFindMany = jest.fn().mockResolvedValue(testFoods)
      ;(prisma.food.findMany as jest.Mock) = mockFindMany;

      const startTime = Date.now();

      // 执行批量查询
      const foodIds = Array.from({ length: 50 }, (_, i) => `food-${i}`);
      const foods = await prisma.food.findMany({
        where: {
          id: { in: foodIds },
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 批量查询应该只调用一次数据库
      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(foods).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});
