import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient, AnomalyStatus } from '@prisma/client';
import { getPendingAnomalies, acknowledgeAnomaly, resolveAnomaly, ignoreAnomaly } from '@/lib/services/analytics/anomaly-detector';

const prisma = new PrismaClient();

/**
 * GET /api/analytics/anomalies
 * 获取异常记录
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');
    const status = searchParams.get('status') as AnomalyStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少必要参数：memberId' },
        { status: 400 }
      );
    }

    const where: any = {
      memberId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const anomalies = await prisma.healthAnomaly.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: anomalies,
    });
  } catch (error) {
    console.error('Failed to get anomalies:', error);
    return NextResponse.json(
      { error: '获取异常记录失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analytics/anomalies
 * 更新异常状态
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { anomalyId, action, resolution } = body;

    if (!anomalyId || !action) {
      return NextResponse.json(
        { error: '缺少必要参数：anomalyId, action' },
        { status: 400 }
      );
    }

    switch (action) {
    case 'acknowledge':
      await acknowledgeAnomaly(anomalyId);
      break;
    case 'resolve':
      if (!resolution) {
        return NextResponse.json(
          { error: '解决异常需要提供resolution参数' },
          { status: 400 }
        );
      }
      await resolveAnomaly(anomalyId, resolution);
      break;
    case 'ignore':
      await ignoreAnomaly(anomalyId);
      break;
    default:
      return NextResponse.json(
        { error: '无效的action值' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '异常状态已更新',
    });
  } catch (error) {
    console.error('Failed to update anomaly:', error);
    return NextResponse.json(
      { error: '更新异常状态失败' },
      { status: 500 }
    );
  }
}

