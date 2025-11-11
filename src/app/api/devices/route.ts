/**
 * 设备管理API - 获取设备列表
 *
 * Migrated from Prisma to Supabase
 * Note: Middleware wrappers preserved, healthkit-service and huawei-health-service still use external services
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { z } from 'zod';
import { validationMiddleware, commonSchemas, withValidation } from '@/lib/middleware/validation-middleware';
import { APIError, createErrorResponse } from '@/lib/errors/api-error';
import { withPermissions, requirePermissions } from '@/lib/middleware/permission-middleware';
import { withSecurity, defaultSecurityOptions } from '@/lib/security/security-middleware';
import { withPerformanceMonitoring } from '@/lib/monitoring/performance-monitor';
import { Permission } from '@/lib/permissions';

const GETQuerySchema = z.object({
  memberId: z.string().optional(),
  platform: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  ...commonSchemas.pagination.shape,
});

/**
 * 获取用户可访问的成员ID列表
 * Migrated from Prisma to Supabase
 */
async function getAccessibleMemberIds(userId: string): Promise<string[]> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: members } = await supabase
    .from('family_members')
    .select(`
      id,
      family:families!inner(
        members:family_members(
          userId
        )
      )
    `)
    .is('deletedAt', null);

  if (!members) return [];

  // 筛选用户所属的家庭成员
  return members
    .filter((m: any) =>
      m.family?.members?.some((fm: any) => fm.userId === userId)
    )
    .map((m: any) => m.id);
}

export const GET = withPermissions(
  requirePermissions([Permission.READ_DEVICE]),
  withSecurity(
    defaultSecurityOptions,
    withPerformanceMonitoring(
      async (request: NextRequest) => {
        const session = await auth();
        const supabase = SupabaseClientManager.getInstance();

        const { searchParams } = new URL(request.url);
        const validatedQuery = GETQuerySchema.parse(Object.fromEntries(searchParams));

        // 获取用户可访问的成员ID列表
        const accessibleMemberIds = await getAccessibleMemberIds(session.user.id);

        if (accessibleMemberIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            total: 0,
            page: validatedQuery.page,
            limit: validatedQuery.limit,
            totalPages: 0,
          });
        }

        // 构建Supabase查询
        const skip = (validatedQuery.page - 1) * validatedQuery.limit;
        let query = supabase
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
            errorCount,
            lastError,
            memberId,
            member:family_members!inner(
              id,
              name
            )
          `, { count: 'exact' })
          .in('memberId', accessibleMemberIds);

        // 应用筛选条件
        if (validatedQuery.memberId) {
          query = query.eq('memberId', validatedQuery.memberId);
        }

        if (validatedQuery.platform) {
          query = query.eq('platform', validatedQuery.platform);
        }

        if (validatedQuery.isActive !== undefined) {
          query = query.eq('isActive', validatedQuery.isActive);
        }

        // 排序和分页
        const { data: devices, error, count } = await query
          .order('lastSyncAt', { ascending: false, nullsFirst: false })
          .range(skip, skip + validatedQuery.limit - 1);

        if (error) {
          console.error('查询设备列表失败:', error);
          return NextResponse.json(
            { error: '查询设备列表失败' },
            { status: 500 }
          );
        }

        const total = count || 0;

        return NextResponse.json({
          success: true,
          data: devices || [],
          total,
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          totalPages: Math.ceil(total / validatedQuery.limit),
        });
      }
    )
  )
);

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
    const supabase = SupabaseClientManager.getInstance();

    // 验证请求数据
    const connectionSchema = z.object({
      memberId: z.string(),
      deviceId: z.string(),
      deviceName: z.string(),
      deviceType: z.enum(['SMARTWATCH', 'FITNESS_BAND', 'SMART_SCALE', 'BLOOD_PRESSURE_MONITOR', 'GLUCOSE_METER', 'SMART_RING', 'OTHER']),
      manufacturer: z.string(),
      model: z.string().optional(),
      firmwareVersion: z.string().optional(),
      platform: z.enum(['APPLE_HEALTHKIT', 'HUAWEI_HEALTH', 'GOOGLE_FIT', 'XIAOMI_HEALTH', 'SAMSUNG_HEALTH', 'GARMIN_CONNECT', 'FITBIT', 'OTHER_PLATFORM']),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      permissions: z.array(z.enum(['READ_STEPS', 'READ_HEART_RATE', 'READ_CALORIES', 'READ_SLEEP', 'READ_WEIGHT', 'READ_BLOOD_PRESSURE', 'READ_DISTANCE', 'READ_ACTIVE_MINUTES', 'READ_EXERCISE'])),
      dataTypes: z.array(z.enum(['STEPS', 'HEART_RATE', 'CALORIES_BURNED', 'SLEEP_DURATION', 'SLEEP_QUALITY', 'WEIGHT', 'BODY_FAT', 'MUSCLE_MASS', 'BLOOD_PRESSURE', 'DISTANCE', 'ACTIVE_MINUTES', 'EXERCISE_TYPE', 'EXERCISE_DURATION', 'RESTING_HEART_RATE', 'FLOORS_CLIMBED', 'STANDING_HOURS'])),
      syncInterval: z.number().optional().default(1800),
    });

    const validatedData = connectionSchema.parse(body);

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

    // 检查设备是否已存在
    const { data: existingDevice } = await supabase
      .from('device_connections')
      .select('id')
      .eq('deviceId', validatedData.deviceId)
      .eq('isActive', true)
      .maybeSingle();

    if (existingDevice) {
      return NextResponse.json(
        { error: '设备已存在' },
        { status: 409 }
      );
    }

    // 根据平台调用相应的连接服务
    let deviceConnection;
    if (validatedData.platform === 'APPLE_HEALTHKIT') {
      const { connectHealthKitDevice } = await import('@/lib/services/healthkit-service');
      deviceConnection = await connectHealthKitDevice(validatedData.memberId, validatedData);
    } else if (validatedData.platform === 'HUAWEI_HEALTH') {
      const { connectHuaweiHealthDevice } = await import('@/lib/services/huawei-health-service');
      deviceConnection = await connectHuaweiHealthDevice(validatedData.memberId, validatedData);
    } else {
      // 其他平台的通用处理
      const { data: newDevice, error: createError } = await supabase
        .from('device_connections')
        .insert({
          ...validatedData,
          permissions: JSON.stringify(validatedData.permissions),
          dataTypes: JSON.stringify(validatedData.dataTypes),
          syncStatus: 'PENDING',
          connectionDate: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('创建设备连接失败:', createError);
        throw createError;
      }

      deviceConnection = newDevice;
    }

    return NextResponse.json({
      success: true,
      data: deviceConnection,
      message: '设备连接成功',
    });

  } catch (error) {
    console.error('连接设备失败:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '设备连接失败' },
      { status: 500 }
    );
  }
}
