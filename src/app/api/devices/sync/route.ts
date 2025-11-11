/**
 * 设备同步API - 手动触发设备同步
 *
 * Migrated from Prisma to Supabase
 * Note: healthKitService and huaweiHealthService still use external services
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { z } from 'zod';

const SyncRequestSchema = z.object({
  deviceId: z.string(),
  memberId: z.string(),
  dataTypes: z.array(z.string()).optional(),
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
    const validatedData = SyncRequestSchema.parse(body);
    const supabase = SupabaseClientManager.getInstance();

    // 验证用户权限：检查该成员是否属于用户有权访问的家庭
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select(`
        id,
        userId,
        familyId,
        family:families!inner(
          id,
          creatorId,
          members:family_members(
            id,
            userId
          )
        )
      `)
      .eq('id', validatedData.memberId)
      .is('deletedAt', null)
      .maybeSingle();

    if (memberError) {
      console.error('查询家庭成员失败:', memberError);
      return NextResponse.json(
        { error: '查询家庭成员失败' },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    // 检查用户是否属于该家庭
    const familyMembers = member.family?.members || [];
    const hasAccess = familyMembers.some((m: any) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    // 查找设备连接
    const { data: deviceConnection, error: deviceError } = await supabase
      .from('device_connections')
      .select('*')
      .eq('deviceId', validatedData.deviceId)
      .eq('memberId', validatedData.memberId)
      .eq('isActive', true)
      .maybeSingle();

    if (deviceError) {
      console.error('查询设备连接失败:', deviceError);
      return NextResponse.json(
        { error: '查询设备失败' },
        { status: 500 }
      );
    }

    if (!deviceConnection) {
      return NextResponse.json(
        { error: '设备未连接或已禁用' },
        { status: 404 }
      );
    }

    // 更新同步状态为同步中
    const { error: updateSyncingError } = await supabase
      .from('device_connections')
      .update({
        syncStatus: 'SYNCING',
      })
      .eq('id', deviceConnection.id);

    if (updateSyncingError) {
      console.error('更新同步状态失败:', updateSyncingError);
    }

    // 根据平台调用相应的同步服务
    let syncResult;
    if (deviceConnection.platform === 'APPLE_HEALTHKIT') {
      const { healthKitService } = await import('@/lib/services/healthkit-service');
      syncResult = await healthKitService.syncAllData(
        validatedData.memberId,
        deviceConnection.id,
        deviceConnection.lastSyncAt || undefined
      );
    } else if (deviceConnection.platform === 'HUAWEI_HEALTH') {
      const { huaweiHealthService } = await import('@/lib/services/huawei-health-service');
      syncResult = await huaweiHealthService.syncAllData(
        validatedData.memberId,
        deviceConnection.id,
        deviceConnection.lastSyncAt || undefined
      );
    } else {
      // 其他平台的通用处理
      syncResult = {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errors: ['该平台暂不支持自动同步'],
        lastSyncDate: new Date(),
      };
    }

    // 如果同步失败，增加重试次数（使用read-then-write模式替代increment）
    if (!syncResult.success) {
      const currentRetryCount = deviceConnection.retryCount || 0;

      const { error: updateFailedError } = await supabase
        .from('device_connections')
        .update({
          syncStatus: 'FAILED',
          lastError: syncResult.errors[0],
          retryCount: currentRetryCount + 1,
        })
        .eq('id', deviceConnection.id);

      if (updateFailedError) {
        console.error('更新失败状态失败:', updateFailedError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deviceId: deviceConnection.deviceId,
        syncResult,
        syncStatus: syncResult.success ? 'SUCCESS' : 'FAILED',
      },
      message: syncResult.success ? '同步完成' : '同步失败',
    });

  } catch (error) {
    console.error('设备同步失败:', error);

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
 * 批量同步所有设备
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memberId } = body;
    const supabase = SupabaseClientManager.getInstance();

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    // 验证用户权限：检查该成员是否属于用户有权访问的家庭
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select(`
        id,
        userId,
        familyId,
        family:families!inner(
          id,
          creatorId,
          members:family_members(
            id,
            userId
          )
        )
      `)
      .eq('id', memberId)
      .is('deletedAt', null)
      .maybeSingle();

    if (memberError) {
      console.error('查询家庭成员失败:', memberError);
      return NextResponse.json(
        { error: '查询家庭成员失败' },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    // 检查用户是否属于该家庭
    const familyMembers = member.family?.members || [];
    const hasAccess = familyMembers.some((m: any) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    // 获取所有活跃设备
    const { data: devices, error: devicesError } = await supabase
      .from('device_connections')
      .select('*')
      .eq('memberId', memberId)
      .eq('isActive', true);

    if (devicesError) {
      console.error('查询设备列表失败:', devicesError);
      return NextResponse.json(
        { error: '查询设备列表失败' },
        { status: 500 }
      );
    }

    if (!devices || devices.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          syncedDevices: [],
          totalSynced: 0,
          errors: ['没有可同步的设备'],
        },
        message: '没有可同步的设备',
      });
    }

    const syncResults = [];
    let totalSynced = 0;

    // 并行同步所有设备
    const syncPromises = devices.map(async (device) => {
      try {
        // 更新同步状态
        const { error: updateSyncingError } = await supabase
          .from('device_connections')
          .update({
            syncStatus: 'SYNCING',
          })
          .eq('id', device.id);

        if (updateSyncingError) {
          console.error('更新同步状态失败:', updateSyncingError);
        }

        // 调用相应平台的同步服务
        let syncResult;
        if (device.platform === 'APPLE_HEALTHKIT') {
          const { healthKitService } = await import('@/lib/services/healthkit-service');
          syncResult = await healthKitService.syncAllData(
            memberId,
            device.id,
            device.lastSyncAt || undefined
          );
        } else if (device.platform === 'HUAWEI_HEALTH') {
          const { huaweiHealthService } = await import('@/lib/services/huawei-health-service');
          syncResult = await huaweiHealthService.syncAllData(
            memberId,
            device.id,
            device.lastSyncAt || undefined
          );
        }

        // 更新同步结果（使用read-then-write模式替代increment）
        if (syncResult && !syncResult.success) {
          const currentRetryCount = device.retryCount || 0;

          const { error: updateFailedError } = await supabase
            .from('device_connections')
            .update({
              syncStatus: 'FAILED',
              lastError: syncResult.errors[0],
              retryCount: currentRetryCount + 1,
            })
            .eq('id', device.id);

          if (updateFailedError) {
            console.error('更新失败状态失败:', updateFailedError);
          }
        }

        return {
          deviceId: device.deviceId,
          platform: device.platform,
          syncResult,
        };
      } catch (error) {
        console.error(`设备 ${device.deviceId} 同步失败:`, error);
        return {
          deviceId: device.deviceId,
          platform: device.platform,
          error: error instanceof Error ? error.message : '同步失败',
        };
      }
    });

    const results = await Promise.all(syncPromises);

    // 统计结果
    results.forEach(result => {
      if (result.syncResult) {
        totalSynced += result.syncResult.syncedCount;
        syncResults.push(result);
      } else {
        syncResults.push(result);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedDevices: syncResults,
        totalSynced,
        totalDevices: devices.length,
      },
      message: `完成 ${devices.length} 个设备的同步`,
    });

  } catch (error) {
    console.error('批量设备同步失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
