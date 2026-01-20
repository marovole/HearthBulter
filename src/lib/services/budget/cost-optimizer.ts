import { api } from "../../convex-client";
import { convexClient } from "../../convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";

export interface NutritionTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodOption {
  food: {
    id: string;
    name: string;
    category: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  amount: number;
  cost: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  unitPrice: number;
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
  allowedCategories?: string[];
  excludedFoodIds?: string[];
  preferSeasonal?: boolean;
  economyMode?: boolean;
}

export class CostOptimizer {
  async optimizeShoppingList(
    foodIds: string[],
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const originalFoods = await this.getFoodOptions(foodIds);

    const originalCost = originalFoods.reduce((sum, food) => sum + food.cost, 0);
    const originalNutrition = this.calculateTotalNutrition(originalFoods);

    const substituteOptions = await this.findSubstituteOptions(originalFoods, constraints);

    const optimizedFoods = await this.runOptimization(
      originalFoods,
      substituteOptions,
      constraints
    );

    const optimizedCost = optimizedFoods.reduce((sum, food) => sum + food.cost, 0);
    const optimizedNutrition = this.calculateTotalNutrition(optimizedFoods);

    const substitutions = this.generateSubstitutions(originalFoods, optimizedFoods);

    const savings = originalCost - optimizedCost;
    const savingsPercentage = originalCost > 0 ? (savings / originalCost) * 100 : 0;

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
          constraints.nutritionTargets
        ),
      },
    };
  }

  async getFoodOptionsForOptimization(foodIds: string[]): Promise<FoodOption[]> {
    return this.getFoodOptions(foodIds);
  }

  async findSubstituteOptionsForOptimization(
    originalFoods: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[]> {
    return this.findSubstituteOptions(originalFoods, constraints);
  }

  private async getFoodOptions(foodIds: string[]): Promise<FoodOption[]> {
    const options: FoodOption[] = [];

    for (const foodId of foodIds) {
      const food = (await convexClient.query(api.budget.getFoodById, {
        foodId: foodId as Id<"foods">,
      })) as Doc<"foods"> | null;

      if (!food) continue;

      const latestPrice = (await convexClient.query(api.budget.getLatestPrice, {
        foodId: foodId as Id<"foods">,
      })) as Doc<"priceHistories"> | null;
      if (!latestPrice) continue;

      const amount = 100;
      const cost = (latestPrice.unitPrice * amount) / 1000;

      options.push({
        food: {
          id: food._id,
          name: food.name,
          category: food.category,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        },
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

  private async findSubstituteOptions(
    originalFoods: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[]> {
    const substitutes: FoodOption[] = [];

    for (const original of originalFoods) {
      const similarFoods = (await convexClient.query(api.budget.getFoodsByCategory, {
        category: original.food.category,
        excludeIds: [original.food.id as Id<"foods">],
        limit: 10,
      })) as Doc<"foods">[];

      for (const food of similarFoods) {
        const latestPrice = (await convexClient.query(api.budget.getLatestPrice, {
          foodId: food._id,
        })) as Doc<"priceHistories"> | null;

        if (!latestPrice) continue;

        if (latestPrice.unitPrice >= original.unitPrice) continue;

        const amount = 100;
        const cost = (latestPrice.unitPrice * amount) / 1000;

        substitutes.push({
          food: {
            id: food._id,
            name: food.name,
            category: food.category,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
          },
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

    return substitutes.sort((a, b) => a.cost - b.cost);
  }

  private async runOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[]> {
    if (constraints.economyMode) {
      return this.economyModeOptimization(originalFoods, substitutes, constraints);
    } else {
      return this.balancedOptimization(originalFoods, substitutes, constraints);
    }
  }

  private economyModeOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[]> {
    const result: FoodOption[] = [];
    const targetNutrition = constraints.nutritionTargets;

    const sortedOptions = [...originalFoods, ...substitutes].sort(
      (a, b) => a.cost / a.nutrition.calories - b.cost / b.nutrition.calories
    );

    const currentNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    let currentCost = 0;

    for (const option of sortedOptions) {
      if (currentNutrition.calories >= targetNutrition.calories) break;

      const remainingCalories = targetNutrition.calories - currentNutrition.calories;
      const neededAmount = Math.min(
        (remainingCalories / option.nutrition.calories) * option.amount,
        option.amount * 2
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

      if (constraints.maxCost && currentCost > constraints.maxCost) {
        break;
      }
    }

    return Promise.resolve(result);
  }

  private balancedOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[]> {
    const result = [...originalFoods];

    for (let i = 0; i < result.length; i++) {
      const original = result[i];
      if (!original) continue;

      const cheaperSubstitutes = substitutes.filter(
        (s) => s.food.category === original.food.category && s.cost < original.cost
      );
      const bestSubstitute = cheaperSubstitutes[0];
      if (!bestSubstitute) continue;

      const nutritionSimilarity = this.calculateNutritionSimilarity(original, bestSubstitute);

      if (nutritionSimilarity > 0.7) {
        result[i] = bestSubstitute;
      }
    }

    return Promise.resolve(result);
  }

  private calculateNutritionSimilarity(food1: FoodOption, food2: FoodOption): number {
    const normalizeNutrition = (nutrition: any) => {
      const total = nutrition.calories + nutrition.protein + nutrition.carbs + nutrition.fat;
      return {
        calories: nutrition.calories / total,
        protein: nutrition.protein / total,
        carbs: nutrition.carbs / total,
        fat: nutrition.fat / total,
      };
    };

    const norm1 = normalizeNutrition(food1.nutrition);
    const norm2 = normalizeNutrition(food2.nutrition);

    const distance = Math.sqrt(
      Math.pow(norm1.calories - norm2.calories, 2) +
        Math.pow(norm1.protein - norm2.protein, 2) +
        Math.pow(norm1.carbs - norm2.carbs, 2) +
        Math.pow(norm1.fat - norm2.fat, 2)
    );

    return 1 - distance;
  }

  private calculateTotalNutrition(foods: FoodOption[]): NutritionTarget {
    return foods.reduce(
      (total, food) => ({
        calories: total.calories + food.nutrition.calories,
        protein: total.protein + food.nutrition.protein,
        carbs: total.carbs + food.nutrition.carbs,
        fat: total.fat + food.nutrition.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  private meetsNutritionRequirements(actual: NutritionTarget, targets: NutritionTarget): boolean {
    const tolerance = 0.1;

    return (
      actual.calories >= targets.calories * (1 - tolerance) &&
      actual.protein >= targets.protein * (1 - tolerance) &&
      actual.carbs >= targets.carbs * (1 - tolerance) &&
      actual.fat >= targets.fat * (1 - tolerance)
    );
  }

  private generateSubstitutions(
    original: FoodOption[],
    optimized: FoodOption[]
  ): Array<{
    original: FoodOption;
    substitute: FoodOption;
    savings: number;
    reason: string;
  }> {
    const substitutions: any[] = [];

    for (const origFood of original) {
      const replacement = optimized.find(
        (opt) => opt.food.category === origFood.food.category && opt.food.id !== origFood.food.id
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

  async multiObjectiveOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<OptimizationResult> {
    const weights = {
      cost: constraints.economyMode ? 0.6 : 0.4,
      nutrition: 0.3,
      variety: 0.3,
    };

    const candidates = await this.generateCandidateSolutions(
      originalFoods,
      substitutes,
      constraints
    );

    const scoredCandidates = candidates.map((candidate) => {
      const costScore = this.calculateCostScore(candidate, constraints);
      const nutritionScore = this.calculateNutritionScore(candidate, constraints);
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

    const bestSolution = scoredCandidates.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best
    );

    const originalCost = originalFoods.reduce((sum, food) => sum + food.cost, 0);
    const originalNutrition = this.calculateTotalNutrition(originalFoods);
    const optimizedNutrition = this.calculateTotalNutrition(bestSolution.candidate);
    const optimizedCost = bestSolution.candidate.reduce((sum, food) => sum + food.cost, 0);

    return {
      originalCost,
      optimizedCost,
      savings: originalCost - optimizedCost,
      savingsPercentage:
        originalCost > 0 ? ((originalCost - optimizedCost) / originalCost) * 100 : 0,
      originalFoods,
      optimizedFoods: bestSolution.candidate,
      substitutions: this.generateSubstitutions(originalFoods, bestSolution.candidate),
      nutritionComparison: {
        original: originalNutrition,
        optimized: optimizedNutrition,
        meetsRequirements: this.meetsNutritionRequirements(
          optimizedNutrition,
          constraints.nutritionTargets
        ),
      },
    };
  }

  private async generateCandidateSolutions(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[][]> {
    const candidates: FoodOption[][] = [];

    candidates.push([...originalFoods]);

    candidates.push(await this.economyModeOptimization(originalFoods, substitutes, constraints));

    candidates.push(await this.balancedOptimization(originalFoods, substitutes, constraints));

    candidates.push(await this.nutritionFirstOptimization(originalFoods, substitutes, constraints));

    candidates.push(await this.varietyFirstOptimization(originalFoods, substitutes, constraints));

    return candidates.filter((candidate) => candidate.length > 0);
  }

  private async nutritionFirstOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[]> {
    const result: FoodOption[] = [];
    const targetNutrition = constraints.nutritionTargets;

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

  private async varietyFirstOptimization(
    originalFoods: FoodOption[],
    substitutes: FoodOption[],
    constraints: OptimizationConstraints
  ): Promise<FoodOption[]> {
    const categories = [...new Set([...originalFoods, ...substitutes].map((f) => f.food.category))];
    const result: FoodOption[] = [];

    for (const category of categories) {
      const categoryOptions = [...originalFoods, ...substitutes]
        .filter((f) => f.food.category === category)
        .sort((a, b) => a.cost - b.cost);

      const [cheapestOption] = categoryOptions;
      if (cheapestOption) {
        result.push(cheapestOption);
      }
    }

    return result;
  }

  private calculateCostScore(foods: FoodOption[], constraints: OptimizationConstraints): number {
    const totalCost = foods.reduce((sum, food) => sum + food.cost, 0);

    if (constraints.maxCost) {
      return Math.max(0, 1 - totalCost / constraints.maxCost);
    }

    const avgCost = foods.reduce((sum, food) => sum + food.cost, 0) / foods.length;
    return Math.max(0, 1 - avgCost / 50);
  }

  private calculateNutritionScore(
    foods: FoodOption[],
    constraints: OptimizationConstraints
  ): number {
    const nutrition = this.calculateTotalNutrition(foods);
    const targets = constraints.nutritionTargets;

    const calorieScore = Math.min(1, nutrition.calories / targets.calories);
    const proteinScore = Math.min(1, nutrition.protein / targets.protein);
    const carbsScore = Math.min(1, nutrition.carbs / targets.carbs);
    const fatScore = Math.min(1, nutrition.fat / targets.fat);

    return (calorieScore + proteinScore + carbsScore + fatScore) / 4;
  }

  private calculateVarietyScore(foods: FoodOption[]): number {
    const categories = new Set(foods.map((f) => f.food.category));
    const idealVariety = 5;
    return Math.min(1, categories.size / idealVariety);
  }

  async getPlatformPriceComparison(foodId: string): Promise<{
    food: { id: string; name: string; category: string };
    prices: Array<{
      platform: string;
      price: number;
      unitPrice: number;
      unit: string;
      recordedAt: number;
    }>;
    bestPrice: {
      platform: string;
      unitPrice: number;
      savings: number;
    };
  }> {
    const food = (await convexClient.query(api.budget.getFoodById, {
      foodId: foodId as Id<"foods">,
    })) as Doc<"foods"> | null;

    if (!food) {
      throw new Error("食物不存在");
    }

    const priceHistories = (await convexClient.query(api.budget.getPriceHistories, {
      foodId: foodId as Id<"foods">,
      isValid: true,
      limit: 20,
    })) as Doc<"priceHistories">[];

    const platformPrices: { [key: string]: any } = {};

    for (const price of priceHistories) {
      if (
        !platformPrices[price.platform] ||
        price.recordedAt > platformPrices[price.platform].recordedAt
      ) {
        platformPrices[price.platform] = price;
      }
    }

    const prices = Object.values(platformPrices).map((price: any) => ({
      platform: price.platform,
      price: price.price,
      unitPrice: price.unitPrice,
      unit: price.unit,
      recordedAt: price.recordedAt,
    }));

    if (prices.length === 0) {
      throw new Error("价格数据不足");
    }

    const sortedPrices = [...prices].sort((a, b) => a.unitPrice - b.unitPrice);
    const bestPrice = sortedPrices[0];
    if (!bestPrice) {
      throw new Error("价格数据不足");
    }

    const avgPrice = sortedPrices.reduce((sum, p) => sum + p.unitPrice, 0) / sortedPrices.length;
    const savings =
      sortedPrices.length > 1 ? ((avgPrice - bestPrice.unitPrice) / avgPrice) * 100 : 0;

    return {
      food: {
        id: food._id,
        name: food.name,
        category: food.category,
      },
      prices,
      bestPrice: {
        platform: bestPrice.platform,
        unitPrice: bestPrice.unitPrice,
        savings,
      },
    };
  }
}

export const costOptimizer = new CostOptimizer();
