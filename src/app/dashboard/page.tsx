import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  // 获取用户的家庭信息
  const userFamilies = await prisma.family.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id
        }
      }
    },
    include: {
      members: {
        include: {
          healthGoals: true,
          allergies: true
        }
      },
      _count: {
        select: {
          members: true
        }
      }
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Health Butler
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                欢迎，{session.user.name}
              </span>
              <a
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                退出登录
              </a>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              家庭健康管理中心
            </h2>
            <p className="text-gray-600">
              管理您的家庭成员和健康目标
            </p>
          </div>

          {userFamilies.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                您还没有创建家庭
              </h3>
              <p className="text-gray-600 mb-4">
                创建一个家庭档案来开始管理您和家人的健康
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                创建家庭
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userFamilies.map((family) => (
                <div key={family.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {family.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {family._count.members} 成员
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        家庭成员
                      </h4>
                      <div className="space-y-2">
                        {family.members.map((member) => (
                          <div key={member.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{member.name}</span>
                            <div className="flex items-center space-x-2">
                              {member.healthGoals.length > 0 && (
                                <span className="text-green-600 text-xs">
                                  {member.healthGoals[0].goalType === 'LOSE_WEIGHT' ? '减重' : '维持'}
                                </span>
                              )}
                              {member.allergies.length > 0 && (
                                <span className="text-red-600 text-xs">
                                  过敏
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                      管理家庭 →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}