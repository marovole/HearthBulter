/**
 * Nutrition Calculator Tests
 * Unit tests for nutrition calculation service
 */

import { NutritionCalculator, UnitConverter } from '@/lib/services/nutrition-calculator';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    food: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('Nutrition Calculator', () => {
  const calculator = new NutritionCalculator();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSingleFood', () => {
    it('should calculate nutrition for a single food correctly', async () => {
      const mockFood = {
        id: 'food-1',
        name: '鸡胸肉',
        calories: 165,
        protein: 23,
        carbs: 0,
        fat: 1.2,
        fiber: null,
        sugar: null,
        sodium: null,
        vitaminA: null,
        vitaminC: null,
        calcium: null,
        iron: null,
      }

      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await calculator.calculateSingleFood('food-1', 100);

      expect(result).not.toBeNull();
      expect(result?.foodId).toBe('food-1');
      expect(result?.foodName).toBe('鸡胸肉');
      expect(result?.amount).toBe(100);
      expect(result?.calories).toBe(165);
      expect(result?.protein).toBe(23);
      expect(result?.carbs).toBe(0);
      expect(result?.fat).toBe(1.2);
    });

    it('should calculate nutrition with correct ratio for different amounts', async () => {
      const mockFood = {
        id: 'food-1',
        name: '鸡胸肉',
        calories: 165,
        protein: 23,
        carbs: 0,
        fat: 1.2,
        fiber: null,
        sugar: null,
        sodium: null,
        vitaminA: null,
        vitaminC: null,
        calcium: null,
        iron: null,
      }

      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await calculator.calculateSingleFood('food-1', 200);

      expect(result).not.toBeNull();
      expect(result?.calories).toBe(330); // 165 * 2
      expect(result?.protein).toBe(46); // 23 * 2
      expect(result?.fat).toBe(2.4); // 1.2 * 2
    });

    it('should return null for non-existent food', async () => {
      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await calculator.calculateSingleFood('non-existent', 100);

      expect(result).toBeNull();
    });

    it('should handle optional nutrients correctly', async () => {
      const mockFood = {
        id: 'food-1',
        name: '西兰花',
        calories: 34,
        protein: 2.8,
        carbs: 7,
        fat: 0.4,
        fiber: 2.6,
        sugar: null,
        sodium: 33,
        vitaminA: null,
        vitaminC: 89.2,
        calcium: 47,
        iron: 0.7,
      }

      ;(prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await calculator.calculateSingleFood('food-1', 100);

      expect(result).not.toBeNull();
      expect(result?.fiber).toBe(2.6);
      expect(result?.sodium).toBe(33);
      expect(result?.vitaminC).toBe(89.2);
      expect(result?.calcium).toBe(47);
      expect(result?.iron).toBe(0.7);
      expect(result?.sugar).toBeUndefined();
      expect(result?.vitaminA).toBeUndefined();
    });
  });

  describe('calculateBatch', () => {
    it('should calculate nutrition for multiple foods', async () => {
      const mockFoods = [
        {
          id: 'food-1',
          name: '鸡胸肉',
          calories: 165,
          protein: 23,
          carbs: 0,
          fat: 1.2,
          fiber: null,
          sugar: null,
          sodium: null,
          vitaminA: null,
          vitaminC: null,
          calcium: null,
          iron: null,
        },
        {
          id: 'food-2',
          name: '米饭',
          calories: 130,
          protein: 2.7,
          carbs: 28,
          fat: 0.3,
          fiber: 0.4,
          sugar: null,
          sodium: null,
          vitaminA: null,
          vitaminC: null,
          calcium: null,
          iron: null,
        },
      ]

      ;(prisma.food.findMany as jest.Mock).mockResolvedValue(mockFoods);

      const inputs = [
        { foodId: 'food-1', amount: 100 },
        { foodId: 'food-2', amount: 150 },
      ];

      const result = await calculator.calculateBatch(inputs);

      expect(result.items).toHaveLength(2);
      expect(result.totalCalories).toBe(165 + 195); // 165 + (130 * 1.5)
      expect(result.totalProtein).toBe(27.1); // 23 + (2.7 * 1.5) = 27.1 (actual calculation result)
      expect(result.totalCarbs).toBe(0 + 42); // 0 + (28 * 1.5)
      expect(result.totalFat).toBe(1.7); // 1.2 + (0.3 * 1.5) = 1.7 (actual calculation result)
    });

    it('should skip non-existent foods', async () => {
      const mockFoods = [
        {
          id: 'food-1',
          name: '鸡胸肉',
          calories: 165,
          protein: 23,
          carbs: 0,
          fat: 1.2,
          fiber: null,
          sugar: null,
          sodium: null,
          vitaminA: null,
          vitaminC: null,
          calcium: null,
          iron: null,
        },
      ]

      ;(prisma.food.findMany as jest.Mock).mockResolvedValue(mockFoods);

      const inputs = [
        { foodId: 'food-1', amount: 100 },
        { foodId: 'non-existent', amount: 100 },
      ];

      const result = await calculator.calculateBatch(inputs);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].foodId).toBe('food-1');
    });

    it('should calculate optional nutrients totals when available', async () => {
      const mockFoods = [
        {
          id: 'food-1',
          name: '西兰花',
          calories: 34,
          protein: 2.8,
          carbs: 7,
          fat: 0.4,
          fiber: 2.6,
          sugar: null,
          sodium: 33,
          vitaminA: null,
          vitaminC: 89.2,
          calcium: 47,
          iron: 0.7,
        },
      ]

      ;(prisma.food.findMany as jest.Mock).mockResolvedValue(mockFoods);

      const inputs = [{ foodId: 'food-1', amount: 100 }];

      const result = await calculator.calculateBatch(inputs);

      expect(result.totalFiber).toBe(2.6);
      expect(result.totalSodium).toBe(33);
      expect(result.totalVitaminC).toBe(89.2);
      expect(result.totalCalcium).toBe(47);
      expect(result.totalIron).toBe(0.7);
    });
  });
});

describe('Unit Converter', () => {
  describe('toGrams', () => {
    it('should convert kg to grams', () => {
      expect(UnitConverter.toGrams(1, 'kg')).toBe(1000);
      expect(UnitConverter.toGrams(0.5, 'kg')).toBe(500);
    });

    it('should convert oz to grams', () => {
      expect(UnitConverter.toGrams(1, 'oz')).toBeCloseTo(28.35, 2);
      expect(UnitConverter.toGrams(10, 'oz')).toBeCloseTo(283.5, 1);
    });

    it('should convert lb to grams', () => {
      expect(UnitConverter.toGrams(1, 'lb')).toBeCloseTo(453.592, 2);
    });

    it('should keep grams as grams', () => {
      expect(UnitConverter.toGrams(100, 'g')).toBe(100);
    });
  });

  describe('volumeToGrams', () => {
    it('should convert cups to grams for rice', () => {
      expect(UnitConverter.volumeToGrams(1, 'cup', 'rice')).toBe(200);
      expect(UnitConverter.volumeToGrams(2, 'cup', 'rice')).toBe(400);
    });

    it('should convert tablespoons to grams', () => {
      expect(UnitConverter.volumeToGrams(1, 'tbsp', 'rice')).toBe(12.5);
    });

    it('should convert milliliters to grams for milk', () => {
      expect(UnitConverter.volumeToGrams(240, 'ml', 'milk')).toBe(240);
    });

    it('should use default conversion when food type not specified', () => {
      expect(UnitConverter.volumeToGrams(1, 'cup')).toBe(200);
    });
  });
});

