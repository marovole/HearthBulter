import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";

type Id<TableName extends string> = string & { __tableName: TableName };

type MemberGoal = {
  goalType: string;
  targetWeight?: number | null;
  progress: number;
  tdee?: number | null;
};

type MemberAllergy = {
  id: string;
  allergenName: string;
  severity: string;
};

type FamilyMemberSummary = {
  id: string;
  userId?: string;
  role: string;
  name: string;
  gender: string;
  ageGroup: string;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  user?: { name?: string | null; email?: string | null } | null;
  healthGoals: MemberGoal[];
  allergies: MemberAllergy[];
};

type FamilyDetailView = {
  id: string;
  name: string;
  creatorId: string;
  members: FamilyMemberSummary[];
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

export default async function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const familyDoc = (await convexClient.query(api.families.getById, {
    familyId: id as Id<"families">,
  })) as any;

  if (!familyDoc) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const currentUserMember = (await convexClient.query(api.members.getByClerkInFamily, {
    familyId: id as Id<"families">,
    clerkId: session.user.id,
  })) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const members = (await convexClient.query(api.families.listMembers, {
    familyId: id as Id<"families">,
  })) as any[];

  const memberSummaries = await Promise.all(
    members.map(async (member) => {
      const [user, healthGoals, allergies] = await Promise.all([
        member.userId
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
            convexClient.query(api.users.getById, {
              userId: member.userId as Id<"users">,
            })
          : Promise.resolve(null),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
        convexClient.query(api.health.listGoals, {
          memberId: member._id as Id<"familyMembers">,
          includeInactive: true,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
        convexClient.query(api.health.listAllergies, {
          memberId: member._id as Id<"familyMembers">,
        }),
      ]);

      const birthDate = new Date(member.birthDate);

      return {
        id: member._id,
        userId: member.userId,
        role: member.role,
        name: member.name,
        gender: member.gender,
        ageGroup: getAgeGroup(birthDate),
        weight: member.weight ?? null,
        height: member.height ?? null,
        bmi: calculateBmi(member.weight, member.height),
        user: user
          ? {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
              name: (user as any).name ?? null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
              email: (user as any).email ?? null,
            }
          : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
        healthGoals: ((healthGoals as any[]) ?? []).slice(0, 1).map((goal) => ({
          goalType: goal.goalType,
          targetWeight: goal.targetValue ?? null,
          progress: goal.progress ?? 0,
          tdee: goal.tdee ?? null,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
        allergies: ((allergies as any[]) ?? []).map((allergy) => ({
          id: allergy._id,
          allergenName: allergy.allergenName,
          severity: allergy.severity,
        })),
      } satisfies FamilyMemberSummary;
    })
  );

  const family: FamilyDetailView = {
    id: familyDoc._id,
    name: familyDoc.name,
    creatorId: familyDoc.creatorId,
    members: memberSummaries,
  };

  // 验证用户是否属于该家庭
  const userMember = currentUserMember
    ? family.members.find((m: FamilyMemberSummary) => m.id === currentUserMember._id)
    : undefined;

  if (!userMember) {
    redirect("/dashboard");
  }

  const isCreator = Boolean(
    currentUserMember?.userId && family.creatorId === currentUserMember.userId
  );
  const isAdmin = userMember.role === "ADMIN" || isCreator;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4 text-blue-600 hover:text-blue-800">
                ← 返回
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{family.name}</h1>
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
          {/* 家庭信息卡片 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">{family.name}</h2>
                <p className="text-gray-600">{family.members.length} 位家庭成员</p>
              </div>
              {isAdmin && (
                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/families/${id}/invite`}
                    className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    + 添加成员
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 成员列表 */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">家庭成员</h3>
            </div>

            <div className="divide-y divide-gray-200">
              {family.members.map((member: FamilyMemberSummary) => {
                const activeGoal = member.healthGoals[0];
                const hasAllergies = member.allergies.length > 0;

                return (
                  <div key={member.id} className="p-6 transition-colors hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <h4 className="text-lg font-medium text-gray-900">{member.name}</h4>
                          <span className="text-sm text-gray-500">
                            {member.gender === "MALE" ? "男" : "女"}
                          </span>
                          <span className="text-sm text-gray-500">
                            {member.ageGroup === "CHILD"
                              ? "儿童"
                              : member.ageGroup === "TEENAGER"
                                ? "青少年"
                                : member.ageGroup === "ADULT"
                                  ? "成年人"
                                  : "老年人"}
                          </span>
                          {member.role === "ADMIN" && (
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                              管理员
                            </span>
                          )}
                        </div>

                        {member.user && (
                          <p className="mb-3 text-sm text-gray-600">
                            关联账户: {member.user.name} ({member.user.email})
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                          {member.weight && (
                            <div>
                              <span className="text-gray-500">体重:</span>
                              <span className="ml-2 font-medium">{member.weight} kg</span>
                            </div>
                          )}
                          {member.height && (
                            <div>
                              <span className="text-gray-500">身高:</span>
                              <span className="ml-2 font-medium">{member.height} cm</span>
                            </div>
                          )}
                          {member.bmi && (
                            <div>
                              <span className="text-gray-500">BMI:</span>
                              <span className="ml-2 font-medium">{member.bmi.toFixed(1)}</span>
                            </div>
                          )}
                          {activeGoal?.tdee && (
                            <div>
                              <span className="text-gray-500">TDEE:</span>
                              <span className="ml-2 font-medium">{activeGoal.tdee} kcal</span>
                            </div>
                          )}
                        </div>

                        {/* 健康目标 */}
                        {activeGoal && (
                          <div className="mt-4 rounded-md bg-green-50 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium text-green-800">
                                  当前目标:{" "}
                                  {activeGoal.goalType === "LOSE_WEIGHT"
                                    ? "减重"
                                    : activeGoal.goalType === "GAIN_MUSCLE"
                                      ? "增肌"
                                      : activeGoal.goalType === "MAINTAIN"
                                        ? "维持"
                                        : "改善健康"}
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
                          <div className="mt-2 rounded-md bg-red-50 p-3">
                            <span className="text-sm font-medium text-red-800">
                              ⚠️ 过敏史: {member.allergies.length} 项
                            </span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {member.allergies.slice(0, 3).map((allergy: MemberAllergy) => (
                                <span
                                  key={allergy.id}
                                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                                >
                                  {allergy.allergenName}
                                </span>
                              ))}
                              {member.allergies.length > 3 && (
                                <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
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
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
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
