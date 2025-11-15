import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/analytics/trends
 * 获取趋势数据
 *
 * TODO: 暂时禁用 - 需要修复模块初始化问题
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Trends API 暂时禁用，正在修复模块初始化问题',
      data: null,
    });
  } catch (error) {
    console.error('Failed to get trend data:', error);
    return NextResponse.json(
      { error: '获取趋势数据失败' },
      { status: 500 }
    );
  }
}

