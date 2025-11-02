/**
 * 设备管理API - 断开设备连接
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { APIError, handleAPIError, createErrorResponse, createAPIResponse } from '@/lib/errors/api-error';

interface RouteParams {
  params: Promise<{ id: string }>
}

const DELETEBodySchema = z.object({
  reason: z.string().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return createErrorResponse(APIError.unauthorized());
    }

    const { id } = await params;
    const body = await request.json();
    const validatedBody = DELETEBodySchema.parse(body);

    // 查找设备连接
    const deviceConnection = await prisma.deviceConnection.findFirst({
      where: {
        id,
        member: {
          family: {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!deviceConnection) {
      return NextResponse.json(
        { error: '设备未找到' },
        { status: 404 }
      );
    }

    // 根据平台调用相应的断开连接服务
    if (deviceConnection.platform === 'APPLE_HEALTHKIT') {
      const { disconnectHealthKitDevice } = await import('@/lib/services/healthkit-service');
      await disconnectHealthKitDevice(deviceConnection.deviceId);
    } else if (deviceConnection.platform === 'HUAWEI_HEALTH') {
      const { disconnectHuaweiHealthDevice } = await import('@/lib/services/huawei-health-service');
      await disconnectHuaweiHealthDevice(deviceConnection.deviceId);
    }

    // 更新数据库记录
    await prisma.deviceConnection.update({
      where: { id },
      data: {
        isActive: false,
        isAutoSync: false,
        syncStatus: 'DISABLED',
        disconnectionDate: new Date(),
      },
    });

    // 如果有断开原因，记录到设备记录中
    if (validatedBody.reason) {
      await prisma.deviceConnection.update({
        where: { id },
        data: {
          // 注意：这里需要在schema中添加disconnectReason字段
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: '设备断开连接成功',
    });

  } catch (error) {
    console.error('断开设备连接失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 查找设备连接详情
    const deviceConnection = await prisma.deviceConnection.findFirst({
      where: {
        id,
        member: {
          family: {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        healthData: {
          select: {
            id: true,
            measuredAt: true,
            source: true,
            weight: true,
            heartRate: true,
            bloodPressureSystolic: true,
            notes: true,
          },
          orderBy: {
            measuredAt: 'desc',
          },
          take: 10, // 最近10条健康数据
        },
      },
    });

    if (!deviceConnection) {
      return NextResponse.json(
        { error: '设备未找到' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deviceConnection,
    });

  } catch (error) {
    console.error('获取设备详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
