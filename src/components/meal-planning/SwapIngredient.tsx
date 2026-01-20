"use client";

import { useState } from "react";
import { MealCard } from "./MealCard";
import type { MealType } from "@prisma/client";

interface MealIngredient {
  id: string;
  amount: number;
  food: {
    id: string;
    name: string;
  };
}

interface Meal {
  id: string;
  date: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: MealIngredient[];
}

interface SwapIngredientProps {
  planId: string;
  meal: Meal;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

export function SwapIngredient({ planId, meal, isOpen, onClose, onSuccess }: SwapIngredientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replaceCount, setReplaceCount] = useState(0);

  const handleReplace = async (keepOpen = false) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/meal-plans/${planId}/meals/${meal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        let errorMessage = "替换餐食失败";
        if (data.error) {
          if (data.error.includes("未找到")) {
            errorMessage = "未找到合适的替代餐食，请稍后再试";
          } else if (data.error.includes("不存在")) {
            errorMessage = "餐食不存在，请刷新页面";
          } else if (data.error.includes("无权限")) {
            errorMessage = "您没有权限执行此操作";
          } else {
            errorMessage = data.error;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setReplaceCount(replaceCount + 1);
      setSuccessMessage("✅ 替换成功！");

      // 成功后的回调
      if (onSuccess) {
        onSuccess();
      }

      // 如果不保持打开，则延迟关闭以显示成功消息
      if (!keepOpen) {
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
          setReplaceCount(0);
        }, 1500);
      } else {
        // 如果要继续替换，清除成功消息
        setTimeout(() => {
          setSuccessMessage(null);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "替换失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceAndContinue = () => {
    handleReplace(true);
  };

  const handleReplaceAndClose = () => {
    handleReplace(false);
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    setReplaceCount(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
    >
      <div
        className="animate-in fade-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">替换餐食</h2>
              <p className="mt-1 text-sm text-gray-600">选择更适合您的替代餐食</p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-full text-2xl font-bold text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4">
          {/* 当前餐食信息 */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <span>🍽️</span>
              <span>当前{MEAL_TYPE_LABELS[meal.mealType]}</span>
              {replaceCount > 0 && (
                <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
                  已替换 {replaceCount} 次
                </span>
              )}
            </h3>
            <MealCard meal={meal} />
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">正在寻找替代餐食...</p>
                  <p className="mt-1 text-xs text-blue-700">系统正在匹配相似营养价值的食谱</p>
                </div>
              </div>
            </div>
          )}

          {/* 成功提示 */}
          {successMessage && (
            <div className="animate-in fade-in mb-4 rounded-lg border border-green-200 bg-green-50 p-4 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-lg text-green-600">✓</span>
                <p className="text-sm font-medium text-green-900">{successMessage}</p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg text-red-600">⚠️</span>
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-red-900">替换失败</p>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          {!loading && !successMessage && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-base">💡</span>
                <span>
                  系统将自动为您选择一个相似营养价值的替代餐食。如果不满意，可以点击“再换一个”继续替换。
                </span>
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            <button
              onClick={handleClose}
              disabled={loading}
              className="order-3 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
            >
              {successMessage ? "完成" : "取消"}
            </button>
            {successMessage && (
              <button
                onClick={handleReplaceAndContinue}
                disabled={loading}
                className="order-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                🔄 再换一个
              </button>
            )}
            {!successMessage && (
              <button
                onClick={handleReplaceAndClose}
                disabled={loading}
                className={`order-1 rounded-lg px-4 py-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 sm:order-2 ${
                  loading
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                }`}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                    替换中...
                  </span>
                ) : (
                  "确认替换"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
