/**
 * User Initialization Service
 * 用户初始化服务
 *
 * 为新用户自动创建默认的健康数据、营养目标和健康目标
 */

import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { addMonths, startOfDay } from "date-fns";

interface InitializationResult {
  success: boolean;
  message: string;
  data?: {
    healthGoalCreated: boolean;
    nutritionTargetCreated: boolean;
    healthDataCreated: boolean;
  };
}

/**
 * 检查成员是否需要初始化
 */
export async function checkIfMemberNeedsInitialization(memberId: string): Promise<boolean> {
  const [healthData, healthGoals, nutritionTargets] = await Promise.all([
    convexClient.query<Doc<"healthData">[]>(api.health.getMetrics, {
      memberId: memberId as Id<"familyMembers">,
      limit: 1,
    }),
    convexClient.query<Doc<"healthGoals">[]>(api.health.listGoals, {
      memberId: memberId as Id<"familyMembers">,
      includeInactive: true,
    }),
    convexClient.query<Doc<"dailyNutritionTargets">[]>(api.analytics.listDailyNutritionTargets, {
      memberId: memberId as Id<"familyMembers">,
      startDate: 0,
      endDate: Date.now(),
    }),
  ]);

  return healthData.length === 0 && healthGoals.length === 0 && nutritionTargets.length === 0;
}

/**
 * 计算基础代谢率（BMR）- Harris-Benedict 公式
 */
function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: "MALE" | "FEMALE" | "OTHER"
): number {
  if (gender === "MALE") {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else if (gender === "FEMALE") {
    return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  } else {
    // 对于 OTHER，使用平均值
    const male = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    const female = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
    return (male + female) / 2;
  }
}

/**
 * 计算每日总能量消耗（TDEE）
 */
function calculateTDEE(
  bmr: number,
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active" = "moderate"
): number {
  const activityMultipliers = {
    sedentary: 1.2, // 久坐，很少运动
    light: 1.375, // 轻度活动，每周1-3次
    moderate: 1.55, // 中度活动，每周3-5次
    active: 1.725, // 高度活动，每周6-7次
    very_active: 1.9, // 极高活动，体力劳动或每天两次训练
  };

  return bmr * activityMultipliers[activityLevel];
}

/**
 * 初始化成员的健康数据
 */
export async function initializeMemberHealthData(memberId: string): Promise<InitializationResult> {
  try {
    // 获取成员信息
    const member = await convexClient.query<Doc<"familyMembers"> | null>(api.members.getById, {
      memberId: memberId as Id<"familyMembers">,
    });

    if (!member) {
      return {
        success: false,
        message: "成员不存在",
      };
    }

    // 检查是否已经初始化过
    const alreadyInitialized = !(await checkIfMemberNeedsInitialization(memberId));
    if (alreadyInitialized) {
      return {
        success: true,
        message: "该成员已经初始化过",
        data: {
          healthGoalCreated: false,
          nutritionTargetCreated: false,
          healthDataCreated: false,
        },
      };
    }

    const now = new Date();
    let healthGoalCreated = false;
    let nutritionTargetCreated = false;
    let healthDataCreated = false;

    // 1. 创建初始健康数据记录（如果成员有体重或身高信息）
    if (member.weight || member.height) {
      await convexClient.mutation(api.health.addRecord, {
        memberId: memberId as Id<"familyMembers">,
        weight: member.weight ?? undefined,
        source: "MANUAL",
        measuredAt: startOfDay(now).getTime(),
        notes: "初始化数据",
      });
      healthDataCreated = true;
    }

    // 2. 创建默认健康目标（体重维持）
    if (member.weight) {
      const carbRatio = 0.5;
      const proteinRatio = 0.3;
      const fatRatio = 0.2;

      await convexClient.mutation(api.health.createGoal, {
        memberId: memberId as Id<"familyMembers">,
        goalType: "MAINTAIN",
        targetValue: member.weight,
        currentValue: member.weight,
        startDate: now.getTime(),
        endDate: addMonths(now, 3).getTime(),
        status: "ACTIVE",
        carbRatio,
        proteinRatio,
        fatRatio,
      });
      healthGoalCreated = true;
    }

    // 3. 创建默认营养目标
    if (member.weight && member.height && member.birthDate) {
      const age = Math.floor((now.getTime() - member.birthDate) / (365.25 * 24 * 60 * 60 * 1000));

      const bmr = calculateBMR(member.weight, member.height, age, member.gender);
      const tdee = calculateTDEE(bmr);

      const targetCalories = Math.round(tdee);
      const targetProtein = Math.round(member.weight * 2);
      const targetCarbs = Math.round((targetCalories * 0.5) / 4);
      const targetFat = Math.round((targetCalories * 0.3) / 9);
      const date = startOfDay(now).getTime();

      await convexClient.mutation(api.analytics.upsertDailyNutritionTarget, {
        memberId: memberId as Id<"familyMembers">,
        date,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        actualCalories: 0,
        actualProtein: 0,
        actualCarbs: 0,
        actualFat: 0,
      });
      nutritionTargetCreated = true;
    } else {
      const date = startOfDay(now).getTime();

      await convexClient.mutation(api.analytics.upsertDailyNutritionTarget, {
        memberId: memberId as Id<"familyMembers">,
        date,
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 250,
        targetFat: 67,
        actualCalories: 0,
        actualProtein: 0,
        actualCarbs: 0,
        actualFat: 0,
      });
      nutritionTargetCreated = true;
    }

    return {
      success: true,
      message: "初始化成功",
      data: {
        healthGoalCreated,
        nutritionTargetCreated,
        healthDataCreated,
      },
    };
  } catch (error) {
    console.error("初始化成员健康数据失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "初始化失败",
    };
  }
}

/**
 * 批量初始化家庭的所有成员
 */
export async function initializeFamilyMembers(familyId: string): Promise<InitializationResult[]> {
  const members = await convexClient.query<Doc<"familyMembers">[]>(api.families.listMembers, {
    familyId: familyId as Id<"families">,
    includeDeleted: false,
  });

  const results = await Promise.all(
    members.map((member) => initializeMemberHealthData(member._id as string))
  );

  return results;
}
