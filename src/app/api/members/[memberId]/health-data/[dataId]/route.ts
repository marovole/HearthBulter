import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
 * DELETE /api/members/:memberId/health-data/:dataId
 * 删除健康数据记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; dataId: string }> }
) {
  try {
    const { memberId, dataId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限删除该成员的健康数据' },
        { status: 403 }
      )
    }

    // 检查记录是否存在且属于该成员
    const healthData = await prisma.healthData.findFirst({
      where: {
        id: dataId,
        memberId,
      },
    })

    if (!healthData) {
      return NextResponse.json(
        { error: '健康数据记录不存在' },
        { status: 404 }
      )
    }

    // 删除记录
    await prisma.healthData.delete({
      where: { id: dataId },
    })

    return NextResponse.json(
      {
        message: '健康数据删除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除健康数据失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
