/**
 * 辅助打卡服务
 * 负责处理饮水、运动、睡眠、体重等辅助打卡功能
 */

import { convexClient, api } from "@/lib/convex-client";

type Id<TableName extends string> = string & { __tableName: TableName };

type SleepQuality = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

type AuxiliaryTrackingRecord = {
  memberId: Id<"familyMembers">;
  date: number;
  exerciseMinutes?: number;
  sleepHours?: number;
  sleepQuality?: string;
  waterIntake?: number;
  waterTarget?: number;
  steps?: number;
  standingHours?: number;
  caloriesBurned?: number;
  exerciseType?: string;
  weight?: number;
  bodyFat?: number;
};

function toMemberId(memberId: string): Id<"familyMembers"> {
  return memberId as Id<"familyMembers">;
}

function toStartOfDayTimestamp(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
}

function pickDefinedTrackingFields(
  source: Partial<AuxiliaryTrackingRecord>
): Partial<AuxiliaryTrackingRecord> {
  const fields: Partial<AuxiliaryTrackingRecord> = {};

  if (source.exerciseMinutes !== undefined) fields.exerciseMinutes = source.exerciseMinutes;
  if (source.sleepHours !== undefined) fields.sleepHours = source.sleepHours;
  if (source.sleepQuality !== undefined) fields.sleepQuality = source.sleepQuality;
  if (source.waterIntake !== undefined) fields.waterIntake = source.waterIntake;
  if (source.waterTarget !== undefined) fields.waterTarget = source.waterTarget;
  if (source.steps !== undefined) fields.steps = source.steps;
  if (source.standingHours !== undefined) fields.standingHours = source.standingHours;
  if (source.caloriesBurned !== undefined) fields.caloriesBurned = source.caloriesBurned;
  if (source.exerciseType !== undefined) fields.exerciseType = source.exerciseType;
  if (source.weight !== undefined) fields.weight = source.weight;
  if (source.bodyFat !== undefined) fields.bodyFat = source.bodyFat;

  return fields;
}

async function getTrackingByDate(memberId: Id<"familyMembers">, date: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await convexClient.query(api.analytics.getAuxiliaryTracking, {
    memberId,
    date,
  })) as any as AuxiliaryTrackingRecord | null;
}

async function listTrackingsByDateRange(
  memberId: Id<"familyMembers">,
  startDate: number,
  endDate: number
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await convexClient.query(api.analytics.listAuxiliaryTrackings, {
    memberId,
    startDate,
    endDate,
  })) as any as AuxiliaryTrackingRecord[];
}

async function upsertTrackingByDate(
  memberId: Id<"familyMembers">,
  date: number,
  updates: Partial<AuxiliaryTrackingRecord>
) {
  const existing = await getTrackingByDate(memberId, date);

  await convexClient.mutation(api.analytics.upsertAuxiliaryTracking, {
    memberId,
    date,
    ...pickDefinedTrackingFields(existing ?? {}),
    ...pickDefinedTrackingFields(updates),
  });

  return getTrackingByDate(memberId, date);
}

/**
 * 获取或创建今日辅助打卡记录
 */
export async function getOrCreateTodayTracking(memberId: string) {
  const memberIdRef = toMemberId(memberId);
  const todayTimestamp = toStartOfDayTimestamp(new Date());

  let tracking = await convexClient.query(api.analytics.getAuxiliaryTracking, {
    memberId: memberIdRef,
    date: todayTimestamp,
  });

  if (!tracking) {
    await convexClient.mutation(api.analytics.upsertAuxiliaryTracking, {
      memberId: memberIdRef,
      date: todayTimestamp,
    });

    tracking = await convexClient.query(api.analytics.getAuxiliaryTracking, {
      memberId: memberIdRef,
      date: todayTimestamp,
    });
  }

  return tracking;
}

/**
 * 饮水打卡
 */
export async function trackWater(memberId: string, amount: number) {
  const memberIdRef = toMemberId(memberId);
  const todayTimestamp = toStartOfDayTimestamp(new Date());

  const existing = await getTrackingByDate(memberIdRef, todayTimestamp);
  const waterIntake = (existing?.waterIntake ?? 0) + amount;

  return upsertTrackingByDate(memberIdRef, todayTimestamp, {
    waterIntake,
  });
}

/**
 * 设置饮水目标
 */
export async function setWaterTarget(memberId: string, target: number) {
  const memberIdRef = toMemberId(memberId);
  const todayTimestamp = toStartOfDayTimestamp(new Date());

  return upsertTrackingByDate(memberIdRef, todayTimestamp, {
    waterTarget: target,
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
  const memberIdRef = toMemberId(memberId);
  const todayTimestamp = toStartOfDayTimestamp(new Date());

  const existing = await getTrackingByDate(memberIdRef, todayTimestamp);
  const exerciseMinutes = (existing?.exerciseMinutes ?? 0) + data.minutes;
  const caloriesBurned = (existing?.caloriesBurned ?? 0) + data.caloriesBurned;

  return upsertTrackingByDate(memberIdRef, todayTimestamp, {
    exerciseMinutes,
    caloriesBurned,
    exerciseType: JSON.stringify(data.exerciseType),
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
    quality: SleepQuality;
  }
) {
  // 睡眠记录的日期应该是前一天（因为睡眠是前一晚的）
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTimestamp = toStartOfDayTimestamp(yesterday);

  return upsertTrackingByDate(toMemberId(memberId), yesterdayTimestamp, {
    sleepHours: data.hours,
    sleepQuality: data.quality,
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
  const memberIdRef = toMemberId(memberId);
  const todayTimestamp = toStartOfDayTimestamp(new Date());

  const tracking = await upsertTrackingByDate(memberIdRef, todayTimestamp, {
    weight: data.weight,
    ...(data.bodyFat !== undefined && { bodyFat: data.bodyFat }),
  });

  // 同时更新 FamilyMember 的体重（最新值）
  await convexClient.mutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.members as any).update,
    {
      memberId: memberIdRef,
      weight: data.weight,
    }
  );

  // 重新计算BMI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const member = (await convexClient.query(api.members.getById, { memberId: memberIdRef })) as any;

  if (member?.height && data.weight) {
    const heightInMeters = member.height / 100;
    const bmi = data.weight / (heightInMeters * heightInMeters);

    await convexClient.mutation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.members as any).update,
      {
        memberId: memberIdRef,
        bmi,
      }
    );
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
  const memberIdRef = toMemberId(memberId);

  const startTimestamp = startDate ? toStartOfDayTimestamp(startDate) : 0;
  const endTimestamp = endDate
    ? (() => {
        const normalized = new Date(endDate);
        normalized.setHours(23, 59, 59, 999);
        return normalized.getTime();
      })()
    : Date.now();

  const trackings = await listTrackingsByDateRange(memberIdRef, startTimestamp, endTimestamp);

  return [...trackings].sort((a, b) => b.date - a.date).slice(0, limit);
}

/**
 * 获取体重趋势
 */
export async function getWeightTrend(memberId: string, days: number = 30) {
  const endDate = new Date();
  const endTimestamp = toStartOfDayTimestamp(endDate);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const startTimestamp = toStartOfDayTimestamp(startDate);

  const trackings = await listTrackingsByDateRange(
    toMemberId(memberId),
    startTimestamp,
    endTimestamp
  );

  const weightTrackings = trackings.filter((t) => t.weight !== undefined && t.weight !== null);

  if (weightTrackings.length === 0) {
    return {
      trend: "no_data" as const,
      data: [],
      change: 0,
      avgWeight: 0,
    };
  }

  const firstWeight = weightTrackings.at(0)?.weight ?? 0;
  const lastWeight = weightTrackings.at(-1)?.weight ?? 0;
  const change = lastWeight - firstWeight;

  const avgWeight =
    weightTrackings.reduce((sum, t) => sum + (t.weight ?? 0), 0) / weightTrackings.length;

  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (Math.abs(change) > 1) {
    trend = change > 0 ? "increasing" : "decreasing";
  }

  return {
    trend,
    data: weightTrackings,
    change,
    avgWeight,
  };
}

/**
 * 获取睡眠质量统计
 */
export async function getSleepStats(memberId: string, days: number = 7) {
  const endDate = new Date();
  const endTimestamp = toStartOfDayTimestamp(endDate);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const startTimestamp = toStartOfDayTimestamp(startDate);

  const trackings = await listTrackingsByDateRange(
    toMemberId(memberId),
    startTimestamp,
    endTimestamp
  );

  const sleepTrackings = trackings.filter(
    (t) => t.sleepHours !== undefined && t.sleepHours !== null
  );

  if (sleepTrackings.length === 0) {
    return {
      avgHours: 0,
      totalNights: 0,
      qualityDistribution: {},
      data: [],
    };
  }

  const avgHours =
    sleepTrackings.reduce((sum, t) => sum + (t.sleepHours ?? 0), 0) / sleepTrackings.length;

  const qualityDistribution: { [key: string]: number } = {};
  sleepTrackings.forEach((t) => {
    if (t.sleepQuality) {
      qualityDistribution[t.sleepQuality] = (qualityDistribution[t.sleepQuality] || 0) + 1;
    }
  });

  return {
    avgHours: Math.round(avgHours * 10) / 10,
    totalNights: sleepTrackings.length,
    qualityDistribution,
    data: sleepTrackings,
  };
}

/**
 * 获取运动统计
 */
export async function getExerciseStats(memberId: string, days: number = 7) {
  const endDate = new Date();
  const endTimestamp = toStartOfDayTimestamp(endDate);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const startTimestamp = toStartOfDayTimestamp(startDate);

  const trackings = await listTrackingsByDateRange(
    toMemberId(memberId),
    startTimestamp,
    endTimestamp
  );

  const exerciseTrackings = trackings.filter((t) => (t.exerciseMinutes ?? 0) > 0);

  const totalMinutes = exerciseTrackings.reduce((sum, t) => sum + (t.exerciseMinutes ?? 0), 0);
  const totalCalories = exerciseTrackings.reduce((sum, t) => sum + (t.caloriesBurned ?? 0), 0);
  const activeDays = exerciseTrackings.length;

  // 统计运动类型分布
  const typeDistribution: { [key: string]: number } = {};
  exerciseTrackings.forEach((t) => {
    if (t.exerciseType) {
      try {
        const types = JSON.parse(t.exerciseType) as string[];
        types.forEach((type) => {
          typeDistribution[type] = (typeDistribution[type] || 0) + 1;
        });
      } catch {
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
    data: exerciseTrackings,
  };
}

/**
 * 获取饮水统计
 */
export async function getWaterStats(memberId: string, days: number = 7) {
  const endDate = new Date();
  const endTimestamp = toStartOfDayTimestamp(endDate);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const startTimestamp = toStartOfDayTimestamp(startDate);

  const trackings = await listTrackingsByDateRange(
    toMemberId(memberId),
    startTimestamp,
    endTimestamp
  );

  const totalIntake = trackings.reduce((sum, t) => sum + (t.waterIntake ?? 0), 0);
  const avgIntake = Math.round(totalIntake / days);

  const targetReachedDays = trackings.filter(
    (t) => (t.waterIntake ?? 0) >= (t.waterTarget ?? 2000)
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
