"use client";

import { useState, useEffect } from "react";
import { MacroPieChart } from "@/components/dashboard/MacroPieChart";

interface NutritionData {
  planId: string;
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  daily: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  target: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface NutritionSummaryProps {
  planId: string;
}

function calculatePercentage(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.min((actual / target) * 100, 100);
}

function getProgressColor(percentage: number): string {
  if (percentage >= 90 && percentage <= 110) return "bg-green-600";
  if (percentage >= 80 && percentage < 90) return "bg-yellow-500";
  if (percentage > 110) return "bg-orange-500";
  return "bg-red-500";
}

export function NutritionSummary({ planId }: NutritionSummaryProps) {
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNutrition();
  }, [planId]);

  const fetchNutrition = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/meal-plans/${planId}/nutrition`);

      if (!response.ok) {
        throw new Error("获取营养汇总失败");
      }

      const data = await response.json();
      setNutrition(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchNutrition(true);
  };

  // 生成营养建议
  const getNutritionAdvice = (
    actual: number,
    target: number,
    nutrientName: string,
  ): string | null => {
    const percentage = (actual / target) * 100;

    if (percentage < 80) {
      return `${nutrientName}摄入偏低，建议适当增加富含${nutrientName}的食物`;
    } else if (percentage > 120) {
      return `${nutrientName}摄入偏高，建议适当减少摄入量`;
    }
    return null;
  };

  if (loading && !nutrition) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-gray-600">加载营养数据...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-red-600 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">获取失败</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline focus:outline-none"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!nutrition) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-600">暂无营养数据</p>
        </div>
      </div>
    );
  }

  const caloriesPercentage = calculatePercentage(
    nutrition.daily.calories,
    nutrition.target.calories,
  );
  const proteinPercentage = calculatePercentage(
    nutrition.daily.protein,
    nutrition.target.protein,
  );
  const carbsPercentage = calculatePercentage(
    nutrition.daily.carbs,
    nutrition.target.carbs,
  );
  const fatPercentage = calculatePercentage(
    nutrition.daily.fat,
    nutrition.target.fat,
  );

  // 收集所有建议
  const adviceList = [
    getNutritionAdvice(
      nutrition.daily.calories,
      nutrition.target.calories,
      "热量",
    ),
    getNutritionAdvice(
      nutrition.daily.protein,
      nutrition.target.protein,
      "蛋白质",
    ),
    getNutritionAdvice(
      nutrition.daily.carbs,
      nutrition.target.carbs,
      "碳水化合物",
    ),
    getNutritionAdvice(nutrition.daily.fat, nutrition.target.fat, "脂肪"),
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          营养统计
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            refreshing
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
          aria-label="刷新营养数据"
        >
          <span className={refreshing ? "animate-spin" : ""}>🔄</span>
          <span>{refreshing ? "刷新中..." : "刷新数据"}</span>
        </button>
      </div>

      {/* 营养建议 */}
      {adviceList.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-amber-600 text-lg">💡</span>
            <h3 className="text-sm font-medium text-amber-900">营养建议</h3>
          </div>
          <ul className="ml-7 space-y-1">
            {adviceList.map((advice, index) => (
              <li key={index} className="text-sm text-amber-800">
                • {advice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 宏量营养素饼图 */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          📊 每日宏量营养素分布
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-3 text-center">
              🎯 目标分布
            </h4>
            <MacroPieChart
              target={{
                carbs: nutrition.target.carbs,
                protein: nutrition.target.protein,
                fat: nutrition.target.fat,
              }}
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-600 mb-3 text-center">
              ✅ 实际分布
            </h4>
            <MacroPieChart
              actual={{
                carbs: nutrition.daily.carbs,
                protein: nutrition.daily.protein,
                fat: nutrition.daily.fat,
              }}
            />
          </div>
        </div>
      </div>

      {/* 详细对比 */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          📈 每日营养对比
        </h3>

        {/* 热量 */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">🔥 热量</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-gray-600">
                目标: {nutrition.target.calories.toFixed(0)}
              </span>
              <span className="font-semibold text-gray-900">
                实际: {nutrition.daily.calories.toFixed(0)}
              </span>
              <span
                className={`font-medium px-2 py-0.5 rounded ${
                  caloriesPercentage >= 90 && caloriesPercentage <= 110
                    ? "text-green-600 bg-green-50"
                    : caloriesPercentage < 90
                      ? "text-yellow-600 bg-yellow-50"
                      : "text-orange-600 bg-orange-50"
                }`}
              >
                {caloriesPercentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(caloriesPercentage)}`}
              style={{ width: `${Math.min(caloriesPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* 蛋白质 */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">🥩 蛋白质</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-gray-600">
                目标: {nutrition.target.protein.toFixed(1)}g
              </span>
              <span className="font-semibold text-gray-900">
                实际: {nutrition.daily.protein.toFixed(1)}g
              </span>
              <span
                className={`font-medium px-2 py-0.5 rounded ${
                  proteinPercentage >= 90 && proteinPercentage <= 110
                    ? "text-green-600 bg-green-50"
                    : proteinPercentage < 90
                      ? "text-yellow-600 bg-yellow-50"
                      : "text-orange-600 bg-orange-50"
                }`}
              >
                {proteinPercentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(proteinPercentage)}`}
              style={{ width: `${Math.min(proteinPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* 碳水化合物 */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              🍚 碳水化合物
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-gray-600">
                目标: {nutrition.target.carbs.toFixed(1)}g
              </span>
              <span className="font-semibold text-gray-900">
                实际: {nutrition.daily.carbs.toFixed(1)}g
              </span>
              <span
                className={`font-medium px-2 py-0.5 rounded ${
                  carbsPercentage >= 90 && carbsPercentage <= 110
                    ? "text-green-600 bg-green-50"
                    : carbsPercentage < 90
                      ? "text-yellow-600 bg-yellow-50"
                      : "text-orange-600 bg-orange-50"
                }`}
              >
                {carbsPercentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(carbsPercentage)}`}
              style={{ width: `${Math.min(carbsPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* 脂肪 */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">🥑 脂肪</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-gray-600">
                目标: {nutrition.target.fat.toFixed(1)}g
              </span>
              <span className="font-semibold text-gray-900">
                实际: {nutrition.daily.fat.toFixed(1)}g
              </span>
              <span
                className={`font-medium px-2 py-0.5 rounded ${
                  fatPercentage >= 90 && fatPercentage <= 110
                    ? "text-green-600 bg-green-50"
                    : fatPercentage < 90
                      ? "text-yellow-600 bg-yellow-50"
                      : "text-orange-600 bg-orange-50"
                }`}
              >
                {fatPercentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(fatPercentage)}`}
              style={{ width: `${Math.min(fatPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 总计数据 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          📊 总计数据
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">总热量</div>
            <div className="text-lg font-semibold text-gray-900">
              {nutrition.total.calories.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">kcal</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">总蛋白质</div>
            <div className="text-lg font-semibold text-gray-900">
              {nutrition.total.protein.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">g</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">总碳水</div>
            <div className="text-lg font-semibold text-gray-900">
              {nutrition.total.carbs.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">g</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">总脂肪</div>
            <div className="text-lg font-semibold text-gray-900">
              {nutrition.total.fat.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">g</div>
          </div>
        </div>
      </div>
    </div>
  );
}
