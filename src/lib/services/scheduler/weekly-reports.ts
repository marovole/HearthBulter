/**
 * 每周报告生成任务
 */

import { PrismaClient, ReportType } from '@prisma/client';
import { createReport } from '../analytics/report-generator';
import { TaskLogger } from './logger';

const prisma = new PrismaClient();
const logger = new TaskLogger();

/**
 * 生成所有活跃用户的周报
 */
export async function generateWeeklyReports(): Promise<void> {
  logger.info('Starting weekly report generation...');

  try {
    // 获取所有活跃的家庭成员
    const activeMembers = await getActiveMembers();

    if (activeMembers.length === 0) {
      logger.info('No active members found for weekly reports');
      return;
    }

    logger.info(
      `Found ${activeMembers.length} active members for weekly reports`,
    );

    let successCount = 0;
    let errorCount = 0;

    for (const member of activeMembers) {
      try {
        // 检查本周是否已经生成过报告
        const existingReport = await checkExistingReport(member.id, 'WEEKLY');
        if (existingReport) {
          logger.debug(
            `Weekly report already exists for member ${member.id}, skipping`,
          );
          continue;
        }

        // 生成周报
        const report = await createReport(member.id, 'WEEKLY');
        logger.info(
          `Generated weekly report for member ${member.name}: ${report.id}`,
        );
        successCount++;
      } catch (error) {
        logger.error(
          `Failed to generate weekly report for member ${member.id}:`,
          error,
        );
        errorCount++;
      }
    }

    logger.info(
      `Weekly report generation completed: ${successCount} success, ${errorCount} errors`,
    );
  } catch (error) {
    logger.error('Weekly report generation failed:', error);
    throw error;
  }
}

/**
 * 获取活跃成员（最近30天有数据记录的成员）
 */
async function getActiveMembers() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return await prisma.familyMember.findMany({
    where: {
      OR: [
        {
          mealLogs: {
            some: {
              date: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
        {
          healthData: {
            some: {
              measuredAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
        {
          healthScores: {
            some: {
              date: {
                gte: thirtyDaysAgo,
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
 * 检查是否已存在本周的报告
 */
async function checkExistingReport(memberId: string, reportType: ReportType) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // 本周开始（周日）
  weekStart.setHours(0, 0, 0, 0);

  return await prisma.healthReport.findFirst({
    where: {
      memberId,
      reportType,
      createdAt: {
        gte: weekStart,
      },
    },
  });
}
