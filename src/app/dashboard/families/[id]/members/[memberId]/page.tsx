'use client';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';


export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>
}) {
  const { id, memberId } = await params;
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // 获取成员详细信息
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
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      healthGoals: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      },
      allergies: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      },
      medicalReports: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1, // 只取最近一次报告
        include: {
          indicators: {
            where: { isAbnormal: true },
            take: 3, // 只取前3个异常指标用于显示
          },
        },
      },
    },
  });

  if (!member || member.family.id !== id) {
    notFound();
  }

  // 验证权限
  const isCreator = member.family.creatorId === session.user.id;
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
  const isSelf = member.userId === session.user.id;

  if (!isAdmin && !isSelf) {
    redirect('/dashboard');
  }

  // 计算年龄
  const birthDate = new Date(member.birthDate);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href={`/dashboard/families/${id}`}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← 返回家庭
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                {member.name}
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
          {/* 基本信息卡片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">基本信息</h2>
              {(isAdmin || isSelf) && (
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  编辑信息
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  姓名
                </label>
                <p className="mt-1 text-base text-gray-900">{member.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  性别
                </label>
                <p className="mt-1 text-base text-gray-900">
                  {member.gender === 'MALE' ? '男' : '女'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  年龄
                </label>
                <p className="mt-1 text-base text-gray-900">{age} 岁</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  年龄组
                </label>
                <p className="mt-1 text-base text-gray-900">
                  {member.ageGroup === 'CHILD'
                    ? '儿童'
                    : member.ageGroup === 'TEENAGER'
                      ? '青少年'
                      : member.ageGroup === 'ADULT'
                        ? '成年人'
                        : '老年人'}
                </p>
              </div>

              {member.weight && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    体重
                  </label>
                  <p className="mt-1 text-base text-gray-900">
                    {member.weight} kg
                  </p>
                </div>
              )}

              {member.height && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    身高
                  </label>
                  <p className="mt-1 text-base text-gray-900">
                    {member.height} cm
                  </p>
                </div>
              )}

              {member.bmi && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    BMI
                  </label>
                  <p className="mt-1 text-base text-gray-900">
                    {member.bmi.toFixed(1)}
                  </p>
                </div>
              )}

              {member.healthGoals[0]?.tdee && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    每日能量消耗 (TDEE)
                  </label>
                  <p className="mt-1 text-base text-gray-900">
                    {member.healthGoals[0].tdee} kcal
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">
                  角色
                </label>
                <p className="mt-1 text-base text-gray-900">
                  {member.role === 'ADMIN' ? '管理员' : '成员'}
                </p>
              </div>
            </div>

            {member.user && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-500">
                  关联账户
                </label>
                <p className="mt-1 text-base text-gray-900">
                  {member.user.name} ({member.user.email})
                </p>
              </div>
            )}
          </div>

          {/* 健康目标卡片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">健康目标</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/goals/new`}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                >
                  + 新增目标
                </Link>
              )}
            </div>

            {member.healthGoals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无健康目标</p>
            ) : (
              <div className="space-y-4">
                {member.healthGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {goal.goalType === 'LOSE_WEIGHT'
                            ? '减重计划'
                            : goal.goalType === 'GAIN_MUSCLE'
                              ? '增肌计划'
                              : goal.goalType === 'MAINTAIN'
                                ? '维持体重'
                                : '改善健康'}
                        </h3>
                        <span
                          className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${
                            goal.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : goal.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-800'
                                : goal.status === 'PAUSED'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {goal.status === 'ACTIVE'
                            ? '进行中'
                            : goal.status === 'COMPLETED'
                              ? '已完成'
                              : goal.status === 'PAUSED'
                                ? '已暂停'
                                : '已取消'}
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/families/${id}/members/${memberId}/goals/${goal.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        查看详情 →
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      {goal.startWeight && (
                        <div>
                          <span className="text-gray-500">起始体重:</span>
                          <span className="ml-2 font-medium">
                            {goal.startWeight} kg
                          </span>
                        </div>
                      )}
                      {goal.currentWeight && (
                        <div>
                          <span className="text-gray-500">当前体重:</span>
                          <span className="ml-2 font-medium">
                            {goal.currentWeight} kg
                          </span>
                        </div>
                      )}
                      {goal.targetWeight && (
                        <div>
                          <span className="text-gray-500">目标体重:</span>
                          <span className="ml-2 font-medium">
                            {goal.targetWeight} kg
                          </span>
                        </div>
                      )}
                      {goal.targetWeeks && (
                        <div>
                          <span className="text-gray-500">目标周数:</span>
                          <span className="ml-2 font-medium">
                            {goal.targetWeeks} 周
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 进度条 */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          进度
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {goal.tdee && (
                      <div className="text-sm text-gray-600">
                        每日能量消耗: {goal.tdee} kcal
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 食谱规划卡片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">食谱规划</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/meal-plans/new`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  + 新建食谱计划
                </Link>
              )}
            </div>

            <div className="mb-4">
              <Link
                href={`/dashboard/families/${id}/members/${memberId}/meal-plans`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                查看所有食谱计划 →
              </Link>
            </div>

            <p className="text-gray-500 text-sm">
              根据成员的健康目标和营养需求，自动生成个性化食谱计划
            </p>
          </div>

          {/* 体检报告卡片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">体检报告</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/reports/new`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  + 上传新报告
                </Link>
              )}
            </div>

            {member.medicalReports.length === 0 ? (
              <div className="mb-4">
                <p className="text-gray-500 text-sm mb-4">
                  还没有上传任何体检报告
                </p>
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/reports`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  查看所有报告 →
                </Link>
              </div>
            ) : (
              <>
                {member.medicalReports[0] && (
                  <div className="mb-4">
                    <div className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          最近一次报告
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            member.medicalReports[0].ocrStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : member.medicalReports[0].ocrStatus === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-800'
                                : member.medicalReports[0].ocrStatus === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {member.medicalReports[0].ocrStatus === 'COMPLETED'
                            ? '已完成'
                            : member.medicalReports[0].ocrStatus === 'PROCESSING'
                              ? '处理中'
                              : member.medicalReports[0].ocrStatus === 'FAILED'
                                ? '失败'
                                : '待处理'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        {member.medicalReports[0].reportDate && (
                          <div>
                            <span className="text-gray-500">报告日期：</span>
                            <span className="font-medium">
                              {new Date(
                                member.medicalReports[0].reportDate
                              ).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        )}
                        {member.medicalReports[0].institution && (
                          <div>
                            <span className="text-gray-500">医疗机构：</span>
                            <span className="font-medium">
                              {member.medicalReports[0].institution}
                            </span>
                          </div>
                        )}
                      </div>

                      {member.medicalReports[0].ocrStatus === 'COMPLETED' &&
                        member.medicalReports[0].indicators.length > 0 && (
                        <div className="mt-3">
                          {member.medicalReports[0].indicators.filter(
                            (ind) => ind.isAbnormal
                          ).length > 0 ? (
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <p className="text-sm font-medium text-red-900 mb-2">
                                  发现{' '}
                                  {
                                    member.medicalReports[0].indicators.filter(
                                      (ind) => ind.isAbnormal
                                    ).length
                                  }{' '}
                                  项异常指标
                                </p>
                                <div className="space-y-1">
                                  {member.medicalReports[0].indicators
                                    .filter((ind) => ind.isAbnormal)
                                    .slice(0, 3)
                                    .map((indicator) => (
                                      <div
                                        key={indicator.id}
                                        className="text-sm text-red-800"
                                      >
                                        • {indicator.name}: {indicator.value}{' '}
                                        {indicator.unit}
                                      </div>
                                    ))}
                                  {member.medicalReports[0].indicators.filter(
                                    (ind) => ind.isAbnormal
                                  ).length > 3 && (
                                    <div className="text-xs text-red-600">
                                      还有{' '}
                                      {member.medicalReports[0].indicators.filter(
                                        (ind) => ind.isAbnormal
                                      ).length - 3}{' '}
                                      项异常指标...
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                <p className="text-sm font-medium text-green-900">
                                  所有指标均正常
                                </p>
                              </div>
                            )}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/dashboard/families/${id}/members/${memberId}/reports/${member.medicalReports[0].id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          查看详情 →
                        </Link>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/families/${id}/members/${memberId}/reports`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      查看所有报告 →
                    </Link>
                  </div>
                )}
              </>
            )}

            <p className="text-gray-500 text-sm">
              上传体检报告，自动识别健康指标并追踪变化趋势
            </p>
          </div>

          {/* 过敏史卡片 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">过敏史</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/allergies/new`}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  + 添加过敏记录
                </Link>
              )}
            </div>

            {member.allergies.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                暂无过敏记录
              </p>
            ) : (
              <div className="space-y-3">
                {member.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {allergy.allergenName}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              allergy.severity === 'LIFE_THREATENING'
                                ? 'bg-red-100 text-red-800'
                                : allergy.severity === 'SEVERE'
                                  ? 'bg-orange-100 text-orange-800'
                                  : allergy.severity === 'MODERATE'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {allergy.severity === 'LIFE_THREATENING'
                              ? '危及生命'
                              : allergy.severity === 'SEVERE'
                                ? '严重'
                                : allergy.severity === 'MODERATE'
                                  ? '中度'
                                  : '轻度'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {allergy.allergenType === 'FOOD'
                              ? '食物'
                              : allergy.allergenType === 'ENVIRONMENTAL'
                                ? '环境'
                                : allergy.allergenType === 'MEDICATION'
                                  ? '药物'
                                  : '其他'}
                          </span>
                        </div>

                        {allergy.description && (
                          <p className="text-sm text-gray-600">
                            {allergy.description}
                          </p>
                        )}
                      </div>

                      {(isAdmin || isSelf) && (
                        <button className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
                          编辑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
