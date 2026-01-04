/**
 * 异常检测定时任务
 */

import { PrismaClient } from "@prisma/client";
import { detectAnomalies } from "../analytics/anomaly-detector";
import { TaskLogger } from "./logger";

const prisma = new PrismaClient();
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
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return await prisma.familyMember.findMany({
    where: {
      OR: [
        {
          mealLogs: {
            some: {
              date: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
        {
          healthData: {
            some: {
              measuredAt: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
        {
          healthScores: {
            some: {
              date: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
      ],
    },
    include: {
      family: true,
    },
  });
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
    dataPoint?: any;
  },
) {
  // 检查是否已存在相同的异常
  const existingAnomaly = await prisma.healthAnomaly.findFirst({
    where: {
      memberId,
      title: anomaly.title,
      status: "PENDING",
      detectedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时内
      },
    },
  });

  if (existingAnomaly) {
    logger.debug(
      `Anomaly already exists for member ${memberId}: ${anomaly.title}`,
    );
    return;
  }

  // 创建新异常记录
  await prisma.healthAnomaly.create({
    data: {
      memberId,
      title: anomaly.title,
      description: anomaly.description,
      severity: anomaly.severity,
      status: "PENDING",
      detectedAt: new Date(),
      metadata: anomaly.dataPoint ? JSON.stringify(anomaly.dataPoint) : null,
    },
  });

  logger.debug(
    `Saved anomaly for member ${memberId}: ${anomaly.title} (${anomaly.severity})`,
  );
}
