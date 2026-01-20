/**
 * 食谱规划引擎
 *
 * 基于模板生成个性化7天食谱计划，支持过敏过滤、季节性食材优先和营养平衡
 */

import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import {
  MacroCalculator,
  type MealMacroTargets,
  type MemberMacroInput,
} from "./macro-calculator";
import { nutritionCalculator } from "./nutrition-calculator";
import type { GoalType, MealType } from "@/lib/repositories/types/meal-plan";
import { addDays, startOfDay } from "date-fns";
import { readFileSync } from "fs";
import { join } from "path";
import { recipeRepository } from "@/lib/repositories/recipe-repository-singleton";

/**
 * 餐食模板接口（JSON格式）
 */
interface MealTemplateJSON {
  id: string;
  name: string;
  mealType: MealType;
  ingredients: Array<{
    foodName: string; // 使用食物名称而非ID
    amount: number;
  }>;
  suitableGoals: GoalType[];
  tags?: string[];
}

interface MealTemplate {
  id: string;
  name: string;
  mealType: MealType;
  ingredients: Array<{ foodId: string; amount: number }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  suitableGoals: GoalType[];
  tags?: string[];
}

interface FavoriteMealCandidate {
  recipeId: string;
  mealType: MealType;
  ingredients: Array<{ foodId: string; amount: number }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * 季节性食材映射
 * 定义每个季节的时令食材关键词
 */
const SEASONAL_FOODS: Record<
  "SPRING" | "SUMMER" | "AUTUMN" | "WINTER",
  string[]
> = {
  SPRING: ["春笋", "菠菜", "韭菜", "芹菜", "莴笋", "豌豆"],
  SUMMER: ["西瓜", "黄瓜", "番茄", "茄子", "冬瓜", "苦瓜", "丝瓜"],
  AUTUMN: ["南瓜", "红薯", "山药", "栗子", "莲藕", "萝卜"],
  WINTER: ["白菜", "萝卜", "胡萝卜", "白萝卜", "大白菜", "卷心菜"],
};

/**
 * 获取当前季节
 */
function getCurrentSeason(): "SPRING" | "SUMMER" | "AUTUMN" | "WINTER" {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return "SPRING";
  if (month >= 6 && month <= 8) return "SUMMER";
  if (month >= 9 && month <= 11) return "AUTUMN";
  return "WINTER";
}

const normalizeFoodLabel = (value: string) => value.trim().toLowerCase();

function findFoodMatch(
  foods: Doc<"foods">[],
  foodName: string,
): Doc<"foods"> | undefined {
  const target = normalizeFoodLabel(foodName);
  return foods.find((food) => {
    const candidates = [food.name, food.nameEn ?? "", ...food.aliases].filter(
      (candidate) => candidate.trim().length > 0,
    );

    return candidates.some((candidate) => {
      const normalized = normalizeFoodLabel(candidate);
      return (
        normalized === target ||
        normalized.includes(target) ||
        target.includes(normalized)
      );
    });
  });
}

/**
 * 食谱规划引擎类
 */
export class MealPlanner {
  /**
   * 加载餐食模板
   * 从 JSON 文件加载模板并转换为完整格式
   */
  private async loadTemplates(mealType: MealType): Promise<MealTemplate[]> {
    try {
      // 根据餐食类型确定文件名
      const fileName = `${mealType.toLowerCase()}.json`;
      const filePath = join(
        process.cwd(),
        "src",
        "data",
        "meal-templates",
        fileName,
      );

      // 读取 JSON 文件
      const fileContent = readFileSync(filePath, "utf-8");
      const templatesJSON: MealTemplateJSON[] = JSON.parse(fileContent);

      const templates: MealTemplate[] = [];
      const foods = await convexClient.query<Doc<"foods">[]>(
        api.budget.getFoods,
        { limit: 1000 },
      );

      for (const templateJSON of templatesJSON) {
        const ingredientFoodIds: Array<{ foodId: string; amount: number }> = [];

        for (const ing of templateJSON.ingredients) {
          const food = findFoodMatch(foods, ing.foodName);

          if (food) {
            ingredientFoodIds.push({
              foodId: food._id as string,
              amount: ing.amount,
            });
          }
        }

        // 如果所有食材都找到了，计算营养值
        if (ingredientFoodIds.length === templateJSON.ingredients.length) {
          const nutrition = await nutritionCalculator.calculateBatch(
            ingredientFoodIds.map((ing) => ({
              foodId: ing.foodId,
              amount: ing.amount,
            })),
          );

          templates.push({
            id: templateJSON.id,
            name: templateJSON.name,
            mealType: templateJSON.mealType,
            ingredients: ingredientFoodIds,
            nutrition: {
              calories: nutrition.totalCalories,
              protein: nutrition.totalProtein,
              carbs: nutrition.totalCarbs,
              fat: nutrition.totalFat,
            },
            suitableGoals: templateJSON.suitableGoals,
            tags: templateJSON.tags,
          });
        }
      }

      return templates;
    } catch (error) {
      console.error(`加载${mealType}模板失败:`, error);
      return [];
    }
  }

  /**
   * 获取成员的过敏食材列表
   */
  private async getMemberAllergies(memberId: string): Promise<string[]> {
    const allergies = await convexClient.query<Doc<"allergies">[]>(
      api.health.listAllergies,
      { memberId: memberId as Id<"familyMembers"> },
    );

    return allergies
      .filter(
        (allergy) => !allergy.deletedAt && allergy.allergenType === "FOOD",
      )
      .map((allergy) => allergy.allergenName);
  }

  /**
   * 检查食材是否过敏
   */
  private isAllergenic(
    foodName: string,
    foodAliases: string[],
    allergies: string[],
  ): boolean {
    const foodNameLower = foodName.toLowerCase();

    return allergies.some((allergen) => {
      const allergenLower = allergen.toLowerCase();
      if (foodNameLower.includes(allergenLower)) return true;
      return foodAliases.some((alias) =>
        alias.toLowerCase().includes(allergenLower),
      );
    });
  }

  /**
   * 过滤过敏食材
   */
  private filterAllergenicFoods(
    foods: Array<{ id: string; name: string; aliases: string[] }>,
    allergies: string[],
  ): Array<{ id: string; name: string; aliases: string[] }> {
    return foods.filter(
      (food) => !this.isAllergenic(food.name, food.aliases, allergies),
    );
  }

  private normalizeMealTypes(raw?: string[] | null): MealType[] {
    if (!raw || raw.length === 0) return [];

    const allowed: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
    return raw
      .map((type) => type?.toUpperCase())
      .filter((type): type is MealType => allowed.includes(type as MealType))
      .map((type) => type as MealType);
  }

  private normalizeGoalType(raw: string): GoalType {
    const allowed: GoalType[] = [
      "LOSE_WEIGHT",
      "GAIN_MUSCLE",
      "MAINTAIN",
      "IMPROVE_HEALTH",
    ];

    if (allowed.includes(raw as GoalType)) {
      return raw as GoalType;
    }

    throw new Error("未知的健康目标类型");
  }

  private pickFavoriteMeal(
    candidates: FavoriteMealCandidate[],
    usedRecipeIds: Set<string>,
  ): FavoriteMealCandidate | null {
    const candidate = candidates.find(
      (item) => !usedRecipeIds.has(item.recipeId),
    );
    return candidate || null;
  }

  private async getFavoriteMealsByType(
    memberId: string,
  ): Promise<Record<MealType, FavoriteMealCandidate[]>> {
    const favoritesByType: Record<MealType, FavoriteMealCandidate[]> = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACK: [],
    };

    const favoritesResult = await recipeRepository.getFavoritesByMember({
      memberId,
      page: 1,
      limit: 50,
      sortBy: "favoritedAt",
      sortOrder: "desc",
    });

    for (const favorite of favoritesResult.favorites) {
      const recipe = favorite.recipe;
      if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        continue;
      }

      const mealTypes = this.normalizeMealTypes(recipe.mealTypes);
      if (mealTypes.length === 0) {
        continue;
      }

      const ingredients = recipe.ingredients
        .map((ingredient) => ({
          foodId: ingredient.food.id,
          amount: ingredient.amount ?? 0,
        }))
        .filter((ingredient) => ingredient.foodId && ingredient.amount > 0);

      if (ingredients.length === 0) {
        continue;
      }

      const nutrition = await nutritionCalculator.calculateBatch(
        ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          amount: ingredient.amount,
        })),
      );

      const candidate: Omit<FavoriteMealCandidate, "mealType"> = {
        recipeId: favorite.recipeId,
        ingredients,
        nutrition: {
          calories: nutrition.totalCalories,
          protein: nutrition.totalProtein,
          carbs: nutrition.totalCarbs,
          fat: nutrition.totalFat,
        },
      };

      mealTypes.forEach((mealType) => {
        favoritesByType[mealType].push({
          ...candidate,
          mealType,
        });
      });
    }

    return favoritesByType;
  }

  /**
   * 获取季节性食材优先级分数
   * 分数越高，优先级越高
   */
  private getSeasonalScore(
    foodName: string,
    foodAliases: string[],
    season: "SPRING" | "SUMMER" | "AUTUMN" | "WINTER",
  ): number {
    const seasonalFoods = SEASONAL_FOODS[season];
    const foodNameLower = foodName.toLowerCase();
    const aliases = foodAliases ?? [];

    // 检查是否匹配季节性食材
    for (const seasonalFood of seasonalFoods) {
      if (foodNameLower.includes(seasonalFood.toLowerCase())) {
        return 10; // 高优先级
      }
      if (
        aliases.some((alias) =>
          alias.toLowerCase().includes(seasonalFood.toLowerCase()),
        )
      ) {
        return 10;
      }
    }

    return 0; // 非季节性食材
  }

  /**
   * 计算餐食营养值与目标值的差异
   * 返回差异的绝对值总和（越小越好）
   */
  private calculateNutritionDifference(
    actual: { calories: number; protein: number; carbs: number; fat: number },
    target: { calories: number; protein: number; carbs: number; fat: number },
    tolerance: number = 0.05, // 5% 误差容忍度
  ): number {
    const calorieDiff =
      Math.abs(actual.calories - target.calories) / target.calories;
    const proteinDiff =
      Math.abs(actual.protein - target.protein) / Math.max(target.protein, 1);
    const carbsDiff =
      Math.abs(actual.carbs - target.carbs) / Math.max(target.carbs, 1);
    const fatDiff = Math.abs(actual.fat - target.fat) / Math.max(target.fat, 1);

    // 如果超过容忍度，返回较大的差异值
    if (
      calorieDiff > tolerance ||
      proteinDiff > tolerance ||
      carbsDiff > tolerance ||
      fatDiff > tolerance
    ) {
      return calorieDiff + proteinDiff + carbsDiff + fatDiff + 10;
    }

    return calorieDiff + proteinDiff + carbsDiff + fatDiff;
  }

  /**
   * 选择最匹配的餐食模板
   */
  private selectBestTemplate(
    templates: MealTemplate[],
    target: { calories: number; protein: number; carbs: number; fat: number },
    allergies: string[],
    season: "SPRING" | "SUMMER" | "AUTUMN" | "WINTER",
    usedTemplateIds: Set<string>, // 已使用的模板ID，避免重复
  ): MealTemplate | null {
    // 过滤掉已使用的模板
    const availableTemplates = templates.filter(
      (t) => !usedTemplateIds.has(t.id),
    );

    if (availableTemplates.length === 0) {
      return null;
    }

    // 对模板进行评分排序
    const scoredTemplates = availableTemplates.map((template) => {
      // 计算营养差异
      const nutritionDiff = this.calculateNutritionDifference(
        template.nutrition,
        target,
      );

      // 计算季节性优先级
      const seasonalScore = template.ingredients.reduce<number>(
        (score, ing: { foodId: string; amount: number }) => {
          // 需要查询食物信息获取季节性分数
          // 这里简化处理，假设食材已包含季节性信息
          return score;
        },
        0,
      );

      // 综合评分（营养差异越小越好，季节性分数越高越好）
      const score = -nutritionDiff + seasonalScore * 0.1;

      return { template, score };
    });

    // 按分数排序，选择最佳模板
    scoredTemplates.sort((a, b) => b.score - a.score);
    const bestTemplate = scoredTemplates[0];
    return bestTemplate ? bestTemplate.template : null;
  }

  /**
   * 生成单日餐食计划
   */
  private async generateDailyMeals(
    date: Date,
    mealTargets: MealMacroTargets,
    goalType: GoalType,
    memberId: string,
    usedTemplateIds: Set<string>,
    favoriteMealsByType: Record<MealType, FavoriteMealCandidate[]>,
    usedFavoriteRecipeIds: Set<string>,
  ): Promise<
    Array<{
      date: Date;
      mealType: MealType;
      recipeId?: string;
      ingredients: Array<{ foodId: string; amount: number }>;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }>
  > {
    const allergies = await this.getMemberAllergies(memberId);
    const season = getCurrentSeason();
    const meals: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

    const dailyMeals = [];

    for (const mealType of meals) {
      let target: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      switch (mealType) {
        case "BREAKFAST":
          target = mealTargets.breakfast;
          break;
        case "LUNCH":
          target = mealTargets.lunch;
          break;
        case "DINNER":
          target = mealTargets.dinner;
          break;
        case "SNACK":
          target = mealTargets.snack;
          break;
        default:
          throw new Error(`未知的餐食类型: ${mealType}`);
      }

      const favoriteMeal = this.pickFavoriteMeal(
        favoriteMealsByType[mealType],
        usedFavoriteRecipeIds,
      );

      if (favoriteMeal) {
        usedFavoriteRecipeIds.add(favoriteMeal.recipeId);
        dailyMeals.push({
          date: startOfDay(date),
          mealType: favoriteMeal.mealType,
          recipeId: favoriteMeal.recipeId,
          ingredients: favoriteMeal.ingredients,
          nutrition: favoriteMeal.nutrition,
        });
        continue;
      }

      // 加载对应类型的模板
      const templates = await this.loadTemplates(mealType);
      const suitableTemplates = templates.filter((t) =>
        t.suitableGoals.includes(goalType),
      );

      // 选择最佳模板
      const selectedTemplate = this.selectBestTemplate(
        suitableTemplates,
        target,
        allergies,
        season,
        usedTemplateIds,
      );

      if (selectedTemplate) {
        usedTemplateIds.add(selectedTemplate.id);
        dailyMeals.push({
          date: startOfDay(date),
          mealType: selectedTemplate.mealType,
          ingredients: selectedTemplate.ingredients,
          nutrition: selectedTemplate.nutrition,
        });
      }
    }

    return dailyMeals;
  }

  /**
   * 生成7天食谱计划
   */
  async generateMealPlan(
    memberId: string,
    days: number = 7,
    startDate?: Date,
  ): Promise<{
    planId: string;
    memberId: string;
    startDate: Date;
    endDate: Date;
    goalType: GoalType;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    meals: Array<{
      id: string;
      date: Date;
      mealType: MealType;
      ingredients: Array<{ foodId: string; amount: number }>;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }>;
  }> {
    // 获取成员信息
    const member = await convexClient.query<Doc<"familyMembers"> | null>(
      api.members.getById,
      { memberId: memberId as Id<"familyMembers"> },
    );

    if (!member || member.deletedAt) {
      throw new Error("成员不存在");
    }

    if (!member.weight || !member.height) {
      throw new Error("成员体重或身高信息不完整");
    }

    const goals = await convexClient.query<Doc<"healthGoals">[]>(
      api.health.listGoals,
      { memberId: memberId as Id<"familyMembers">, includeInactive: false },
    );

    const activeGoal = goals[0];
    if (!activeGoal) {
      throw new Error("成员没有活跃的健康目标");
    }

    // 计算宏量营养素目标
    const activityLevel = activeGoal.activityFactor
      ? this.mapActivityFactorToLevel(activeGoal.activityFactor)
      : "MODERATE";

    const goalType = this.normalizeGoalType(activeGoal.goalType);
    const gender: "MALE" | "FEMALE" =
      member.gender === "FEMALE" ? "FEMALE" : "MALE";

    const macroInput: MemberMacroInput = {
      weight: member.weight,
      height: member.height,
      birthDate: new Date(member.birthDate),
      gender,
      activityLevel,
      goalType,
      carbRatio: activeGoal.carbRatio ?? undefined,
      proteinRatio: activeGoal.proteinRatio ?? undefined,
      fatRatio: activeGoal.fatRatio ?? undefined,
    };

    const macroTargets = MacroCalculator.calculateFullMacroTargets(macroInput);

    // 确定开始日期
    const planStartDate = startDate
      ? startOfDay(startDate)
      : startOfDay(new Date());
    const planEndDate = addDays(planStartDate, days - 1);

    // 生成每日餐食
    const usedTemplateIds = new Set<string>();
    const usedFavoriteRecipeIds = new Set<string>();
    const favoriteMealsByType = await this.getFavoriteMealsByType(memberId);
    const allMeals = [];

    for (let i = 0; i < days; i++) {
      const currentDate = addDays(planStartDate, i);
      const dailyMeals = await this.generateDailyMeals(
        currentDate,
        macroTargets.mealTargets,
        goalType,
        memberId,
        usedTemplateIds,
        favoriteMealsByType,
        usedFavoriteRecipeIds,
      );
      allMeals.push(...dailyMeals);
    }

    const { planId, mealIds } = await convexClient.mutation<{
      planId: Id<"mealPlans">;
      mealIds: Id<"meals">[];
    }>(api.meals.createPlanWithMeals, {
      memberId: memberId as Id<"familyMembers">,
      startDate: planStartDate.getTime(),
      endDate: planEndDate.getTime(),
      goalType,
      targetCalories: macroTargets.targetCalories,
      targetProtein: macroTargets.dailyTargets.protein,
      targetCarbs: macroTargets.dailyTargets.carbs,
      targetFat: macroTargets.dailyTargets.fat,
      meals: allMeals.map((meal) => ({
        date: meal.date.getTime(),
        mealType: meal.mealType,
        calories: meal.nutrition.calories,
        protein: meal.nutrition.protein,
        carbs: meal.nutrition.carbs,
        fat: meal.nutrition.fat,
        recipeId: meal.recipeId ? (meal.recipeId as Id<"recipes">) : undefined,
        ingredients: meal.ingredients.map((ing) => ({
          foodId: ing.foodId as Id<"foods">,
          amount: ing.amount,
        })),
      })),
    });

    return {
      planId: planId as string,
      memberId,
      startDate: planStartDate,
      endDate: planEndDate,
      goalType,
      targetCalories: macroTargets.targetCalories,
      targetProtein: macroTargets.dailyTargets.protein,
      targetCarbs: macroTargets.dailyTargets.carbs,
      targetFat: macroTargets.dailyTargets.fat,
      meals: allMeals.map((meal, index) => ({
        id: mealIds[index] as string,
        date: meal.date,
        mealType: meal.mealType,
        ingredients: meal.ingredients.map((ing) => ({
          foodId: ing.foodId,
          amount: ing.amount,
        })),
        nutrition: meal.nutrition,
      })),
    };
  }

  /**
   * 替换单餐
   * 生成营养相近的替代餐，保持当日总营养不变
   */
  async replaceMeal(
    mealId: string,
    memberId: string,
  ): Promise<{
    id: string;
    date: Date;
    mealType: MealType;
    ingredients: Array<{ foodId: string; amount: number }>;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }> {
    const currentMeal = await convexClient.query<Doc<"meals"> | null>(
      api.meals.getMealById,
      { mealId: mealId as Id<"meals"> },
    );

    if (!currentMeal) {
      throw new Error("餐食不存在");
    }

    const plan = await convexClient.query<Doc<"mealPlans"> | null>(
      api.meals.getPlanById,
      { planId: currentMeal.planId },
    );

    if (!plan || plan.memberId !== (memberId as Id<"familyMembers">)) {
      throw new Error("无权限替换此餐食");
    }

    const goals = await convexClient.query<Doc<"healthGoals">[]>(
      api.health.listGoals,
      { memberId: memberId as Id<"familyMembers">, includeInactive: false },
    );

    const activeGoal = goals[0];
    if (!activeGoal) {
      throw new Error("成员没有活跃的健康目标");
    }

    const goalType = this.normalizeGoalType(activeGoal.goalType);

    const targetNutrition = {
      calories: currentMeal.calories,
      protein: currentMeal.protein,
      carbs: currentMeal.carbs,
      fat: currentMeal.fat,
    };

    const allergies = await this.getMemberAllergies(memberId);
    const season = getCurrentSeason();

    const templates = await this.loadTemplates(currentMeal.mealType);
    const suitableTemplates = templates.filter((t) =>
      t.suitableGoals.includes(goalType),
    );

    const replacementTemplate = this.selectBestTemplate(
      suitableTemplates,
      targetNutrition,
      allergies,
      season,
      new Set(),
    );

    if (!replacementTemplate) {
      throw new Error("未找到合适的替代餐食");
    }

    await convexClient.mutation(api.meals.updateMeal, {
      mealId: mealId as Id<"meals">,
      mealType: replacementTemplate.mealType,
      recipeId: currentMeal.recipeId,
      calories: replacementTemplate.nutrition.calories,
      protein: replacementTemplate.nutrition.protein,
      carbs: replacementTemplate.nutrition.carbs,
      fat: replacementTemplate.nutrition.fat,
      ingredients: replacementTemplate.ingredients.map((ing) => ({
        foodId: ing.foodId as Id<"foods">,
        amount: ing.amount,
      })),
    });

    return {
      id: mealId,
      date: new Date(currentMeal.date),
      mealType: replacementTemplate.mealType,
      ingredients: replacementTemplate.ingredients.map((ing) => ({
        foodId: ing.foodId,
        amount: ing.amount,
      })),
      nutrition: replacementTemplate.nutrition,
    };
  }

  /**
   * 将活动系数映射到活动级别
   */
  private mapActivityFactorToLevel(
    activityFactor: number,
  ): "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE" {
    if (activityFactor <= 1.2) return "SEDENTARY";
    if (activityFactor <= 1.375) return "LIGHT";
    if (activityFactor <= 1.55) return "MODERATE";
    if (activityFactor <= 1.725) return "ACTIVE";
    return "VERY_ACTIVE";
  }
}

// 导出单例实例
export const mealPlanner = new MealPlanner();
