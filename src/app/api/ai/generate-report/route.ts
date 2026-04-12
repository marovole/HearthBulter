import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { healthReportGenerator, ReportType } from "@/lib/services/ai/health-report-generator";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { healthRepository } from "@/lib/repositories/health-repository-singleton";
import { mealTrackingRepository } from "@/lib/repositories/meal-tracking-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexQueryReference } from "@/lib/convex-reference";
import { getDefaultRateLimitConfig, rateLimiter } from "@/lib/services/ai/rate-limiter";
import { sensitiveFilter } from "@/lib/services/sensitive-filter";

// Convex ID type - using string with type assertion
type Id<TableName extends string> = string & { __tableName: TableName };

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 速率限制检查
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      "ai_generate_report",
      getDefaultRateLimitConfig("ai_generate_report")
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
            "Retry-After": rateLimitResult.retryAfter?.toString() || "86400",
          },
        }
      );
    }

    const body = await request.json();
    const {
      memberId,
      reportType = ReportType.WEEKLY,
      startDate,
      endDate,
      includeAIInsights = true,
    } = body;

    if (!memberId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Member ID, start date, and end date are required" },
        { status: 400 }
      );
    }

    // 验证用户权限
    const accessResult = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    // 收集报告数据
    const reportData = await collectReportData(
      memberId,
      reportType,
      new Date(startDate),
      new Date(endDate)
    );

    // 生成报告
    const report = await healthReportGenerator.generateReport(reportData, includeAIInsights);

    // 保存报告到数据库
    const reportId = await convexClient.mutation(api.analytics.createHealthReport, {
      memberId: memberId as Id<"familyMembers">,
      reportType: reportType.toUpperCase(),
      startDate: new Date(startDate).getTime(),
      endDate: new Date(endDate).getTime(),
      title: report.title,
      summary: report.summary,
      htmlContent: report.htmlContent,
      dataSnapshot: JSON.stringify(reportData),
      insights: report.insights.length > 0 ? JSON.stringify(report.insights) : "",
      overallScore:
        report.sections.find((s) => s.id === "executive_summary")?.data?.overall_score || 0,
    });

    // 保存AI建议记录
    if (report.insights.length > 0) {
      await healthRepository.saveHealthAdvice({
        memberId,
        type: "REPORT_GENERATION",
        content: {
          reportId: reportId as string,
          insights: report.insights,
          recommendations: report.recommendations,
        },
        prompt: `Generated ${reportType} health report with AI insights`,
        tokens: 0,
      });
    }

    return NextResponse.json({
      reportId: reportId as string,
      report: {
        ...report,
        id: reportId as string,
        shareToken: report.shareToken,
      },
    });
  } catch (error) {
    console.error("Report generation API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET 方法用于获取报告历史
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const reportType = searchParams.get("type") as ReportType;
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    // 验证用户权限
    const accessResult = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: "Member not found or access denied" }, { status: 404 });
    }

    // 获取报告历史 — 使用宽泛日期范围获取最近报告
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const convexReports = (await convexClient.query(
      asConvexQueryReference("analytics:getHealthReportsByMember"),
      {
        memberId: memberId as Id<"familyMembers">,
        startDate: ninetyDaysAgo,
        endDate: now,
        limit,
      }
    )) as Array<{
      _id: string;
      title: string;
      reportType: string;
      startDate: number;
      endDate: number;
      summary: string;
      overallScore: number;
      status: string;
      createdAt: number;
      shareToken?: string;
    }>;

    // 过滤报告类型并映射字段
    let reports = convexReports || [];
    if (reportType) {
      reports = reports.filter((r) => r.reportType === reportType.toUpperCase());
    }

    // 限制数量并映射为响应格式
    const mappedReports = reports.slice(0, limit).map((r) => ({
      id: r._id,
      title: r.title,
      reportType: r.reportType,
      startDate: new Date(r.startDate).toISOString(),
      endDate: new Date(r.endDate).toISOString(),
      summary: r.summary,
      overallScore: r.overallScore,
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
      shareToken: r.shareToken,
    }));

    return NextResponse.json({ reports: mappedReports });
  } catch (error) {
    console.error("Report history API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 辅助函数：收集报告数据
async function collectReportData(
  memberId: string,
  reportType: ReportType,
  startDate: Date,
  endDate: Date
) {
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  // 并行获取所有数据
  const [healthScores, nutritionTargets, auxiliaryTrackings, healthMetricsResult, mealLogsResult] =
    await Promise.all([
      // 获取健康评分数据
      convexClient.query(asConvexQueryReference("analytics:listHealthScores"), {
        memberId: memberId as Id<"familyMembers">,
        startDate: startTimestamp,
        endDate: endTimestamp,
      }) as Promise<Array<{ date: number; overallScore: number }>>,

      // 获取营养数据
      convexClient.query(asConvexQueryReference("analytics:listDailyNutritionTargets"), {
        memberId: memberId as Id<"familyMembers">,
        startDate: startTimestamp,
        endDate: endTimestamp,
      }) as Promise<
        Array<{
          date: number;
          targetCalories: number;
          actualCalories: number;
          targetProtein: number;
          actualProtein: number;
          targetCarbs: number;
          actualCarbs: number;
          targetFat: number;
          actualFat: number;
        }>
      >,

      // 获取活动数据
      convexClient.query(asConvexQueryReference("analytics:listAuxiliaryTrackings"), {
        memberId: memberId as Id<"familyMembers">,
        startDate: startTimestamp,
        endDate: endTimestamp,
      }) as Promise<
        Array<{
          date: number;
          exerciseMinutes?: number;
          waterIntake?: number;
        }>
      >,

      // 获取健康指标数据
      memberRepository.getHealthData({
        memberId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 100,
        sortOrder: "asc",
      }),

      // 获取餐饮记录
      mealTrackingRepository.listMealLogs(
        memberId,
        {
          startDate,
          endDate,
        },
        { limit: 100 }
      ),
    ]);

  // 处理健康指标数据
  const healthMetrics = healthMetricsResult.data.map((h) => ({
    measuredAt: new Date(h.measuredAt),
    weight: h.weight ?? null,
    bloodPressureSystolic: h.bloodPressureSystolic ?? null,
    bloodPressureDiastolic: h.bloodPressureDiastolic ?? null,
    heartRate: h.heartRate ?? null,
  }));

  // 处理餐饮记录
  const mealLogsByDate = mealLogsResult.items.reduce<
    Record<
      string,
      {
        date: string;
        meals: Array<{ type: string; calories: number; satisfaction: number }>;
      }
    >
  >((acc, log) => {
    const dateKey = log.date.toISOString().slice(0, 10);
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, meals: [] };
    }
    acc[dateKey].meals.push({
      type: log.mealType,
      calories: log.calories ?? 0,
      satisfaction: 3,
    });
    return acc;
  }, {});

  const mealLogsArray = Object.values(mealLogsByDate);

  // 整理数据格式
  return {
    reportType,
    memberId,
    startDate,
    endDate,
    data: {
      health_scores: healthScores.map((h) => ({
        date: new Date(h.date).toISOString().slice(0, 10),
        score: h.overallScore ?? 0,
      })),
      nutrition_data: {
        calories: nutritionTargets.map((n) => ({
          date: new Date(n.date).toISOString().slice(0, 10),
          actual: n.actualCalories ?? 0,
          target: n.targetCalories ?? 0,
        })),
        macros: {
          protein: nutritionTargets.map((n) => ({
            date: new Date(n.date).toISOString().slice(0, 10),
            actual: n.actualProtein ?? 0,
            target: n.targetProtein ?? 0,
          })),
          carbs: nutritionTargets.map((n) => ({
            date: new Date(n.date).toISOString().slice(0, 10),
            actual: n.actualCarbs ?? 0,
            target: n.targetCarbs ?? 0,
          })),
          fat: nutritionTargets.map((n) => ({
            date: new Date(n.date).toISOString().slice(0, 10),
            actual: n.actualFat ?? 0,
            target: n.targetFat ?? 0,
          })),
        },
      },
      activity_data: auxiliaryTrackings.map((a) => ({
        date: new Date(a.date).toISOString().slice(0, 10),
        exercise_minutes: a.exerciseMinutes ?? 0,
        water_intake: a.waterIntake ?? 0,
      })),
      health_metrics: {
        weight: healthMetrics
          .filter((h) => h.weight)
          .map((h) => ({
            date: h.measuredAt.toISOString().slice(0, 10),
            value: h.weight!,
          })),
        blood_pressure: healthMetrics
          .filter((h) => h.bloodPressureSystolic && h.bloodPressureDiastolic)
          .map((h) => ({
            date: h.measuredAt.toISOString().slice(0, 10),
            systolic: h.bloodPressureSystolic!,
            diastolic: h.bloodPressureDiastolic!,
          })),
        heart_rate: healthMetrics
          .filter((h) => h.heartRate)
          .map((h) => ({
            date: h.measuredAt.toISOString().slice(0, 10),
            value: h.heartRate!,
          })),
      },
      meal_logs: mealLogsArray,
    },
  };
}
