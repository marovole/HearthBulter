/**
 * 设备管理API - 获取设备列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const GETQuerySchema = z.object({
  memberId: z.string().optional(),
  platform: z.string().optional(),
  isActive: z.coerce.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams)
    
    const validatedQuery = GETQuerySchema.parse(query)

    // 构建查询条件
    const where: any = {
      member: {
        family: {
          members: {
            some: {
              userId: session.user.id
            }
          }
        }
      }
    }

    if (validatedQuery.memberId) {
      where.memberId = validatedQuery.memberId
    }

    if (validatedQuery.platform) {
      where.platform = validatedQuery.platform
    }

    if (validatedQuery.isActive !== undefined) {
      where.isActive = validatedQuery.isActive
    }

    // 获取设备列表
    const devices = await prisma.deviceConnection.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        lastSyncAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: devices,
      total: devices.length
    })

  } catch (error) {
    console.error('获取设备列表失败:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数错误', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
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
      syncInterval: z.number().optional().default(1800)
    })

    const validatedData = connectionSchema.parse(body)

    // 验证用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: validatedData.memberId,
        user: {
          families: {
            some: {
              members: {
                some: {
                  userId: session.user.id
                }
              }
            }
          }
        }
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      )
    }

    // 检查设备是否已存在
    const existingDevice = await prisma.deviceConnection.findFirst({
      where: {
        deviceId: validatedData.deviceId,
        isActive: true
      }
    })

    if (existingDevice) {
      return NextResponse.json(
        { error: '设备已存在' },
        { status: 409 }
      )
    }

    // 根据平台调用相应的连接服务
    let deviceConnection
    if (validatedData.platform === 'APPLE_HEALTHKIT') {
      const { connectHealthKitDevice } = await import('@/lib/services/healthkit-service')
      deviceConnection = await connectHealthKitDevice(validatedData.memberId, validatedData)
    } else if (validatedData.platform === 'HUAWEI_HEALTH') {
      const { connectHuaweiHealthDevice } = await import('@/lib/services/huawei-health-service')
      deviceConnection = await connectHuaweiHealthDevice(validatedData.memberId, validatedData)
    } else {
      // 其他平台的通用处理
      deviceConnection = await prisma.deviceConnection.create({
        data: {
          ...validatedData,
          syncStatus: 'PENDING',
          connectionDate: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: deviceConnection,
      message: '设备连接成功'
    })

  } catch (error) {
    console.error('连接设备失败:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数错误', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '设备连接失败' },
      { status: 500 }
    )
  }
}
