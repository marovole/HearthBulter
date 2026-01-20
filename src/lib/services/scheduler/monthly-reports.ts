/**
 * 每月报告生成任务
 */

import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { createReport } from "../analytics/report-generator";
import { TaskLogger } from "./logger";
const logger = new TaskLogger();

/**
 * 生成所有活跃用户的月报
 */
export async function generateMonthlyReports(): Promise<void> {
  logger.info("Starting monthly report generation...");

  try {
    // 获取所有活跃的家庭成员
    const activeMembers = await getActiveMembers();

    if (activeMembers.length === 0) {
      logger.info("No active members found for monthly reports");
      return;
    }

    logger.info(`Found ${activeMembers.length} active members for monthly reports`);

    let successCount = 0;
    let errorCount = 0;

    for (const member of activeMembers) {
      try {
        // 检查本月是否已经生成过报告
        const existingReport = await checkExistingReport(member.id, "MONTHLY");
        if (existingReport) {
          logger.debug(`Monthly report already exists for member ${member.id}, skipping`);
          continue;
        }

        // 生成月报
        await createReport(member.id, "MONTHLY");
        logger.info(`Generated monthly report for member ${member.name}`);
        successCount++;
      } catch (error) {
        logger.error(`Failed to generate monthly report for member ${member.id}:`, error);
        errorCount++;
      }
    }

    logger.info(
      `Monthly report generation completed: ${successCount} success, ${errorCount} errors`
    );
  } catch (error) {
    logger.error("Monthly report generation failed:", error);
    throw error;
  }
}

/**
 * 获取活跃成员（最近60天有数据记录的成员）
 */
async function getActiveMembers() {
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const members = await convexClient.query<Doc<"familyMembers">[]>(api.members.listAll, {});

  const activeMembers: Array<{ id: string; name: string }> = [];

  for (const member of members) {
    const healthData = await convexClient.query<Doc<"healthData">[]>(api.health.getMetrics, {
      memberId: member._id as Id<"familyMembers">,
    });

    const hasRecentData = healthData.some(
      (record) => (record.measuredAt ?? record.createdAt ?? 0) >= cutoff
    );

    if (hasRecentData) {
      activeMembers.push({ id: member._id, name: member.name });
    }
  }

  return activeMembers;
}

/**
 * 检查是否已存在本月的报告
 */
async function checkExistingReport(memberId: string, reportType: string) {
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const reports = await convexClient.query<Doc<"healthReports">[]>(
    api.analytics.getHealthReportsByMember,
    {
      memberId: memberId as Id<"familyMembers">,
      startDate: monthStart.getTime(),
      endDate: now,
      limit: 10,
    }
  );

  return reports.find((report) => report.reportType === reportType) ?? null;
}
