import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  validateAndDetectAnomaly,
  type HealthDataInput,
} from '@/lib/services/health-data-validator'
import { updateStreakDays } from '../health-reminders/route'
import {
  validateRequestBody,
  handleApiError,
  healthDataSchemas,
  commonSchemas,
  formatApiCreated,
} from '@/lib/validation'

/**
 * 验证用户是否有权限访问成员的健康数据
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: any }> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId, deletedAt: null },
    include: {
      family: {
        select: {
          creatorId: true,
          members: {
            where: { userId, deletedAt: null },
            select: { role: true },
          },
        },
      },
    },
  })

  if (!member) {
    return { hasAccess: false, member: null }
  }

  const isCreator = member.family.creatorId === userId
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator
  const isSelf = member.userId === userId

  return {
    hasAccess: isAdmin || isSelf,
    member,
  }
}

/**
 * GET /api/members/:memberId/health-data
 * 查询成员的健康数据历史记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 验证权限
    const { hasAccess, member } = await verifyMemberAccess(
      memberId,
      session.user.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的健康数据' },
        { status: 403 }
      )
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 构建查询条件
    const where: any = {
      memberId,
    }

    if (startDate || endDate) {
      where.measuredAt = {}
      if (startDate) {
        where.measuredAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.measuredAt.lte = new Date(endDate)
      }
    }

    // 查询数据
    const [healthData, total] = await Promise.all([
      prisma.healthData.findMany({
        where,
        orderBy: { measuredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.healthData.count({ where }),
    ])

    return NextResponse.json(
      {
        data: healthData,
        total,
        limit,
        offset,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('查询健康数据失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/members/:memberId/health-data
 * 录入新的健康数据
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 验证权限
    const { hasAccess, member } = await verifyMemberAccess(
      memberId,
      session.user.id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限为该成员录入健康数据' },
        { status: 403 }
      )
    }

    // 验证请求体
    const validation = await validateRequestBody(request, healthDataSchemas.create)
    if (!validation.success) {
      return validation.response
    }

    const data = validation.data

    // 构建健康数据输入
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
    }

    // 验证数据（业务逻辑验证）
    const businessValidation = await validateAndDetectAnomaly(memberId, healthDataInput)

    if (!businessValidation.valid) {
      return NextResponse.json(
        {
          error: '数据验证失败',
          details: businessValidation.errors,
          warnings: businessValidation.warnings,
        },
        { status: 400 }
      )
    }

    // 创建健康数据记录
    const healthData = await prisma.healthData.create({
      data: {
        memberId,
        weight: healthDataInput.weight,
        bodyFat: healthDataInput.bodyFat,
        muscleMass: healthDataInput.muscleMass,
        bloodPressureSystolic: healthDataInput.bloodPressureSystolic,
        bloodPressureDiastolic: healthDataInput.bloodPressureDiastolic,
        heartRate: healthDataInput.heartRate,
        measuredAt: healthDataInput.measuredAt as Date,
        source: healthDataInput.source || 'MANUAL',
        notes: healthDataInput.notes,
      },
    })

    // 更新连续打卡天数（异步，不阻塞响应）
    updateStreakDays(memberId).catch((error) => {
      console.error('更新连续打卡天数失败:', error)
    })

    // 构建响应数据
    const responseData: any = {
      data: healthData,
    }

    // 如果有警告（异常检测），在响应中包含警告信息
    if (businessValidation.warnings && businessValidation.warnings.length > 0) {
      responseData.warnings = businessValidation.warnings
    }

    return formatApiCreated(responseData, '健康数据录入成功')
  } catch (error) {
    return handleApiError(error, '录入健康数据')
  }
}
