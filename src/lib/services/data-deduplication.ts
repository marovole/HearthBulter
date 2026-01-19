/**
 * 数据去重服务
 * 实现可穿戴设备数据的智能去重，避免与手动录入冲突
 */

import { addHours, subHours, isBefore, isAfter } from "date-fns";
import type { HealthDataSource } from "@/types/wearable-devices";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import type { HealthDataInput } from "@/types/wearable-devices";
import { DEDUPLICATION_WINDOWS } from "@/types/wearable-devices";

/**
 * 去重结果类型
 */
export interface DeduplicationResult {
  shouldInsert: boolean;
  conflictingRecords: HealthDataRecord[];
  recommendedAction: "INSERT" | "UPDATE" | "SKIP";
  reason?: string;
}

type HealthDataRecord = Doc<"healthData">;

/**
 * 数据来源优先级
 */
const SOURCE_PRIORITY: Record<HealthDataSource, number> = {
  APPLE_HEALTHKIT: 9,
  HUAWEI_HEALTH: 8,
  GOOGLE_FIT: 7,
  XIAOMI_HEALTH: 6,
  SAMSUNG_HEALTH: 5,
  GARMIN_CONNECT: 4,
  FITBIT: 3,
  WEARABLE: 2,
  MEDICAL_REPORT: 1,
  DEVICE: 1,
  IMPORTED: 1,
  MANUAL: 0,
};

const getSourcePriority = (source: unknown): number => {
  if (typeof source === "string" && source in SOURCE_PRIORITY) {
    return SOURCE_PRIORITY[source as HealthDataSource] ?? 0;
  }
  return 0;
};

/**
 * 检查数据是否应该插入
 */
export async function checkDataDuplication(
  inputData: HealthDataInput,
  memberId: string,
): Promise<DeduplicationResult> {
  // 确定检查的时间窗口
  const timeWindow = getTimeWindowForData(inputData);
  const windowStart = subHours(inputData.measuredAt, timeWindow);
  const windowEnd = addHours(inputData.measuredAt, timeWindow);

  const existingRecords = await convexClient.query<HealthDataRecord[]>(
    api.health.listByMemberDateRange,
    {
      memberId: memberId as Id<"familyMembers">,
      startDate: windowStart.getTime(),
      endDate: windowEnd.getTime(),
    },
  );

  const filteredRecords = existingRecords.filter((record) =>
    hasSameMetricsWithInput(record, inputData),
  );

  if (filteredRecords.length === 0) {
    return {
      shouldInsert: true,
      conflictingRecords: [],
      recommendedAction: "INSERT",
    };
  }

  // 分析冲突记录
  const analysis = analyzeConflicts(inputData, existingRecords);

  return analysis;
}

/**
 * 根据数据类型确定时间窗口
 */
function getTimeWindowForData(data: HealthDataInput): number {
  // 根据数据类型返回不同的时间窗口（小时）
  if (data.weight !== null && data.weight !== undefined) {
    return DEDUPLICATION_WINDOWS.WEIGHT;
  }
  if (data.heartRate !== null && data.heartRate !== undefined) {
    return DEDUPLICATION_WINDOWS.HEART_RATE;
  }
  if (
    data.bloodPressureSystolic !== null &&
    data.bloodPressureSystolic !== undefined
  ) {
    return DEDUPLICATION_WINDOWS.BLOOD_PRESSURE;
  }

  // 默认时间窗口
  return 1;
}

function hasSameMetricsWithInput(
  record: HealthDataRecord,
  data: HealthDataInput,
): boolean {
  const hasWeight =
    data.weight !== null &&
    data.weight !== undefined &&
    record.weight !== null &&
    record.weight !== undefined;
  const hasHeartRate =
    data.heartRate !== null &&
    data.heartRate !== undefined &&
    record.heartRate !== null &&
    record.heartRate !== undefined;
  const hasBloodPressure =
    data.bloodPressureSystolic !== null &&
    data.bloodPressureSystolic !== undefined &&
    record.bloodPressureSystolic !== null &&
    record.bloodPressureSystolic !== undefined;

  return hasWeight || hasHeartRate || hasBloodPressure;
}

/**
 * 分析数据冲突
 */
function analyzeConflicts(
  newData: HealthDataInput,
  existingRecords: HealthDataRecord[],
): DeduplicationResult {
  const sortedRecords = [...existingRecords].sort(
    (a, b) => getSourcePriority(b.source) - getSourcePriority(a.source),
  );

  const highestPriorityRecord = sortedRecords[0];
  if (!highestPriorityRecord) {
    return {
      shouldInsert: true,
      conflictingRecords: [],
      recommendedAction: "INSERT",
    };
  }
  const newSourcePriority = getSourcePriority(newData.source);
  const highestSourcePriority = getSourcePriority(highestPriorityRecord.source);

  if (newSourcePriority > highestSourcePriority) {
    return {
      shouldInsert: false,
      conflictingRecords: [highestPriorityRecord],
      recommendedAction: "UPDATE",
      reason: `设备数据 (${newData.source}) 优先级高于现有数据 (${highestPriorityRecord.source})，建议更新`,
    };
  }

  if (newSourcePriority < highestSourcePriority) {
    return {
      shouldInsert: false,
      conflictingRecords: [highestPriorityRecord],
      recommendedAction: "SKIP",
      reason: `现有数据来源 (${highestPriorityRecord.source}) 优先级高于新数据 (${newData.source})，建议跳过`,
    };
  }

  const samePriorityRecords = sortedRecords.filter(
    (record) => getSourcePriority(record.source) === newSourcePriority,
  );

  if (samePriorityRecords.length > 0) {
    const mostRecentSamePriority = samePriorityRecords[0];
    if (!mostRecentSamePriority) {
      return {
        shouldInsert: true,
        conflictingRecords: [],
        recommendedAction: "INSERT",
      };
    }

    const mostRecentDate = new Date(mostRecentSamePriority.measuredAt);
    if (isAfter(newData.measuredAt, mostRecentDate)) {
      return {
        shouldInsert: false,
        conflictingRecords: [mostRecentSamePriority],
        recommendedAction: "UPDATE",
        reason: "新数据时间更新，建议更新现有记录",
      };
    }
    return {
      shouldInsert: false,
      conflictingRecords: [mostRecentSamePriority],
      recommendedAction: "SKIP",
      reason: "存在时间更新的相同优先级数据，建议跳过",
    };
  }

  return {
    shouldInsert: true,
    conflictingRecords: [],
    recommendedAction: "INSERT",
  };
}

/**
 * 批量处理数据去重
 */
export async function batchDeduplicate(
  inputDataList: HealthDataInput[],
  memberId: string,
): Promise<DeduplicationResult[]> {
  const results: DeduplicationResult[] = [];

  // 按时间排序输入数据，确保较新的数据后处理
  const sortedInput = inputDataList.sort(
    (a, b) =>
      new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );

  for (const inputData of sortedInput) {
    const result = await checkDataDuplication(inputData, memberId);
    results.push(result);
  }

  return results;
}

/**
 * 清理重复数据（定期任务）
 */
export async function cleanupDuplicateData(memberId: string) {
  // 查找最近30天的数据
  const thirtyDaysAgo = subHours(new Date(), 24 * 30);

  const recentData = await convexClient.query<HealthDataRecord[]>(
    api.health.listByMemberDateRange,
    {
      memberId: memberId as Id<"familyMembers">,
      startDate: thirtyDaysAgo.getTime(),
    },
  );

  if (recentData.length === 0) {
    return { cleanedCount: 0, warnings: [] };
  }

  const toDelete: Array<Id<"healthData">> = [];
  const warnings: string[] = [];

  for (let i = 0; i < recentData.length; i++) {
    const current = recentData[i];
    if (!current) {
      continue;
    }
    const currentDate = new Date(current.measuredAt);
    const windowStart = subHours(currentDate, 1);
    const windowEnd = addHours(currentDate, 1);

    const duplicates = recentData.filter((record) => {
      if (record._id === current._id) return false;
      const recordDate = new Date(record.measuredAt);
      return (
        isAfter(recordDate, windowStart) &&
        isBefore(recordDate, windowEnd) &&
        hasSameMetrics(record, current)
      );
    });

    if (duplicates.length > 0) {
      const allRecords = [current, ...duplicates];
      const sortedByPriority = allRecords.sort((a, b) => {
        const priorityA = getSourcePriority(a.source);
        const priorityB = getSourcePriority(b.source);
        return priorityB - priorityA;
      });

      const toKeep = sortedByPriority[0];
      if (!toKeep) {
        continue;
      }
      const toDeleteFromGroup = sortedByPriority.slice(1);

      toDeleteFromGroup.forEach((record) => {
        if (!record) {
          return;
        }
        if (!toDelete.some((id) => id === record._id)) {
          toDelete.push(record._id);
        }
      });

      if (toDeleteFromGroup.length > 0) {
        warnings.push(
          `发现 ${toDeleteFromGroup.length + 1} 条重复数据于 ${currentDate.toISOString()}，保留 ${toKeep.source} 来源的数据`,
        );
      }
    }
  }

  if (toDelete.length > 0) {
    await convexClient.mutation(api.health.deleteRecords, {
      recordIds: toDelete,
    });
  }

  return {
    cleanedCount: toDelete.length,
    warnings,
  };
}

/**
 * 检查两条记录是否有相同的健康指标
 */
function hasSameMetrics(
  record1: HealthDataRecord,
  record2: HealthDataRecord,
): boolean {
  const metrics: Array<keyof HealthDataRecord> = [
    "weight",
    "heartRate",
    "bloodPressureSystolic",
  ];

  return metrics.some((metric) => {
    const value1 = record1[metric];
    const value2 = record2[metric];
    return (
      value1 !== null &&
      value2 !== null &&
      value1 !== undefined &&
      value2 !== undefined
    );
  });
}

/**
 * 获取数据去重统计
 */
export async function getDeduplicationStats(memberId: string) {
  const thirtyDaysAgo = subHours(new Date(), 24 * 30);

  const records = await convexClient.query<HealthDataRecord[]>(
    api.health.listByMemberDateRange,
    {
      memberId: memberId as Id<"familyMembers">,
      startDate: thirtyDaysAgo.getTime(),
    },
  );

  const sourceCounts = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.source] = (acc[record.source] ?? 0) + 1;
    return acc;
  }, {});

  const totalRecords = records.length;

  return {
    totalRecords,
    sourceBreakdown: Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
      percentage: totalRecords
        ? ((count / totalRecords) * 100).toFixed(1)
        : "0.0",
    })),
  };
}
