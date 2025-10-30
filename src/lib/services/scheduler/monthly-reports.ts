/**
 * 每月报告生成任务
 */

import { PrismaClient, ReportType } from '@prisma/client';
import { createReport } from '../analytics/report-generator';
import { TaskLogger } from './logger';

const prisma = new PrismaClient();
const logger = new TaskLogger();

/**
 * 生成所有活跃用户的月报
 */
export async function generateMonthlyReports(): Promise<void> {
  logger.info('Starting monthly report generation...');
  
  try {
    // 获取所有活跃的家庭成员
    const activeMembers = await getActiveMembers();
    
    if (activeMembers.length === 0) {
      logger.info('No active members found for monthly reports');
      return;
    }

    logger.info(`Found ${activeMembers.length} active members for monthly reports`);

    let successCount = 0;
    let errorCount = 0;

    for (const member of activeMembers) {
      try {
        // 检查本月是否已经生成过报告
        const existingReport = await checkExistingReport(member.id, 'MONTHLY');
        if (existingReport) {
          logger.debug(`Monthly report already exists for member ${member.id}, skipping`);
          continue;
        }

        // 生成月报
        const report = await createReport(member.id, 'MONTHLY');
        logger.info(`Generated monthly report for member ${member.name}: ${report.id}`);
        successCount++;

      } catch (error) {
        logger.error(`Failed to generate monthly report for member ${member.id}:`, error);
        errorCount++;
      }
    }

    logger.info(`Monthly report generation completed: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    logger.error('Monthly report generation failed:', error);
    throw error;
  }
}

/**
 * 获取活跃成员（最近60天有数据记录的成员）
 */
async function getActiveMembers() {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  return await prisma.familyMember.findMany({
    where: {
      OR: [
        {
          mealLogs: {
            some: {
              date: {
                gte: sixtyDaysAgo,
              },
            },
          },
        },
        {
          healthData: {
            some: {
              measuredAt: {
                gte: sixtyDaysAgo,
              },
            },
          },
        },
        {
          healthScores: {
            some: {
              date: {
                gte: sixtyDaysAgo,
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
 * 检查是否已存在本月的报告
 */
async function checkExistingReport(memberId: string, reportType: ReportType) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // 本月开始

  return await prisma.healthReport.findFirst({
    where: {
      memberId,
      reportType,
      createdAt: {
        gte: monthStart,
      },
    },
  });
}
