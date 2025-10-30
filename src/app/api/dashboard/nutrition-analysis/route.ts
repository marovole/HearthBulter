import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { analyticsService } from '@/lib/services/analytics-service'

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
 * GET /api/dashboard/nutrition-analysis
 * 获取营养分析数据
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const memberId = searchParams.get('memberId')
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少成员ID参数' },
        { status: 400 }
      )
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的营养分析数据' },
        { status: 403 }
      )
    }

    // 获取营养汇总
    const nutritionSummary = await analyticsService.summarizeNutrition(
      memberId,
      period
    )

    return NextResponse.json({ data: nutritionSummary }, { status: 200 })
  } catch (error) {
    console.error('获取营养分析失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

