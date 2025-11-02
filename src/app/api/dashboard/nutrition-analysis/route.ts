import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { analyticsService } from '@/lib/services/analytics-service';

/**
 * 验证用户是否有权限访问成员的健康数据
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
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
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
  const isSelf = member.userId === userId;

  return {
    hasAccess: isAdmin || isSelf,
  };
}

/**
 * GET /api/dashboard/nutrition-analysis
 * 获取营养分析数据
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily';

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少成员ID参数' },
        { status: 400 }
      );
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的营养分析数据' },
        { status: 403 }
      );
    }

    // 获取营养汇总
    const nutritionSummary = await analyticsService.summarizeNutrition(
      memberId,
      period
    );

    // 生成实际营养数据（用于演示）
    const mockActualData = generateMockNutritionData(nutritionSummary);

    return NextResponse.json({ data: mockActualData }, { status: 200 });
  } catch (error) {
    console.error('获取营养分析失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 生成模拟营养数据（用于演示）
 * 在实际应用中，这些数据应该来自meal-planning模块的实际摄入记录
 */
function generateMockNutritionData(summary: any) {
  // 基于目标生成一些合理的实际数据
  const variance = 0.8 + Math.random() * 0.4; // 80%-120%的波动
  
  const actual = {
    carbs: summary.targetCarbs ? Math.round(summary.targetCarbs * variance) : 0,
    protein: summary.targetProtein ? Math.round(summary.targetProtein * variance) : 0,
    fat: summary.targetFat ? Math.round(summary.targetFat * variance) : 0,
    calories: summary.targetCalories ? Math.round(summary.targetCalories * variance) : 0,
  };

  // 计算达标率
  const adherenceRates = [];
  if (summary.targetCarbs) {
    adherenceRates.push(Math.min(100, (actual.carbs / summary.targetCarbs) * 100));
  }
  if (summary.targetProtein) {
    adherenceRates.push(Math.min(100, (actual.protein / summary.targetProtein) * 100));
  }
  if (summary.targetFat) {
    adherenceRates.push(Math.min(100, (actual.fat / summary.targetFat) * 100));
  }
  
  const adherenceRate = adherenceRates.length > 0 
    ? adherenceRates.reduce((a, b) => a + b, 0) / adherenceRates.length 
    : 0;

  return {
    ...summary,
    actual,
    adherenceRate: Math.round(adherenceRate * 10) / 10,
  };
}

