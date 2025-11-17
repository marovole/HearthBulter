import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic'

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // 获取家庭详细信息
  const family = await prisma.family.findUnique({
    where: { id, deletedAt: null },
    include: {
      members: {
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          healthGoals: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          allergies: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  if (!family) {
    notFound();
  }

  // 验证用户是否属于该家庭
  const userMember = family.members.find((m) => m.userId === session.user.id);
  if (!userMember) {
    redirect('/dashboard');
  }

  const isCreator = family.creatorId === session.user.id;
  const isAdmin = userMember.role === 'ADMIN' || isCreator;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← 返回
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                {family.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user.name}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                退出登录
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 家庭信息卡片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {family.name}
                </h2>
                <p className="text-gray-600">
                  {family.members.length} 位家庭成员
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/families/${id}/invite`}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    邀请成员
                  </Link>
                  <Link
                    href={`/dashboard/families/${id}/members/new`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    + 添加成员
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 成员列表 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                家庭成员
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              {family.members.map((member) => {
                const activeGoal = member.healthGoals[0];
                const hasAllergies = member.allergies.length > 0;

                return (
                  <div
                    key={member.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {member.name}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {member.gender === 'MALE' ? '男' : '女'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {member.ageGroup === 'CHILD'
                              ? '儿童'
                              : member.ageGroup === 'TEENAGER'
                                ? '青少年'
                                : member.ageGroup === 'ADULT'
                                  ? '成年人'
                                  : '老年人'}
                          </span>
                          {member.role === 'ADMIN' && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              管理员
                            </span>
                          )}
                        </div>

                        {member.user && (
                          <p className="text-sm text-gray-600 mb-3">
                            关联账户: {member.user.name} ({member.user.email})
                          </p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {member.weight && (
                            <div>
                              <span className="text-gray-500">体重:</span>
                              <span className="ml-2 font-medium">
                                {member.weight} kg
                              </span>
                            </div>
                          )}
                          {member.height && (
                            <div>
                              <span className="text-gray-500">身高:</span>
                              <span className="ml-2 font-medium">
                                {member.height} cm
                              </span>
                            </div>
                          )}
                          {member.bmi && (
                            <div>
                              <span className="text-gray-500">BMI:</span>
                              <span className="ml-2 font-medium">
                                {member.bmi.toFixed(1)}
                              </span>
                            </div>
                          )}
                          {activeGoal?.tdee && (
                            <div>
                              <span className="text-gray-500">TDEE:</span>
                              <span className="ml-2 font-medium">
                                {activeGoal.tdee} kcal
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 健康目标 */}
                        {activeGoal && (
                          <div className="mt-4 p-3 bg-green-50 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium text-green-800">
                                  当前目标:{' '}
                                  {activeGoal.goalType === 'LOSE_WEIGHT'
                                    ? '减重'
                                    : activeGoal.goalType === 'GAIN_MUSCLE'
                                      ? '增肌'
                                      : activeGoal.goalType === 'MAINTAIN'
                                        ? '维持'
                                        : '改善健康'}
                                </span>
                                {activeGoal.targetWeight && (
                                  <span className="ml-2 text-sm text-green-700">
                                    目标体重: {activeGoal.targetWeight} kg
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-green-700">
                                进度: {activeGoal.progress}%
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 过敏信息 */}
                        {hasAllergies && (
                          <div className="mt-2 p-3 bg-red-50 rounded-md">
                            <span className="text-sm font-medium text-red-800">
                              ⚠️ 过敏史: {member.allergies.length} 项
                            </span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {member.allergies.slice(0, 3).map((allergy) => (
                                <span
                                  key={allergy.id}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                                >
                                  {allergy.allergenName}
                                </span>
                              ))}
                              {member.allergies.length > 3 && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                  +{member.allergies.length - 3} 更多
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        <Link
                          href={`/dashboard/families/${id}/members/${member.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          查看详情 →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
