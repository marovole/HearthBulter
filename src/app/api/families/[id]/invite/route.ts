import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 生成随机邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 避免容易混淆的字符 (O, 0, I, 1, L)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// POST /api/families/:id/invite - 生成或刷新家庭邀请码
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 获取家庭信息并验证权限
    const family = await prisma.family.findUnique({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { userId: session.user.id, deletedAt: null },
          select: { role: true },
        },
      },
    })

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 })
    }

    // 验证权限：只有创建者和管理员可以生成邀请码
    const isCreator = family.creatorId === session.user.id
    const isAdmin = family.members[0]?.role === 'ADMIN' || isCreator

    if (!isAdmin) {
      return NextResponse.json(
        { error: '只有管理员可以生成邀请码' },
        { status: 403 }
      )
    }

    // 生成新的邀请码
    const inviteCode = generateInviteCode()

    // 更新家庭的邀请码
    const updatedFamily = await prisma.family.update({
      where: { id },
      data: { inviteCode },
    })

    // 构建邀请链接
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${inviteCode}`

    return NextResponse.json(
      {
        message: '邀请码生成成功',
        inviteCode: updatedFamily.inviteCode,
        inviteUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('生成邀请码失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// GET /api/families/:id/invite - 获取当前邀请码
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 获取家庭信息
    const family = await prisma.family.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        creatorId: true,
        members: {
          where: { userId: session.user.id, deletedAt: null },
          select: { role: true },
        },
      },
    })

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 })
    }

    // 验证用户是否属于该家庭
    if (family.members.length === 0) {
      return NextResponse.json(
        { error: '无权限访问该家庭' },
        { status: 403 }
      )
    }

    // 如果没有邀请码，返回提示
    if (!family.inviteCode) {
      return NextResponse.json(
        {
          inviteCode: null,
          inviteUrl: null,
          message: '尚未生成邀请码，请点击生成',
        },
        { status: 200 }
      )
    }

    // 构建邀请链接
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${family.inviteCode}`

    return NextResponse.json(
      {
        inviteCode: family.inviteCode,
        inviteUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取邀请码失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
