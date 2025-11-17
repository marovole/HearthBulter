import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { analyticsService } from '@/lib/services/analytics-service';
import { healthScoreCalculator } from '@/lib/services/health-score-calculator';

/**
 * 验证用户是否有权限访问成员的健康数据
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: any }> {
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
    return { hasAccess: false, member: null };
  }

  const isCreator = member.family.creatorId === userId;
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
  const isSelf = member.userId === userId;

  return {
    hasAccess: isAdmin || isSelf,
    member,
  };
}

/**
 * GET /api/dashboard/overview
 * 获取仪表盘概览数据
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
        { error: '无权限访问该成员的仪表盘数据' },
        { status: 403 }
      );
    }

    // 获取概览数据
    const overview = await analyticsService.getDashboardOverview(memberId);
    const healthScore = await healthScoreCalculator.calculateHealthScore(
      memberId
    );

    return NextResponse.json(
      {
        overview,
        healthScore,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取仪表盘概览失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

