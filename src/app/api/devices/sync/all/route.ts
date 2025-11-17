/**
 * 批量设备同步API
 *
 * Migrated from Prisma to Supabase (endpoint layer)
 * Note: deviceSyncService still uses Prisma
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { deviceSyncService } from '@/lib/services/device-sync-service';
import { fetchDevicesForSync } from '@/lib/db/supabase-rpc-helpers';
import { z } from 'zod';


// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
const BatchSyncSchema = z.object({
  memberId: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

/**
 * POST /api/devices/sync/all
 * 批量设备同步
 *
 * Migrated from Prisma to Supabase
 * Optimizations:
 * - 使用 RPC `fetch_devices_for_sync`（仅当有 memberId 时）
 * - 单次往返获取设备列表和统计
 * - 无 memberId 时保持现有逻辑（安全性优先）
 */
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

    const supabase = SupabaseClientManager.getInstance();

    if (validatedData.memberId) {
      // 验证用户权限 - 检查是否在同一家庭
      const { data: member } = await supabase
        .from('family_members')
        .select('id, familyId')
        .eq('id', validatedData.memberId)
        .single();

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }

      // 检查是否在同一家庭
      const { data: sameFamilyCheck } = await supabase
        .from('family_members')
        .select('id')
        .eq('familyId', member.familyId)
        .eq('userId', session.user.id)
        .is('deletedAt', null)
        .maybeSingle();

      if (!sameFamilyCheck) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }
    }

    // 获取需要同步的设备
    let devicesToSync: any[] = [];

    if (validatedData.memberId) {
      // 有 memberId：使用优化的 RPC
      // 优势：单次往返、服务端过滤、包含汇总统计
      const devicesResult = await fetchDevicesForSync({
        memberId: validatedData.memberId,
        platforms: validatedData.platforms,
        limit: 200, // RPC 最大限制
      });

      if (!devicesResult.success || !devicesResult.data) {
        console.error('RPC fetch_devices_for_sync failed:', devicesResult.error);
        return NextResponse.json(
          { error: '查询设备失败' },
          { status: 500 }
        );
      }

      // 映射 RPC 数据结构到原有格式
      devicesToSync = devicesResult.data.devices.map(d => ({
        id: d.id,
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        platform: d.platform,
        memberId: d.memberId,
        syncStatus: d.syncStatus,
        member: {
          id: d.memberId,
          name: d.memberName,
        },
      }));

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
    } else {
      // 无 memberId：保持现有逻辑（避免安全问题）
      // 先获取用户的所有家庭成员ID
      const { data: userMembers } = await supabase
        .from('family_members')
        .select('id, familyId')
        .eq('userId', session.user.id)
        .is('deletedAt', null);

      if (!userMembers || userMembers.length === 0) {
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

      const memberIds = userMembers.map(m => m.id);

      // 手动查询设备
      let devicesQuery = supabase
        .from('device_connections')
        .select(`
          id,
          deviceId,
          deviceName,
          platform,
          memberId,
          syncStatus,
          member:family_members!inner(id, name)
        `)
        .eq('isActive', true)
        .eq('isAutoSync', true)
        .neq('syncStatus', 'DISABLED')
        .in('memberId', memberIds);

      if (validatedData.platforms && validatedData.platforms.length > 0) {
        devicesQuery = devicesQuery.in('platform', validatedData.platforms);
      }

      const { data: devices, error: devicesError } = await devicesQuery;

      if (devicesError) {
        console.error('查询设备失败:', devicesError);
        return NextResponse.json(
          { error: '查询设备失败' },
          { status: 500 }
        );
      }

      if (!devices || devices.length === 0) {
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

      devicesToSync = devices;
    }

    // 执行批量同步
    const syncResults = await deviceSyncService.syncAllDevices();

    // 更新设备状态
    const deviceUpdatePromises = syncResults.results.map(async (result) => {
      const device = devicesToSync.find(d => d.deviceId === result.deviceId);
      if (!device) return null;

      try {
        const now = new Date().toISOString();

        if (result.success && !result.skipped) {
          await supabase
            .from('device_connections')
            .update({
              syncStatus: 'SUCCESS',
              lastSyncAt: result.endTime || now,
              errorCount: 0,
              lastError: null,
              updatedAt: now,
            })
            .eq('id', device.id);
        } else if (!result.success) {
          // 获取当前 errorCount
          const { data: currentDevice } = await supabase
            .from('device_connections')
            .select('errorCount')
            .eq('id', device.id)
            .single();

          const newErrorCount = (currentDevice?.errorCount || 0) + 1;

          await supabase
            .from('device_connections')
            .update({
              syncStatus: 'FAILED',
              lastError: result.errors?.[0] || 'Unknown error',
              errorCount: newErrorCount,
              updatedAt: now,
            })
            .eq('id', device.id);
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
 * GET /api/devices/sync/all
 * 获取同步历史记录
 *
 * Migrated from Prisma to Supabase
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

    const supabase = SupabaseClientManager.getInstance();

    // 获取用户的所有家庭成员ID
    const { data: userMembers } = await supabase
      .from('family_members')
      .select('id, familyId')
      .eq('userId', session.user.id)
      .is('deletedAt', null);

    if (!userMembers || userMembers.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          syncHistory: [],
          dailyStats: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
        },
      });
    }

    const memberIds = userMembers.map(m => m.id);

    // 构建查询条件
    let syncQuery = supabase
      .from('health_data')
      .select(`
        id,
        dataType,
        value,
        unit,
        measuredAt,
        source,
        createdAt,
        memberId,
        deviceConnectionId,
        member:family_members!inner(id, name),
        deviceConnection:device_connections(id, deviceId, deviceName, platform)
      `, { count: 'exact' })
      .in('memberId', memberIds)
      .in('source', ['APPLE_HEALTHKIT', 'HUAWEI_HEALTH', 'GOOGLE_FIT'])
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (memberId) {
      syncQuery = syncQuery.eq('memberId', memberId);
    }

    const { data: syncHistory, error: syncError, count: total } = await syncQuery;

    if (syncError) {
      console.error('获取同步历史失败:', syncError);
      return NextResponse.json(
        { error: '获取同步历史失败' },
        { status: 500 }
      );
    }

    // 获取最近30天的日统计数据
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: recentData } = await supabase
      .from('health_data')
      .select('createdAt')
      .in('memberId', memberIds)
      .in('source', ['APPLE_HEALTHKIT', 'HUAWEI_HEALTH', 'GOOGLE_FIT'])
      .gte('createdAt', thirtyDaysAgo.toISOString());

    // 客户端分组统计
    const dailyStatsMap: Record<string, number> = {};
    (recentData || []).forEach(record => {
      const date = new Date(record.createdAt).toISOString().split('T')[0];
      dailyStatsMap[date] = (dailyStatsMap[date] || 0) + 1;
    });

    const dailyStats = Object.entries(dailyStatsMap)
      .map(([date, count]) => ({
        createdAt: date,
        _count: { id: count },
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        syncHistory: syncHistory || [],
        dailyStats,
        pagination: {
          total: total || 0,
          limit,
          offset,
          hasMore: offset + limit < (total || 0),
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
