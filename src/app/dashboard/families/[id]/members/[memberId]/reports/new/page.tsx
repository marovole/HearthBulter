import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportUploader } from "@/components/reports/ReportUploader";

type Id<TableName extends string> = string & { __tableName: TableName };

export default async function NewReportPage({
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
                href={`/dashboard/families/${id}/members/${memberId}/reports`}
                className="hover:text-gray-900"
              >
                体检报告
              </Link>
              <span>/</span>
              <span className="text-gray-900">上传</span>
            </div>
          </nav>

          {/* 主要内容 */}
          <ReportUploader
            memberId={typedMemberId}
            familyId={id}
            onSuccess={(reportId) => {
              redirect(`/dashboard/families/${id}/members/${memberId}/reports/${reportId}`);
            }}
            onCancel={() => {
              redirect(`/dashboard/families/${id}/members/${memberId}/reports`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
