'use client'


import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function NewGoalPage() {
  const params = useParams<{ id: string; memberId: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    goalType: 'LOSE_WEIGHT',
    targetWeight: '',
    targetWeeks: '',
    activityLevel: 'MODERATE',
    carbRatio: 0.5,
    proteinRatio: 0.2,
    fatRatio: 0.3,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/members/${params.memberId}/goals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            goalType: formData.goalType,
            targetWeight: formData.targetWeight
              ? parseFloat(formData.targetWeight)
              : undefined,
            targetWeeks: formData.targetWeeks
              ? parseInt(formData.targetWeeks)
              : undefined,
            activityLevel: formData.activityLevel,
            carbRatio: formData.carbRatio,
            proteinRatio: formData.proteinRatio,
            fatRatio: formData.fatRatio,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        router.push(
          `/dashboard/families/${params.id}/members/${params.memberId}`
        );
        router.refresh();
      } else {
        setError(data.error || '创建健康目标失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href={`/dashboard/families/${params.id}/members/${params.memberId}`}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← 返回
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                新建健康目标
              </h1>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 目标类型 */}
              <div>
                <label
                  htmlFor="goalType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  目标类型 *
                </label>
                <select
                  id="goalType"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.goalType}
                  onChange={(e) =>
                    setFormData({ ...formData, goalType: e.target.value })
                  }
                >
                  <option value="LOSE_WEIGHT">减重</option>
                  <option value="GAIN_MUSCLE">增肌</option>
                  <option value="MAINTAIN">维持</option>
                  <option value="IMPROVE_HEALTH">改善健康</option>
                </select>
              </div>

              {/* 目标体重 */}
              <div>
                <label
                  htmlFor="targetWeight"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  目标体重 (kg)
                </label>
                <input
                  type="number"
                  id="targetWeight"
                  min="20"
                  max="300"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如: 65"
                  value={formData.targetWeight}
                  onChange={(e) =>
                    setFormData({ ...formData, targetWeight: e.target.value })
                  }
                />
              </div>

              {/* 目标周数 */}
              <div>
                <label
                  htmlFor="targetWeeks"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  目标周数
                </label>
                <input
                  type="number"
                  id="targetWeeks"
                  min="1"
                  max="52"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如: 12"
                  value={formData.targetWeeks}
                  onChange={(e) =>
                    setFormData({ ...formData, targetWeeks: e.target.value })
                  }
                />
                <p className="mt-1 text-sm text-gray-500">
                  预计达成目标需要的周数（1-52周）
                </p>
              </div>

              {/* 活动水平 */}
              <div>
                <label
                  htmlFor="activityLevel"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  活动水平 *
                </label>
                <select
                  id="activityLevel"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.activityLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      activityLevel: e.target.value,
                    })
                  }
                >
                  <option value="SEDENTARY">久坐 (很少运动)</option>
                  <option value="LIGHT">轻度活动 (每周1-3天运动)</option>
                  <option value="MODERATE">中度活动 (每周3-5天运动)</option>
                  <option value="ACTIVE">高度活动 (每周6-7天运动)</option>
                  <option value="VERY_ACTIVE">非常活跃 (专业运动员)</option>
                </select>
              </div>

              {/* 营养比例 */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  营养比例配置
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  配置每日摄入的营养素比例（总和应为 100%）
                </p>

                {/* 碳水化合物 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      碳水化合物
                    </label>
                    <span className="text-sm font-medium text-gray-900">
                      {(formData.carbRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    className="w-full"
                    value={formData.carbRatio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carbRatio: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                {/* 蛋白质 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      蛋白质
                    </label>
                    <span className="text-sm font-medium text-gray-900">
                      {(formData.proteinRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    className="w-full"
                    value={formData.proteinRatio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        proteinRatio: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                {/* 脂肪 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      脂肪
                    </label>
                    <span className="text-sm font-medium text-gray-900">
                      {(formData.fatRatio * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    className="w-full"
                    value={formData.fatRatio}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fatRatio: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                {/* 总和提示 */}
                <div
                  className={`p-3 rounded-md ${
                    Math.abs(
                      formData.carbRatio +
                        formData.proteinRatio +
                        formData.fatRatio -
                        1
                    ) < 0.01
                      ? 'bg-green-50 text-green-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  <p className="text-sm font-medium">
                    总计:{' '}
                    {(
                      (formData.carbRatio +
                        formData.proteinRatio +
                        formData.fatRatio) *
                      100
                    ).toFixed(0)}
                    %
                    {Math.abs(
                      formData.carbRatio +
                        formData.proteinRatio +
                        formData.fatRatio -
                        1
                    ) >= 0.01 && ' (建议调整为100%)'}
                  </p>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '创建中...' : '创建目标'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
