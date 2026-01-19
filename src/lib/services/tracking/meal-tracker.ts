import { convexTracking } from "@/lib/convex-tracking";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface MealLogDoc {
  _id: Id<"mealLogs">;
  memberId: Id<"familyMembers">;
  date: number;
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

interface FoodDoc {
  _id: Id<"foods">;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export async function createMealLog(data: {
  memberId: string;
  date: Date;
  mealType: string;
  foods: Array<{ foodId: string; amount: number }>;
  notes?: string;
}) {
  const { memberId, date, mealType, foods, notes } = data;

  const nutrition = await calculateNutritionFromFoods(foods);

  const mealLogId = await convexTracking.createMealLog({
    memberId,
    date,
    mealType,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    fiber: nutrition.fiber,
    sugar: nutrition.sugar,
    sodium: nutrition.sodium,
    notes,
  });

  for (const food of foods) {
    await convexTracking.addMealLogFood(
      mealLogId as string,
      food.foodId,
      food.amount,
    );
  }

  await updateDailyNutritionTarget(memberId, date);
  await updateTrackingStreak(memberId, date);

  const mealLog = await convexTracking.getMealLogById(mealLogId as string);
  return mealLog;
}

export async function calculateNutritionFromFoods(
  foods: Array<{ foodId: string; amount: number }>,
) {
  const foodIds = foods.map((f) => f.foodId);
  const foodData = (await convexTracking.getFoodsByIds(foodIds)) as FoodDoc[];

  const foodMap = new Map(foodData.map((f) => [f._id, f]));

  const nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  foods.forEach((food) => {
    const foodInfo = foodMap.get(food.foodId as Id<"foods">);
    if (!foodInfo) return;

    const ratio = food.amount / 100;
    nutrition.calories += foodInfo.calories * ratio;
    nutrition.protein += foodInfo.protein * ratio;
    nutrition.carbs += foodInfo.carbs * ratio;
    nutrition.fat += foodInfo.fat * ratio;
    nutrition.fiber += (foodInfo.fiber || 0) * ratio;
    nutrition.sugar += (foodInfo.sugar || 0) * ratio;
    nutrition.sodium += (foodInfo.sodium || 0) * ratio;
  });

  return nutrition;
}

export async function getTodayMealLogs(memberId: string) {
  return convexTracking.getTodayMealLogs(memberId);
}

export async function getMealLogHistory(
  memberId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    mealType?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  return convexTracking.getMealLogHistory(memberId, options);
}

export async function updateMealLog(
  mealLogId: string,
  data: {
    foods?: Array<{ foodId: string; amount: number }>;
    notes?: string;
  },
) {
  const { foods, notes } = data;

  let nutrition:
    | Awaited<ReturnType<typeof calculateNutritionFromFoods>>
    | undefined;
  if (foods) {
    nutrition = await calculateNutritionFromFoods(foods);
    await convexTracking.deleteMealLogFoods(mealLogId);
  }

  await convexTracking.updateMealLog(mealLogId, {
    ...(nutrition && {
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sugar: nutrition.sugar,
      sodium: nutrition.sodium,
    }),
    ...(notes !== undefined && { notes }),
  });

  if (foods) {
    for (const food of foods) {
      await convexTracking.addMealLogFood(mealLogId, food.foodId, food.amount);
    }
    const mealLog = (await convexTracking.getMealLogById(
      mealLogId,
    )) as MealLogDoc | null;
    if (mealLog) {
      await updateDailyNutritionTarget(
        mealLog.memberId as string,
        new Date(mealLog.date),
      );
    }
  }

  return convexTracking.getMealLogById(mealLogId);
}

export async function deleteMealLog(mealLogId: string) {
  await convexTracking.softDeleteMealLog(mealLogId);
  const mealLog = (await convexTracking.getMealLogById(
    mealLogId,
  )) as MealLogDoc | null;
  if (mealLog) {
    await updateDailyNutritionTarget(
      mealLog.memberId as string,
      new Date(mealLog.date),
    );
  }
}

async function updateDailyNutritionTarget(memberId: string, date: Date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const tomorrow = new Date(targetDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const mealLogs = (await convexTracking.getMealLogsForPeriod(
    memberId,
    targetDate,
    tomorrow,
  )) as Array<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;

  const actual = mealLogs.reduce(
    (sum, log) => ({
      calories: sum.calories + log.calories,
      protein: sum.protein + log.protein,
      carbs: sum.carbs + log.carbs,
      fat: sum.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const targetCalories = 2000;
  const targetProtein = 100;
  const targetCarbs = 250;
  const targetFat = 65;

  const caloriesDeviation =
    targetCalories > 0
      ? ((actual.calories - targetCalories) / targetCalories) * 100
      : 0;
  const proteinDeviation =
    targetProtein > 0
      ? ((actual.protein - targetProtein) / targetProtein) * 100
      : 0;
  const carbsDeviation =
    targetCarbs > 0 ? ((actual.carbs - targetCarbs) / targetCarbs) * 100 : 0;
  const fatDeviation =
    targetFat > 0 ? ((actual.fat - targetFat) / targetFat) * 100 : 0;

  const isCompleted = mealLogs.length > 0;

  await convexTracking.upsertDailyNutritionTarget({
    memberId,
    date: targetDate,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    actualCalories: actual.calories,
    actualProtein: actual.protein,
    actualCarbs: actual.carbs,
    actualFat: actual.fat,
    caloriesDeviation,
    proteinDeviation,
    carbsDeviation,
    fatDeviation,
    isCompleted,
  });
}

async function updateTrackingStreak(memberId: string, date: Date) {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);

  const streak = (await convexTracking.getTrackingStreak(
    memberId,
  )) as Doc<"trackingStreaks"> | null;

  if (!streak) {
    await convexTracking.upsertTrackingStreak({
      memberId,
      currentStreak: 1,
      longestStreak: 1,
      totalDays: 1,
      lastCheckIn: today,
      badges: JSON.stringify([]),
    });
    return;
  }

  const lastCheckIn = streak.lastCheckIn ? new Date(streak.lastCheckIn) : null;
  if (lastCheckIn) {
    lastCheckIn.setHours(0, 0, 0, 0);

    if (lastCheckIn.getTime() === today.getTime()) {
      return;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isConsecutive = lastCheckIn.getTime() === yesterday.getTime();

    const newCurrentStreak = isConsecutive ? streak.currentStreak + 1 : 1;
    const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);
    const newBadges = JSON.parse(streak.badges) as string[];

    const milestones = [7, 30, 100, 365];
    milestones.forEach((milestone) => {
      const badgeId = `${milestone}-days`;
      if (newCurrentStreak >= milestone && !newBadges.includes(badgeId)) {
        newBadges.push(badgeId);
      }
    });

    await convexTracking.upsertTrackingStreak({
      memberId,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      totalDays: streak.totalDays + 1,
      lastCheckIn: today,
      badges: JSON.stringify(newBadges),
    });
  }
}

export async function getRecentFoods(
  memberId: string,
  options: {
    days?: number;
    limit?: number;
    mealType?: string;
  } = {},
) {
  const { days = 7, limit = 10, mealType } = options;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = (await convexTracking.getMealLogHistory(memberId, {
    startDate,
    mealType,
    limit: 100,
  })) as { logs: Array<Doc<"mealLogs"> & { foods: Doc<"mealLogFoods">[] }> };

  const mealLogs = result.logs;

  const foodFrequency = new Map<
    string,
    {
      count: number;
      food: Doc<"foods">;
      avgAmount: number;
      totalAmount: number;
    }
  >();

  mealLogs.forEach((log) => {
    log.foods.forEach((mealFood) => {
      const existing = foodFrequency.get(mealFood.foodId);
      if (existing) {
        existing.count++;
        existing.totalAmount += mealFood.amount;
        existing.avgAmount = existing.totalAmount / existing.count;
      } else {
        foodFrequency.set(mealFood.foodId, {
          count: 1,
          food: mealFood.foodId as unknown as Doc<"foods">,
          avgAmount: mealFood.amount,
          totalAmount: mealFood.amount,
        });
      }
    });
  });

  return Array.from(foodFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({
      food: item.food,
      frequency: item.count,
      avgAmount: Math.round(item.avgAmount),
    }));
}
