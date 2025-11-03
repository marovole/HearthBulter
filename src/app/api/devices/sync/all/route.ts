/**
 * 批量设备同步API
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deviceSyncService } from '@/lib/services/device-sync-service';
import { z } from 'zod';

const BatchSyncSchema = z.object({
  memberId: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = BatchSyncSchema.parse(body);

    // 构建查询条件
    const where: any = {
      isActive: true,
      isAutoSync: true,
      syncStatus: {
        not: 'DISABLED',
      },
    };

    if (validatedData.memberId) {
      // 验证用户权限
      const member = await prisma.familyMember.findFirst({
        where: {
          id: validatedData.memberId,
          user: {
            families: {
              some: {
                members: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }

      where.memberId = validatedData.memberId;
    } else {
      // 如果没有指定memberId，同步用户所有家庭成员的设备
      where.member = {
        family: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      };
    }

    if (validatedData.platforms && validatedData.platforms.length > 0) {
      where.platform = {
        in: validatedData.platforms,
      };
    }

    // 获取需要同步的设备
    const devicesToSync = await prisma.deviceConnection.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (devicesToSync.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: '没有需要同步的设备',
          devices: [],
          summary: {
            total: 0,
            success: 0,
            failed: 0,
            skipped: 0,
          },
        },
      });
    }

    // 执行批量同步
    const syncResults = await deviceSyncService.syncAllDevices();
    
    // 更新设备状态
    const deviceUpdatePromises = syncResults.results.map(async (result) => {
      const device = devicesToSync.find(d => d.deviceId === result.deviceId);
      if (!device) return null;

      try {
        if (result.success && !result.skipped) {
          await prisma.deviceConnection.update({
            where: { id: device.id },
            data: {
              syncStatus: 'SUCCESS',
              lastSyncAt: result.endTime,
              errorCount: 0,
              lastError: null,
            },
          });
        } else if (!result.success) {
          await prisma.deviceConnection.update({
            where: { id: device.id },
            data: {
              syncStatus: 'FAILED',
              lastError: result.errors?.[0],
              errorCount: { increment: 1 },
            },
          });
        }
      } catch (updateError) {
        console.error('更新设备状态失败:', updateError);
      }

      return {
        ...result,
        member: device.member,
      };
    });

    const updatedResults = (await Promise.all(deviceUpdatePromises))
      .filter(result => result !== null);

    // 统计结果
    const summary = {
      total: devicesToSync.length,
      success: updatedResults.filter(r => r.success && !r.skipped).length,
      failed: updatedResults.filter(r => !r.success).length,
      skipped: updatedResults.filter(r => r.skipped).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        message: `完成 ${summary.total} 个设备的同步`,
        devices: updatedResults,
        summary,
        duration: syncResults.duration,
      },
    });

  } catch (error) {
    console.error('批量设备同步失败:', error);
    
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

/**
 * 获取同步历史记录
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const where: any = {
      member: {
        family: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    };

    if (memberId) {
      where.memberId = memberId;
    }

    // 获取同步历史（这里我们通过healthData记录来模拟）
    const syncHistory = await prisma.healthData.findMany({
      where: {
        ...where,
        source: {
          in: ['APPLE_HEALTHKIT', 'HUAWEI_HEALTH', 'GOOGLE_FIT'],
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        deviceConnection: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
            platform: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 获取总数
    const total = await prisma.healthData.count({
      where,
    });

    // 按日期分组统计
    const dailyStats = await prisma.healthData.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        source: {
          in: ['APPLE_HEALTHKIT', 'HUAWEI_HEALTH', 'GOOGLE_FIT'],
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        syncHistory,
        dailyStats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });

  } catch (error) {
    console.error('获取同步历史失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
