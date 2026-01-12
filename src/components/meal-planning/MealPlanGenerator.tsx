// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MemberInfo {
  id: string;
  name: string;
  goals?: Array<{
    id: string;
    goalType: string;
    targetWeight?: number;
    targetDate?: string;
  }>;
}

interface MealPlanGeneratorProps {
  memberId: string;
  memberInfo?: MemberInfo;
  onSuccess?: (planId: string) => void;
  onCancel?: () => void;
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "减重",
  WEIGHT_GAIN: "增肌",
  MAINTENANCE: "维持",
  HEALTH_MANAGEMENT: "健康管理",
};

export function MealPlanGenerator({
  memberId,
  memberInfo: initialMemberInfo,
  onSuccess,
  onCancel,
}: MealPlanGeneratorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | undefined>(
    initialMemberInfo,
  );

  const [formData, setFormData] = useState({
    days: 7,
    startDate: format(new Date(), "yyyy-MM-dd"),
  });

  // 如果没有传入成员信息，则获取
  useEffect(() => {
    if (!memberInfo) {
      fetchMemberInfo();
    }
  }, [memberId]);

  const fetchMemberInfo = async () => {
    try {
      // 这里可以调用API获取成员信息，如果需要的話
      // 目前先使用传入的memberInfo
    } catch (err) {
      console.error("获取成员信息失败:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 前端表单验证
    if (formData.startDate) {
      const selectedDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setError("开始日期不能早于今天");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload: {
        days: number;
        startDate?: string;
      } = {
        days: formData.days,
      };

      // 如果指定了开始日期，则添加
      if (formData.startDate) {
        payload.startDate = new Date(formData.startDate).toISOString();
      }

      const response = await fetch(`/api/members/${memberId}/meal-plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // 提供更友好的错误信息
        let errorMessage = "生成食谱失败";
        if (data.error) {
          if (data.error.includes("未授权")) {
            errorMessage = "您没有权限执行此操作，请重新登录";
          } else if (data.error.includes("不存在")) {
            errorMessage = "成员信息不存在，请刷新页面重试";
          } else if (data.error.includes("无权限")) {
            errorMessage = "您没有权限为该成员生成食谱";
          } else {
            errorMessage = data.error;
          }
        }
        throw new Error(errorMessage);
      }

      // 成功 - 显示成功提示
      const planId = data.plan.id;

      if (onSuccess) {
        onSuccess(planId);
      } else {
        // 刷新页面，由调用方处理导航
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成食谱失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const activeGoal = memberInfo?.goals?.find(
    (goal) => goal.goalType !== "HEALTH_MANAGEMENT",
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">生成食谱计划</h2>

      {/* 成员信息 */}
      {memberInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">成员信息</h3>
          <p className="text-lg font-semibold text-gray-900">
            {memberInfo.name}
          </p>
          {activeGoal && (
            <p className="text-sm text-gray-600 mt-1">
              当前目标:{" "}
              {GOAL_TYPE_LABELS[activeGoal.goalType] || activeGoal.goalType}
              {activeGoal.targetWeight &&
                ` (目标体重: ${activeGoal.targetWeight}kg)`}
            </p>
          )}
        </div>
      )}

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 食谱天数 */}
        <div>
          <label
            htmlFor="days"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            食谱天数
          </label>
          <select
            id="days"
            value={formData.days}
            onChange={(e) =>
              setFormData({ ...formData, days: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value={3}>3天</option>
            <option value={7}>7天</option>
            <option value={14}>14天</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">选择食谱计划的持续时间</p>
        </div>

        {/* 开始日期 */}
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            开始日期（可选）
          </label>
          <input
            type="date"
            id="startDate"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            min={format(new Date(), "yyyy-MM-dd")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            留空则从今天开始，或选择未来的日期
          </p>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡
            系统将根据成员的健康目标、营养需求和过敏信息自动生成个性化食谱计划。
          </p>
        </div>

        {/* 加载进度提示 */}
        {loading && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm font-medium text-blue-900">
                正在生成食谱计划...
              </p>
            </div>
            <div className="ml-8">
              <p className="text-xs text-blue-700 mb-1">
                ⚡ 计算营养需求和宏量分配
              </p>
              <p className="text-xs text-blue-700 mb-1">
                🍱 从模板库中选择最适合的食谱
              </p>
              <p className="text-xs text-blue-700">✨ 平衡营养并避免过敏食材</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-1">
                  生成失败
                </p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="取消"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
            }`}
            aria-busy={loading}
            aria-label={loading ? "正在生成食谱计划" : "生成食谱计划"}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                生成中...
              </span>
            ) : (
              "生成食谱计划"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
