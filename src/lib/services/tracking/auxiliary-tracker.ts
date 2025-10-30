/**
 * 辅助打卡服务
 * 负责处理饮水、运动、睡眠、体重等辅助打卡功能
 */

import { db } from '@/lib/db';

/**
 * 获取或创建今日辅助打卡记录
 */
export async function getOrCreateTodayTracking(memberId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let tracking = await db.auxiliaryTracking.findUnique({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
  });

  if (!tracking) {
    tracking = await db.auxiliaryTracking.create({
      data: {
        memberId,
        date: today,
      },
    });
  }

  return tracking;
}

/**
 * 饮水打卡
 */
export async function trackWater(memberId: string, amount: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tracking = await db.auxiliaryTracking.upsert({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
    update: {
      waterIntake: {
        increment: amount,
      },
    },
    create: {
      memberId,
      date: today,
      waterIntake: amount,
    },
  });

  return tracking;
}

/**
 * 设置饮水目标
 */
export async function setWaterTarget(memberId: string, target: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db.auxiliaryTracking.upsert({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
    update: {
      waterTarget: target,
    },
    create: {
      memberId,
      date: today,
      waterTarget: target,
    },
  });
}

/**
 * 运动打卡
 */
export async function trackExercise(
  memberId: string,
  data: {
    minutes: number;
    caloriesBurned: number;
    exerciseType: string[];
  }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db.auxiliaryTracking.upsert({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
    update: {
      exerciseMinutes: {
        increment: data.minutes,
      },
      caloriesBurned: {
        increment: data.caloriesBurned,
      },
      exerciseType: JSON.stringify(data.exerciseType),
    },
    create: {
      memberId,
      date: today,
      exerciseMinutes: data.minutes,
      caloriesBurned: data.caloriesBurned,
      exerciseType: JSON.stringify(data.exerciseType),
    },
  });
}

/**
 * 估算运动消耗卡路里
 */
export function estimateCaloriesBurned(
  exerciseType: string,
  minutes: number,
  weight: number
): number {
  // 简化的MET值（代谢当量）计算
  // MET = 每公斤体重每分钟消耗的热量（单位：kcal/kg/min）
  const metValues: { [key: string]: number } = {
    walking: 3.5, // 散步
    jogging: 7.0, // 慢跑
    running: 9.0, // 跑步
    cycling: 8.0, // 骑行
    swimming: 8.0, // 游泳
    yoga: 3.0, // 瑜伽
    strength_training: 6.0, // 力量训练
    dancing: 6.5, // 舞蹈
    basketball: 8.0, // 篮球
    badminton: 5.5, // 羽毛球
  };

  const met = metValues[exerciseType] || 5.0; // 默认中等强度
  const caloriesPerMinute = (met * 3.5 * weight) / 200;
  return Math.round(caloriesPerMinute * minutes);
}

/**
 * 睡眠打卡
 */
export async function trackSleep(
  memberId: string,
  data: {
    hours: number;
    quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  }
) {
  // 睡眠记录的日期应该是前一天（因为睡眠是前一晚的）
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  return db.auxiliaryTracking.upsert({
    where: {
      memberId_date: {
        memberId,
        date: yesterday,
      },
    },
    update: {
      sleepHours: data.hours,
      sleepQuality: data.quality,
    },
    create: {
      memberId,
      date: yesterday,
      sleepHours: data.hours,
      sleepQuality: data.quality,
    },
  });
}

/**
 * 体重打卡
 */
export async function trackWeight(
  memberId: string,
  data: {
    weight: number;
    bodyFat?: number;
  }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tracking = await db.auxiliaryTracking.upsert({
    where: {
      memberId_date: {
        memberId,
        date: today,
      },
    },
    update: {
      weight: data.weight,
      ...(data.bodyFat !== undefined && { bodyFat: data.bodyFat }),
    },
    create: {
      memberId,
      date: today,
      weight: data.weight,
      bodyFat: data.bodyFat,
    },
  });

  // 同时更新 FamilyMember 的体重（最新值）
  await db.familyMember.update({
    where: { id: memberId },
    data: {
      weight: data.weight,
    },
  });

  // 重新计算BMI
  const member = await db.familyMember.findUnique({
    where: { id: memberId },
    select: { height: true, weight: true },
  });

  if (member?.height && member?.weight) {
    const heightInMeters = member.height / 100;
    const bmi = member.weight / (heightInMeters * heightInMeters);

    await db.familyMember.update({
      where: { id: memberId },
      data: { bmi },
    });
  }

  return tracking;
}

/**
 * 获取历史辅助打卡数据
 */
export async function getAuxiliaryTrackingHistory(
  memberId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, limit = 30 } = options;

  const where: any = {
    memberId,
  };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
  }

  return db.auxiliaryTracking.findMany({
    where,
    orderBy: {
      date: 'desc',
    },
    take: limit,
  });
}

/**
 * 获取体重趋势
 */
export async function getWeightTrend(
  memberId: string,
  days: number = 30
) {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  const trackings = await db.auxiliaryTracking.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      weight: {
        not: null,
      },
    },
    select: {
      date: true,
      weight: true,
      bodyFat: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  if (trackings.length === 0) {
    return {
      trend: 'no_data' as const,
      data: [],
      change: 0,
      avgWeight: 0,
    };
  }

  const firstWeight = trackings[0].weight!;
  const lastWeight = trackings[trackings.length - 1].weight!;
  const change = lastWeight - firstWeight;

  const avgWeight =
    trackings.reduce((sum, t) => sum + (t.weight || 0), 0) / trackings.length;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (Math.abs(change) > 1) {
    trend = change > 0 ? 'increasing' : 'decreasing';
  }

  return {
    trend,
    data: trackings,
    change,
    avgWeight,
  };
}

/**
 * 获取睡眠质量统计
 */
export async function getSleepStats(
  memberId: string,
  days: number = 7
) {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  const trackings = await db.auxiliaryTracking.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      sleepHours: {
        not: null,
      },
    },
    select: {
      date: true,
      sleepHours: true,
      sleepQuality: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  if (trackings.length === 0) {
    return {
      avgHours: 0,
      totalNights: 0,
      qualityDistribution: {},
      data: [],
    };
  }

  const avgHours =
    trackings.reduce((sum, t) => sum + (t.sleepHours || 0), 0) / trackings.length;

  const qualityDistribution: { [key: string]: number } = {};
  trackings.forEach((t) => {
    if (t.sleepQuality) {
      qualityDistribution[t.sleepQuality] =
        (qualityDistribution[t.sleepQuality] || 0) + 1;
    }
  });

  return {
    avgHours: Math.round(avgHours * 10) / 10,
    totalNights: trackings.length,
    qualityDistribution,
    data: trackings,
  };
}

/**
 * 获取运动统计
 */
export async function getExerciseStats(
  memberId: string,
  days: number = 7
) {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  const trackings = await db.auxiliaryTracking.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      exerciseMinutes: {
        gt: 0,
      },
    },
    select: {
      date: true,
      exerciseMinutes: true,
      caloriesBurned: true,
      exerciseType: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  const totalMinutes = trackings.reduce(
    (sum, t) => sum + (t.exerciseMinutes || 0),
    0
  );
  const totalCalories = trackings.reduce(
    (sum, t) => sum + (t.caloriesBurned || 0),
    0
  );
  const activeDays = trackings.length;

  // 统计运动类型分布
  const typeDistribution: { [key: string]: number } = {};
  trackings.forEach((t) => {
    if (t.exerciseType) {
      try {
        const types = JSON.parse(t.exerciseType) as string[];
        types.forEach((type) => {
          typeDistribution[type] = (typeDistribution[type] || 0) + 1;
        });
      } catch (error) {
        // 忽略解析错误
      }
    }
  });

  return {
    totalMinutes,
    totalCalories,
    activeDays,
    avgMinutesPerDay: Math.round(totalMinutes / days),
    typeDistribution,
    data: trackings,
  };
}

/**
 * 获取饮水统计
 */
export async function getWaterStats(
  memberId: string,
  days: number = 7
) {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  const trackings = await db.auxiliaryTracking.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      date: true,
      waterIntake: true,
      waterTarget: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  const totalIntake = trackings.reduce(
    (sum, t) => sum + (t.waterIntake || 0),
    0
  );
  const avgIntake = Math.round(totalIntake / days);

  const targetReachedDays = trackings.filter(
    (t) => (t.waterIntake || 0) >= (t.waterTarget || 2000)
  ).length;

  const completionRate = (targetReachedDays / days) * 100;

  return {
    totalIntake,
    avgIntake,
    targetReachedDays,
    completionRate: Math.round(completionRate * 10) / 10,
    data: trackings,
  };
}

