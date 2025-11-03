/**
 * List Generator Tests
 * Unit tests for shopping list generation service
 */

import { ListGenerator } from '@/lib/services/list-generator';
import { prisma } from '@/lib/db';
import type { FoodCategory, MealType } from '@prisma/client';

// Define FoodCategory enum values that match Prisma
const FoodCategoryValues = {
  VEGETABLES: 'VEGETABLES',
  FRUITS: 'FRUITS',
  PROTEIN: 'PROTEIN',
  SEAFOOD: 'SEAFOOD',
  DAIRY: 'DAIRY',
  GRAINS: 'GRAINS',
  OILS: 'OILS',
  SNACKS: 'SNACKS',
  BEVERAGES: 'BEVERAGES',
} as const;

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    mealPlan: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock @prisma/client to include FoodCategory enum
jest.mock('@prisma/client', () => ({
  FoodCategory: FoodCategoryValues,
}), { virtual: true });

describe('List Generator', () => {
  const generator = new ListGenerator();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateShoppingList', () => {
    it('should extract and aggregate ingredients correctly', async () => {
      const mockPlan = {
        id: 'plan-1',
        meals: [
          {
            ingredients: [
              {
                foodId: 'food-1',
                amount: 100,
                food: {
                  id: 'food-1',
                  name: '鸡胸肉',
                  category: 'PROTEIN' as FoodCategory,
                },
              },
              {
                foodId: 'food-2',
                amount: 150,
                food: {
                  id: 'food-2',
                  name: '米饭',
                  category: 'GRAINS' as FoodCategory,
                },
              },
              {
                foodId: 'food-1', // 重复的食材
                amount: 100,
                food: {
                  id: 'food-1',
                  name: '鸡胸肉',
                  category: 'PROTEIN' as FoodCategory,
                },
              },
            ],
          },
          {
            ingredients: [
              {
                foodId: 'food-1',
                amount: 100,
                food: {
                  id: 'food-1',
                  name: '鸡胸肉',
                  category: 'PROTEIN' as FoodCategory,
                },
              },
            ],
          },
        ],
      }

      ;(prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

      const result = await generator.generateShoppingList('plan-1');

      expect(result.planId).toBe('plan-1');
      expect(result.items).toHaveLength(2);

      // 检查鸡胸肉是否正确聚合（100 + 100 + 100 = 300g）
      const chicken = result.items.find((item) => item.foodId === 'food-1');
      expect(chicken).toBeDefined();
      expect(chicken?.totalAmount).toBe(300);

      // 检查米饭是否正确聚合（150g）
      const rice = result.items.find((item) => item.foodId === 'food-2');
      expect(rice).toBeDefined();
      expect(rice?.totalAmount).toBe(150);
    });

    it('should categorize ingredients correctly', async () => {
      const mockPlan = {
        id: 'plan-1',
        meals: [
          {
            ingredients: [
              {
                foodId: 'food-1',
                amount: 100,
                food: {
                  id: 'food-1',
                  name: '西兰花',
                  category: 'VEGETABLES' as FoodCategory,
                },
              },
              {
                foodId: 'food-2',
                amount: 150,
                food: {
                  id: 'food-2',
                  name: '苹果',
                  category: 'FRUITS' as FoodCategory,
                },
              },
              {
                foodId: 'food-3',
                amount: 200,
                food: {
                  id: 'food-3',
                  name: '鸡胸肉',
                  category: 'PROTEIN' as FoodCategory,
                },
              },
            ],
          },
        ],
      }

      ;(prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

      const result = await generator.generateShoppingList('plan-1');

      expect(result.categories.VEGETABLES).toHaveLength(1);
      expect(result.categories.VEGETABLES[0].foodName).toBe('西兰花');

      expect(result.categories.FRUITS).toHaveLength(1);
      expect(result.categories.FRUITS[0].foodName).toBe('苹果');

      expect(result.categories.PROTEIN).toHaveLength(1);
      expect(result.categories.PROTEIN[0].foodName).toBe('鸡胸肉');
    });

    it('should add perishable days based on category', async () => {
      const mockPlan = {
        id: 'plan-1',
        meals: [
          {
            ingredients: [
              {
                foodId: 'food-1',
                amount: 100,
                food: {
                  id: 'food-1',
                  name: '生菜',
                  category: 'VEGETABLES' as FoodCategory,
                },
              },
              {
                foodId: 'food-2',
                amount: 200,
                food: {
                  id: 'food-2',
                  name: '鸡胸肉',
                  category: 'PROTEIN' as FoodCategory,
                },
              },
              {
                foodId: 'food-3',
                amount: 500,
                food: {
                  id: 'food-3',
                  name: '米饭',
                  category: 'GRAINS' as FoodCategory,
                },
              },
            ],
          },
        ],
      }

      ;(prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

      const result = await generator.generateShoppingList('plan-1');

      const vegetables = result.items.find((item) => item.category === 'VEGETABLES');
      expect(vegetables?.perishableDays).toBe(5);

      const protein = result.items.find((item) => item.category === 'PROTEIN');
      expect(protein?.perishableDays).toBe(7);

      const grains = result.items.find((item) => item.category === 'GRAINS');
      expect(grains?.perishableDays).toBe(30);
    });

    it('should throw error when plan does not exist', async () => {
      ;(prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(generator.generateShoppingList('non-existent')).rejects.toThrow(
        '食谱计划不存在'
      );
    });

    it('should handle empty meal plan', async () => {
      const mockPlan = {
        id: 'plan-1',
        meals: [],
      }

      ;(prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

      const result = await generator.generateShoppingList('plan-1');

      expect(result.items).toHaveLength(0);
      expect(result.totalItems).toBe(0);
    });
  });

  describe('getPerishableItems', () => {
    it('should filter items with perishable days <= 7', () => {
      const items = [
        {
          foodId: 'food-1',
          foodName: '生菜',
          category: 'VEGETABLES' as FoodCategory,
          totalAmount: 200,
          perishableDays: 5,
        },
        {
          foodId: 'food-2',
          foodName: '鸡胸肉',
          category: 'PROTEIN' as FoodCategory,
          totalAmount: 300,
          perishableDays: 7,
        },
        {
          foodId: 'food-3',
          foodName: '米饭',
          category: 'GRAINS' as FoodCategory,
          totalAmount: 1000,
          perishableDays: 30,
        },
      ];

      const perishable = generator.getPerishableItems(items);

      expect(perishable).toHaveLength(2);
      expect(perishable.some((item) => item.foodId === 'food-1')).toBe(true);
      expect(perishable.some((item) => item.foodId === 'food-2')).toBe(true);
      expect(perishable.some((item) => item.foodId === 'food-3')).toBe(false);
    });
  });

  describe('getCategoryAdvice', () => {
    it('should return correct advice for different categories', () => {
      expect(generator.getCategoryAdvice('VEGETABLES')).toBe('建议7天内购买');
      expect(generator.getCategoryAdvice('SEAFOOD')).toBe('建议3天内购买');
      expect(generator.getCategoryAdvice('GRAINS')).toBe('建议30天内购买');
      expect(generator.getCategoryAdvice('OILS')).toBe('可长期保存');
    });
  });
});

