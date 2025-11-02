import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const emailShareSchema = z.object({
  emailAddress: z.string().email('请输入正确的邮箱地址'),
  listName: z.string(),
  textContent: z.string(),
})

// POST /api/shopping-lists/:id/share/email - 邮件分享
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 查询购物清单并验证权限
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { id: listId },
      include: {
        plan: {
          include: {
            member: {
              include: {
                family: {
                  select: {
                    creatorId: true,
                    members: {
                      where: { userId: session.user.id, deletedAt: null },
                      select: { role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!shoppingList) {
      return NextResponse.json({ error: '购物清单不存在' }, { status: 404 })
    }

    // 验证权限
    const isCreator =
      shoppingList.plan.member.family.creatorId === session.user.id
    const isAdmin =
      shoppingList.plan.member.family.members[0]?.role === 'ADMIN' ||
      isCreator
    const isSelf = shoppingList.plan.member.userId === session.user.id

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限分享该购物清单' },
        { status: 403 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const validatedData = emailShareSchema.parse(body)

    // 这里应该集成邮件服务，比如 Resend、SendGrid 等
    // 目前先返回成功，实际项目中需要实现邮件发送逻辑
    try {
      // 示例邮件发送逻辑（需要配置邮件服务）
      // await emailService.send({
      //   to: validatedData.emailAddress,
      //   subject: `购物清单分享: ${validatedData.listName}`,
      //   text: validatedData.textContent,
      //   html: `<pre>${validatedData.textContent}</pre>`,
      // })

      console.log('邮件发送模拟:', {
        to: validatedData.emailAddress,
        subject: `购物清单分享: ${validatedData.listName}`,
        content: validatedData.textContent,
      })

      return NextResponse.json({
        message: '邮件发送成功',
        emailAddress: validatedData.emailAddress,
      })
    } catch (emailError) {
      console.error('邮件发送失败:', emailError)
      return NextResponse.json(
        { error: '邮件发送失败，请稍后重试' },
        { status: 500 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.errors },
        { status: 400 }
      )
    }

    console.error('邮件分享失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
