import { NextRequest, NextResponse } from 'next/server';
import { dailyReviewService } from '@/lib/services/daily-review-service';
import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

/**
 * Cron Job: 每日复盘生成
 *
 * Cloudflare Pages Scheduled Handler
 * 触发频率: 每天 20:00 UTC (北京时间次日 04:00)
 *
 * 功能:
 * - 为每个活跃家庭成员生成昨日复盘
 * - 聚合任务执行情况统计
 * - 生成关键成就和明日建议
 *
 * 安全: 通过 CRON_SECRET 环境变量验证
 */

export const runtime = 'edge';

// 声明此路由为 scheduled handler
export async function GET(request: NextRequest) {
  // 验证 Cron 密钥
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'CRON_SECRET not configured',
      },
      { status: 500 },
    );
  }

  // 检查 Authorization header 或 query parameter
  const querySecret = new URL(request.url).searchParams.get('secret');

  if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  const startTime = Date.now();
  const yesterday = subDays(new Date(), 1);

  const results: {
    membersProcessed: number;
    reviewsGenerated: number;
    reviewsUpdated: number;
    errors: string[];
  } = {
    membersProcessed: 0,
    reviewsGenerated: 0,
    reviewsUpdated: 0,
    errors: [],
  };

  try {
    // 获取所有活跃家庭成员（30 天内有活动）
    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - 30);

    const activeMembers = await prisma.familyMember.findMany({
      where: {
        deletedAt: null,
        updatedAt: {
          gte: activeThreshold,
        },
      },
      select: {
        id: true,
        name: true,
        familyId: true,
      },
    });

    results.membersProcessed = activeMembers.length;

    // 为每个成员生成复盘
    for (const member of activeMembers) {
      try {
        // 检查是否已存在复盘
        const existingReview = await dailyReviewService.getLatestReview(
          member.id,
        );

        // 如果最新复盘不是昨天的，则生成新的
        const shouldGenerate =
          !existingReview ||
          new Date(existingReview.reviewDate).toDateString() !==
            yesterday.toDateString();

        if (shouldGenerate) {
          const review = await dailyReviewService.generateDailyReview(
            member.familyId,
            member.id,
            yesterday,
          );

          if (existingReview) {
            results.reviewsUpdated++;
            console.log(
              `[Cron] Updated daily review for member ${member.name} (${member.id})`,
            );
          } else {
            results.reviewsGenerated++;
            console.log(
              `[Cron] Generated daily review for member ${member.name} (${member.id})`,
            );
          }

          // 记录统计信息
          const completionRate =
            review.totalTasks > 0
              ? Math.round((review.completedTasks / review.totalTasks) * 100)
              : 0;
          console.log(
            `[Cron] Review stats: ${review.totalTasks} total, ${review.completedTasks} completed, ${completionRate}% rate`,
          );
        } else {
          console.log(
            `[Cron] Review already exists for ${member.name} (${member.id}), skipping`,
          );
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Member ${member.id}: ${errorMsg}`);
        console.error(
          `[Cron] Error generating review for member ${member.id}:`,
          error,
        );
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        reviewDate: yesterday.toISOString(),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Cron] Fatal error in generate-daily-reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        results,
      },
      { status: 500 },
    );
  }
}

// 支持 POST 方法用于手动触发（开发测试用）
export async function POST(request: NextRequest) {
  return GET(request);
}

// Cloudflare Pages Scheduled Handler 类型声明
// 在实际部署时，Cloudflare 会调用此 handler
export const scheduled = async (event: ScheduledEvent) => {
  // 这里是 Cloudflare Workers 的 scheduled event handler
  // 在 Cloudflare Pages 环境中，GET 请求会被 Cloudflare Cron 调用
  return null;
};

// 类型定义
interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}
