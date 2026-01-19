import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { priceAnalyzer } from "@/lib/services/budget/price-analyzer";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const foodId = searchParams.get("foodId");
    const days = searchParams.get("days");
    const popular = searchParams.get("popular");

    if (popular === "true") {
      // 获取热门食物价格趋势
      const limit = parseInt(searchParams.get("limit") || "20");
      const trends = await priceAnalyzer.getPopularFoodsPrices(limit);

      return NextResponse.json({
        type: "popular",
        data: trends,
        count: trends.length,
      });
    }

    if (!foodId) {
      return NextResponse.json({ error: "缺少foodId参数" }, { status: 400 });
    }

    // 获取特定食物的价格趋势
    const trend = await priceAnalyzer.getPriceTrend(
      foodId,
      days ? parseInt(days) : undefined,
    );

    return NextResponse.json({
      type: "single",
      foodId,
      data: trend,
    });
  } catch (error) {
    console.error("获取价格趋势失败:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "获取价格趋势失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { foodIds, memberId } = body;

    if (!foodIds || !Array.isArray(foodIds)) {
      return NextResponse.json({ error: "缺少foodIds参数" }, { status: 400 });
    }

    // 批量获取价格趋势
    const trends = await Promise.all(
      foodIds.map(async (foodId: string) => {
        try {
          const trend = await priceAnalyzer.getPriceTrend(foodId);
          return { foodId, success: true, data: trend };
        } catch (error) {
          return {
            foodId,
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          };
        }
      }),
    );

    // 生成价格预警
    let alerts: Awaited<ReturnType<typeof priceAnalyzer.getPriceAlerts>> = [];
    if (memberId) {
      try {
        const access = await memberRepository.verifyMemberAccess(
          memberId,
          session.user.id,
        );
        if (!access.hasAccess) {
          return NextResponse.json(
            { error: "无权限访问该成员的价格预警" },
            { status: 403 },
          );
        }
        alerts = await priceAnalyzer.getPriceAlerts(memberId);
      } catch (error) {
        console.error("获取价格预警失败:", error);
      }
    }

    return NextResponse.json({
      trends,
      alerts,
      summary: {
        total: foodIds.length,
        successful: trends.filter((t) => t.success).length,
        failed: trends.filter((t) => !t.success).length,
      },
    });
  } catch (error) {
    console.error("批量获取价格趋势失败:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "批量获取价格趋势失败" },
      { status: 500 },
    );
  }
}
