/**
 * Nutrition Calculator 测试
 * 服务层测试 - 核心业务逻辑覆盖
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  nutritionCalculator,
  UnitConverter,
  type NutritionInput,
  type NutritionResult,
  type NutritionSummary,
} from "@/lib/services/nutrition-calculator";
import { prisma } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  prisma: {
    food: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("UnitConverter", () => {
  describe("toGrams - Weight Conversions", () => {
    it("should convert grams to grams (1:1)", () => {
      expect(UnitConverter.toGrams(100, "g")).toBe(100);
      expect(UnitConverter.toGrams(250, "g")).toBe(250);
    });

    it("should convert kilograms to grams", () => {
      expect(UnitConverter.toGrams(1, "kg")).toBe(1000);
      expect(UnitConverter.toGrams(0.5, "kg")).toBe(500);
      expect(UnitConverter.toGrams(2.5, "kg")).toBe(2500);
    });

    it("should convert ounces to grams", () => {
      expect(UnitConverter.toGrams(1, "oz")).toBeCloseTo(28.35, 2);
      expect(UnitConverter.toGrams(4, "oz")).toBeCloseTo(113.4, 1);
      expect(UnitConverter.toGrams(16, "oz")).toBeCloseTo(453.6, 1);
    });

    it("should convert pounds to grams", () => {
      expect(UnitConverter.toGrams(1, "lb")).toBeCloseTo(453.592, 2);
      expect(UnitConverter.toGrams(2, "lb")).toBeCloseTo(907.184, 2);
      expect(UnitConverter.toGrams(0.5, "lb")).toBeCloseTo(226.796, 2);
    });

    it("should return same amount for invalid unit", () => {
      expect(UnitConverter.toGrams(100, "invalid" as any)).toBe(100);
    });
  });

  describe("volumeToGrams - Volume to Weight Conversions", () => {
    it("should convert cups to grams for rice", () => {
      expect(UnitConverter.volumeToGrams(1, "cup", "rice")).toBe(200);
      expect(UnitConverter.volumeToGrams(0.5, "cup", "rice")).toBe(100);
      expect(UnitConverter.volumeToGrams(2, "cup", "rice")).toBe(400);
    });

    it("should convert cups to grams for flour", () => {
      expect(UnitConverter.volumeToGrams(1, "cup", "flour")).toBe(120);
      expect(UnitConverter.volumeToGrams(2, "cup", "flour")).toBe(240);
    });

    it("should convert cups to grams for sugar", () => {
      expect(UnitConverter.volumeToGrams(1, "cup", "sugar")).toBe(200);
    });

    it("should convert cups to grams for milk", () => {
      expect(UnitConverter.volumeToGrams(1, "cup", "milk")).toBe(240);
      expect(UnitConverter.volumeToGrams(0.5, "cup", "milk")).toBe(120);
    });

    it("should convert cups to grams for oil", () => {
      expect(UnitConverter.volumeToGrams(1, "cup", "oil")).toBe(220);
    });

    it("should convert tablespoons to grams", () => {
      expect(UnitConverter.volumeToGrams(1, "tbsp", "default")).toBe(12.5);
      expect(UnitConverter.volumeToGrams(2, "tbsp", "default")).toBe(25);
    });

    it("should convert teaspoons to grams", () => {
      expect(UnitConverter.volumeToGrams(1, "tsp", "default")).toBe(4.2);
      expect(UnitConverter.volumeToGrams(3, "tsp", "default")).toBeCloseTo(
        12.6,
        1,
      );
    });

    it("should convert milliliters to grams", () => {
      expect(UnitConverter.volumeToGrams(100, "ml", "milk")).toBe(100);
      expect(UnitConverter.volumeToGrams(250, "ml", "milk")).toBe(250);
    });

    it("should convert liters to grams", () => {
      expect(UnitConverter.volumeToGrams(1, "l", "milk")).toBe(1000);
      expect(UnitConverter.volumeToGrams(0.5, "l", "milk")).toBe(500);
    });

    it("should use default conversion for unknown food type", () => {
      expect(UnitConverter.volumeToGrams(1, "cup", "unknown")).toBe(200);
    });

    it("should return same amount for invalid unit", () => {
      expect(
        UnitConverter.volumeToGrams(100, "invalid" as any, "default"),
      ).toBe(100);
    });
  });
});

describe("NutritionCalculator", () => {
  const mockFood = {
    id: "food-1",
    name: "苹果",
    calories: 52,
    protein: 0.3,
    carbs: 14.0,
    fat: 0.2,
    fiber: 2.4,
    sugar: 10.4,
    sodium: 1,
    vitaminA: 3,
    vitaminC: 4.6,
    calcium: 6,
    iron: 0.12,
  };

  const mockFood2 = {
    id: "food-2",
    name: "鸡胸肉",
    calories: 165,
    protein: 31.0,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    sugar: 0,
    sodium: 74,
  };

  const mockFood3 = {
    id: "food-3",
    name: "燕麦",
    calories: 389,
    protein: 16.9,
    carbs: 66.3,
    fat: 6.9,
    fiber: 10.6,
    sugar: 0,
    sodium: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateSingleFood", () => {
    it("should calculate nutrition for a single food correctly", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await nutritionCalculator.calculateSingleFood(
        "food-1",
        150,
      );

      expect(result).toBeDefined();
      expect(result!.foodId).toBe("food-1");
      expect(result!.foodName).toBe("苹果");
      expect(result!.amount).toBe(150);
      expect(result!.calories).toBe(78); // 52 * 1.5 = 78
      expect(result!.protein).toBe(0.5); // 0.3 * 1.5 = 0.45, rounded to 0.5
      expect(result!.carbs).toBe(21); // 14 * 1.5 = 21
      expect(result!.fat).toBe(0.3); // 0.2 * 1.5 = 0.3
      expect(result!.fiber).toBe(3.6); // 2.4 * 1.5 = 3.6
      expect(result!.sugar).toBe(15.6); // 10.4 * 1.5 = 15.6
      expect(result!.sodium).toBe(1.5); // 1 * 1.5 = 1.5
      expect(result!.vitaminA).toBe(4.5); // 3 * 1.5 = 4.5
      expect(result!.vitaminC).toBe(6.9); // 4.6 * 1.5 = 6.9
      expect(result!.calcium).toBe(9); // 6 * 1.5 = 9
      expect(result!.iron).toBe(0.2); // 0.12 * 1.5 = 0.18, rounded to 0.2
    });

    it("should calculate nutrition for 100g serving", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await nutritionCalculator.calculateSingleFood(
        "food-1",
        100,
      );

      expect(result!.calories).toBe(52);
      expect(result!.protein).toBe(0.3);
      expect(result!.carbs).toBe(14);
      expect(result!.fat).toBe(0.2);
      expect(result!.fiber).toBe(2.4);
    });

    it("should calculate nutrition for different portion sizes", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood2);

      const result50g = await nutritionCalculator.calculateSingleFood(
        "food-2",
        50,
      );
      expect(result50g!.calories).toBe(82.5); // 165 * 0.5
      expect(result50g!.protein).toBe(15.5); // 31 * 0.5 = 15.5

      const result200g = await nutritionCalculator.calculateSingleFood(
        "food-2",
        200,
      );
      expect(result200g!.calories).toBe(330); // 165 * 2
      expect(result200g!.protein).toBe(62); // 31 * 2 = 62
    });

    it("should handle foods with partial nutrition data", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood3);

      const result = await nutritionCalculator.calculateSingleFood(
        "food-3",
        100,
      );

      expect(result!.calories).toBe(389);
      expect(result!.protein).toBe(16.9);
      expect(result!.carbs).toBe(66.3);
      expect(result!.fat).toBe(6.9);
      expect(result!.fiber).toBe(10.6);
      expect(result!.sugar).toBe(0);
      expect(result!.sodium).toBe(2);
      expect(result!.vitaminA).toBeUndefined();
      expect(result!.vitaminC).toBeUndefined();
      expect(result!.calcium).toBeUndefined();
      expect(result!.iron).toBeUndefined();
    });

    it("should return null for non-existent food", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await nutritionCalculator.calculateSingleFood(
        "food-nonexistent",
        100,
      );

      expect(result).toBeNull();
    });

    it("should handle very small portion sizes", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await nutritionCalculator.calculateSingleFood("food-1", 5);

      expect(result!.calories).toBe(2.6); // 52 * 0.05
      expect(result!.protein).toBe(0);
    });

    it("should handle large portion sizes", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await nutritionCalculator.calculateSingleFood(
        "food-1",
        1000,
      );

      expect(result!.calories).toBe(520); // 52 * 10
      expect(result!.carbs).toBe(140); // 14 * 10
    });

    it("should calculate zero calories for zero portion", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await nutritionCalculator.calculateSingleFood("food-1", 0);

      expect(result!.calories).toBe(0);
      expect(result!.protein).toBe(0);
      expect(result!.carbs).toBe(0);
      expect(result!.fat).toBe(0);
    });
  });

  describe("calculateBatch", () => {
    it("should calculate nutrition for multiple foods", async () => {
      (prisma.food.findMany as jest.Mock).mockResolvedValue([
        mockFood,
        mockFood2,
        mockFood3,
      ]);

      const inputs: NutritionInput[] = [
        { foodId: "food-1", amount: 150 }, // Apple
        { foodId: "food-2", amount: 100 }, // Chicken breast
        { foodId: "food-3", amount: 50 }, // Oats
      ];

      const result = await nutritionCalculator.calculateBatch(inputs);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(3);

      // Check apple
      expect(result.items[0].foodId).toBe("food-1");
      expect(result.items[0].calories).toBe(78);

      // Check chicken breast
      expect(result.items[1].foodId).toBe("food-2");
      expect(result.items[1].calories).toBe(165);
      expect(result.items[1].protein).toBe(31);

      // Check oats
      expect(result.items[2].foodId).toBe("food-3");
      expect(result.items[2].calories).toBe(194.5);
      expect(result.items[2].carbs).toBe(33.15);
    });

    it("should calculate total nutrition correctly", async () => {
      (prisma.food.findMany as jest.Mock).mockResolvedValue([
        mockFood,
        mockFood2,
      ]);

      const inputs: NutritionInput[] = [
        { foodId: "food-1", amount: 100 }, // 52 calories
        { foodId: "food-2", amount: 100 }, // 165 calories
      ];

      const result = await nutritionCalculator.calculateBatch(inputs);

      expect(result.totalCalories).toBe(217); // 52 + 165
      expect(result.totalProtein).toBe(31.3); // 0.3 + 31
      expect(result.totalCarbs).toBe(14); // 14 + 0
      expect(result.totalFat).toBe(3.8); // 0.2 + 3.6
    });

    it("should include optional nutrients in totals", async () => {
      (prisma.food.findMany as jest.Mock).mockResolvedValue([
        mockFood,
        mockFood3,
      ]);

      const inputs: NutritionInput[] = [
        { foodId: "food-1", amount: 100 }, // Apple with fiber, sugar
        { foodId: "food-3", amount: 100 }, // Oats with fiber
      ];

      const result = await nutritionCalculator.calculateBatch(inputs);

      expect(result.totalFiber).toBe(2.4 + 10.6); // 13
      expect(result.totalSugar).toBe(10.4);
      expect(result.totalSodium).toBe(2 + 1); // 3
      expect(result.totalVitaminA).toBe(3);
      expect(result.totalVitaminC).toBe(4.6);
      expect(result.totalCalcium).toBe(6);
      expect(result.totalIron).toBe(0.12);
    });

    it("should handle empty input array", async () => {
      const inputs: NutritionInput[] = [];

      const result = await nutritionCalculator.calculateBatch(inputs);

      expect(result.items).toHaveLength(0);
      expect(result.totalCalories).toBe(0);
      expect(result.totalProtein).toBe(0);
      expect(result.totalCarbs).toBe(0);
      expect(result.totalFat).toBe(0);
    });

    it("should skip non-existent foods", async () => {
      (prisma.food.findMany as jest.Mock).mockResolvedValue([mockFood]);

      const inputs: NutritionInput[] = [
        { foodId: "food-1", amount: 100 },
        { foodId: "food-nonexistent", amount: 100 },
        { foodId: "food-2", amount: 100 },
      ];

      const result = await nutritionCalculator.calculateBatch(inputs);

      // Should only return apple, skip others
      expect(result.items).toHaveLength(1);
      expect(result.items[0].foodId).toBe("food-1");
    });

    it("should round totals to one decimal place", async () => {
      (prisma.food.findMany as jest.Mock).mockResolvedValue([mockFood]);

      const inputs: NutritionInput[] = [{ foodId: "food-1", amount: 123 }]; // 1.23 ratio

      const result = await nutritionCalculator.calculateBatch(inputs);

      // 52 * 1.23 = 63.96 → 64.0 (rounded)
      // 0.3 * 1.23 = 0.369 → 0.4 (rounded)
      // 14 * 1.23 = 17.22 → 17.2 (rounded)
      // 0.2 * 1.23 = 0.246 → 0.2 (rounded)

      expect(result.totalCalories).toBe(64);
      expect(result.totalProtein).toBe(0.4);
      expect(result.totalCarbs).toBe(17.2);
      expect(result.totalFat).toBe(0.2);
    });

    it("should handle single food batch", async () => {
      (prisma.food.findMany as jest.Mock).mockResolvedValue([mockFood]);

      const inputs: NutritionInput[] = [{ foodId: "food-1", amount: 150 }];

      const result = await nutritionCalculator.calculateBatch(inputs);

      expect(result.items).toHaveLength(1);
      expect(result.totalCalories).toBe(78);
    });

    it("should handle duplicate foods", async () => {
      (prisma.food.findMany as jest.Mock).mockResolvedValue([mockFood]);

      const inputs: NutritionInput[] = [
        { foodId: "food-1", amount: 100 },
        { foodId: "food-1", amount: 100 },
      ];

      const result = await nutritionCalculator.calculateBatch(inputs);

      expect(result.items).toHaveLength(2);
      expect(result.totalCalories).toBe(104); // 52 + 52
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors in calculateSingleFood", async () => {
      (prisma.food.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(
        nutritionCalculator.calculateSingleFood("food-1", 100),
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle database errors in calculateBatch", async () => {
      (prisma.food.findMany as jest.Mock).mockRejectedValue(
        new Error("Database query failed"),
      );

      const inputs: NutritionInput[] = [{ foodId: "food-1", amount: 100 }];

      await expect(nutritionCalculator.calculateBatch(inputs)).rejects.toThrow(
        "Database query failed",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle foods with zero values", async () => {
      const zeroFood = {
        ...mockFood,
        id: "food-zero",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      (prisma.food.findUnique as jest.Mock).mockResolvedValue(zeroFood);

      const result = await nutritionCalculator.calculateSingleFood(
        "food-zero",
        100,
      );

      expect(result!.calories).toBe(0);
      expect(result!.protein).toBe(0);
      expect(result!.carbs).toBe(0);
      expect(result!.fat).toBe(0);
    });

    it("should handle decimal amounts", async () => {
      (prisma.food.findUnique as jest.Mock).mockResolvedValue(mockFood);

      const result = await nutritionCalculator.calculateSingleFood(
        "food-1",
        0.5,
      );

      expect(result!.calories).toBe(0.3); // 52 * 0.005 = 0.26 → 0.3 (rounded)
    });

    it("should handle very high food IDs count in batch", async () => {
      const manyFoods = Array.from({ length: 100 }, (_, i) => ({
        ...mockFood,
        id: `food-${i}`,
      }));

      (prisma.food.findMany as jest.Mock).mockResolvedValue(manyFoods);

      const inputs: NutritionInput[] = manyFoods.slice(0, 50).map((food) => ({
        foodId: food.id,
        amount: 100,
      }));

      const result = await nutritionCalculator.calculateBatch(inputs);

      expect(result.items).toHaveLength(50);
    });
  });
});
