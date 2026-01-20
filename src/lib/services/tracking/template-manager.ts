import { convexTracking } from "@/lib/convex-tracking";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface FoodDoc {
  _id: Id<"foods">;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealLogDoc {
  _id: Id<"mealLogs">;
  memberId: Id<"familyMembers">;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: Array<{
    _id: Id<"mealLogFoods">;
    foodId: Id<"foods">;
    amount: number;
  }>;
}

interface QuickTemplateDoc {
  _id: Id<"quickTemplates">;
  name: string;
  useCount: number;
  lastUsed?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function createQuickTemplate(data: {
  memberId: string;
  name: string;
  description?: string;
  mealType: string;
  foods: Array<{ foodId: string; amount: number }>;
}) {
  const { memberId, name, description, mealType, foods } = data;

  const nutrition = await calculateNutritionFromFoods(foods);

  const templateId = await convexTracking.createQuickTemplate({
    memberId,
    name,
    description,
    mealType,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
  });

  for (const food of foods) {
    await convexTracking.addTemplateFood(templateId as string, food.foodId, food.amount);
  }

  return convexTracking.getTemplateById(templateId as string);
}

async function calculateNutritionFromFoods(foods: Array<{ foodId: string; amount: number }>) {
  const foodIds = foods.map((f) => f.foodId);
  const foodData = (await convexTracking.getFoodsByIds(foodIds)) as FoodDoc[];

  const foodMap = new Map(foodData.map((f) => [f._id, f]));

  const nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  foods.forEach((food) => {
    const foodInfo = foodMap.get(food.foodId as Id<"foods">);
    if (!foodInfo) return;

    const ratio = food.amount / 100;
    nutrition.calories += foodInfo.calories * ratio;
    nutrition.protein += foodInfo.protein * ratio;
    nutrition.carbs += foodInfo.carbs * ratio;
    nutrition.fat += foodInfo.fat * ratio;
  });

  return nutrition;
}

export async function createTemplateFromMealLog(
  mealLogId: string,
  templateName: string,
  description?: string
) {
  const mealLog = (await convexTracking.getMealLogById(mealLogId)) as MealLogDoc | null;
  if (!mealLog) {
    throw new Error("Meal log not found");
  }

  return createQuickTemplate({
    memberId: mealLog.memberId as string,
    name: templateName,
    description,
    mealType: mealLog.mealType,
    foods: mealLog.foods.map((food) => ({
      foodId: food.foodId as string,
      amount: food.amount,
    })),
  });
}

export async function getQuickTemplates(memberId: string, mealType?: string) {
  return convexTracking.getQuickTemplates(memberId, mealType);
}

export async function getRecommendedTemplates(
  memberId: string,
  mealType: string,
  limit: number = 3
) {
  const currentHour = new Date().getHours();

  let recommendedMealType = mealType;
  if (!mealType) {
    if (currentHour >= 6 && currentHour < 10) {
      recommendedMealType = "BREAKFAST";
    } else if (currentHour >= 11 && currentHour < 14) {
      recommendedMealType = "LUNCH";
    } else if (currentHour >= 17 && currentHour < 21) {
      recommendedMealType = "DINNER";
    } else {
      recommendedMealType = "SNACK";
    }
  }

  const templates = (await convexTracking.getQuickTemplates(
    memberId,
    recommendedMealType
  )) as QuickTemplateDoc[];
  return templates.slice(0, limit);
}

async function updateTemplateScores(memberId: string) {
  const templates = (await convexTracking.getQuickTemplates(memberId)) as QuickTemplateDoc[];
  const now = Date.now();

  for (const template of templates as Doc<"quickTemplates">[]) {
    let score = 0;

    const frequencyScore = Math.min(template.useCount * 5, 50);
    score += frequencyScore;

    if (template.lastUsed) {
      const daysSinceLastUse = Math.floor((now - template.lastUsed) / (1000 * 60 * 60 * 24));

      if (daysSinceLastUse <= 7) {
        score += 30;
      } else if (daysSinceLastUse <= 30) {
        score += 20;
      } else if (daysSinceLastUse <= 90) {
        score += 10;
      }
    }

    const proteinRatio = (template.protein * 4) / template.calories;
    const carbsRatio = (template.carbs * 4) / template.calories;
    const fatRatio = (template.fat * 9) / template.calories;

    let balanceScore = 0;
    if (proteinRatio >= 0.15 && proteinRatio <= 0.25) balanceScore += 7;
    if (carbsRatio >= 0.4 && carbsRatio <= 0.6) balanceScore += 7;
    if (fatRatio >= 0.2 && fatRatio <= 0.35) balanceScore += 6;

    score += balanceScore;

    await convexTracking.updateTemplateScore(template._id, score);
  }
}

export async function useTemplate(templateId: string) {
  await convexTracking.incrementTemplateUseCount(templateId);
  return convexTracking.getTemplateById(templateId);
}

export async function updateQuickTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    foods?: Array<{ foodId: string; amount: number }>;
  }
) {
  const { name, description, foods } = data;

  let nutrition: Awaited<ReturnType<typeof calculateNutritionFromFoods>> | undefined;
  if (foods) {
    nutrition = await calculateNutritionFromFoods(foods);
    await convexTracking.deleteTemplateFoods(templateId);
  }

  await convexTracking.updateQuickTemplate(templateId, {
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(nutrition && {
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    }),
  });

  if (foods) {
    for (const food of foods) {
      await convexTracking.addTemplateFood(templateId, food.foodId, food.amount);
    }
  }

  return convexTracking.getTemplateById(templateId);
}

export async function deleteQuickTemplate(templateId: string) {
  await convexTracking.softDeleteQuickTemplate(templateId);
}

export async function autoGenerateTemplates(memberId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = (await convexTracking.getMealLogHistory(memberId, {
    startDate: thirtyDaysAgo,
    limit: 100,
  })) as { logs: Array<Doc<"mealLogs"> & { foods: Doc<"mealLogFoods">[] }> };

  const mealLogs = result.logs;

  const mealTypeGroups = new Map<string, typeof mealLogs>();
  mealLogs.forEach((log) => {
    const existing = mealTypeGroups.get(log.mealType) || [];
    existing.push(log);
    mealTypeGroups.set(log.mealType, existing);
  });

  const generatedTemplates = [];

  for (const [mealType, logs] of mealTypeGroups.entries()) {
    const combinationFrequency = new Map<
      string,
      {
        count: number;
        foods: Array<{
          foodId: string;
          totalAmount: number;
          avgAmount: number;
        }>;
      }
    >();

    logs.forEach((log) => {
      const foodIds = log.foods
        .map((food) => food.foodId)
        .sort()
        .join(",");

      const existing = combinationFrequency.get(foodIds);
      if (existing) {
        existing.count++;
        log.foods.forEach((food) => {
          const foodStat = existing.foods.find((fs) => fs.foodId === food.foodId);
          if (foodStat) {
            foodStat.totalAmount += food.amount;
            foodStat.avgAmount = foodStat.totalAmount / existing.count;
          }
        });
      } else {
        combinationFrequency.set(foodIds, {
          count: 1,
          foods: log.foods.map((food) => ({
            foodId: food.foodId,
            totalAmount: food.amount,
            avgAmount: food.amount,
          })),
        });
      }
    });

    const topCombinations = Array.from(combinationFrequency.entries())
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2);

    for (const [_, data] of topCombinations) {
      const mealTypeName: Record<string, string> = {
        BREAKFAST: "早餐",
        LUNCH: "午餐",
        DINNER: "晚餐",
        SNACK: "加餐",
      };

      const templateName = `常吃${mealTypeName[mealType] || mealType} (${data.count}次)`;

      try {
        const template = await createQuickTemplate({
          memberId,
          name: templateName,
          description: `根据您最近${data.count}次的记录自动生成`,
          mealType,
          foods: data.foods.map((f) => ({
            foodId: f.foodId,
            amount: Math.round(f.avgAmount),
          })),
        });

        generatedTemplates.push(template);
      } catch (error) {
        console.error("Failed to create template:", error);
      }
    }
  }

  return generatedTemplates;
}
