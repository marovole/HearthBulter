import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";

type Id<TableName extends string> = string & { __tableName: TableName };

type HealthGoal = {
  id: string;
  goalType: string;
  status: string;
  startWeight?: number | null;
  currentWeight?: number | null;
  targetWeight?: number | null;
  targetWeeks?: number | null;
  progress: number;
  tdee?: number | null;
};

type MedicalIndicator = {
  id: string;
  name: string;
  value: string | number;
  unit?: string | null;
  isAbnormal: boolean;
};

type Allergy = {
  id: string;
  allergenName: string;
  allergenType: string;
  severity: string;
  description?: string | null;
};

type MemberDetailView = {
  id: string;
  name: string;
  gender: string;
  ageGroup: string;
  birthDate: Date;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  role: string;
  userId?: string;
  user?: { name?: string | null; email?: string | null } | null;
  healthGoals: HealthGoal[];
  allergies: Allergy[];
  medicalReports: Array<{
    id: string;
    ocrStatus?: string;
    reportDate?: Date | null;
    institution?: string | null;
    indicators: MedicalIndicator[];
  }>;
};

function getAgeGroup(birthDate: Date): string {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  if (age < 13) return "CHILD";
  if (age < 18) return "TEENAGER";
  if (age < 60) return "ADULT";
  return "ELDERLY";
}

function calculateBmi(weight?: number | null, height?: number | null): number | null {
  if (!weight || !height) {
    return null;
  }

  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const { id, memberId } = await params;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const access = await memberRepository.verifyMemberAccess(memberId, session.user.id);

  if (!access.member) {
    notFound();
  }

  if (access.member.familyId !== id) {
    notFound();
  }

  if (!access.hasAccess) {
    redirect("/dashboard");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const currentUserMember = (await convexClient.query(api.members.getByClerkInFamily, {
    familyId: id as Id<"families">,
    clerkId: session.user.id,
  })) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const memberDoc = (await convexClient.query(api.members.getById, {
    memberId: memberId as Id<"familyMembers">,
  })) as any;

  if (!memberDoc) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const goals = (await convexClient.query(api.health.listGoals, {
    memberId: memberId as Id<"familyMembers">,
    includeInactive: true,
  })) as any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const allergies = (await convexClient.query(api.health.listAllergies, {
    memberId: memberId as Id<"familyMembers">,
  })) as any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const medicalReports = (await convexClient.query(api.health.listMedicalReportsByMember, {
    memberId: memberId as Id<"familyMembers">,
    limit: 1,
  })) as any[];

  const latestReport = medicalReports[0]
    ? {
        ...medicalReports[0],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
        indicators: (
          ((await convexClient.query(api.health.listIndicatorsByReport, {
            reportId: medicalReports[0]._id as Id<"medicalReports">,
          })) as any[]) ?? []
        )
          .filter((indicator) => indicator.isAbnormal)
          .slice(0, 3)
          .map((indicator) => ({
            id: indicator._id,
            name: indicator.name,
            value: indicator.value,
            unit: indicator.unit ?? null,
            isAbnormal: indicator.isAbnormal,
          })),
      }
    : null;

  const user = memberDoc.userId
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
      ((await convexClient.query(api.users.getById, {
        userId: memberDoc.userId as Id<"users">,
      })) as any)
    : null;

  const birthDate = new Date(memberDoc.birthDate);
  const member: MemberDetailView = {
    id: memberDoc._id,
    name: memberDoc.name,
    gender: memberDoc.gender,
    ageGroup: getAgeGroup(birthDate),
    birthDate,
    weight: memberDoc.weight ?? null,
    height: memberDoc.height ?? null,
    bmi: calculateBmi(memberDoc.weight, memberDoc.height),
    role: memberDoc.role,
    userId: memberDoc.userId,
    user: user
      ? {
          name: user.name ?? null,
          email: user.email ?? null,
        }
      : null,
    healthGoals: goals.map((goal) => ({
      id: goal._id,
      goalType: goal.goalType,
      status: goal.status,
      startWeight: goal.startWeight ?? null,
      currentWeight: goal.currentValue ?? null,
      targetWeight: goal.targetValue ?? null,
      targetWeeks: goal.targetWeeks ?? null,
      progress: goal.progress ?? 0,
      tdee: goal.tdee ?? null,
    })),
    allergies: allergies.map((allergy) => ({
      id: allergy._id,
      allergenName: allergy.allergenName,
      allergenType: allergy.allergenType,
      severity: allergy.severity,
      description: allergy.description ?? null,
    })),
    medicalReports: latestReport
      ? [
          {
            id: latestReport._id,
            ocrStatus: latestReport.ocrStatus,
            reportDate: latestReport.reportDate ? new Date(latestReport.reportDate) : null,
            institution: latestReport.institution ?? null,
            indicators: latestReport.indicators,
          },
        ]
      : [],
  };

  const isSelf = Boolean(
    currentUserMember?.userId && memberDoc.userId && currentUserMember.userId === memberDoc.userId
  );
  const isCreator = Boolean(
    currentUserMember?.userId && access.member.family.creatorId === currentUserMember.userId
  );
  const isAdmin = currentUserMember?.role === "ADMIN" || isCreator;

  // 计算年龄
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link
                href={`/dashboard/families/${id}`}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← 返回家庭
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{member.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{session.user.name}</span>
              <Link href="/api/auth/signout" className="text-sm text-gray-500 hover:text-gray-700">
                退出登录
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 基本信息卡片 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-2xl font-bold text-gray-900">基本信息</h2>
              {(isAdmin || isSelf) && (
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  编辑信息
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-500">姓名</label>
                <p className="mt-1 text-base text-gray-900">{member.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">性别</label>
                <p className="mt-1 text-base text-gray-900">
                  {member.gender === "MALE" ? "男" : "女"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">年龄</label>
                <p className="mt-1 text-base text-gray-900">{age} 岁</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">年龄组</label>
                <p className="mt-1 text-base text-gray-900">
                  {member.ageGroup === "CHILD"
                    ? "儿童"
                    : member.ageGroup === "TEENAGER"
                      ? "青少年"
                      : member.ageGroup === "ADULT"
                        ? "成年人"
                        : "老年人"}
                </p>
              </div>

              {member.weight && (
                <div>
                  <label className="text-sm font-medium text-gray-500">体重</label>
                  <p className="mt-1 text-base text-gray-900">{member.weight} kg</p>
                </div>
              )}

              {member.height && (
                <div>
                  <label className="text-sm font-medium text-gray-500">身高</label>
                  <p className="mt-1 text-base text-gray-900">{member.height} cm</p>
                </div>
              )}

              {member.bmi && (
                <div>
                  <label className="text-sm font-medium text-gray-500">BMI</label>
                  <p className="mt-1 text-base text-gray-900">{member.bmi.toFixed(1)}</p>
                </div>
              )}

              {member.healthGoals[0]?.tdee && (
                <div>
                  <label className="text-sm font-medium text-gray-500">每日能量消耗 (TDEE)</label>
                  <p className="mt-1 text-base text-gray-900">{member.healthGoals[0].tdee} kcal</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">角色</label>
                <p className="mt-1 text-base text-gray-900">
                  {member.role === "ADMIN" ? "管理员" : "成员"}
                </p>
              </div>
            </div>

            {member.user && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <label className="text-sm font-medium text-gray-500">关联账户</label>
                <p className="mt-1 text-base text-gray-900">
                  {member.user.name} ({member.user.email})
                </p>
              </div>
            )}
          </div>

          {/* 健康目标卡片 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-2xl font-bold text-gray-900">健康目标</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/goals/new`}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                >
                  + 新增目标
                </Link>
              )}
            </div>

            {member.healthGoals.length === 0 ? (
              <p className="py-8 text-center text-gray-500">暂无健康目标</p>
            ) : (
              <div className="space-y-4">
                {member.healthGoals.map((goal: HealthGoal) => (
                  <div
                    key={goal.id}
                    className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {goal.goalType === "LOSE_WEIGHT"
                            ? "减重计划"
                            : goal.goalType === "GAIN_MUSCLE"
                              ? "增肌计划"
                              : goal.goalType === "MAINTAIN"
                                ? "维持体重"
                                : "改善健康"}
                        </h3>
                        <span
                          className={`mt-1 inline-block rounded px-2 py-1 text-xs font-medium ${
                            goal.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : goal.status === "COMPLETED"
                                ? "bg-blue-100 text-blue-800"
                                : goal.status === "PAUSED"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {goal.status === "ACTIVE"
                            ? "进行中"
                            : goal.status === "COMPLETED"
                              ? "已完成"
                              : goal.status === "PAUSED"
                                ? "已暂停"
                                : "已取消"}
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/families/${id}/members/${memberId}/goals/${goal.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        查看详情 →
                      </Link>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      {goal.startWeight && (
                        <div>
                          <span className="text-gray-500">起始体重:</span>
                          <span className="ml-2 font-medium">{goal.startWeight} kg</span>
                        </div>
                      )}
                      {goal.currentWeight && (
                        <div>
                          <span className="text-gray-500">当前体重:</span>
                          <span className="ml-2 font-medium">{goal.currentWeight} kg</span>
                        </div>
                      )}
                      {goal.targetWeight && (
                        <div>
                          <span className="text-gray-500">目标体重:</span>
                          <span className="ml-2 font-medium">{goal.targetWeight} kg</span>
                        </div>
                      )}
                      {goal.targetWeeks && (
                        <div>
                          <span className="text-gray-500">目标周数:</span>
                          <span className="ml-2 font-medium">{goal.targetWeeks} 周</span>
                        </div>
                      )}
                    </div>

                    {/* 进度条 */}
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">进度</span>
                        <span className="text-sm font-medium text-gray-700">{goal.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-600 transition-all"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {goal.tdee && (
                      <div className="text-sm text-gray-600">每日能量消耗: {goal.tdee} kcal</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 食谱规划卡片 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-2xl font-bold text-gray-900">食谱规划</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/meal-plans/new`}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  + 新建食谱计划
                </Link>
              )}
            </div>

            <div className="mb-4">
              <Link
                href={`/dashboard/families/${id}/members/${memberId}/meal-plans`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                查看所有食谱计划 →
              </Link>
            </div>

            <p className="text-sm text-gray-500">
              根据成员的健康目标和营养需求，自动生成个性化食谱计划
            </p>
          </div>

          {/* 体检报告卡片 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-2xl font-bold text-gray-900">体检报告</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/reports/new`}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  + 上传新报告
                </Link>
              )}
            </div>

            {member.medicalReports.length === 0 ? (
              <div className="mb-4">
                <p className="mb-4 text-sm text-gray-500">还没有上传任何体检报告</p>
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/reports`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  查看所有报告 →
                </Link>
              </div>
            ) : (
              <>
                {member.medicalReports[0] && (
                  <div className="mb-4">
                    <div className="mb-4 rounded-lg border border-gray-200 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">最近一次报告</h3>
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            member.medicalReports[0].ocrStatus === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : member.medicalReports[0].ocrStatus === "PROCESSING"
                                ? "bg-blue-100 text-blue-800"
                                : member.medicalReports[0].ocrStatus === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {member.medicalReports[0].ocrStatus === "COMPLETED"
                            ? "已完成"
                            : member.medicalReports[0].ocrStatus === "PROCESSING"
                              ? "处理中"
                              : member.medicalReports[0].ocrStatus === "FAILED"
                                ? "失败"
                                : "待处理"}
                        </span>
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                        {member.medicalReports[0].reportDate && (
                          <div>
                            <span className="text-gray-500">报告日期：</span>
                            <span className="font-medium">
                              {new Date(member.medicalReports[0].reportDate).toLocaleDateString(
                                "zh-CN"
                              )}
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

                      {member.medicalReports[0].ocrStatus === "COMPLETED" &&
                        member.medicalReports[0].indicators.length > 0 && (
                          <div className="mt-3">
                            {member.medicalReports[0].indicators.filter(
                              (ind: MedicalIndicator) => ind.isAbnormal
                            ).length > 0 ? (
                              <div className="rounded border border-red-200 bg-red-50 p-3">
                                <p className="mb-2 text-sm font-medium text-red-900">
                                  发现{" "}
                                  {
                                    member.medicalReports[0].indicators.filter(
                                      (ind: MedicalIndicator) => ind.isAbnormal
                                    ).length
                                  }{" "}
                                  项异常指标
                                </p>
                                <div className="space-y-1">
                                  {member.medicalReports[0].indicators
                                    .filter((ind: MedicalIndicator) => ind.isAbnormal)
                                    .slice(0, 3)
                                    .map((indicator: MedicalIndicator) => (
                                      <div key={indicator.id} className="text-sm text-red-800">
                                        • {indicator.name}: {indicator.value} {indicator.unit}
                                      </div>
                                    ))}
                                  {member.medicalReports[0].indicators.filter(
                                    (ind: MedicalIndicator) => ind.isAbnormal
                                  ).length > 3 && (
                                    <div className="text-xs text-red-600">
                                      还有{" "}
                                      {member.medicalReports[0].indicators.filter(
                                        (ind: MedicalIndicator) => ind.isAbnormal
                                      ).length - 3}{" "}
                                      项异常指标...
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded border border-green-200 bg-green-50 p-3">
                                <p className="text-sm font-medium text-green-900">所有指标均正常</p>
                              </div>
                            )}
                          </div>
                        )}

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/dashboard/families/${id}/members/${memberId}/reports/${member.medicalReports[0].id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          查看详情 →
                        </Link>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/families/${id}/members/${memberId}/reports`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      查看所有报告 →
                    </Link>
                  </div>
                )}
              </>
            )}

            <p className="text-sm text-gray-500">上传体检报告，自动识别健康指标并追踪变化趋势</p>
          </div>

          {/* 过敏史卡片 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-2xl font-bold text-gray-900">过敏史</h2>
              {(isAdmin || isSelf) && (
                <Link
                  href={`/dashboard/families/${id}/members/${memberId}/allergies/new`}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                >
                  + 添加过敏记录
                </Link>
              )}
            </div>

            {member.allergies.length === 0 ? (
              <p className="py-8 text-center text-gray-500">暂无过敏记录</p>
            ) : (
              <div className="space-y-3">
                {member.allergies.map((allergy: Allergy) => (
                  <div
                    key={allergy.id}
                    className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-red-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {allergy.allergenName}
                          </h3>
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              allergy.severity === "LIFE_THREATENING"
                                ? "bg-red-100 text-red-800"
                                : allergy.severity === "SEVERE"
                                  ? "bg-orange-100 text-orange-800"
                                  : allergy.severity === "MODERATE"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                            }`}
                          >
                            {allergy.severity === "LIFE_THREATENING"
                              ? "危及生命"
                              : allergy.severity === "SEVERE"
                                ? "严重"
                                : allergy.severity === "MODERATE"
                                  ? "中度"
                                  : "轻度"}
                          </span>
                          <span className="text-sm text-gray-500">
                            {allergy.allergenType === "FOOD"
                              ? "食物"
                              : allergy.allergenType === "ENVIRONMENTAL"
                                ? "环境"
                                : allergy.allergenType === "MEDICATION"
                                  ? "药物"
                                  : "其他"}
                          </span>
                        </div>

                        {allergy.description && (
                          <p className="text-sm text-gray-600">{allergy.description}</p>
                        )}
                      </div>

                      {(isAdmin || isSelf) && (
                        <button className="ml-4 text-sm font-medium text-blue-600 hover:text-blue-800">
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
