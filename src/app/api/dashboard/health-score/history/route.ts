import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { healthScoreCalculator } from "@/lib/services/health-score-calculator";
import { subDays, format } from "date-fns";

/**
 * 验证用户是否有权限访问成员的健康数据
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
async function verifyMemberAccess(
  memberId: string,
  userId: string,
): Promise<{ hasAccess: boolean }> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId, deletedAt: null },
    include: {
      family: {
        select: {
          creatorId: true,
          members: {
            where: { userId, deletedAt: null },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!member) {
    return { hasAccess: false };
  }

  const isCreator = member.family.creatorId === userId;
  const isAdmin = member.family.members[0]?.role === "ADMIN" || isCreator;
  const isSelf = member.userId === userId;

  return {
    hasAccess: isAdmin || isSelf,
  };
}

/**
 * GET /api/dashboard/health-score/history
 * 获取健康评分历史数据
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!memberId) {
      return NextResponse.json({ error: "缺少成员ID参数" }, { status: 400 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "无权限访问该成员的健康评分历史数据" },
        { status: 403 },
      );
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
  days: number,
): Promise<Array<{ date: string; score: number }>> {
  const history: Array<{ date: string; score: number }> = [];
  const now = new Date();

  // 获取当前健康评分作为基准
  const currentScore =
    await healthScoreCalculator.calculateHealthScore(memberId);
  const baseScore = currentScore.totalScore;

  // 生成过去几天的模拟数据
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);

    // 添加一些随机波动，但保持总体趋势
    const randomVariation = (Math.random() - 0.5) * 10; // -5 到 +5 的随机变化
    const trendFactor = ((days - i) / days) * 5; // 轻微的上升趋势
    const score = Math.max(
      0,
      Math.min(100, baseScore + randomVariation + trendFactor),
    );

    history.push({
      date: format(date, "yyyy-MM-dd"),
      score: Math.round(score),
    });
  }

  return history;
}
