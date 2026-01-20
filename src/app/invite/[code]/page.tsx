"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface FamilyInfo {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = typeof params?.code === "string" ? params.code : "";

  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 获取邀请信息
  const fetchInviteInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/invite/${code}`);

      if (response.ok) {
        const data = await response.json();
        setFamily(data.family);
      } else if (response.status === 404) {
        setError("邀请码无效或已过期");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "获取邀请信息失败");
      }
    } catch (err) {
      console.error("获取邀请信息失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 接受邀请
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberName.trim()) {
      setError("请输入您的名称");
      return;
    }

    try {
      setJoining(true);
      setError(null);

      const response = await fetch(`/api/invite/${code}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberName: memberName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        // 3秒后跳转到家庭页面
        setTimeout(() => {
          router.push(`/dashboard/families/${data.family.id}`);
        }, 3000);
      } else if (response.status === 401) {
        // 未登录，引导用户登录
        setError("请先登录后再接受邀请");
        setTimeout(() => {
          router.push(`/auth/signin?callbackUrl=/invite/${code}`);
        }, 2000);
      } else if (response.status === 400) {
        const errorData = await response.json();
        setError(errorData.error || "加入家庭失败");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "加入家庭失败");
      }
    } catch (err) {
      console.error("接受邀请失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (!code) {
      return;
    }
    fetchInviteInfo();
  }, [code]);

  // 成功页面
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">成功加入家庭!</h2>
          <p className="mb-6 text-gray-600">欢迎加入{family?.name}，正在跳转到家庭页面...</p>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  // 错误页面
  if (error && !family) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">无法加载邀请信息</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  // 邀请信息展示和接受表单
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">您收到了一个家庭邀请</h1>
          <p className="text-gray-600">接受邀请后，您将成为该家庭的成员</p>
        </div>

        {/* 家庭信息卡片 */}
        {family && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-2 text-xl font-bold text-gray-900">{family.name}</h2>
            {family.description && <p className="mb-3 text-gray-700">{family.description}</p>}
            <div className="flex items-center text-sm text-gray-600">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>{family.memberCount} 位成员</span>
            </div>
          </div>
        )}

        {/* 接受邀请表单 */}
        <form onSubmit={handleAcceptInvite}>
          <div className="mb-6">
            <label htmlFor="memberName" className="mb-2 block text-sm font-medium text-gray-700">
              您在家庭中的名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="memberName"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="例如：爸爸、妈妈、张三"
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              required
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500">这个名称将显示在家庭成员列表中</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={joining || !memberName.trim()}
            className="w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {joining ? "加入中..." : "接受邀请并加入家庭"}
          </button>
        </form>

        {/* 说明 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">加入家庭后，您可以在个人资料中完善更多健康信息</p>
        </div>

        {/* 返回链接 */}
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
