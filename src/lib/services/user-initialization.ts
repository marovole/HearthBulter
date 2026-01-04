/**
 * User Initialization Service
 * 用户初始化服务
 *
 * 为新用户自动创建默认的健康数据、营养目标和健康目标
 */

import { prisma } from '@/lib/db';
import { addMonths, startOfDay } from 'date-fns';

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
export async function checkIfMemberNeedsInitialization(
  memberId: string,
): Promise<boolean> {
  const [healthData, healthGoals, nutritionTargets] = await Promise.all([
    prisma.healthData.findFirst({
      where: { memberId, deletedAt: null },
    }),
    prisma.healthGoal.findFirst({
      where: { memberId, deletedAt: null },
    }),
    prisma.nutritionTarget.findFirst({
      where: { memberId, deletedAt: null },
    }),
  ]);

  // 如果三个都不存在，说明需要初始化
  return !healthData && !healthGoals && !nutritionTargets;
}

/**
 * 计算基础代谢率（BMR）- Harris-Benedict 公式
 */
function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'MALE' | 'FEMALE' | 'OTHER',
): number {
  if (gender === 'MALE') {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else if (gender === 'FEMALE') {
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
  activityLevel:
    | 'sedentary'
    | 'light'
    | 'moderate'
    | 'active'
    | 'very_active' = 'moderate',
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
export async function initializeMemberHealthData(
  memberId: string,
): Promise<InitializationResult> {
  try {
    // 获取成员信息
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return {
        success: false,
        message: '成员不存在',
      };
    }

    // 检查是否已经初始化过
    const alreadyInitialized =
      !(await checkIfMemberNeedsInitialization(memberId));
    if (alreadyInitialized) {
      return {
        success: true,
        message: '该成员已经初始化过',
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
      await prisma.healthData.create({
        data: {
          memberId,
          weight: member.weight,
          height: member.height,
          measuredAt: startOfDay(now),
          source: 'USER_INPUT',
          notes: '初始化数据',
        },
      });
      healthDataCreated = true;
    }

    // 2. 创建默认健康目标（体重维持）
    if (member.weight) {
      await prisma.healthGoal.create({
        data: {
          memberId,
          goalType: 'MAINTAIN',
          targetWeight: member.weight,
          startWeight: member.weight,
          startDate: now,
          targetDate: addMonths(now, 3), // 默认3个月后
          status: 'ACTIVE',
          description: '维持当前体重',
        },
      });
      healthGoalCreated = true;
    }

    // 3. 创建默认营养目标
    if (member.weight && member.height && member.birthDate) {
      // 计算年龄
      const age = Math.floor(
        (now.getTime() - member.birthDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      );

      // 计算 BMR 和 TDEE
      const bmr = calculateBMR(
        member.weight,
        member.height,
        age,
        member.gender,
      );
      const tdee = calculateTDEE(bmr);

      // 计算宏量营养素（基于标准比例）
      const targetCalories = Math.round(tdee);
      const targetProtein = Math.round(member.weight * 2); // 2g/kg 体重
      const targetCarbs = Math.round((targetCalories * 0.5) / 4); // 50% 来自碳水，4 kcal/g
      const targetFat = Math.round((targetCalories * 0.3) / 9); // 30% 来自脂肪，9 kcal/g

      await prisma.nutritionTarget.create({
        data: {
          memberId,
          targetCalories,
          targetProtein,
          targetCarbs,
          targetFat,
          startDate: now,
          isActive: true,
        },
      });
      nutritionTargetCreated = true;
    } else {
      // 如果没有完整信息，使用默认值
      await prisma.nutritionTarget.create({
        data: {
          memberId,
          targetCalories: 2000, // 标准成年人推荐值
          targetProtein: 150, // 75g
          targetCarbs: 250, // 250g
          targetFat: 67, // 67g
          startDate: now,
          isActive: true,
        },
      });
      nutritionTargetCreated = true;
    }

    return {
      success: true,
      message: '初始化成功',
      data: {
        healthGoalCreated,
        nutritionTargetCreated,
        healthDataCreated,
      },
    };
  } catch (error) {
    console.error('初始化成员健康数据失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '初始化失败',
    };
  }
}

/**
 * 批量初始化家庭的所有成员
 */
export async function initializeFamilyMembers(
  familyId: string,
): Promise<InitializationResult[]> {
  const members = await prisma.familyMember.findMany({
    where: { familyId, deletedAt: null },
  });

  const results = await Promise.all(
    members.map((member) => initializeMemberHealthData(member.id)),
  );

  return results;
}
