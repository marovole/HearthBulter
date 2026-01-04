/**
 * 餐饮打卡服务
 * 负责处理用户的餐饮记录、营养计算和数据管理
 */

import { db } from '@/lib/db';
import { MealType, Prisma } from '@prisma/client';

/**
 * 创建餐饮记录
 */
export async function createMealLog(data: {
  memberId: string;
  date: Date;
  mealType: MealType;
  foods: Array<{ foodId: string; amount: number }>;
  notes?: string;
}) {
  const { memberId, date, mealType, foods, notes } = data;

  // 计算总营养成分
  const nutrition = await calculateNutritionFromFoods(foods);

  // 创建餐饮记录
  const mealLog = await db.mealLog.create({
    data: {
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
      foods: {
        create: foods.map((food) => ({
          foodId: food.foodId,
          amount: food.amount,
        })),
      },
    },
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
  });

  // 更新每日营养目标追踪
  await updateDailyNutritionTarget(memberId, date);

  // 更新连续打卡记录
  await updateTrackingStreak(memberId, date);

  return mealLog;
}

/**
 * 根据食物列表计算总营养成分
 */
export async function calculateNutritionFromFoods(
  foods: Array<{ foodId: string; amount: number }>,
) {
  // 获取所有食物的营养信息
  const foodIds = foods.map((f) => f.foodId);
  const foodData = await db.food.findMany({
    where: { id: { in: foodIds } },
    select: {
      id: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fiber: true,
      sugar: true,
      sodium: true,
    },
  });

  // 创建食物ID到营养数据的映射
  const foodMap = new Map(foodData.map((f) => [f.id, f]));

  // 计算总营养成分（根据份量按比例计算）
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
    const foodInfo = foodMap.get(food.foodId);
    if (!foodInfo) return;

    // 营养数据是per 100g，需要按实际份量计算
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

/**
 * 获取成员的今日餐饮记录
 */
export async function getTodayMealLogs(memberId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return db.mealLog.findMany({
    where: {
      memberId,
      date: {
        gte: today,
        lt: tomorrow,
      },
      deletedAt: null,
    },
    include: {
      foods: {
        include: {
          food: true,
        },
      },
      photos: true,
    },
    orderBy: {
      checkedAt: 'asc',
    },
  });
}

/**
 * 获取成员的历史餐饮记录
 */
export async function getMealLogHistory(
  memberId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    mealType?: MealType;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { startDate, endDate, mealType, limit = 50, offset = 0 } = options;

  const where: Prisma.MealLogWhereInput = {
    memberId,
    deletedAt: null,
  };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
  }

  if (mealType) {
    where.mealType = mealType;
  }

  const [logs, total] = await Promise.all([
    db.mealLog.findMany({
      where,
      include: {
        foods: {
          include: {
            food: true,
          },
        },
        photos: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    db.mealLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * 更新餐饮记录
 */
export async function updateMealLog(
  mealLogId: string,
  data: {
    foods?: Array<{ foodId: string; amount: number }>;
    notes?: string;
  },
) {
  const { foods, notes } = data;

  // 如果更新了食物，需要重新计算营养成分
  let nutrition;
  if (foods) {
    nutrition = await calculateNutritionFromFoods(foods);

    // 删除旧的食物关联
    await db.mealLogFood.deleteMany({
      where: { mealLogId },
    });
  }

  const mealLog = await db.mealLog.update({
    where: { id: mealLogId },
    data: {
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
      ...(foods && {
        foods: {
          create: foods.map((food) => ({
            foodId: food.foodId,
            amount: food.amount,
          })),
        },
      }),
    },
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
  });

  // 如果更新了营养成分，需要更新每日目标追踪
  if (nutrition) {
    const mealLogData = await db.mealLog.findUnique({
      where: { id: mealLogId },
      select: { memberId: true, date: true },
    });
    if (mealLogData) {
      await updateDailyNutritionTarget(mealLogData.memberId, mealLogData.date);
    }
  }

  return mealLog;
}

/**
 * 删除餐饮记录（软删除）
 */
export async function deleteMealLog(mealLogId: string) {
  const mealLog = await db.mealLog.update({
    where: { id: mealLogId },
    data: {
      deletedAt: new Date(),
    },
  });

  // 更新每日营养目标追踪
  await updateDailyNutritionTarget(mealLog.memberId, mealLog.date);

  return mealLog;
}

/**
 * 更新每日营养目标追踪
 */
async function updateDailyNutritionTarget(memberId: string, date: Date) {
  // 标准化日期（去除时间部分）
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // 获取当天所有餐饮记录
  const tomorrow = new Date(targetDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const mealLogs = await db.mealLog.findMany({
    where: {
      memberId,
      date: {
        gte: targetDate,
        lt: tomorrow,
      },
      deletedAt: null,
    },
  });

  // 计算实际摄入
  const actual = mealLogs.reduce(
    (sum, log) => ({
      calories: sum.calories + log.calories,
      protein: sum.protein + log.protein,
      carbs: sum.carbs + log.carbs,
      fat: sum.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // 获取营养目标
  const healthGoal = await db.healthGoal.findFirst({
    where: {
      memberId,
      status: 'ACTIVE',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!healthGoal) {
    // 如果没有健康目标，不创建追踪记录
    return;
  }

  // 计算每日目标（从TDEE计算）
  const targetCalories = healthGoal.tdee || 2000;
  const targetProtein = (targetCalories * (healthGoal.proteinRatio || 0.2)) / 4; // 1g蛋白质=4kcal
  const targetCarbs = (targetCalories * (healthGoal.carbRatio || 0.5)) / 4;
  const targetFat = (targetCalories * (healthGoal.fatRatio || 0.3)) / 9; // 1g脂肪=9kcal

  // 计算偏差百分比
  const caloriesDeviation =
    ((actual.calories - targetCalories) / targetCalories) * 100;
  const proteinDeviation =
    ((actual.protein - targetProtein) / targetProtein) * 100;
  const carbsDeviation = ((actual.carbs - targetCarbs) / targetCarbs) * 100;
  const fatDeviation = ((actual.fat - targetFat) / targetFat) * 100;

  // 判断是否完成打卡（至少记录了一餐）
  const isCompleted = mealLogs.length > 0;

  // 更新或创建每日目标追踪记录
  await db.dailyNutritionTarget.upsert({
    where: {
      memberId_date: {
        memberId,
        date: targetDate,
      },
    },
    update: {
      actualCalories: actual.calories,
      actualProtein: actual.protein,
      actualCarbs: actual.carbs,
      actualFat: actual.fat,
      caloriesDeviation,
      proteinDeviation,
      carbsDeviation,
      fatDeviation,
      isCompleted,
    },
    create: {
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
    },
  });
}

/**
 * 更新连续打卡记录
 */
async function updateTrackingStreak(memberId: string, date: Date) {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);

  // 获取或创建连续打卡记录
  let streak = await db.trackingStreak.findUnique({
    where: { memberId },
  });

  if (!streak) {
    streak = await db.trackingStreak.create({
      data: {
        memberId,
        currentStreak: 1,
        longestStreak: 1,
        totalDays: 1,
        lastCheckIn: today,
      },
    });
    return streak;
  }

  // 检查是否是新的一天
  const lastCheckIn = streak.lastCheckIn ? new Date(streak.lastCheckIn) : null;
  if (lastCheckIn) {
    lastCheckIn.setHours(0, 0, 0, 0);

    // 如果是同一天，不更新
    if (lastCheckIn.getTime() === today.getTime()) {
      return streak;
    }

    // 检查是否连续
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isConsecutive = lastCheckIn.getTime() === yesterday.getTime();

    const newCurrentStreak = isConsecutive ? streak.currentStreak + 1 : 1;
    const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);
    const newBadges = JSON.parse(streak.badges) as string[];

    // 检查是否解锁新徽章
    const milestones = [7, 30, 100, 365];
    milestones.forEach((milestone) => {
      const badgeId = `${milestone}-days`;
      if (newCurrentStreak >= milestone && !newBadges.includes(badgeId)) {
        newBadges.push(badgeId);
      }
    });

    // 更新记录
    return db.trackingStreak.update({
      where: { memberId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        totalDays: streak.totalDays + 1,
        lastCheckIn: today,
        badges: JSON.stringify(newBadges),
      },
    });
  }

  return streak;
}

/**
 * 获取最近常吃的食物（用于快速添加）
 */
export async function getRecentFoods(
  memberId: string,
  options: {
    days?: number;
    limit?: number;
    mealType?: MealType;
  } = {},
) {
  const { days = 7, limit = 10, mealType } = options;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: Prisma.MealLogWhereInput = {
    memberId,
    date: { gte: startDate },
    deletedAt: null,
  };

  if (mealType) {
    where.mealType = mealType;
  }

  // 获取最近的餐饮记录
  const mealLogs = await db.mealLog.findMany({
    where,
    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  // 统计食物出现频率
  const foodFrequency = new Map<
    string,
    { count: number; food: any; avgAmount: number; totalAmount: number }
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
          food: mealFood.food,
          avgAmount: mealFood.amount,
          totalAmount: mealFood.amount,
        });
      }
    });
  });

  // 按频率排序并返回
  return Array.from(foodFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => ({
      food: item.food,
      frequency: item.count,
      avgAmount: Math.round(item.avgAmount),
    }));
}
