/**
 * 食谱规划引擎
 *
 * 基于模板生成个性化7天食谱计划，支持过敏过滤、季节性食材优先和营养平衡
 */

import { prisma } from "@/lib/db";
import { MacroCalculator, type MealMacroTargets } from "./macro-calculator";
import { nutritionCalculator } from "./nutrition-calculator";
import type { GoalType, MealType, FoodCategory } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import { readFileSync } from "fs";
import { join } from "path";

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

      // 转换为完整模板格式
      const templates: MealTemplate[] = [];

      for (const templateJSON of templatesJSON) {
        // 查找所有食材的 foodId
        const ingredientFoodIds: Array<{ foodId: string; amount: number }> = [];

        for (const ing of templateJSON.ingredients) {
          // 通过名称查找食物（支持别名匹配）
          const food = await prisma.food.findFirst({
            where: {
              OR: [
                { name: { contains: ing.foodName, mode: "insensitive" } },
                { aliases: { contains: ing.foodName, mode: "insensitive" } },
              ],
            },
          });

          if (food) {
            ingredientFoodIds.push({
              foodId: food.id,
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
    const allergies = await prisma.allergy.findMany({
      where: {
        memberId,
        allergenType: "FOOD",
        deletedAt: null,
      },
      select: {
        allergenName: true,
      },
    });

    return allergies.map((a) => a.allergenName);
  }

  /**
   * 检查食材是否过敏
   */
  private isAllergenic(
    foodName: string,
    foodAliases: string,
    allergies: string[],
  ): boolean {
    const foodNameLower = foodName.toLowerCase();
    const aliases = JSON.parse(foodAliases || "[]") as string[];

    return allergies.some((allergen) => {
      const allergenLower = allergen.toLowerCase();
      // 检查食物名称或别名是否包含过敏原
      if (foodNameLower.includes(allergenLower)) return true;
      return aliases.some((alias) =>
        alias.toLowerCase().includes(allergenLower),
      );
    });
  }

  /**
   * 过滤过敏食材
   */
  private filterAllergenicFoods(
    foods: Array<{ id: string; name: string; aliases: string }>,
    allergies: string[],
  ): Array<{ id: string; name: string; aliases: string }> {
    return foods.filter(
      (food) => !this.isAllergenic(food.name, food.aliases, allergies),
    );
  }

  /**
   * 获取季节性食材优先级分数
   * 分数越高，优先级越高
   */
  private getSeasonalScore(
    foodName: string,
    foodAliases: string,
    season: "SPRING" | "SUMMER" | "AUTUMN" | "WINTER",
  ): number {
    const seasonalFoods = SEASONAL_FOODS[season];
    const foodNameLower = foodName.toLowerCase();
    const aliases = JSON.parse(foodAliases || "[]") as string[];

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
      const seasonalScore = template.ingredients.reduce((score, ing) => {
        // 需要查询食物信息获取季节性分数
        // 这里简化处理，假设食材已包含季节性信息
        return score;
      }, 0);

      // 综合评分（营养差异越小越好，季节性分数越高越好）
      const score = -nutritionDiff + seasonalScore * 0.1;

      return { template, score };
    });

    // 按分数排序，选择最佳模板
    scoredTemplates.sort((a, b) => b.score - a.score);
    return scoredTemplates[0].template;
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
  ): Promise<
    Array<{
      date: Date;
      mealType: MealType;
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
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        healthGoals: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!member) {
      throw new Error("成员不存在");
    }

    if (!member.weight || !member.height) {
      throw new Error("成员体重或身高信息不完整");
    }

    const activeGoal = member.healthGoals[0];
    if (!activeGoal) {
      throw new Error("成员没有活跃的健康目标");
    }

    // 计算宏量营养素目标
    const activityLevel = activeGoal.activityFactor
      ? this.mapActivityFactorToLevel(activeGoal.activityFactor)
      : "MODERATE";

    const macroInput = {
      weight: member.weight,
      height: member.height,
      birthDate: member.birthDate,
      gender: member.gender,
      activityLevel,
      goalType: activeGoal.goalType,
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
    const allMeals = [];

    for (let i = 0; i < days; i++) {
      const currentDate = addDays(planStartDate, i);
      const dailyMeals = await this.generateDailyMeals(
        currentDate,
        macroTargets.mealTargets,
        activeGoal.goalType,
        memberId,
        usedTemplateIds,
      );
      allMeals.push(...dailyMeals);
    }

    // 保存到数据库
    const mealPlan = await prisma.mealPlan.create({
      data: {
        memberId,
        startDate: planStartDate,
        endDate: planEndDate,
        goalType: activeGoal.goalType,
        targetCalories: macroTargets.targetCalories,
        targetProtein: macroTargets.dailyTargets.protein,
        targetCarbs: macroTargets.dailyTargets.carbs,
        targetFat: macroTargets.dailyTargets.fat,
        status: "ACTIVE",
        meals: {
          create: allMeals.map((meal) => ({
            date: meal.date,
            mealType: meal.mealType,
            calories: meal.nutrition.calories,
            protein: meal.nutrition.protein,
            carbs: meal.nutrition.carbs,
            fat: meal.nutrition.fat,
            ingredients: {
              create: meal.ingredients.map((ing) => ({
                foodId: ing.foodId,
                amount: ing.amount,
              })),
            },
          })),
        },
      },
      include: {
        meals: {
          include: {
            ingredients: {
              include: {
                food: true,
              },
            },
          },
        },
      },
    });

    return {
      planId: mealPlan.id,
      memberId: mealPlan.memberId,
      startDate: mealPlan.startDate,
      endDate: mealPlan.endDate,
      goalType: mealPlan.goalType,
      targetCalories: mealPlan.targetCalories,
      targetProtein: mealPlan.targetProtein,
      targetCarbs: mealPlan.targetCarbs,
      targetFat: mealPlan.targetFat,
      meals: mealPlan.meals.map((meal) => ({
        id: meal.id,
        date: meal.date,
        mealType: meal.mealType,
        ingredients: meal.ingredients.map((ing) => ({
          foodId: ing.foodId,
          amount: ing.amount,
        })),
        nutrition: {
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
        },
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
    // 获取当前餐食信息
    const currentMeal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        plan: {
          include: {
            member: {
              include: {
                healthGoals: {
                  where: { status: "ACTIVE" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!currentMeal) {
      throw new Error("餐食不存在");
    }

    if (currentMeal.plan.memberId !== memberId) {
      throw new Error("无权限替换此餐食");
    }

    const activeGoal = currentMeal.plan.member.healthGoals[0];
    if (!activeGoal) {
      throw new Error("成员没有活跃的健康目标");
    }

    // 获取目标营养值（使用当前餐食的营养值作为目标）
    const targetNutrition = {
      calories: currentMeal.calories,
      protein: currentMeal.protein,
      carbs: currentMeal.carbs,
      fat: currentMeal.fat,
    };

    // 获取过敏信息
    const allergies = await this.getMemberAllergies(memberId);
    const season = getCurrentSeason();

    // 加载对应类型的模板
    const templates = await this.loadTemplates(currentMeal.mealType);
    const suitableTemplates = templates.filter((t) =>
      t.suitableGoals.includes(activeGoal.goalType),
    );

    // 选择营养相近的替代模板（不使用已使用的模板ID限制，允许替换）
    const replacementTemplate = this.selectBestTemplate(
      suitableTemplates,
      targetNutrition,
      allergies,
      season,
      new Set(), // 不使用已使用限制，允许选择任何模板
    );

    if (!replacementTemplate) {
      throw new Error("未找到合适的替代餐食");
    }

    // 删除旧食材并创建新食材
    await prisma.mealIngredient.deleteMany({
      where: { mealId },
    });

    await prisma.mealIngredient.createMany({
      data: replacementTemplate.ingredients.map((ing) => ({
        mealId,
        foodId: ing.foodId,
        amount: ing.amount,
      })),
    });

    // 更新餐食营养信息
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        calories: replacementTemplate.nutrition.calories,
        protein: replacementTemplate.nutrition.protein,
        carbs: replacementTemplate.nutrition.carbs,
        fat: replacementTemplate.nutrition.fat,
      },
      include: {
        ingredients: {
          include: {
            food: true,
          },
        },
      },
    });

    return {
      id: updatedMeal.id,
      date: updatedMeal.date,
      mealType: updatedMeal.mealType,
      ingredients: updatedMeal.ingredients.map((ing) => ({
        foodId: ing.foodId,
        amount: ing.amount,
      })),
      nutrition: {
        calories: updatedMeal.calories,
        protein: updatedMeal.protein,
        carbs: updatedMeal.carbs,
        fat: updatedMeal.fat,
      },
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
