// ============================================================================
// 智能触发 Cron 任务
// 每日运行，遍历用户计算触发分数
// ============================================================================

// @ts-nocheck - Convex returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { smartTriggerEngine } from "@/lib/services/smart-trigger";
import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference } from "@/lib/convex-reference";

// Type definitions for Convex documents
interface TriggerLogDoc {
  _id?: string;
  userId?: string;
  triggerType?: string;
  triggerScore?: number;
  triggered?: boolean;
  emailSent?: boolean;
  createdAt?: number;
}

interface UserDoc {
  _id?: string;
}

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

    // 使用 Convex 查询触发日志
    const logs = (await convexClient.query(
      asConvexQueryReference("smartTrigger:getTriggerLogs"),
      { userId: "system" } // 获取所有日志需要遍历，这里简化处理
    )) as TriggerLogDoc[] | null;

    // 获取最近的100条日志（客户端过滤）
    const recentLogs = (logs || [])
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 100)
      .map((log) => ({
        id: log._id,
        userId: log.userId,
        triggerType: log.triggerType,
        triggerScore: log.triggerScore,
        triggered: log.triggered,
        emailSent: log.emailSent,
        createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
      }));

    const stats = {
      total: recentLogs.length,
      triggered: recentLogs.filter((l) => l.triggered).length,
      emailsSent: recentLogs.filter((l) => l.emailSent).length,
      averageScore:
        recentLogs.length > 0
          ? recentLogs.reduce((sum, l) => sum + (l.triggerScore || 0), 0) / recentLogs.length
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
  // 使用 Convex 获取用户信息
  const user = (await convexClient.query(asConvexQueryReference("users:getById"), {
    userId,
  })) as UserDoc | null;

  if (!user) {
    console.log(`[SmartTrigger] No user found for ${userId}`);
    return;
  }

  console.log(`[SmartTrigger] Would generate meal plan for user ${userId}`);
}
