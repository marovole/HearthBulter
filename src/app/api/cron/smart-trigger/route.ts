// ============================================================================
// 智能触发 Cron 任务
// 每日运行，遍历用户计算触发分数
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { smartTriggerEngine } from "@/lib/services/smart-trigger";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// --------------------------------------------------------------------------
// POST: 执行智能触发任务
// --------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[SmartTrigger] Starting daily trigger check...");

    const results = await smartTriggerEngine.processAllUsers();

    const triggered = results.filter((r) => r.shouldTrigger);
    const reminders = results.filter((r) => r.suggestedAction === "send_reminder");

    console.log(`[SmartTrigger] Processed ${results.length} users`);
    console.log(`[SmartTrigger] Triggered: ${triggered.length}, Reminders: ${reminders.length}`);

    for (const result of triggered) {
      try {
        await generateAndNotifyMealPlan(result.userId);
      } catch (error) {
        console.error(`[SmartTrigger] Failed to generate plan for ${result.userId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      triggered: triggered.length,
      reminders: reminders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SmartTrigger] Cron job failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// GET: 获取触发状态
// --------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recentLogs = await prisma.smartTriggerLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        triggerType: true,
        triggerScore: true,
        triggered: true,
        emailSent: true,
        createdAt: true,
      },
    });

    const stats = {
      total: recentLogs.length,
      triggered: recentLogs.filter((l) => l.triggered).length,
      emailsSent: recentLogs.filter((l) => l.emailSent).length,
      averageScore:
        recentLogs.length > 0
          ? recentLogs.reduce((sum, l) => sum + l.triggerScore, 0) / recentLogs.length
          : 0,
    };

    return NextResponse.json({
      stats,
      recentLogs: recentLogs.slice(0, 20),
    });
  } catch (error) {
    console.error("[SmartTrigger] Status check failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// --------------------------------------------------------------------------
// 生成周计划并发送通知
// --------------------------------------------------------------------------

async function generateAndNotifyMealPlan(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      familyMembers: true,
    },
  });

  if (!user || !user.familyMembers) {
    console.log(`[SmartTrigger] No family member found for user ${userId}`);
    return;
  }

  console.log(`[SmartTrigger] Would generate meal plan for user ${userId}`);
}
