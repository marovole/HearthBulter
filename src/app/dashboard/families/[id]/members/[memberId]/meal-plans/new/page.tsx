import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MealPlanGenerator } from "@/components/meal-planning/MealPlanGenerator";

type Id<TableName extends string> = string & { __tableName: TableName };

type HealthGoal = {
  id: string;
  goalType: string;
  targetWeight: number | null;
  targetDate: string | null;
};

export default async function NewMealPlanPage({
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
    redirect(`/dashboard/families/${id}/members/${memberId}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const member = (await convexClient.query(api.members.getById, {
    memberId: memberId as Id<"familyMembers">,
  })) as any;

  if (!member) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const goals = (await convexClient.query(api.health.listGoals, {
    memberId: memberId as Id<"familyMembers">,
    includeInactive: true,
  })) as any[];

  const healthGoals: HealthGoal[] = goals.map((goal) => ({
    id: goal._id,
    goalType: goal.goalType,
    targetWeight: goal.targetValue ?? null,
    targetDate: goal.endDate ? new Date(goal.endDate).toISOString() : null,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 面包屑导航 */}
          <nav className="mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href={`/dashboard/families/${id}`} className="hover:text-gray-900">
                家庭
              </Link>
              <span>/</span>
              <Link
                href={`/dashboard/families/${id}/members/${memberId}`}
                className="hover:text-gray-900"
              >
                {member.name || "成员"}
              </Link>
              <span>/</span>
              <Link
                href={`/dashboard/families/${id}/members/${memberId}/meal-plans`}
                className="hover:text-gray-900"
              >
                食谱规划
              </Link>
              <span>/</span>
              <span className="text-gray-900">新建</span>
            </div>
          </nav>

          {/* 主要内容 */}
          <MealPlanGenerator
            memberId={memberId}
            memberInfo={{
              id: member._id,
              name: member.name || "成员",
              goals: healthGoals.map((goal: HealthGoal) => ({
                id: goal.id,
                goalType: goal.goalType,
                targetWeight: goal.targetWeight ?? undefined,
                targetDate: goal.targetDate ?? undefined,
              })),
            }}
            onSuccess={(planId) => {
              redirect(`/dashboard/families/${id}/members/${memberId}/meal-plans/${planId}`);
            }}
            onCancel={() => {
              redirect(`/dashboard/families/${id}/members/${memberId}/meal-plans`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
