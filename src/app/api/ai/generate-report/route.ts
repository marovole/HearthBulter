import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { healthReportGenerator, ReportType } from '@/lib/services/ai/health-report-generator';
import { prisma } from '@/lib/db';
import { rateLimiter } from '@/lib/services/ai/rate-limiter';
import { sensitiveFilter } from '@/lib/services/sensitive-filter';


// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 速率限制检查
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      'ai_generate_report'
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '86400',
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
        { error: 'Member ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    // 验证用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        OR: [
          { userId: session.user.id },
          {
            family: {
              members: {
                some: {
                  userId: session.user.id,
                  role: 'ADMIN',
                },
              },
            },
          },
        ],
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 收集报告数据
    const reportData = await collectReportData(memberId, reportType, new Date(startDate), new Date(endDate));

    // 生成报告
    const report = await healthReportGenerator.generateReport(reportData, includeAIInsights);

    // 保存报告到数据库
    const savedReport = await prisma.healthReport.create({
      data: {
        memberId,
        reportType: reportType.toUpperCase() as any,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        title: report.title,
        summary: report.summary,
        dataSnapshot: JSON.stringify(reportData),
        insights: report.insights.length > 0 ? report.insights : null,
        overallScore: report.sections.find(s => s.id === 'executive_summary')?.data?.overall_score || null,
        htmlContent: report.htmlContent,
        status: report.status,
        shareToken: report.shareToken,
      },
    });

    // 保存AI建议记录
    if (report.insights.length > 0) {
      await prisma.aIAdvice.create({
        data: {
          memberId,
          type: 'REPORT_GENERATION',
          content: {
            reportId: savedReport.id,
            insights: report.insights,
            recommendations: report.recommendations,
          },
          prompt: `Generated ${reportType} health report with AI insights`,
          tokens: 0,
        },
      });
    }

    return NextResponse.json({
      reportId: savedReport.id,
      report: {
        ...report,
        id: savedReport.id,
        shareToken: savedReport.shareToken,
      },
    });

  } catch (error) {
    console.error('Report generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET 方法用于获取报告历史
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const reportType = searchParams.get('type') as ReportType;
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // 验证用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        OR: [
          { userId: session.user.id },
          {
            family: {
              members: {
                some: {
                  userId: session.user.id,
                  role: 'ADMIN',
                },
              },
            },
          },
        ],
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 获取报告历史
    const reports = await prisma.healthReport.findMany({
      where: {
        memberId,
        ...(reportType && { reportType: reportType.toUpperCase() as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        reportType: true,
        startDate: true,
        endDate: true,
        summary: true,
        overallScore: true,
        status: true,
        createdAt: true,
        shareToken: true,
      },
    });

    return NextResponse.json({ reports });

  } catch (error) {
    console.error('Report history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 辅助函数：收集报告数据
async function collectReportData(
  memberId: string,
  reportType: ReportType,
  startDate: Date,
  endDate: Date
) {
  // 获取健康评分数据
  const healthScores = await prisma.healthScore.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      overallScore: true,
    },
  });

  // 获取营养数据
  const nutritionTargets = await prisma.dailyNutritionTarget.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      targetCalories: true,
      actualCalories: true,
      targetProtein: true,
      actualProtein: true,
      targetCarbs: true,
      actualCarbs: true,
      targetFat: true,
      actualFat: true,
    },
  });

  // 获取活动数据
  const auxiliaryTrackings = await prisma.auxiliaryTracking.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      exerciseMinutes: true,
      waterIntake: true,
    },
  });

  // 获取健康指标数据
  const healthMetrics = await prisma.healthData.findMany({
    where: {
      memberId,
      measuredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { measuredAt: 'asc' },
    select: {
      measuredAt: true,
      weight: true,
      bloodPressureSystolic: true,
      bloodPressureDiastolic: true,
      heartRate: true,
    },
  });

  // 获取餐饮记录
  const mealLogs = await prisma.mealLog.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      mealType: true,
      calories: true,
      notes: true,
    },
  });

  // 整理数据格式
  return {
    reportType,
    memberId,
    startDate,
    endDate,
    data: {
      health_scores: healthScores.map(h => ({
        date: h.date.toISOString().split('T')[0],
        score: h.overallScore,
      })),
      nutrition_data: {
        calories: nutritionTargets.map(n => ({
          date: n.date.toISOString().split('T')[0],
          actual: n.actualCalories,
          target: n.targetCalories,
        })),
        macros: {
          protein: nutritionTargets.map(n => ({
            date: n.date.toISOString().split('T')[0],
            actual: n.actualProtein,
            target: n.targetProtein,
          })),
          carbs: nutritionTargets.map(n => ({
            date: n.date.toISOString().split('T')[0],
            actual: n.actualCarbs,
            target: n.targetCarbs,
          })),
          fat: nutritionTargets.map(n => ({
            date: n.date.toISOString().split('T')[0],
            actual: n.actualFat,
            target: n.targetFat,
          })),
        },
      },
      activity_data: auxiliaryTrackings.map(a => ({
        date: a.date.toISOString().split('T')[0],
        exercise_minutes: a.exerciseMinutes || 0,
        water_intake: a.waterIntake || 0,
      })),
      health_metrics: {
        weight: healthMetrics.filter(h => h.weight).map(h => ({
          date: h.measuredAt.toISOString().split('T')[0],
          value: h.weight!,
        })),
        blood_pressure: healthMetrics.filter(h => h.bloodPressureSystolic && h.bloodPressureDiastolic).map(h => ({
          date: h.measuredAt.toISOString().split('T')[0],
          systolic: h.bloodPressureSystolic!,
          diastolic: h.bloodPressureDiastolic!,
        })),
        heart_rate: healthMetrics.filter(h => h.heartRate).map(h => ({
          date: h.measuredAt.toISOString().split('T')[0],
          value: h.heartRate!,
        })),
      },
      meal_logs: mealLogs.reduce((acc, log) => {
        const dateKey = log.date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, meals: [] };
        }
        acc[dateKey].meals.push({
          type: log.mealType,
          calories: log.calories,
          satisfaction: 3, // 默认满意度，可以后续扩展
        });
        return acc;
      }, {} as any),
    },
  };
}
