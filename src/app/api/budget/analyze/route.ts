import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { spendingAnalyzer } from "@/lib/services/budget/spending-analyzer";
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
    const memberId = searchParams.get("memberId");
    const period = searchParams.get("period") as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

    if (!memberId) {
      return NextResponse.json({ error: "缺少memberId参数" }, { status: 400 });
    }

    const access = await memberRepository.verifyMemberAccess(memberId, session.user.id);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的预算分析" }, { status: 403 });
    }

    const analysis = await spendingAnalyzer.analyzeSpending(memberId, period || "MONTHLY");

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("支出分析失败:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "支出分析失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, analysisType, customPeriod } = body;

    if (!memberId) {
      return NextResponse.json({ error: "缺少memberId参数" }, { status: 400 });
    }

    const access = await memberRepository.verifyMemberAccess(memberId, session.user.id);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的预算分析" }, { status: 403 });
    }

    let result;

    switch (analysisType) {
      case "trends":
        result = await spendingAnalyzer.getSpendingTrends(memberId, customPeriod?.months || 6);
        break;
      case "highCategories":
        result = await spendingAnalyzer.getHighSpendingCategories(
          memberId,
          customPeriod?.limit || 5
        );
        break;
      case "perPerson":
        result = await spendingAnalyzer.getPerPersonCost(memberId);
        break;
      default:
        result = await spendingAnalyzer.analyzeSpending(memberId, customPeriod?.type || "MONTHLY");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("自定义支出分析失败:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "自定义支出分析失败" }, { status: 500 });
  }
}
