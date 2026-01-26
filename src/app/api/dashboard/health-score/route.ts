// @ts-nocheck - neonAdapter returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { api, convexClient } from "@/lib/convex-client";

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

/**
 * GET /api/dashboard/health-score
 * 获取健康评分数据
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

    if (!memberId) {
      return NextResponse.json({ error: "缺少成员ID参数" }, { status: 400 });
    }

    // 验证权限
    const hasAccess = await verifyMemberAccess(memberId, clerkId);
    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康评分数据" }, { status: 403 });
    }

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

    const healthScore = {
      totalScore,
      breakdown: {
        bmiScore,
        nutritionScore,
        activityScore,
        dataCompletenessScore,
      },
      details: {
        bmi: bmi !== null ? Math.round(bmi * 10) / 10 : null,
        bmiCategory,
        nutritionAdherenceRate: 88,
        activityFrequency: 3,
        dataCompletenessRate: weight !== null && heightCm !== null ? 100 : 50,
      },
      recommendations: [
        bmiCategory === "overweight" || bmiCategory === "obese"
          ? "建议控制饮食并增加有氧运动"
          : bmiCategory === "underweight"
            ? "建议增加蛋白质摄入并进行力量训练"
            : "保持良好的生活习惯，继续坚持",
      ].filter(Boolean),
    };

    return NextResponse.json({ data: healthScore }, { status: 200 });
  } catch (error) {
    console.error("获取健康评分失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
