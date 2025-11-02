/**
 * Price Estimator Tests
 * Unit tests for price estimation and budget control service
 */

import { PriceEstimator } from '@/lib/services/price-estimator';
import { prisma } from '@/lib/db';
import type { FoodCategory } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    food: {
      findUnique: jest.fn(),
    },
    shoppingList: {
      update: jest.fn(),
    },
  },
}));

describe('Price Estimator', () => {
  const estimator = new PriceEstimator();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('estimatePrice', () => {
    it('should estimate price correctly for vegetables', async () => {
      const mockFood = {
        id: 'food-1',
        name: '西兰花',
        category: 'VEGETABLES' as FoodCategory,
      }

      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await estimator.estimatePrice('food-1', 500);

      expect(result.foodId).toBe('food-1');
      expect(result.foodName).toBe('西兰花');
      expect(result.amount).toBe(500);
      expect(result.unitPrice).toBe(3.0); // VEGETABLES default price
      expect(result.estimatedPrice).toBe(15.0); // 3.0 * 500 / 100
    });

    it('should estimate price correctly for protein', async () => {
      const mockFood = {
        id: 'food-2',
        name: '鸡胸肉',
        category: 'PROTEIN' as FoodCategory,
      }

      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await estimator.estimatePrice('food-2', 300);

      expect(result.unitPrice).toBe(15.0); // PROTEIN default price
      expect(result.estimatedPrice).toBe(45.0); // 15.0 * 300 / 100
    });

    it('should throw error when food does not exist', async () => {
      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(estimator.estimatePrice('non-existent', 100)).rejects.toThrow(
        '食物不存在'
      );
    });

    it('should round price to 2 decimal places', async () => {
      const mockFood = {
        id: 'food-1',
        name: '西兰花',
        category: 'VEGETABLES' as FoodCategory,
      }

      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await estimator.estimatePrice('food-1', 333);

      // 3.0 * 333 / 100 = 9.99
      expect(result.estimatedPrice).toBe(9.99);
    });
  });

  describe('estimatePrices', () => {
    it('should estimate prices for multiple items', async () => {
      const mockFoods = [
        {
          id: 'food-1',
          name: '西兰花',
          category: 'VEGETABLES' as FoodCategory,
        },
        {
          id: 'food-2',
          name: '鸡胸肉',
          category: 'PROTEIN' as FoodCategory,
        },
      ]

      ;(prisma.food.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFoods[0])
        .mockResolvedValueOnce(mockFoods[1]);

      const items = [
        { foodId: 'food-1', amount: 500 },
        { foodId: 'food-2', amount: 300 },
      ];

      const results = await estimator.estimatePrices(items);

      expect(results).toHaveLength(2);
      expect(results[0].estimatedPrice).toBe(15.0);
      expect(results[1].estimatedPrice).toBe(45.0);
    });
  });

  describe('checkBudget', () => {
    it('should return correct result when within budget', () => {
      const result = estimator.checkBudget(100, 150);

      expect(result.totalEstimatedCost).toBe(100);
      expect(result.budget).toBe(150);
      expect(result.isOverBudget).toBe(false);
      expect(result.overBudgetAmount).toBe(0);
      expect(result.recommendation).toBeUndefined();
    });

    it('should return correct result when over budget', () => {
      const result = estimator.checkBudget(200, 150);

      expect(result.totalEstimatedCost).toBe(200);
      expect(result.budget).toBe(150);
      expect(result.isOverBudget).toBe(true);
      expect(result.overBudgetAmount).toBe(50);
      expect(result.recommendation).toContain('超预算');
    });

    it('should handle null budget', () => {
      const result = estimator.checkBudget(100, null);

      expect(result.budget).toBeNull();
      expect(result.isOverBudget).toBe(false);
      expect(result.overBudgetAmount).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate total cost correctly', () => {
      const estimates = [
        {
          foodId: 'food-1',
          foodName: '西兰花',
          amount: 500,
          estimatedPrice: 15.0,
          unitPrice: 3.0,
        },
        {
          foodId: 'food-2',
          foodName: '鸡胸肉',
          amount: 300,
          estimatedPrice: 45.0,
          unitPrice: 15.0,
        },
      ];

      const total = estimator.calculateTotalCost(estimates);

      expect(total).toBe(60.0);
    });

    it('should return 0 for empty array', () => {
      const total = estimator.calculateTotalCost([]);

      expect(total).toBe(0);
    });
  });

  describe('updateActualCost', () => {
    it('should update actual cost in database', async () => {
      ;(prisma.shoppingList.update as jest.Mock).mockResolvedValue({
        id: 'list-1',
        actualCost: 58.5,
      });

      await estimator.updateActualCost('list-1', 58.5);

      expect(prisma.shoppingList.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: { actualCost: 58.5 },
      });
    });
  });

  describe('getPriceTrendAdvice', () => {
    it('should return accurate price message when diff < 5%', () => {
      const advice = estimator.getPriceTrendAdvice(100, 103);
      expect(advice).toContain('价格估算准确');
    });

    it('should return high price message when diff > 5%', () => {
      const advice = estimator.getPriceTrendAdvice(100, 110);
      expect(advice).toContain('实际采购成本比估算高');
    });

    it('should return low price message when diff < -5%', () => {
      const advice = estimator.getPriceTrendAdvice(100, 90);
      expect(advice).toContain('实际采购成本比估算低');
    });
  });
});

