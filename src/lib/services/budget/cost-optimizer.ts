import { PrismaClient } from '@prisma/client';
import { Food, FoodCategory, PriceHistory } from '@prisma/client';
import type { NutritionInfo } from '@/types/service-types';

const prisma = new PrismaClient();

export interface NutritionTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodOption {
  food: Food;
  amount: number; // 克数
  cost: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  unitPrice: number; // 元/kg
  platform: string;
}

export interface OptimizationResult {
  originalCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
  originalFoods: FoodOption[];
  optimizedFoods: FoodOption[];
  substitutions: {
    original: FoodOption;
    substitute: FoodOption;
    savings: number;
    reason: string;
  }[];
  nutritionComparison: {
    original: NutritionTarget;
    optimized: NutritionTarget;
    meetsRequirements: boolean;
  };
}

export interface OptimizationConstraints {
  nutritionTargets: NutritionTarget;
  maxCost?: number;
  minSavings?: number;
  allowedCategories?: FoodCategory[];
  excludedFoodIds?: string[];
  preferSeasonal?: boolean;
  economyMode?: boolean;
}

export class CostOptimizer {
  /**
   * 优化购物清单成本
   */
  async optimizeShoppingList(
    foodIds: string[],
    constraints: OptimizationConstraints,
  ): Promise<OptimizationResult> {
    // 获取原始食物选项
    const originalFoods = await this.getFoodOptions(foodIds);

    // 计算原始成本和营养
    const originalCost = originalFoods.reduce(
      (sum, food) => sum + food.cost,
      0,
    );
    const originalNutrition = this.calculateTotalNutrition(originalFoods);

    // 获取可替换的食物选项
    const substituteOptions = await this.findSubstituteOptions(
      originalFoods,
      constraints,
    );

    // 运行优化算法
    const optimizedFoods = await this.runOptimization(
      originalFoods,
      substituteOptions,
      constraints,
    );

    // 计算优化后成本和营养
    const optimizedCost = optimizedFoods.reduce(
      (sum, food) => sum + food.cost,
      0,
    );
    const optimizedNutrition = this.calculateTotalNutrition(optimizedFoods);

    // 生成替换建议
    const substitutions = this.generateSubstitutions(
      originalFoods,
      optimizedFoods,
    );

    const savings = originalCost - optimizedCost;
    const savingsPercentage =
      originalCost > 0 ? (savings / originalCost) * 100 : 0;

    return {
      originalCost,
      optimizedCost,
      savings,
      savingsPercentage,
      originalFoods,
      optimizedFoods,
      substitutions,
      nutritionComparison: {
        original: originalNutrition,
        optimized: optimizedNutrition,
        meetsRequirements: this.meetsNutritionRequirements(
          optimizedNutrition,
          constraints.nutritionTargets,
        ),
      },
    };
  }

  /**
   * 获取食物选项（包含价格信息）
   */
  private async getFoodOptions(foodIds: string[]): Promise<FoodOption[]> {
    const options: FoodOption[] = [];

    for (const foodId of foodIds) {
      const food = await prisma.food.findUnique({
        where: { id: foodId },
        include: {
          priceHistories: {
            where: { isValid: true },
            orderBy: { recordedAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!food) continue;

      // 获取最新价格
      const latestPrice = food.priceHistories[0];
      if (!latestPrice) continue;

      // 默认100g的量
      const amount = 100;
      const cost = (latestPrice.unitPrice * amount) / 1000; // 转换为元

      options.push({
        food,
        amount,
        cost,
        nutrition: {
          calories: (food.calories * amount) / 100,
          protein: (food.protein * amount) / 100,
          carbs: (food.carbs * amount) / 100,
          fat: (food.fat * amount) / 100,
        },
        unitPrice: latestPrice.unitPrice,
        platform: latestPrice.platform,
      });
    }

    return options;
  }

  /**
   * 查找可替换的食物选项
   */
  private async findSubstituteOptions(
    originalFoods: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<FoodOption[]> {
    const substitutes: FoodOption[] = [];

    for (const original of originalFoods) {
      // 查找同类别的其他食物
      const similarFoods = await prisma.food.findMany({
        where: {
          category: original.food.category,
          id: { not: original.food.id },
          ...(constraints.excludedFoodIds && {
            id: { notIn: constraints.excludedFoodIds },
          }),
        },
        include: {
          priceHistories: {
            where: { isValid: true },
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        take: 10,
      });

      for (const food of similarFoods) {
        const latestPrice = food.priceHistories[0];
        if (!latestPrice) continue;

        // 只考虑更便宜的选项
        if (latestPrice.unitPrice >= original.unitPrice) continue;

        const amount = 100;
        const cost = (latestPrice.unitPrice * amount) / 1000;

        substitutes.push({
          food,
          amount,
          cost,
          nutrition: {
            calories: (food.calories * amount) / 100,
            protein: (food.protein * amount) / 100,
            carbs: (food.carbs * amount) / 100,
            fat: (food.fat * amount) / 100,
          },
          unitPrice: latestPrice.unitPrice,
          platform: latestPrice.platform,
        });
      }
    }

    // 按价格排序
    return substitutes.sort((a, b) => a.cost - b.cost);
  }

  /**
   * 运行优化算法
   */
  private async runOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<FoodOption[]> {
    if (constraints.economyMode) {
      return this.economyModeOptimization(
        originalFoods,
        substitutes,
        constraints,
      );
    } else {
      return this.balancedOptimization(originalFoods, substitutes, constraints);
    }
  }

  /**
   * 经济模式优化（优先成本最低）
   */
  private economyModeOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<FoodOption[]> {
    const result: FoodOption[] = [];
    const targetNutrition = constraints.nutritionTargets;

    // 贪心算法：优先选择性价比最高的食物
    const sortedOptions = [...originalFoods, ...substitutes].sort(
      (a, b) => a.cost / a.nutrition.calories - b.cost / b.nutrition.calories,
    );

    const currentNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    let currentCost = 0;

    for (const option of sortedOptions) {
      if (currentNutrition.calories >= targetNutrition.calories) break;

      // 计算需要多少量来满足营养目标
      const remainingCalories =
        targetNutrition.calories - currentNutrition.calories;
      const neededAmount = Math.min(
        (remainingCalories / option.nutrition.calories) * option.amount,
        option.amount * 2, // 最多2倍量
      );

      const scaledOption = {
        ...option,
        amount: neededAmount,
        cost: (option.cost / option.amount) * neededAmount,
        nutrition: {
          calories: (option.nutrition.calories / option.amount) * neededAmount,
          protein: (option.nutrition.protein / option.amount) * neededAmount,
          carbs: (option.nutrition.carbs / option.amount) * neededAmount,
          fat: (option.nutrition.fat / option.amount) * neededAmount,
        },
      };

      result.push(scaledOption);

      currentNutrition.calories += scaledOption.nutrition.calories;
      currentNutrition.protein += scaledOption.nutrition.protein;
      currentNutrition.carbs += scaledOption.nutrition.carbs;
      currentNutrition.fat += scaledOption.nutrition.fat;
      currentCost += scaledOption.cost;

      // 检查预算约束
      if (constraints.maxCost && currentCost > constraints.maxCost) {
        break;
      }
    }

    return Promise.resolve(result);
  }

  /**
   * 平衡优化（成本与营养平衡）
   */
  private balancedOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<FoodOption[]> {
    const result = [...originalFoods];

    // 尝试替换部分高成本食物
    for (let i = 0; i < result.length; i++) {
      const original = result[i];

      // 查找同类别的更便宜替代品
      const cheaperSubstitutes = substitutes.filter(
        (s) =>
          s.food.category === original.food.category && s.cost < original.cost,
      );

      if (cheaperSubstitutes.length > 0) {
        // 选择最便宜的替代品
        const bestSubstitute = cheaperSubstitutes[0];

        // 检查营养相似性
        const nutritionSimilarity = this.calculateNutritionSimilarity(
          original,
          bestSubstitute,
        );

        if (nutritionSimilarity > 0.7) {
          // 70%相似度阈值
          result[i] = bestSubstitute;
        }
      }
    }

    return Promise.resolve(result);
  }

  /**
   * 计算营养相似性
   */
  private calculateNutritionSimilarity(
    food1: FoodOption,
    food2: FoodOption,
  ): number {
    const normalizeNutrition = (nutrition: NutritionInfo) => {
      const total =
        nutrition.calories +
        nutrition.protein +
        nutrition.carbs +
        nutrition.fat;
      return {
        calories: nutrition.calories / total,
        protein: nutrition.protein / total,
        carbs: nutrition.carbs / total,
        fat: nutrition.fat / total,
      };
    };

    const norm1 = normalizeNutrition(food1.nutrition);
    const norm2 = normalizeNutrition(food2.nutrition);

    // 计算欧几里得距离的相似度
    const distance = Math.sqrt(
      Math.pow(norm1.calories - norm2.calories, 2) +
        Math.pow(norm1.protein - norm2.protein, 2) +
        Math.pow(norm1.carbs - norm2.carbs, 2) +
        Math.pow(norm1.fat - norm2.fat, 2),
    );

    return 1 - distance;
  }

  /**
   * 计算总营养
   */
  private calculateTotalNutrition(foods: FoodOption[]): NutritionTarget {
    return foods.reduce(
      (total, food) => ({
        calories: total.calories + food.nutrition.calories,
        protein: total.protein + food.nutrition.protein,
        carbs: total.carbs + food.nutrition.carbs,
        fat: total.fat + food.nutrition.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }

  /**
   * 检查是否满足营养要求
   */
  private meetsNutritionRequirements(
    actual: NutritionTarget,
    targets: NutritionTarget,
  ): boolean {
    const tolerance = 0.1; // 10%容差

    return (
      actual.calories >= targets.calories * (1 - tolerance) &&
      actual.protein >= targets.protein * (1 - tolerance) &&
      actual.carbs >= targets.carbs * (1 - tolerance) &&
      actual.fat >= targets.fat * (1 - tolerance)
    );
  }

  /**
   * 生成替换建议
   */
  private generateSubstitutions(
    original: FoodOption[],
    optimized: FoodOption[],
  ): Array<{
    original: FoodOption;
    substitute: FoodOption;
    savings: number;
    reason: string;
  }> {
    const substitutions: Array<{
      original: FoodOption;
      substitute: FoodOption;
      savings: number;
      reason: string;
    }> = [];

    // 简单的替换检测逻辑
    for (const origFood of original) {
      const replacement = optimized.find(
        (opt) =>
          opt.food.category === origFood.food.category &&
          opt.food.id !== origFood.food.id,
      );

      if (replacement && replacement.cost < origFood.cost) {
        substitutions.push({
          original: origFood,
          substitute: replacement,
          savings: origFood.cost - replacement.cost,
          reason: `${replacement.food.name}比${origFood.food.name}更便宜，营养相似`,
        });
      }
    }

    return substitutions;
  }

  /**
   * 多目标优化（成本+营养+口味）
   */
  async multiObjectiveOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<OptimizationResult> {
    // 定义权重
    const weights = {
      cost: constraints.economyMode ? 0.6 : 0.4,
      nutrition: 0.3,
      variety: 0.3,
    };

    // 生成多个候选方案
    const candidates = await this.generateCandidateSolutions(
      originalFoods,
      substitutes,
      constraints,
    );

    // 评估每个候选方案
    const scoredCandidates = candidates.map((candidate) => {
      const costScore = this.calculateCostScore(candidate, constraints);
      const nutritionScore = this.calculateNutritionScore(
        candidate,
        constraints,
      );
      const varietyScore = this.calculateVarietyScore(candidate);

      const totalScore =
        costScore * weights.cost +
        nutritionScore * weights.nutrition +
        varietyScore * weights.variety;

      return {
        candidate,
        scores: {
          cost: costScore,
          nutrition: nutritionScore,
          variety: varietyScore,
        },
        totalScore,
      };
    });

    // 选择得分最高的方案
    const bestSolution = scoredCandidates.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best,
    );

    const originalCost = originalFoods.reduce(
      (sum, food) => sum + food.cost,
      0,
    );
    const originalNutrition = this.calculateTotalNutrition(originalFoods);
    const optimizedNutrition = this.calculateTotalNutrition(
      bestSolution.candidate,
    );
    const optimizedCost = bestSolution.candidate.reduce(
      (sum, food) => sum + food.cost,
      0,
    );

    return {
      originalCost,
      optimizedCost,
      savings: originalCost - optimizedCost,
      savingsPercentage:
        originalCost > 0
          ? ((originalCost - optimizedCost) / originalCost) * 100
          : 0,
      originalFoods,
      optimizedFoods: bestSolution.candidate,
      substitutions: this.generateSubstitutions(
        originalFoods,
        bestSolution.candidate,
      ),
      nutritionComparison: {
        original: originalNutrition,
        optimized: optimizedNutrition,
        meetsRequirements: this.meetsNutritionRequirements(
          optimizedNutrition,
          constraints.nutritionTargets,
        ),
      },
    };
  }

  /**
   * 生成候选解决方案
   */
  private async generateCandidateSolutions(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<FoodOption[][]> {
    const candidates: FoodOption[][] = [];

    // 方案1：原始方案
    candidates.push([...originalFoods]);

    // 方案2：经济模式
    candidates.push(
      await this.economyModeOptimization(
        originalFoods,
        substitutes,
        constraints,
      ),
    );

    // 方案3：平衡模式
    candidates.push(
      await this.balancedOptimization(originalFoods, substitutes, constraints),
    );

    // 方案4：营养优先模式
    candidates.push(
      await this.nutritionFirstOptimization(
        originalFoods,
        substitutes,
        constraints,
      ),
    );

    // 方案5：多样性优先模式
    candidates.push(
      await this.varietyFirstOptimization(
        originalFoods,
        substitutes,
        constraints,
      ),
    );

    return candidates.filter((candidate) => candidate.length > 0);
  }

  /**
   * 营养优先优化
   */
  private async nutritionFirstOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<FoodOption[]> {
    const result: FoodOption[] = [];
    const targetNutrition = constraints.nutritionTargets;

    // 按营养密度排序
    const sortedOptions = [...originalFoods, ...substitutes].sort((a, b) => {
      const nutritionDensityA =
        (a.nutrition.protein + a.nutrition.carbs + a.nutrition.fat) / a.cost;
      const nutritionDensityB =
        (b.nutrition.protein + b.nutrition.carbs + b.nutrition.fat) / b.cost;
      return nutritionDensityB - nutritionDensityA;
    });

    const currentNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const option of sortedOptions) {
      if (currentNutrition.calories >= targetNutrition.calories) break;

      const neededAmount = Math.min(option.amount, option.amount * 1.5);
      const scaledOption = {
        ...option,
        amount: neededAmount,
        cost: (option.cost / option.amount) * neededAmount,
        nutrition: {
          calories: (option.nutrition.calories / option.amount) * neededAmount,
          protein: (option.nutrition.protein / option.amount) * neededAmount,
          carbs: (option.nutrition.carbs / option.amount) * neededAmount,
          fat: (option.nutrition.fat / option.amount) * neededAmount,
        },
      };

      result.push(scaledOption);
      currentNutrition.calories += scaledOption.nutrition.calories;
      currentNutrition.protein += scaledOption.nutrition.protein;
      currentNutrition.carbs += scaledOption.nutrition.carbs;
      currentNutrition.fat += scaledOption.nutrition.fat;
    }

    return result;
  }

  /**
   * 多样性优先优化
   */
  private async varietyFirstOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints,
  ): Promise<FoodOption[]> {
    // 确保每个食物类别都有代表
    const categories = [
      ...new Set(
        [...originalFoods, ...substitutes].map((f) => f.food.category),
      ),
    ];
    const result: FoodOption[] = [];

    for (const category of categories) {
      const categoryOptions = [...originalFoods, ...substitutes]
        .filter((f) => f.food.category === category)
        .sort((a, b) => a.cost - b.cost);

      if (categoryOptions.length > 0) {
        result.push(categoryOptions[0]); // 选择最便宜的
      }
    }

    return result;
  }

  /**
   * 计算成本得分
   */
  private calculateCostScore(
    foods: FoodOption[],
    constraints: OptimizationConstraints,
  ): number {
    const totalCost = foods.reduce((sum, food) => sum + food.cost, 0);

    if (constraints.maxCost) {
      return Math.max(0, 1 - totalCost / constraints.maxCost);
    }

    // 相对成本得分（越低越好）
    const avgCost =
      foods.reduce((sum, food) => sum + food.cost, 0) / foods.length;
    return Math.max(0, 1 - avgCost / 50); // 假设50元为基准
  }

  /**
   * 计算营养得分
   */
  private calculateNutritionScore(
    foods: FoodOption[],
    constraints: OptimizationConstraints,
  ): number {
    const nutrition = this.calculateTotalNutrition(foods);
    const targets = constraints.nutritionTargets;

    const calorieScore = Math.min(1, nutrition.calories / targets.calories);
    const proteinScore = Math.min(1, nutrition.protein / targets.protein);
    const carbsScore = Math.min(1, nutrition.carbs / targets.carbs);
    const fatScore = Math.min(1, nutrition.fat / targets.fat);

    return (calorieScore + proteinScore + carbsScore + fatScore) / 4;
  }

  /**
   * 计算多样性得分
   */
  private calculateVarietyScore(foods: FoodOption[]): number {
    const categories = new Set(foods.map((f) => f.food.category));
    const idealVariety = 5; // 理想的食物类别数量
    return Math.min(1, categories.size / idealVariety);
  }

  /**
   * 获取平台价格比较
   */
  async getPlatformPriceComparison(foodId: string): Promise<{
    food: Food;
    prices: Array<{
      platform: string;
      price: number;
      unitPrice: number;
      unit: string;
      recordedAt: Date;
    }>;
    bestPrice: {
      platform: string;
      unitPrice: number;
      savings: number;
    };
  }> {
    const food = await prisma.food.findUnique({
      where: { id: foodId },
      include: {
        priceHistories: {
          where: { isValid: true },
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!food) {
      throw new Error('食物不存在');
    }

    // 按平台分组价格
    const platformPrices: Record<string, PriceHistory> = {};

    for (const price of food.priceHistories) {
      if (
        !platformPrices[price.platform] ||
        price.recordedAt > platformPrices[price.platform].recordedAt
      ) {
        platformPrices[price.platform] = price;
      }
    }

    const prices = Object.values(platformPrices).map((price: PriceHistory) => ({
      platform: price.platform,
      price: price.price,
      unitPrice: price.unitPrice,
      unit: price.unit,
      recordedAt: price.recordedAt,
    }));

    // 找出最优价格
    const sortedPrices = prices.sort((a, b) => a.unitPrice - b.unitPrice);
    const bestPrice = sortedPrices[0];

    if (sortedPrices.length > 1) {
      const avgPrice =
        sortedPrices.reduce((sum, p) => sum + p.unitPrice, 0) /
        sortedPrices.length;
      bestPrice.savings = ((avgPrice - bestPrice.unitPrice) / avgPrice) * 100;
    } else {
      bestPrice.savings = 0;
    }

    return {
      food,
      prices,
      bestPrice,
    };
  }
}

export const costOptimizer = new CostOptimizer();
