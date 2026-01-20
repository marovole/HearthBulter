"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const familyId = typeof params?.id === "string" ? params.id : "";

  const [inviteData, setInviteData] = useState<{
    inviteCode: string | null;
    inviteUrl: string | null;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前邀请码
  const fetchInviteCode = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/families/${familyId}/invite`);

      if (response.ok) {
        const data = await response.json();
        setInviteData(data);
      } else if (response.status === 401) {
        router.push("/auth/signin");
      } else if (response.status === 403) {
        setError("您没有权限访问此页面");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "获取邀请码失败");
      }
    } catch (err) {
      console.error("获取邀请码失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 生成新的邀请码
  const generateInviteCode = async () => {
    try {
      setGenerating(true);
      setError(null);
      const response = await fetch(`/api/families/${familyId}/invite`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setInviteData(data);
      } else if (response.status === 401) {
        router.push("/auth/signin");
      } else if (response.status === 403) {
        setError("只有管理员可以生成邀请码");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "生成邀请码失败");
      }
    } catch (err) {
      console.error("生成邀请码失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  // 复制邀请链接
  const copyInviteUrl = async () => {
    if (!inviteData?.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteData.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
      alert("复制失败，请手动复制");
    }
  };

  useEffect(() => {
    if (!familyId) {
      return;
    }
    fetchInviteCode();
  }, [familyId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link
                href={`/dashboard/families/${familyId}`}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← 返回家庭
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">邀请成员</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 邀请码信息卡片 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">邀请新成员加入家庭</h2>
            <p className="mb-6 text-gray-600">
              分享邀请链接或邀请码，让其他人加入您的家庭。每个家庭都有唯一的邀请码。
            </p>

            {inviteData?.inviteCode ? (
              <>
                {/* 邀请码显示 */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-gray-700">邀请码</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-4 py-3">
                      <code className="font-mono text-2xl font-bold tracking-wider text-gray-900">
                        {inviteData.inviteCode}
                      </code>
                    </div>
                  </div>
                </div>

                {/* 邀请链接显示 */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-gray-700">邀请链接</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={inviteData.inviteUrl || ""}
                      readOnly
                      className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900"
                    />
                    <button
                      onClick={copyInviteUrl}
                      className={`rounded-md px-4 py-2 font-medium transition-colors ${
                        copied
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {copied ? "已复制!" : "复制链接"}
                    </button>
                  </div>
                </div>

                {/* 使用说明 */}
                <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-2 text-sm font-medium text-blue-900">如何使用</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
                    <li>将邀请链接发送给您想邀请的人</li>
                    <li>他们点击链接后，可以看到家庭信息并选择加入</li>
                    <li>加入时需要登录账户并提供基本信息</li>
                    <li>您可以随时生成新的邀请码来替换旧的</li>
                  </ul>
                </div>

                {/* 刷新邀请码按钮 */}
                <button
                  onClick={generateInviteCode}
                  disabled={generating}
                  className="w-full rounded-md bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {generating ? "生成中..." : "生成新的邀请码"}
                </button>
                <p className="mt-2 text-center text-xs text-gray-500">
                  生成新邀请码会使旧的邀请码失效
                </p>
              </>
            ) : (
              <>
                {/* 尚未生成邀请码 */}
                <div className="py-8 text-center">
                  <p className="mb-6 text-gray-600">{inviteData?.message || "尚未生成邀请码"}</p>
                  <button
                    onClick={generateInviteCode}
                    disabled={generating}
                    className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {generating ? "生成中..." : "生成邀请码"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 安全提示 */}
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-yellow-900">⚠️ 安全提示</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-yellow-800">
              <li>请只将邀请链接分享给您信任的人</li>
              <li>任何拥有邀请链接的人都可以加入您的家庭</li>
              <li>如果邀请链接泄露，请立即生成新的邀请码</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
