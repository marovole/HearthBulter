/**
 * 数据去重服务
 * 实现可穿戴设备数据的智能去重，避免与手动录入冲突
 */

import { addHours, subHours, isBefore, isAfter, isEqual } from 'date-fns';
import type {
  HealthData,
  HealthDataSource,
  DeviceConnection,
} from '@prisma/client';
import { prisma } from '@/lib/db';
import type { HealthDataInput, HealthDataType } from '@/types/wearable-devices';
import { DEDUPLICATION_WINDOWS } from '@/types/wearable-devices';

/**
 * 去重结果类型
 */
export interface DeduplicationResult {
  shouldInsert: boolean;
  conflictingRecords: HealthData[];
  recommendedAction: 'INSERT' | 'UPDATE' | 'SKIP';
  reason?: string;
}

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
  MANUAL: 0,
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

  // 查找时间窗口内的现有数据
  const existingRecords = await prisma.healthData.findMany({
    where: {
      memberId,
      measuredAt: {
        gte: windowStart,
        lte: windowEnd,
      },
      // 只检查有相同指标的数据
      OR: getSameDataConditions(inputData),
    },
    orderBy: {
      measuredAt: 'desc',
    },
  });

  if (existingRecords.length === 0) {
    return {
      shouldInsert: true,
      conflictingRecords: [],
      recommendedAction: 'INSERT',
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

/**
 * 构建相同数据的查询条件
 */
function getSameDataConditions(data: HealthDataInput) {
  const conditions = [];

  if (data.weight !== null && data.weight !== undefined) {
    conditions.push({ weight: { not: null } });
  }
  if (data.heartRate !== null && data.heartRate !== undefined) {
    conditions.push({ heartRate: { not: null } });
  }
  if (
    data.bloodPressureSystolic !== null &&
    data.bloodPressureSystolic !== undefined
  ) {
    conditions.push({ bloodPressureSystolic: { not: null } });
  }

  return conditions;
}

/**
 * 分析数据冲突
 */
function analyzeConflicts(
  newData: HealthDataInput,
  existingRecords: HealthData[],
): DeduplicationResult {
  // 按数据来源优先级排序
  const sortedRecords = existingRecords.sort(
    (a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source],
  );

  // 找到优先级最高的记录
  const highestPriorityRecord = sortedRecords[0];
  const newSourcePriority = SOURCE_PRIORITY[newData.source];

  // 如果新数据来源优先级更高，建议更新
  if (newSourcePriority > SOURCE_PRIORITY[highestPriorityRecord.source]) {
    return {
      shouldInsert: false,
      conflictingRecords: [highestPriorityRecord],
      recommendedAction: 'UPDATE',
      reason: `设备数据 (${newData.source}) 优先级高于现有数据 (${highestPriorityRecord.source})，建议更新`,
    };
  }

  // 如果新数据来源优先级较低，跳过插入
  if (newSourcePriority < SOURCE_PRIORITY[highestPriorityRecord.source]) {
    return {
      shouldInsert: false,
      conflictingRecords: [highestPriorityRecord],
      recommendedAction: 'SKIP',
      reason: `现有数据来源 (${highestPriorityRecord.source}) 优先级高于新数据 (${newData.source})，建议跳过`,
    };
  }

  // 如果优先级相同，检查时间
  const samePriorityRecords = sortedRecords.filter(
    (record) => SOURCE_PRIORITY[record.source] === newSourcePriority,
  );

  if (samePriorityRecords.length > 0) {
    const mostRecentSamePriority = samePriorityRecords[0];

    // 如果新数据时间更新，建议更新
    if (isAfter(newData.measuredAt, mostRecentSamePriority.measuredAt)) {
      return {
        shouldInsert: false,
        conflictingRecords: [mostRecentSamePriority],
        recommendedAction: 'UPDATE',
        reason: '新数据时间更新，建议更新现有记录',
      };
    } else {
      return {
        shouldInsert: false,
        conflictingRecords: [mostRecentSamePriority],
        recommendedAction: 'SKIP',
        reason: '存在时间更新的相同优先级数据，建议跳过',
      };
    }
  }

  // 默认情况下允许插入
  return {
    shouldInsert: true,
    conflictingRecords: [],
    recommendedAction: 'INSERT',
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

  const recentData = await prisma.healthData.findMany({
    where: {
      memberId,
      measuredAt: {
        gte: thirtyDaysAgo,
      },
    },
    orderBy: {
      measuredAt: 'asc',
    },
  });

  if (recentData.length === 0) {
    return { cleanedCount: 0, warnings: [] };
  }

  const toDelete: string[] = [];
  const warnings: string[] = [];

  // 按时间窗口分组检测重复
  for (let i = 0; i < recentData.length; i++) {
    const current = recentData[i];
    const windowStart = subHours(current.measuredAt, 1);
    const windowEnd = addHours(current.measuredAt, 1);

    // 查找同一时间窗口内的记录
    const duplicates = recentData.filter((record) => {
      if (record.id === current.id) return false;
      return (
        isAfter(record.measuredAt, windowStart) &&
        isBefore(record.measuredAt, windowEnd) &&
        hasSameMetrics(record, current)
      );
    });

    if (duplicates.length > 0) {
      // 按优先级分组
      const allRecords = [current, ...duplicates];
      const sortedByPriority = allRecords.sort(
        (a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source],
      );

      // 保留优先级最高的，其他标记为删除
      const toKeep = sortedByPriority[0];
      const toDeleteFromGroup = sortedByPriority.slice(1);

      toDeleteFromGroup.forEach((record) => {
        if (!toDelete.includes(record.id)) {
          toDelete.push(record.id);
        }
      });

      // 记录警告
      if (toDeleteFromGroup.length > 0) {
        warnings.push(
          `发现 ${toDeleteFromGroup.length + 1} 条重复数据于 ${current.measuredAt.toISOString()}，保留 ${toKeep.source} 来源的数据`,
        );
      }
    }
  }

  // 执行删除
  if (toDelete.length > 0) {
    await prisma.healthData.deleteMany({
      where: {
        id: {
          in: toDelete,
        },
      },
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
function hasSameMetrics(record1: HealthData, record2: HealthData): boolean {
  const metrics = ['weight', 'heartRate', 'bloodPressureSystolic'];

  return metrics.some((metric) => {
    const value1 = record1[metric as keyof HealthData];
    const value2 = record2[metric as keyof HealthData];
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

  const stats = await prisma.healthData.groupBy({
    by: ['source'],
    where: {
      memberId,
      measuredAt: {
        gte: thirtyDaysAgo,
      },
    },
    _count: {
      id: true,
    },
  });

  const totalRecords = stats.reduce((sum, stat) => sum + stat._count.id, 0);

  return {
    totalRecords,
    sourceBreakdown: stats.map((stat) => ({
      source: stat.source,
      count: stat._count.id,
      percentage: ((stat._count.id / totalRecords) * 100).toFixed(1),
    })),
  };
}
