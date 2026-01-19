/**
 * 异常检测定时任务
 */

import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import type { AnomalyType, TrendDataType } from "@/lib/types/analytics";
import { detectAnomalies } from "../analytics/anomaly-detector";
import { TaskLogger } from "./logger";
const logger = new TaskLogger();

/**
 * 运行异常检测扫描
 */
export async function runAnomalyDetection(): Promise<void> {
  logger.info("Starting anomaly detection scan...");

  try {
    // 获取所有活跃的家庭成员
    const activeMembers = await getActiveMembers();

    if (activeMembers.length === 0) {
      logger.info("No active members found for anomaly detection");
      return;
    }

    logger.info(
      `Running anomaly detection for ${activeMembers.length} active members`,
    );

    let totalAnomalies = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const member of activeMembers) {
      try {
        // 运行异常检测
        const anomalies = await detectAnomalies(member.id);
        totalAnomalies += anomalies.length;

        if (anomalies.length > 0) {
          logger.info(
            `Found ${anomalies.length} anomalies for member ${member.name}`,
          );

          // 记录异常到数据库（如果detectAnomalies还没有做的话）
          for (const anomaly of anomalies) {
            await saveAnomaly(member.id, anomaly);
          }
        }

        successCount++;
      } catch (error) {
        logger.error(
          `Failed to run anomaly detection for member ${member.id}:`,
          error,
        );
        errorCount++;
      }
    }

    logger.info(
      `Anomaly detection completed: ${successCount} success, ${errorCount} errors, ${totalAnomalies} total anomalies found`,
    );
  } catch (error) {
    logger.error("Anomaly detection scan failed:", error);
    throw error;
  }
}

/**
 * 获取活跃成员（最近7天有数据记录的成员）
 */
async function getActiveMembers() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const members = await convexClient.query<Doc<"familyMembers">[]>(
    api.members.listAll,
    {},
  );

  const activeMembers: Array<{ id: string; name: string }> = [];

  for (const member of members) {
    const healthData = await convexClient.query<Doc<"healthData">[]>(
      api.health.getMetrics,
      { memberId: member._id as Id<"familyMembers"> },
    );

    const hasRecentData = healthData.some(
      (record) => (record.measuredAt ?? record.createdAt ?? 0) >= cutoff,
    );

    if (hasRecentData) {
      activeMembers.push({ id: member._id, name: member.name });
    }
  }

  return activeMembers;
}

/**
 * 保存异常到数据库
 */
async function saveAnomaly(
  memberId: string,
  anomaly: {
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    anomalyType: AnomalyType;
    value: number;
    dataType?: TrendDataType;
    expectedMin?: number;
    expectedMax?: number;
    deviation?: number;
  },
) {
  // 检查是否已存在相同的异常
  const now = Date.now();
  const recentAnomalies = await convexClient.query<Doc<"healthAnomalies">[]>(
    api.analytics.listAnomaliesByMember,
    {
      memberId: memberId as Id<"familyMembers">,
      startDate: now - 24 * 60 * 60 * 1000,
      endDate: now,
      limit: 50,
    },
  );

  const existingAnomaly = recentAnomalies.find(
    (record) => record.title === anomaly.title && record.status === "PENDING",
  );

  if (existingAnomaly) {
    logger.debug(
      `Anomaly already exists for member ${memberId}: ${anomaly.title}`,
    );
    return;
  }

  await convexClient.mutation(api.analytics.createHealthAnomaly, {
    memberId: memberId as Id<"familyMembers">,
    anomalyType: anomaly.anomalyType,
    severity: anomaly.severity,
    title: anomaly.title,
    description: anomaly.description,
    dataType: anomaly.dataType ?? "HEALTH_SCORE",
    value: anomaly.value,
    expectedMin: anomaly.expectedMin,
    expectedMax: anomaly.expectedMax,
    deviation: anomaly.deviation,
    detectedAt: now,
  });

  logger.debug(
    `Saved anomaly for member ${memberId}: ${anomaly.title} (${anomaly.severity})`,
  );
}
