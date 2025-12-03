import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateShareToken } from '@/lib/services/analytics/report-generator';
import { requireOwnership } from '@/lib/middleware/authorization';

/**
 * POST /api/analytics/share
 * 生成报告分享链接
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, expiryDays = 7 } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: '缺少必要参数：reportId' },
        { status: 400 }
      );
    }

    // 验证用户对该报告的访问权限
    const accessResult = await requireOwnership(session.user.id, 'health_report', reportId);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此报告' },
        { status: 403 }
      );
    }

    const token = await generateShareToken(reportId, expiryDays);

    return NextResponse.json({
      success: true,
      data: {
        token,
        shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/report/${token}`,
        expiryDays,
      },
      message: '分享链接已生成',
    });
  } catch (error) {
    console.error('Failed to generate share token:', error);
    return NextResponse.json(
      { error: '生成分享链接失败' },
      { status: 500 }
    );
  }
}

