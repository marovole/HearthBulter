import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { dashboardDataService } from '@/lib/services/dashboard-data-service';

/**
 * 验证用户是否有权限访问成员的健康数据
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
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
 * GET /api/dashboard/data
 * 获取仪表盘聚合数据
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
    const useCache = searchParams.get('useCache') !== 'false';
    const format = searchParams.get('format') as 'json' | 'csv' | undefined;

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

    // 获取仪表盘数据
    const data = await dashboardDataService.getDashboardData(memberId, {
      useCache,
      cacheTTL: 5 * 60 * 1000, // 5分钟缓存
      retryAttempts: 3,
      timeout: 10000,
    });

    // 如果是导出请求
    if (format && format !== 'json') {
      const exportData = await dashboardDataService.exportData(memberId, format);
      
      const filename = `dashboard-data-${memberId}-${new Date().toISOString().split('T')[0]}.${format}`;
      
      return new NextResponse(exportData, {
        headers: {
          'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/data
 * 刷新缓存或预加载数据
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { action, memberIds } = body;

    switch (action) {
    case 'clear-cache':
      // 清除缓存
      dashboardDataService.clearCache();
      return NextResponse.json({ success: true, message: '缓存已清除' }, { status: 200 });

    case 'preload':
      // 预加载数据
      if (!Array.isArray(memberIds)) {
        return NextResponse.json(
          { error: 'memberIds 必须是数组' },
          { status: 400 }
        );
      }

      // 验证权限
      for (const memberId of memberIds) {
        const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);
        if (!hasAccess) {
          return NextResponse.json(
            { error: `无权限访问成员 ${memberId} 的数据` },
            { status: 403 }
          );
        }
      }

      await dashboardDataService.preloadData(memberIds);
      return NextResponse.json({ success: true, message: '数据预加载完成' }, { status: 200 });

    default:
      return NextResponse.json(
        { error: '不支持的操作' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('仪表盘数据操作失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}
