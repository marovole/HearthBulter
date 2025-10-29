import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// 更新家庭的验证 schema
const updateFamilySchema = z.object({
  name: z.string().min(2, '家庭名称至少需要2个字符').optional(),
  description: z.string().optional(),
})

// GET /api/families/:id - 获取家庭详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const family = await prisma.family.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: { deletedAt: null },
          include: {
            healthGoals: {
              where: { deletedAt: null, status: 'ACTIVE' },
              select: {
                id: true,
                goalType: true,
                targetWeight: true,
                progress: true,
              },
            },
            allergies: {
              where: { deletedAt: null },
              select: {
                id: true,
                allergenType: true,
                allergenName: true,
                severity: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 })
    }

    // 验证用户是否有权限访问该家庭
    const isMember = family.members.some((member) => member.userId === session.user.id)
    const isCreator = family.creatorId === session.user.id

    if (!isMember && !isCreator) {
      return NextResponse.json({ error: '无权限访问该家庭' }, { status: 403 })
    }

    return NextResponse.json({ family }, { status: 200 })
  } catch (error) {
    console.error('获取家庭详情失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// PATCH /api/families/:id - 更新家庭信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const body = await request.json()

    // 验证输入数据
    const validation = updateFamilySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      )
    }

    // 检查家庭是否存在
    const family = await prisma.family.findUnique({
      where: { id: params.id, deletedAt: null },
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

    // 验证权限：必须是管理员
    const memberRole = family.members[0]?.role
    const isCreator = family.creatorId === session.user.id
    const isAdmin = memberRole === 'ADMIN' || isCreator

    if (!isAdmin) {
      return NextResponse.json(
        { error: '只有管理员可以修改家庭信息' },
        { status: 403 }
      )
    }

    // 更新家庭信息
    const updatedFamily = await prisma.family.update({
      where: { id: params.id },
      data: validation.data,
      include: {
        members: {
          where: { deletedAt: null },
        },
      },
    })

    return NextResponse.json(
      {
        message: '家庭信息更新成功',
        family: updatedFamily,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('更新家庭信息失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// DELETE /api/families/:id - 删除家庭（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 检查家庭是否存在
    const family = await prisma.family.findUnique({
      where: { id: params.id, deletedAt: null },
    })

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 })
    }

    // 只有创建者可以删除家庭
    if (family.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: '只有家庭创建者可以删除家庭' },
        { status: 403 }
      )
    }

    // 软删除家庭
    await prisma.family.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json(
      { message: '家庭删除成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除家庭失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
