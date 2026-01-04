/**
 * 营养计算服务
 *
 * 提供营养计算工具，包括批量计算、单位转换等功能
 */

import { prisma } from '@/lib/db';
import type { FoodCategory, DataSource } from '@prisma/client';

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

/**
 * 单位转换函数
 */
export class UnitConverter {
  /**
   * 将重量转换为克
   * @param amount 数量
   * @param unit 单位
   */
  static toGrams(amount: number, unit: 'g' | 'kg' | 'oz' | 'lb'): number {
    switch (unit) {
      case 'g':
        return amount;
      case 'kg':
        return amount * 1000;
      case 'oz':
        return amount * 28.35; // 1 oz = 28.35g
      case 'lb':
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
    unit: 'cup' | 'tbsp' | 'tsp' | 'ml' | 'l',
    foodType?: string,
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

    const table =
      foodType && conversionTable[foodType]
        ? conversionTable[foodType]
        : conversionTable.default;

    switch (unit) {
      case 'cup':
        return amount * table.cup;
      case 'tbsp':
        return amount * table.tbsp;
      case 'tsp':
        return amount * table.tsp;
      case 'ml':
        return amount * table.ml;
      case 'l':
        return amount * table.l;
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
  async calculateSingleFood(
    foodId: string,
    amount: number,
  ): Promise<NutritionResult | null> {
    const food = await prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      return null;
    }

    const ratio = amount / 100; // 数据库存储per 100g

    return {
      foodId: food.id,
      foodName: food.name,
      amount,
      calories: Math.round(food.calories * ratio * 10) / 10,
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      fiber: food.fiber ? Math.round(food.fiber * ratio * 10) / 10 : undefined,
      sugar: food.sugar ? Math.round(food.sugar * ratio * 10) / 10 : undefined,
      sodium: food.sodium
        ? Math.round(food.sodium * ratio * 10) / 10
        : undefined,
      vitaminA: food.vitaminA
        ? Math.round(food.vitaminA * ratio * 10) / 10
        : undefined,
      vitaminC: food.vitaminC
        ? Math.round(food.vitaminC * ratio * 10) / 10
        : undefined,
      calcium: food.calcium
        ? Math.round(food.calcium * ratio * 10) / 10
        : undefined,
      iron: food.iron ? Math.round(food.iron * ratio * 10) / 10 : undefined,
    };
  }

  /**
   * 批量计算多个食物的营养
   * @param inputs 营养输入数组
   */
  async calculateBatch(inputs: NutritionInput[]): Promise<NutritionSummary> {
    // 批量查询所有食物
    const foodIds = inputs.map((input) => input.foodId);
    const foods = await prisma.food.findMany({
      where: { id: { in: foodIds } },
    });

    // 创建食物ID到食物对象的映射
    const foodMap = new Map(foods.map((food) => [food.id, food]));

    // 计算每个食物的营养
    const items: NutritionResult[] = [];
    for (const input of inputs) {
      const food = foodMap.get(input.foodId);
      if (!food) {
        continue; // 跳过未找到的食物
      }

      const ratio = input.amount / 100;
      items.push({
        foodId: food.id,
        foodName: food.name,
        amount: input.amount,
        calories: Math.round(food.calories * ratio * 10) / 10,
        protein: Math.round(food.protein * ratio * 10) / 10,
        carbs: Math.round(food.carbs * ratio * 10) / 10,
        fat: Math.round(food.fat * ratio * 10) / 10,
        fiber: food.fiber
          ? Math.round(food.fiber * ratio * 10) / 10
          : undefined,
        sugar: food.sugar
          ? Math.round(food.sugar * ratio * 10) / 10
          : undefined,
        sodium: food.sodium
          ? Math.round(food.sodium * ratio * 10) / 10
          : undefined,
        vitaminA: food.vitaminA
          ? Math.round(food.vitaminA * ratio * 10) / 10
          : undefined,
        vitaminC: food.vitaminC
          ? Math.round(food.vitaminC * ratio * 10) / 10
          : undefined,
        calcium: food.calcium
          ? Math.round(food.calcium * ratio * 10) / 10
          : undefined,
        iron: food.iron ? Math.round(food.iron * ratio * 10) / 10 : undefined,
      });
    }

    // 计算总和
    const summary: NutritionSummary = {
      totalCalories:
        Math.round(items.reduce((sum, item) => sum + item.calories, 0) * 10) /
        10,
      totalProtein:
        Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) /
        10,
      totalCarbs:
        Math.round(items.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10,
      totalFat:
        Math.round(items.reduce((sum, item) => sum + item.fat, 0) * 10) / 10,
      items,
    };

    // 可选营养素的总和
    if (items.some((item) => item.fiber !== undefined)) {
      summary.totalFiber =
        Math.round(
          items.reduce((sum, item) => sum + (item.fiber || 0), 0) * 10,
        ) / 10;
    }

    if (items.some((item) => item.sugar !== undefined)) {
      summary.totalSugar =
        Math.round(
          items.reduce((sum, item) => sum + (item.sugar || 0), 0) * 10,
        ) / 10;
    }

    if (items.some((item) => item.sodium !== undefined)) {
      summary.totalSodium =
        Math.round(
          items.reduce((sum, item) => sum + (item.sodium || 0), 0) * 10,
        ) / 10;
    }

    if (items.some((item) => item.vitaminA !== undefined)) {
      summary.totalVitaminA =
        Math.round(
          items.reduce((sum, item) => sum + (item.vitaminA || 0), 0) * 10,
        ) / 10;
    }

    if (items.some((item) => item.vitaminC !== undefined)) {
      summary.totalVitaminC =
        Math.round(
          items.reduce((sum, item) => sum + (item.vitaminC || 0), 0) * 10,
        ) / 10;
    }

    if (items.some((item) => item.calcium !== undefined)) {
      summary.totalCalcium =
        Math.round(
          items.reduce((sum, item) => sum + (item.calcium || 0), 0) * 10,
        ) / 10;
    }

    if (items.some((item) => item.iron !== undefined)) {
      summary.totalIron =
        Math.round(
          items.reduce((sum, item) => sum + (item.iron || 0), 0) * 10,
        ) / 10;
    }

    return summary;
  }
}

// 导出单例实例
export const nutritionCalculator = new NutritionCalculator();

// 导出类型
export type { NutritionInput, NutritionResult, NutritionSummary };
