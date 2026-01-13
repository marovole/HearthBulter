// @ts-nocheck
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

export function SwapIngredient({
  planId,
  meal,
  isOpen,
  onClose,
  onSuccess,
}: SwapIngredientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [replaceCount, setReplaceCount] = useState(0);

  const handleReplace = async (keepOpen = false) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(
        `/api/meal-plans/${planId}/meals/${meal.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">替换餐食</h2>
              <p className="text-sm text-gray-600 mt-1">
                选择更适合您的替代餐食
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span>🍽️</span>
              <span>当前{MEAL_TYPE_LABELS[meal.mealType]}</span>
              {replaceCount > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  已替换 {replaceCount} 次
                </span>
              )}
            </h3>
            <MealCard meal={meal} />
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    正在寻找替代餐食...
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    系统正在匹配相似营养价值的食谱
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 成功提示 */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">✓</span>
                <p className="text-sm font-medium text-green-900">
                  {successMessage}
                </p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-red-600 text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    替换失败
                  </p>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          {!loading && !successMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-base">💡</span>
                <span>
                  系统将自动为您选择一个相似营养价值的替代餐食。如果不满意，可以点击"再换一个"继续替换。
                </span>
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 order-3 sm:order-1"
            >
              {successMessage ? "完成" : "取消"}
            </button>
            {successMessage && (
              <button
                onClick={handleReplaceAndContinue}
                disabled={loading}
                className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 order-2"
              >
                🔄 再换一个
              </button>
            )}
            {!successMessage && (
              <button
                onClick={handleReplaceAndClose}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 order-1 sm:order-2 ${
                  loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                }`}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
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
