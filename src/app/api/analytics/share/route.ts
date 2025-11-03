import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateShareToken, getReportByShareToken } from '@/lib/services/analytics/report-generator';

/**
 * POST /api/analytics/share
 * 生成报告分享链接
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
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

/**
 * GET /api/analytics/share/[token]
 * 通过分享token获取报告（公开访问）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const report = await getReportByShareToken(params.token);

    if (!report) {
      return NextResponse.json(
        { error: '报告不存在或已过期' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Failed to get shared report:', error);
    return NextResponse.json(
      { error: '获取报告失败' },
      { status: 500 }
    );
  }
}

