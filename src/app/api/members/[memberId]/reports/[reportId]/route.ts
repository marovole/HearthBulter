import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { fileStorageService } from '@/lib/services/file-storage-service'
import type { IndicatorType, IndicatorStatus } from '@prisma/client'

/**
 * 验证用户是否有权限访问成员的健康数据
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
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
    return { hasAccess: false }
  }

  const isCreator = member.family.creatorId === userId
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator
  const isSelf = member.userId === userId

  return {
    hasAccess: isAdmin || isSelf,
  }
}

/**
 * GET /api/members/:memberId/reports/:reportId
 * 获取报告详情和指标数据
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; reportId: string }> }
) {
  try {
    const { memberId, reportId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限查看该报告' },
        { status: 403 }
      )
    }

    // 查询报告详情
    const report = await prisma.medicalReport.findFirst({
      where: {
        id: reportId,
        memberId,
        deletedAt: null,
      },
      include: {
        indicators: {
          orderBy: [
            { indicatorType: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: report }, { status: 200 })
  } catch (error) {
    console.error('查询报告详情失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/members/:memberId/reports/:reportId
 * 手动修正OCR识别结果
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; reportId: string }> }
) {
  try {
    const { memberId, reportId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限修改该报告' },
        { status: 403 }
      )
    }

    // 查询报告
    const report = await prisma.medicalReport.findFirst({
      where: {
        id: reportId,
        memberId,
        deletedAt: null,
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // 更新报告元数据
    const updateData: any = {}

    if (body.reportDate !== undefined) {
      updateData.reportDate = body.reportDate ? new Date(body.reportDate) : null
    }

    if (body.institution !== undefined) {
      updateData.institution = body.institution || null
    }

    if (body.reportType !== undefined) {
      updateData.reportType = body.reportType || null
    }

    if (Object.keys(updateData).length > 0) {
      updateData.isCorrected = true
      updateData.correctedAt = new Date()
    }

    // 更新指标
    if (body.indicators && Array.isArray(body.indicators)) {
      for (const indicatorUpdate of body.indicators) {
        const { id, value, unit, referenceRange, status } = indicatorUpdate

        if (!id) {
          continue
        }

        // 查询原始指标
        const indicator = await prisma.medicalIndicator.findFirst({
          where: {
            id,
            reportId,
          },
        })

        if (indicator) {
          // 更新指标
          await prisma.medicalIndicator.update({
            where: { id },
            data: {
              value: value !== undefined ? value : indicator.value,
              unit: unit || indicator.unit,
              referenceRange: referenceRange !== undefined ? referenceRange : indicator.referenceRange,
              status: (status as IndicatorStatus) || indicator.status,
              isAbnormal: status !== 'NORMAL',
              isCorrected: true,
              originalValue: indicator.originalValue || indicator.value,
            },
          })
        }
      }

      updateData.isCorrected = true
      updateData.correctedAt = new Date()
    }

    // 更新报告
    const updatedReport = await prisma.medicalReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        indicators: {
          orderBy: [
            { indicatorType: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    })

    return NextResponse.json(
      {
        message: '报告修正成功',
        data: updatedReport,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('修正报告失败:', error)
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/members/:memberId/reports/:reportId
 * 删除报告（同时删除云存储文件）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; reportId: string }> }
) {
  try {
    const { memberId, reportId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限删除该报告' },
        { status: 403 }
      )
    }

    // 查询报告
    const report = await prisma.medicalReport.findFirst({
      where: {
        id: reportId,
        memberId,
        deletedAt: null,
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      )
    }

    // 从云存储删除文件
    try {
      const pathname = fileStorageService.extractPathnameFromUrl(report.fileUrl)
      if (pathname) {
        await fileStorageService.deleteFile(pathname)
      }
    } catch (error) {
      console.warn('删除云存储文件失败（继续删除数据库记录）:', error)
    }

    // 软删除报告（标记deletedAt）
    await prisma.medicalReport.update({
      where: { id: reportId },
      data: {
        deletedAt: new Date(),
      },
    })

    // 删除关联的指标记录
    await prisma.medicalIndicator.deleteMany({
      where: { reportId },
    })

    return NextResponse.json(
      { message: '报告删除成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除报告失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

