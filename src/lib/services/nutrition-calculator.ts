/**
 * 营养计算服务
 *
 * 提供营养计算工具，包括批量计算、单位转换等功能
 */

import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface NutritionInput {
  foodId: string;
  amount: number; // 重量（单位：g）
}

interface NutritionResult {
  foodId: string;
  foodName: string;
  amount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
}

interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  totalVitaminA?: number;
  totalVitaminC?: number;
  totalCalcium?: number;
  totalIron?: number;
  items: NutritionResult[];
}

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * 单位转换函数
 */
export class UnitConverter {
  /**
   * 将重量转换为克
   * @param amount 数量
   * @param unit 单位
   */
  static toGrams(amount: number, unit: "g" | "kg" | "oz" | "lb"): number {
    switch (unit) {
    case "g":
      return amount;
    case "kg":
      return amount * 1000;
    case "oz":
      return amount * 28.35; // 1 oz = 28.35g
    case "lb":
      return amount * 453.592; // 1 lb = 453.592g
    default:
      return amount;
    }
  }

  /**
   * 常见体积单位转换为重量（近似值）
   * 注意：这些转换是近似值，实际重量可能因食物密度而有所不同
   */
  static volumeToGrams(
    amount: number,
    unit: "cup" | "tbsp" | "tsp" | "ml" | "l",
    foodType?: string
  ): number {
    // 常用食物的体积到重量转换（近似值）
    const conversionTable: Record<string, Record<string, number>> = {
      rice: { cup: 200, tbsp: 12.5, tsp: 4.2, ml: 0.2, l: 200 }, // 米饭：1杯≈200g
      flour: { cup: 120, tbsp: 7.5, tsp: 2.5, ml: 0.12, l: 120 }, // 面粉：1杯≈120g
      sugar: { cup: 200, tbsp: 12.5, tsp: 4.2, ml: 0.2, l: 200 }, // 糖：1杯≈200g
      milk: { cup: 240, tbsp: 15, tsp: 5, ml: 1, l: 1000 }, // 牛奶：1杯≈240g
      oil: { cup: 220, tbsp: 14, tsp: 4.7, ml: 0.9, l: 900 }, // 油：1杯≈220g
      default: { cup: 200, tbsp: 12.5, tsp: 4.2, ml: 1, l: 1000 },
    };

    const table: Record<string, number> = conversionTable[foodType ?? ""] ??
      conversionTable.default ?? { cup: 0, tbsp: 0, tsp: 0, ml: 0, l: 0 };

    const getValue = (key: string) => table[key] ?? 0;

    switch (unit) {
    case "cup":
      return amount * getValue("cup");
    case "tbsp":
      return amount * getValue("tbsp");
    case "tsp":
      return amount * getValue("tsp");
    case "ml":
      return amount * getValue("ml");
    case "l":
      return amount * getValue("l");
    default:
      return amount;
    }
  }
}

/**
 * 营养计算服务类
 */
export class NutritionCalculator {
  /**
   * 计算单个食物的营养（基于100g标准）
   * @param foodId 食物ID
   * @param amount 重量（g）
   */
  async calculateSingleFood(foodId: string, amount: number): Promise<NutritionResult | null> {
    const food = await convexClient.query<Doc<"foods"> | null>(api.budget.getFoodById, {
      foodId: foodId as Id<"foods">,
    });

    if (!food) {
      return null;
    }

    const ratio = amount / 100; // 数据库存储per 100g

    return {
      foodId: food._id,
      foodName: food.name,
      amount,
      calories: roundTo(food.calories * ratio, 1),
      protein: roundTo(food.protein * ratio, 1),
      carbs: roundTo(food.carbs * ratio, 1),
      fat: roundTo(food.fat * ratio, 1),
      fiber: food.fiber != null ? roundTo(food.fiber * ratio, 1) : undefined,
    };
  }

  /**
   * 批量计算多个食物的营养
   * @param inputs 营养输入数组
   */
  async calculateBatch(inputs: NutritionInput[]): Promise<NutritionSummary> {
    // 批量查询所有食物
    const foodIds = inputs.map((input) => input.foodId);
    const foods = await convexClient.query<Doc<"foods">[]>(api.budget.getFoodsByIds, {
      foodIds: foodIds as Id<"foods">[],
    });

    // 创建食物ID到食物对象的映射
    const foodMap = new Map<string, Doc<"foods">>(foods.map((food) => [food._id as string, food]));

    const items: NutritionResult[] = [];
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    };

    for (const input of inputs) {
      const food = foodMap.get(input.foodId);
      if (!food) {
        continue;
      }

      const ratio = input.amount / 100;
      const calories = food.calories * ratio;
      const protein = food.protein * ratio;
      const carbs = food.carbs * ratio;
      const fat = food.fat * ratio;
      const fiber = food.fiber != null ? food.fiber * ratio : 0;

      totals.calories += calories;
      totals.protein += protein;
      totals.carbs += carbs;
      totals.fat += fat;
      totals.fiber += fiber;

      items.push({
        foodId: food._id,
        foodName: food.name,
        amount: input.amount,
        calories: roundTo(calories, 2),
        protein: roundTo(protein, 2),
        carbs: roundTo(carbs, 2),
        fat: roundTo(fat, 2),
        fiber: food.fiber != null ? roundTo(fiber, 2) : undefined,
      });
    }

    const summary: NutritionSummary = {
      totalCalories: roundTo(totals.calories, 1),
      totalProtein: roundTo(totals.protein, 1),
      totalCarbs: roundTo(totals.carbs, 1),
      totalFat: roundTo(totals.fat, 1),
      items,
    };

    // 可选营养素的总和
    if (items.some((item) => item.fiber !== undefined)) {
      summary.totalFiber = roundTo(totals.fiber, 1);
    }

    return summary;
  }
}

// 导出单例实例
export const nutritionCalculator = new NutritionCalculator();

// 导出类型
export type { NutritionInput, NutritionResult, NutritionSummary };
