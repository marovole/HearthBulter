"use client";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportUploader } from "@/components/reports/ReportUploader";

export default async function NewReportPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>;
}) {
  const { id, memberId } = await params;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
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
    },
  });

  if (!member || member.family.id !== id) {
    notFound();
  }

  // 验证权限
  const isCreator = member.family.creatorId === session.user.id;
  const isAdmin = member.family.members[0]?.role === "ADMIN" || isCreator;
  const isSelf = member.userId === session.user.id;

  if (!isAdmin && !isSelf) {
    redirect(`/dashboard/families/${id}/members/${memberId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
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
            memberId={memberId}
            onSuccess={(reportId) => {
              redirect(
                `/dashboard/families/${id}/members/${memberId}/reports/${reportId}`,
              );
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
