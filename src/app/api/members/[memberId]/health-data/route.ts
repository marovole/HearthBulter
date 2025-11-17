import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { memberRepository } from '@/lib/repositories/member-repository-singleton';
import {

  validateAndDetectAnomaly,
  type HealthDataInput,
} from '@/lib/services/health-data-validator';
import { updateStreakDays } from '../health-reminders/route';
import {
  validateRequestBody,
  handleApiError,
  healthDataSchemas,
  formatApiCreated,
} from '@/lib/validation';

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';


/**
 * GET /api/members/:memberId/health-data
 * 查询成员的健康数据历史记录
 *
 * 使用双写框架迁移
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 使用 Repository 验证权限
    const { hasAccess } = await memberRepository.decorateMethod(
      'verifyMemberAccess',
      memberId,
      session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的健康数据' },
        { status: 403 }
      );
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 转换 offset 分页为 page 分页（Repository 使用 page/limit）
    const page = Math.floor(offset / limit) + 1;

    // 使用 Repository 查询健康数据
    const result = await memberRepository.decorateMethod('getHealthData', {
      memberId,
      startDate,
      endDate,
      page,
      limit,
      sortOrder: 'desc',
    });

    // 转换响应格式以匹配原 API（使用 offset 而不是 page）
    return NextResponse.json(
      {
        data: result.data,
        total: result.pagination.total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('查询健康数据失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/:memberId/health-data
 * 录入新的健康数据
 *
 * 使用双写框架迁移 - 保留业务逻辑验证和异常检测
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 使用 Repository 验证权限
    const { hasAccess } = await memberRepository.decorateMethod(
      'verifyMemberAccess',
      memberId,
      session.user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限为该成员录入健康数据' },
        { status: 403 }
      );
    }

    // 验证请求体（业务逻辑层）
    const validation = await validateRequestBody(request, healthDataSchemas.create);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // 构建健康数据输入（业务逻辑层）
    const healthDataInput: HealthDataInput = {
      weight: data.weight ?? null,
      bodyFat: data.bodyFat ?? null,
      muscleMass: data.muscleMass ?? null,
      bloodPressureSystolic: data.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: data.bloodPressureDiastolic ?? null,
      heartRate: data.heartRate ?? null,
      measuredAt: data.measuredAt ?? new Date(),
      source: 'MANUAL', // 目前只支持手动录入
      notes: data.notes ?? null,
    };

    // 验证数据和异常检测（业务逻辑验证 - 保留在端点层）
    const businessValidation = await validateAndDetectAnomaly(memberId, healthDataInput);

    if (!businessValidation.valid) {
      return NextResponse.json(
        {
          error: '数据验证失败',
          details: businessValidation.errors,
          warnings: businessValidation.warnings,
        },
        { status: 400 }
      );
    }

    // 使用 Repository 创建健康数据记录
    const healthData = await memberRepository.decorateMethod('createHealthData', memberId, {
      weight: healthDataInput.weight ?? undefined,
      bodyFat: healthDataInput.bodyFat ?? undefined,
      muscleMass: healthDataInput.muscleMass ?? undefined,
      bloodPressureSystolic: healthDataInput.bloodPressureSystolic ?? undefined,
      bloodPressureDiastolic: healthDataInput.bloodPressureDiastolic ?? undefined,
      heartRate: healthDataInput.heartRate ?? undefined,
      measuredAt: healthDataInput.measuredAt as Date,
      source: (healthDataInput.source as 'MANUAL' | 'DEVICE' | 'IMPORTED') || 'MANUAL',
      notes: healthDataInput.notes ?? undefined,
    });

    // 更新连续打卡天数（异步，不阻塞响应 - 业务逻辑）
    updateStreakDays(memberId).catch((error) => {
      console.error('更新连续打卡天数失败:', error);
    });

    // 构建响应数据
    const responseData: any = {
      data: healthData,
    };

    // 如果有警告（异常检测），在响应中包含警告信息
    if (businessValidation.warnings && businessValidation.warnings.length > 0) {
      responseData.warnings = businessValidation.warnings;
    }

    return formatApiCreated(responseData, '健康数据录入成功');
  } catch (error) {
    return handleApiError(error, '录入健康数据');
  }
}
