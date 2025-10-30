import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/analytics/reports/[id]
 * 获取报告详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const report = await prisma.healthReport.findUnique({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Failed to get report:', error);
    return NextResponse.json(
      { error: '获取报告失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics/reports/[id]
 * 删除报告（软删除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    await prisma.healthReport.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: '报告已删除',
    });
  } catch (error) {
    console.error('Failed to delete report:', error);
    return NextResponse.json(
      { error: '删除报告失败' },
      { status: 500 }
    );
  }
}

