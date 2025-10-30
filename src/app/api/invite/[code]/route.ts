import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/invite/:code - 获取邀请信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // 查找邀请记录
    const invitation = await prisma.familyInvitation.findFirst({
      where: {
        inviteCode: code,
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: {
                members: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: '邀请码无效' },
        { status: 404 }
      )
    }

    // 检查邀请是否过期
    if (invitation.expiresAt < new Date()) {
      // 自动标记为过期
      await prisma.familyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })

      return NextResponse.json(
        { error: '邀请已过期' },
        { status: 410 }
      )
    }

    // 检查邀请状态
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: '该邀请已被接受' },
        { status: 410 }
      )
    }

    if (invitation.status === 'REJECTED') {
      return NextResponse.json(
        { error: '该邀请已被拒绝' },
        { status: 410 }
      )
    }

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        family: {
          id: invitation.family.id,
          name: invitation.family.name,
          description: invitation.family.description,
          memberCount: invitation.family._count.members,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取邀请信息失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// POST /api/invite/:code - 接受邀请并加入家庭
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录后再接受邀请' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { memberName } = body

    if (!memberName || typeof memberName !== 'string' || memberName.trim() === '') {
      return NextResponse.json(
        { error: '请提供成员名称' },
        { status: 400 }
      )
    }

    // 查找邀请记录
    const invitation = await prisma.familyInvitation.findFirst({
      where: {
        inviteCode: code,
      },
      include: {
        family: {
          include: {
            members: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: '邀请码无效' },
        { status: 404 }
      )
    }

    // 检查邀请是否过期
    if (invitation.expiresAt < new Date()) {
      // 自动标记为过期
      await prisma.familyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })

      return NextResponse.json(
        { error: '邀请已过期' },
        { status: 410 }
      )
    }

    // 检查邀请状态
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: '该邀请不可用' },
        { status: 410 }
      )
    }

    // 验证邮箱匹配（可选：根据业务需求决定是否强制匹配）
    if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: '邀请邮箱与登录邮箱不匹配' },
        { status: 403 }
      )
    }

    // 检查用户是否已经是该家庭的成员
    const existingMember = invitation.family.members.find(
      (member) => member.userId === session.user.id
    )

    if (existingMember) {
      return NextResponse.json(
        { error: '您已经是该家庭的成员' },
        { status: 400 }
      )
    }

    // 检查用户是否已经属于其他家庭
    const userInOtherFamily = await prisma.familyMember.findFirst({
      where: {
        userId: session.user.id,
        deletedAt: null,
        familyId: {
          not: invitation.family.id,
        },
      },
    })

    if (userInOtherFamily) {
      return NextResponse.json(
        { error: '您已经属于另一个家庭，请先退出后再加入新家庭' },
        { status: 400 }
      )
    }

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 创建家庭成员档案
      const newMember = await tx.familyMember.create({
        data: {
          familyId: invitation.family.id,
          userId: session.user.id,
          name: memberName.trim(),
          // 默认值，用户后续可以更新
          gender: 'MALE', // 默认性别，需要用户后续设置
          birthDate: new Date('2000-01-01'), // 默认出生日期，需要用户后续设置
          role: invitation.role, // 使用邀请中指定的角色
        },
      })

      // 更新邀请状态为已接受
      await tx.familyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      })

      return newMember
    })

    return NextResponse.json(
      {
        message: '成功加入家庭',
        family: {
          id: invitation.family.id,
          name: invitation.family.name,
        },
        member: {
          id: result.id,
          name: result.name,
          role: result.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('加入家庭失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
