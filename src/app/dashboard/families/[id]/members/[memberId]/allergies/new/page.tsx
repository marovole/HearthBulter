"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function NewAllergyPage() {
  const params = useParams<{ id: string; memberId: string }>();
  const familyId = params?.id ?? "";
  const memberId = params?.memberId ?? "";
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    allergenType: "FOOD",
    allergenName: "",
    severity: "MODERATE",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/members/${memberId}/allergies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/dashboard/families/${familyId}/members/${memberId}`);
        router.refresh();
      } else {
        setError(data.error || "添加过敏记录失败");
      }
    } catch (error) {
      setError("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link
                href={`/dashboard/families/${familyId}/members/${memberId}`}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← 返回
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">添加过敏记录</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                <strong>重要提示:</strong> 请准确填写过敏信息，这将帮助系统为您生成安全的饮食计划。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 过敏原类型 */}
              <div>
                <label
                  htmlFor="allergenType"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  过敏原类型 *
                </label>
                <select
                  id="allergenType"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-red-500"
                  value={formData.allergenType}
                  onChange={(e) => setFormData({ ...formData, allergenType: e.target.value })}
                >
                  <option value="FOOD">食物</option>
                  <option value="ENVIRONMENTAL">环境</option>
                  <option value="MEDICATION">药物</option>
                  <option value="OTHER">其他</option>
                </select>
              </div>

              {/* 过敏原名称 */}
              <div>
                <label
                  htmlFor="allergenName"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  过敏原名称 *
                </label>
                <input
                  type="text"
                  id="allergenName"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-red-500"
                  placeholder="例如: 花生、牛奶、青霉素等"
                  value={formData.allergenName}
                  onChange={(e) => setFormData({ ...formData, allergenName: e.target.value })}
                />
              </div>

              {/* 严重程度 */}
              <div>
                <label htmlFor="severity" className="mb-2 block text-sm font-medium text-gray-700">
                  严重程度 *
                </label>
                <select
                  id="severity"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-red-500"
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  <option value="MILD">轻度 (轻微不适)</option>
                  <option value="MODERATE">中度 (明显症状)</option>
                  <option value="SEVERE">严重 (需要医疗干预)</option>
                  <option value="LIFE_THREATENING">危及生命 (过敏性休克等)</option>
                </select>
              </div>

              {/* 详细描述 */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  详细描述
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-red-500"
                  placeholder="请描述过敏反应症状、触发条件、处理方式等"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <p className="mt-1 text-sm text-gray-500">例如: 接触后出现皮疹、呼吸困难等症状</p>
              </div>

              {/* 常见过敏原提示 */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="mb-3 text-sm font-medium text-gray-700">常见过敏原参考</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-600">食物类:</p>
                    <p className="text-sm text-gray-500">
                      花生、树坚果、牛奶、鸡蛋、大豆、小麦、鱼类、贝类
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-600">环境类:</p>
                    <p className="text-sm text-gray-500">花粉、尘螨、宠物毛发、霉菌</p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-600">药物类:</p>
                    <p className="text-sm text-gray-500">青霉素、阿司匹林、磺胺类药物</p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-600">其他:</p>
                    <p className="text-sm text-gray-500">昆虫叮咬、乳胶、金属(镍)</p>
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-md border border-transparent bg-red-600 px-4 py-2 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "添加中..." : "添加过敏记录"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
