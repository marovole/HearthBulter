import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/cleanup/expired-invitations - 清理过期邀请
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // 验证管理员权限（仅管理员可执行清理任务）
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限执行此操作' },
        { status: 403 }
      )
    }

    // 清理过期邀请
    const result = await prisma.familyInvitation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    })

    // 软删除超过30天的已过期/已拒绝邀请
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const softDeleteResult = await prisma.familyInvitation.updateMany({
      where: {
        status: { in: ['EXPIRED', 'REJECTED'] },
        updatedAt: { lt: thirtyDaysAgo },
      },
      data: {
        status: 'DELETED', // 使用软删除
      },
    })

    return NextResponse.json(
      {
        message: '清理任务完成',
        results: {
          expiredUpdated: result.count,
          softDeleted: softDeleteResult.count,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('清理过期邀请失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// GET /api/cleanup/expired-invitations - 获取过期邀请统计
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // 验证管理员权限
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权限执行此操作' },
        { status: 403 }
      )
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // 获取过期邀请统计
    const [
      pendingExpired,
      expiredStatus,
      rejectedStatus,
      softDeletable,
    ] = await Promise.all([
      // 待处理但已过期的邀请
      prisma.familyInvitation.count({
        where: {
          status: 'PENDING',
          expiresAt: { lt: now },
        },
      }),
      // 已标记为过期的邀请
      prisma.familyInvitation.count({
        where: {
          status: 'EXPIRED',
        },
      }),
      // 已拒绝的邀请
      prisma.familyInvitation.count({
        where: {
          status: 'REJECTED',
        },
      }),
      // 可软删除的过期/拒绝邀请（超过30天）
      prisma.familyInvitation.count({
        where: {
          status: { in: ['EXPIRED', 'REJECTED'] },
          updatedAt: { lt: thirtyDaysAgo },
        },
      }),
    ])

    return NextResponse.json(
      {
        statistics: {
          pendingExpired,
          expiredStatus,
          rejectedStatus,
          softDeletable,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取过期邀请统计失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}