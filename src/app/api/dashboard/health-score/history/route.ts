// @ts-nocheck - neonAdapter returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { api, convexClient } from "@/lib/convex-client";
import { subDays, format } from "date-fns";

/**
 * 验证用户是否有权限访问成员的健康数据
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
async function verifyMemberAccess(memberId: string, clerkId: string): Promise<boolean> {
  const result = await convexClient.query(api.members.verifyAccess, {
    memberId: memberId as any,
    clerkId,
  });
  return Boolean(result?.hasAccess);
}

function getBmiCategory(bmi: number): "underweight" | "normal" | "overweight" | "obese" {
  if (bmi < 18.5) return "underweight";
  if (bmi < 24) return "normal";
  if (bmi < 28) return "overweight";
  return "obese";
}

async function getCurrentHealthScore(memberId: string) {
  const member = await convexClient.query(api.members.getById, {
    memberId: memberId as any,
  });

  const latestMetrics = await convexClient.query(api.health.getMetrics, {
    memberId: memberId as any,
    limit: 1,
  });

  const latest = Array.isArray(latestMetrics) ? latestMetrics[0] : null;
  const weight: number | null =
    typeof latest?.weight === "number"
      ? latest.weight
      : typeof member?.weight === "number"
        ? member.weight
        : null;

  const heightCm: number | null = typeof member?.height === "number" ? member.height : null;
  const bmi = weight !== null && heightCm !== null ? weight / Math.pow(heightCm / 100, 2) : null;

  const bmiCategory = bmi !== null ? getBmiCategory(bmi) : null;
  const bmiScore =
    bmiCategory === "normal" ? 25 : bmiCategory === "overweight" ? 18 : bmiCategory ? 12 : 10;

  const nutritionScore = 25;
  const activityScore = 20;
  const dataCompletenessScore = weight !== null && heightCm !== null ? 20 : 10;

  const totalScore = Math.round(
    Math.max(0, Math.min(100, bmiScore + nutritionScore + activityScore + dataCompletenessScore))
  );

  return { totalScore };
}

/**
 * GET /api/dashboard/health-score/history
 * 获取健康评分历史数据
 */
export async function GET(request: NextRequest) {
  try {
    const clerkId = request.headers.get("x-auth-user-id");
    if (!clerkId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 解析查询参数
    const searchParams = new URL(request.url).searchParams;
    const memberId = searchParams.get("memberId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!memberId) {
      return NextResponse.json({ error: "缺少成员ID参数" }, { status: 400 });
    }

    // 验证权限
    const hasAccess = await verifyMemberAccess(memberId, clerkId);
    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康评分历史数据" }, { status: 403 });
    }

    // 生成历史数据（模拟）
    const historyData = await generateHealthScoreHistory(memberId, days);

    return NextResponse.json({ data: historyData }, { status: 200 });
  } catch (error) {
    console.error("获取健康评分历史失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 生成健康评分历史数据（模拟）
 * 在实际应用中，这些数据应该从数据库中的历史记录获取
 */
async function generateHealthScoreHistory(
  memberId: string,
  days: number
): Promise<Array<{ date: string; score: number }>> {
  const history: Array<{ date: string; score: number }> = [];
  const now = new Date();

  const currentScore = await getCurrentHealthScore(memberId);
  const baseScore = currentScore.totalScore;

  // 生成过去几天的模拟数据
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);

    // 添加一些随机波动，但保持总体趋势
    const randomVariation = (Math.random() - 0.5) * 10; // -5 到 +5 的随机变化
    const trendFactor = ((days - i) / days) * 5; // 轻微的上升趋势
    const score = Math.max(0, Math.min(100, baseScore + randomVariation + trendFactor));

    history.push({
      date: format(date, "yyyy-MM-dd"),
      score: Math.round(score),
    });
  }

  return history;
}
