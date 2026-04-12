import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportList } from "@/components/reports/ReportList";

type Id<TableName extends string> = string & { __tableName: TableName };

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const { id, memberId } = await params;
  const typedMemberId = memberId as Id<"familyMembers">;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const access = await memberRepository.verifyMemberAccess(typedMemberId, session.user.id);

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
    memberId: typedMemberId,
  })) as any;

  if (!member) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
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
              <span className="text-gray-900">体检报告</span>
            </div>
          </nav>

          {/* 标题和操作 */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">体检报告</h1>
            <Link
              href={`/dashboard/families/${id}/members/${memberId}/reports/new`}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              上传新报告
            </Link>
          </div>

          {/* 报告列表 */}
          <ReportList memberId={typedMemberId} familyId={id} />
        </div>
      </div>
    </div>
  );
}
