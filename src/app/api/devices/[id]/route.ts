/**
 * 设备管理API - 断开设备连接
 *
 * Migrated from Prisma to Supabase
 * Note: healthkit-service and huawei-health-service still use external services
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { z } from 'zod';
import { APIError, handleAPIError, createErrorResponse, createAPIResponse } from '@/lib/errors/api-error';

interface RouteParams {
  params: Promise<{ id: string }>
}

const DELETEBodySchema = z.object({
  reason: z.string().optional(),
});

/**
 * 验证用户是否有权限访问设备
 * Migrated from Prisma to Supabase
 */
async function verifyDeviceAccess(
  deviceId: string,
  userId: string
): Promise<{ hasAccess: boolean; device: any }> {
  const supabase = SupabaseClientManager.getInstance();

  // 查询设备及其成员的家庭信息
  const { data: device, error } = await supabase
    .from('device_connections')
    .select(`
      id,
      deviceId,
      deviceName,
      platform,
      isActive,
      isAutoSync,
      syncStatus,
      memberId,
      member:family_members!inner(
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
      )
    `)
    .eq('id', deviceId)
    .maybeSingle();

  if (error || !device) {
    return { hasAccess: false, device: null };
  }

  // 检查用户是否属于该家庭
  const familyMembers = device.member?.family?.members || [];
  const hasAccess = familyMembers.some((m: any) => m.userId === userId);

  return { hasAccess, device };
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse(APIError.unauthorized());
    }

    const { id } = await params;
    const body = await request.json();
    const validatedBody = DELETEBodySchema.parse(body);

    // 验证设备访问权限
    const { hasAccess, device: deviceConnection } = await verifyDeviceAccess(
      id,
      session.user.id
    );

    if (!hasAccess || !deviceConnection) {
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

    const supabase = SupabaseClientManager.getInstance();

    // 更新数据库记录
    const { error: updateError } = await supabase
      .from('device_connections')
      .update({
        isActive: false,
        isAutoSync: false,
        syncStatus: 'DISABLED',
        disconnectionDate: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('更新设备连接状态失败:', updateError);
      return NextResponse.json(
        { error: '更新设备状态失败' },
        { status: 500 }
      );
    }

    // 如果有断开原因，记录到设备记录中（需要schema支持disconnectReason字段）
    if (validatedBody.reason) {
      // Note: 这里需要在schema中添加disconnectReason字段
      // 暂时注释掉，等schema更新后再启用
      /*
      await supabase
        .from('device_connections')
        .update({
          disconnectReason: validatedBody.reason,
        })
        .eq('id', id);
      */
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = SupabaseClientManager.getInstance();

    // 查询设备连接详情及其成员信息
    const { data: deviceConnection, error: deviceError } = await supabase
      .from('device_connections')
      .select(`
        id,
        deviceId,
        deviceName,
        platform,
        isActive,
        isAutoSync,
        syncStatus,
        lastSyncAt,
        createdAt,
        updatedAt,
        disconnectionDate,
        errorCount,
        lastError,
        memberId,
        member:family_members!inner(
          id,
          name,
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
        )
      `)
      .eq('id', id)
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
        { error: '设备未找到' },
        { status: 404 }
      );
    }

    // 验证访问权限
    const familyMembers = deviceConnection.member?.family?.members || [];
    const hasAccess = familyMembers.some((m: any) => m.userId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '设备未找到' },
        { status: 404 }
      );
    }

    // 查询最近10条健康数据
    const { data: healthData, error: healthError } = await supabase
      .from('health_data')
      .select(`
        id,
        measuredAt,
        source,
        weight,
        heartRate,
        bloodPressureSystolic,
        notes
      `)
      .eq('deviceConnectionId', id)
      .order('measuredAt', { ascending: false })
      .limit(10);

    if (healthError) {
      console.error('查询健康数据失败:', healthError);
      return NextResponse.json(
        { error: '查询健康数据失败' },
        { status: 500 }
      );
    }

    // 简化member数据，移除嵌套的family信息
    const simplifiedDevice = {
      ...deviceConnection,
      member: {
        id: deviceConnection.member.id,
        name: deviceConnection.member.name,
      },
      healthData: healthData || [],
    };

    return NextResponse.json({
      success: true,
      data: simplifiedDevice,
    });

  } catch (error) {
    console.error('获取设备详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
