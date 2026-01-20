/**
 * 每周报告生成任务
 */

import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { createReport } from "../analytics/report-generator";
import { TaskLogger } from "./logger";
const logger = new TaskLogger();

/**
 * 生成所有活跃用户的周报
 */
export async function generateWeeklyReports(): Promise<void> {
  logger.info("Starting weekly report generation...");

  try {
    // 获取所有活跃的家庭成员
    const activeMembers = await getActiveMembers();

    if (activeMembers.length === 0) {
      logger.info("No active members found for weekly reports");
      return;
    }

    logger.info(`Found ${activeMembers.length} active members for weekly reports`);

    let successCount = 0;
    let errorCount = 0;

    for (const member of activeMembers) {
      try {
        // 检查本周是否已经生成过报告
        const existingReport = await checkExistingReport(member.id, "WEEKLY");
        if (existingReport) {
          logger.debug(`Weekly report already exists for member ${member.id}, skipping`);
          continue;
        }

        // 生成周报
        await createReport(member.id, "WEEKLY");
        logger.info(`Generated weekly report for member ${member.name}`);
        successCount++;
      } catch (error) {
        logger.error(`Failed to generate weekly report for member ${member.id}:`, error);
        errorCount++;
      }
    }

    logger.info(
      `Weekly report generation completed: ${successCount} success, ${errorCount} errors`
    );
  } catch (error) {
    logger.error("Weekly report generation failed:", error);
    throw error;
  }
}

/**
 * 获取活跃成员（最近30天有数据记录的成员）
 */
async function getActiveMembers() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
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
 * 检查是否已存在本周的报告
 */
async function checkExistingReport(memberId: string, reportType: string) {
  const now = Date.now();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const reports = await convexClient.query<Doc<"healthReports">[]>(
    api.analytics.getHealthReportsByMember,
    {
      memberId: memberId as Id<"familyMembers">,
      startDate: weekStart.getTime(),
      endDate: now,
      limit: 10,
    }
  );

  return reports.find((report) => report.reportType === reportType) ?? null;
}
