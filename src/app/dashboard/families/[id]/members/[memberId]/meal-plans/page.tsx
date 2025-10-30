import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default async function MealPlansPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>
}) {
  const { id, memberId } = await params
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  // 获取成员信息
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId, deletedAt: null },
    include: {
      family: {
        select: {
          id: true,
          name: true,
          creatorId: true,
          members: {
            where: { userId: session.user.id, deletedAt: null },
            select: { role: true },
          },
        },
      },
      mealPlans: {
        where: { deletedAt: null },
        include: {
          meals: {
            take: 1, // 只取第一个餐食用于统计
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!member) {
    notFound()
  }

  // 验证权限
  const isCreator = member.family.creatorId === session.user.id
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator
  const isSelf = member.userId === session.user.id

  if (!isAdmin && !isSelf) {
    redirect(`/dashboard/families/${id}/members/${memberId}`)
  }

  const GOAL_TYPE_LABELS: Record<string, string> = {
    WEIGHT_LOSS: '减重',
    WEIGHT_GAIN: '增肌',
    MAINTENANCE: '维持',
    HEALTH_MANAGEMENT: '健康管理',
  }

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: '进行中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 面包屑导航 */}
          <nav className="mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link
                href={`/dashboard/families/${id}`}
                className="hover:text-gray-900"
              >
                家庭
              </Link>
              <span>/</span>
              <Link
                href={`/dashboard/families/${id}/members/${memberId}`}
                className="hover:text-gray-900"
              >
                {member.name || '成员'}
              </Link>
              <span>/</span>
              <span className="text-gray-900">食谱规划</span>
            </div>
          </nav>

          {/* 标题和操作 */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">食谱计划</h1>
            <Link
              href={`/dashboard/families/${id}/members/${memberId}/meal-plans/new`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              新建食谱计划
            </Link>
          </div>

          {/* 食谱列表 */}
          {member.mealPlans.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600 mb-4">还没有创建任何食谱计划</p>
              <Link
                href={`/dashboard/families/${id}/members/${memberId}/meal-plans/new`}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                创建第一个食谱计划
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {member.mealPlans.map((plan) => {
                const days = Math.ceil(
                  (plan.endDate.getTime() - plan.startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1

                return (
                  <Link
                    key={plan.id}
                    href={`/dashboard/families/${id}/members/${memberId}/meal-plans/${plan.id}`}
                    className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {format(plan.startDate, 'yyyy年M月d日', {
                              locale: zhCN,
                            })}{' '}
                            -{' '}
                            {format(plan.endDate, 'M月d日', {
                              locale: zhCN,
                            })}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[plan.status]}`}
                          >
                            {STATUS_LABELS[plan.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            时长: {days}天
                          </span>
                          <span>
                            目标: {GOAL_TYPE_LABELS[plan.goalType] || plan.goalType}
                          </span>
                          <span>
                            目标热量: {plan.targetCalories.toFixed(0)} kcal/天
                          </span>
                          <span>
                            餐食数: {plan.meals.length}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400">→</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

