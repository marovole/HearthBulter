/**
 * List Generator Service
 * 购物清单生成服务
 *
 * 从食谱计划自动提取食材、聚合去重、分类展示，并支持保质期标注
 */

import { prisma } from "@/lib/db";
import type { ListStatus } from "@prisma/client";
// Import FoodCategory as value, not just type
let FoodCategory: any;
try {
  // Try to import the actual enum from Prisma if available
  const prismaModule = require("@prisma/client");
  FoodCategory = prismaModule.FoodCategory;
} catch {
  // Fallback: Define FoodCategory locally if not available in Prisma
  FoodCategory = {
    VEGETABLES: "VEGETABLES",
    FRUITS: "FRUITS",
    PROTEIN: "PROTEIN",
    SEAFOOD: "SEAFOOD",
    DAIRY: "DAIRY",
    GRAINS: "GRAINS",
    OILS: "OILS",
    SNACKS: "SNACKS",
    BEVERAGES: "BEVERAGES",
  };
}
import type { FoodCategory as FoodCategoryType } from "@prisma/client";

/**
 * 食材聚合结果
 */
export interface AggregatedIngredient {
  foodId: string;
  foodName: string;
  category: FoodCategoryType;
  totalAmount: number; // 总重量（g）
  perishableDays?: number; // 保质期天数（可选）
}

/**
 * 购物清单生成结果
 */
export interface GeneratedShoppingList {
  planId: string;
  items: AggregatedIngredient[];
  totalItems: number;
  categories: Record<FoodCategoryType, AggregatedIngredient[]>;
}

/**
 * 保质期映射（基于食物分类）
 * 单位：天数
 */
const PERISHABLE_DAYS: Partial<Record<FoodCategoryType, number>> = {
  VEGETABLES: 5, // 蔬菜类平均5天（叶菜3天，根茎类7天）
  FRUITS: 7, // 水果类平均7天
  PROTEIN: 7, // 肉类7天（需冷藏）
  SEAFOOD: 3, // 海鲜类3天（需冷藏）
  DAIRY: 7, // 乳制品7天
  GRAINS: 30, // 谷物类30天
  OILS: 180, // 油脂类180天
  SNACKS: 90, // 零食类90天
  BEVERAGES: 365, // 饮料类365天
};

/**
 * 购物清单生成器类
 */
export class ListGenerator {
  /**
   * 从食谱计划生成购物清单
   * @param planId 食谱计划ID
   * @returns 生成的购物清单数据
   */
  async generateShoppingList(planId: string): Promise<GeneratedShoppingList> {
    // 1. 查询食谱计划及所有餐食和食材
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: {
        meals: {
          include: {
            ingredients: {
              include: {
                food: true, // 包含食物信息以获取分类
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new Error(`食谱计划不存在: ${planId}`);
    }

    // 2. 聚合相同食材
    const aggregated = this.aggregateIngredients(plan.meals);

    // 3. 按分类分组
    const categories = this.groupByCategory(aggregated);

    return {
      planId,
      items: aggregated,
      totalItems: aggregated.length,
      categories,
    };
  }

  /**
   * 聚合食材（合并相同食材的重量）
   * @param meals 餐食列表
   * @returns 聚合后的食材列表
   */
  private aggregateIngredients(
    meals: Array<{
      ingredients: Array<{
        foodId: string;
        amount: number;
        food: {
          id: string;
          name: string;
          category: FoodCategory;
        };
      }>;
    }>,
  ): AggregatedIngredient[] {
    // 使用 Map 按 foodId 聚合
    const ingredientMap = new Map<string, AggregatedIngredient>();
    const alternativeGroups = new Map<string, AggregatedIngredient[]>();

    meals.forEach((meal) => {
      meal.ingredients.forEach((ingredient) => {
        const existing = ingredientMap.get(ingredient.foodId);

        if (existing) {
          // 累加重量
          existing.totalAmount += ingredient.amount;
        } else {
          // 创建新项
          ingredientMap.set(ingredient.foodId, {
            foodId: ingredient.foodId,
            foodName: ingredient.food.name,
            category: ingredient.food.category,
            totalAmount: ingredient.amount,
            perishableDays: PERISHABLE_DAYS[ingredient.food.category],
          });
        }
      });
    });

    // 智能分组：为相似食材创建分组建议
    const ingredients = Array.from(ingredientMap.values());
    this.createAlternativeGroups(ingredients, alternativeGroups);

    // 过滤掉数量过小的食材（小于10g）
    const filteredIngredients = ingredients.filter(
      (ingredient) => ingredient.totalAmount >= 10,
    );

    // 转换为数组并按分类和优先级排序
    return filteredIngredients.sort((a, b) => {
      // 优先按易腐性排序（易腐食材优先）
      const aPerishable =
        a.perishableDays !== undefined && a.perishableDays <= 7;
      const bPerishable =
        b.perishableDays !== undefined && b.perishableDays <= 7;

      if (aPerishable && !bPerishable) return -1;
      if (!aPerishable && bPerishable) return 1;

      // 然后按分类排序（使用分类枚举顺序）
      const categoryOrder = Object.values(FoodCategory);
      const categoryDiff =
        categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;

      // 最后按数量降序排列（大数量优先）
      return b.totalAmount - a.totalAmount;
    });
  }

  /**
   * 创建替代食材分组
   * @param ingredients 食材列表
   * @param groups 分组结果
   */
  private createAlternativeGroups(
    ingredients: AggregatedIngredient[],
    groups: Map<string, AggregatedIngredient[]>,
  ): void {
    // 按相似性分组食材（基于名称关键词）
    const similarityGroups = [
      // 蔬菜类
      { keywords: ["番茄", "西红柿", "圣女果"], category: "VEGETABLES" },
      { keywords: ["土豆", "马铃薯", "洋芋"], category: "VEGETABLES" },
      { keywords: ["黄瓜", "青瓜"], category: "VEGETABLES" },
      // 肉类
      { keywords: ["鸡肉", "鸡胸", "鸡腿", "鸡翅"], category: "PROTEIN" },
      { keywords: ["猪肉", "五花肉", "里脊", "排骨"], category: "PROTEIN" },
      { keywords: ["牛肉", "牛腩", "牛排", "牛肉块"], category: "PROTEIN" },
    ];

    similarityGroups.forEach((group) => {
      const similarIngredients = ingredients.filter(
        (ingredient) =>
          group.category === ingredient.category &&
          group.keywords.some((keyword) =>
            ingredient.foodName.includes(keyword),
          ),
      );

      if (similarIngredients.length > 1) {
        const groupKey = group.keywords[0];
        groups.set(groupKey, similarIngredients);
      }
    });
  }

  /**
   * 按分类分组食材
   * @param items 食材列表
   * @returns 按分类分组的食材
   */
  private groupByCategory(
    items: AggregatedIngredient[],
  ): Record<FoodCategory, AggregatedIngredient[]> {
    const categories: Partial<Record<FoodCategory, AggregatedIngredient[]>> =
      {};

    items.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category]!.push(item);
    });

    // 确保所有分类都存在（即使为空数组）
    const result: Record<FoodCategory, AggregatedIngredient[]> = {} as any;
    Object.values(FoodCategory).forEach((category) => {
      result[category] = categories[category] || [];
    });

    return result;
  }

  /**
   * 获取易腐食材（需要优先采购）
   * @param items 食材列表
   * @returns 易腐食材列表（保质期 <= 7天）
   */
  getPerishableItems(items: AggregatedIngredient[]): AggregatedIngredient[] {
    return items.filter(
      (item) => item.perishableDays !== undefined && item.perishableDays <= 7,
    );
  }

  /**
   * 获取分类建议
   * 根据食材分类返回采购建议
   * @param category 食材分类
   * @returns 采购建议文本
   */
  getCategoryAdvice(category: FoodCategory): string {
    const perishableDays = PERISHABLE_DAYS[category];

    if (!perishableDays) {
      return "建议尽快采购";
    }

    if (perishableDays <= 3) {
      return "建议3天内购买";
    } else if (perishableDays <= 7) {
      return "建议7天内购买";
    } else if (perishableDays <= 30) {
      return "建议30天内购买";
    } else {
      return "可长期保存";
    }
  }
}

// 导出单例实例
export const listGenerator = new ListGenerator();
