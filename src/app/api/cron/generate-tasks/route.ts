import { NextRequest, NextResponse } from 'next/server';
import { taskGeneratorService } from '@/lib/services/task-generator-service';
import { prisma } from '@/lib/db';

/**
 * Cron Job: 每日任务生成
 *
 * Cloudflare Pages Scheduled Handler
 * 触发频率: 每天 08:00 UTC (北京时间 16:00)
 *
 * 功能:
 * - 检查所有活跃家庭的库存临期情况
 * - 为每个成员生成健康打卡任务
 * - 检查营养偏差并生成调整任务
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
  const results: {
    familiesProcessed: number;
    tasksGenerated: number;
    errors: string[];
  } = {
    familiesProcessed: 0,
    tasksGenerated: 0,
    errors: [],
  };

  try {
    // 获取所有活跃家庭（30 天内有活动）
    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - 30);

    const activeFamilies = await prisma.family.findMany({
      where: {
        deletedAt: null,
        updatedAt: {
          gte: activeThreshold,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    results.familiesProcessed = activeFamilies.length;

    // 为每个家庭生成任务
    for (const family of activeFamilies) {
      try {
        const generatedTasks = await taskGeneratorService.generateTasks(
          family.id,
        );
        results.tasksGenerated += generatedTasks.length;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Family ${family.id}: ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
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
