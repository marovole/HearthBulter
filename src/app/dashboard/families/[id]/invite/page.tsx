"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

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
    fetchInviteCode();
  }, [familyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href={`/dashboard/families/${familyId}`}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← 返回家庭
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">邀请成员</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 邀请码信息卡片 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              邀请新成员加入家庭
            </h2>
            <p className="text-gray-600 mb-6">
              分享邀请链接或邀请码，让其他人加入您的家庭。每个家庭都有唯一的邀请码。
            </p>

            {inviteData?.inviteCode ? (
              <>
                {/* 邀请码显示 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邀请码
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-4 py-3">
                      <code className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                        {inviteData.inviteCode}
                      </code>
                    </div>
                  </div>
                </div>

                {/* 邀请链接显示 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邀请链接
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={inviteData.inviteUrl || ""}
                      readOnly
                      className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-900"
                    />
                    <button
                      onClick={copyInviteUrl}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
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
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">
                    如何使用
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
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
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? "生成中..." : "生成新的邀请码"}
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  生成新邀请码会使旧的邀请码失效
                </p>
              </>
            ) : (
              <>
                {/* 尚未生成邀请码 */}
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-6">
                    {inviteData?.message || "尚未生成邀请码"}
                  </p>
                  <button
                    onClick={generateInviteCode}
                    disabled={generating}
                    className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {generating ? "生成中..." : "生成邀请码"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 安全提示 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-yellow-900 mb-2">
              ⚠️ 安全提示
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
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
