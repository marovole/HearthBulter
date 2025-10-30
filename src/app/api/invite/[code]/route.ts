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

    // 查找具有该邀请码的家庭
    const family = await prisma.family.findFirst({
      where: {
        inviteCode: code,
        deletedAt: null,
      },
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
    })

    if (!family) {
      return NextResponse.json(
        { error: '邀请码无效或已过期' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        family: {
          id: family.id,
          name: family.name,
          description: family.description,
          memberCount: family._count.members,
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

    // 查找具有该邀请码的家庭
    const family = await prisma.family.findFirst({
      where: {
        inviteCode: code,
        deletedAt: null,
      },
      include: {
        members: {
          where: { deletedAt: null },
        },
      },
    })

    if (!family) {
      return NextResponse.json(
        { error: '邀请码无效或已过期' },
        { status: 404 }
      )
    }

    // 检查用户是否已经是该家庭的成员
    const existingMember = family.members.find(
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
          not: family.id,
        },
      },
    })

    if (userInOtherFamily) {
      return NextResponse.json(
        { error: '您已经属于另一个家庭，请先退出后再加入新家庭' },
        { status: 400 }
      )
    }

    // 创建家庭成员档案
    // 注意：这里创建的是关联了用户账户的成员，需要用户提供基本信息
    const newMember = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: session.user.id,
        name: memberName.trim(),
        // 默认值，用户后续可以更新
        gender: 'MALE', // 默认性别，需要用户后续设置
        birthDate: new Date('2000-01-01'), // 默认出生日期，需要用户后续设置
        role: 'MEMBER', // 通过邀请加入的默认为普通成员
      },
    })

    return NextResponse.json(
      {
        message: '成功加入家庭',
        family: {
          id: family.id,
          name: family.name,
        },
        member: {
          id: newMember.id,
          name: newMember.name,
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
