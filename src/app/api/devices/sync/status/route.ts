/**
 * 设备同步状态API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deviceSyncService } from '@/lib/services/device-sync-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取用户相关的设备统计
    const deviceStats = await prisma.deviceConnection.findMany({
      where: {
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
      select: {
        id: true,
        deviceName: true,
        platform: true,
        syncStatus: true,
        lastSyncAt: true,
        isActive: true,
        errorCount: true,
        lastError: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 获取全局同步统计
    const globalStats = await deviceSyncService.getSyncStats();
    
    // 获取服务状态
    const serviceStatus = deviceSyncService.getServiceStatus();

    return NextResponse.json({
      success: true,
      data: {
        userDevices: deviceStats,
        globalStats,
        serviceStatus,
      },
    });

  } catch (error) {
    console.error('获取同步状态失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
