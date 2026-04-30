"use client";

import { useState, useEffect } from "react";
import { MacroPieChartLazy, WeightTrendChartLazy } from "@/components/charts/lazy-registry";

interface TrendsSectionProps {
  memberId: string;
}

export function TrendsSection({ memberId }: TrendsSectionProps) {
  const [days, setDays] = useState(30);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  return (
    <div className="space-y-6">
      {/* 时间范围选择器 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">数据趋势</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">趋势周期：</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                <option value={7}>7天</option>
                <option value={30}>30天</option>
                <option value={90}>90天</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">营养周期：</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
            </div>
          </div>
        </div>

        {/* 体重趋势图 */}
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-gray-700">体重趋势</h4>
          <WeightTrendChartLazy memberId={memberId} days={days} />
        </div>

        {/* 营养分析图 */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">营养分析</h4>
          <NutritionChart memberId={memberId} period={period} />
        </div>
      </div>
    </div>
  );
}

function NutritionChart({
  memberId,
  period,
}: {
  memberId: string;
  period: "daily" | "weekly" | "monthly";
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [memberId, period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/dashboard/nutrition-analysis?memberId=${memberId}&period=${period}`
      );
      if (!response.ok) {
        throw new Error("加载营养数据失败");
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error("加载营养数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <p>暂无营养数据</p>
      </div>
    );
  }

  return (
    <MacroPieChartLazy
      target={
        data.targetCarbs && data.targetProtein && data.targetFat
          ? {
              carbs: data.targetCarbs,
              protein: data.targetProtein,
              fat: data.targetFat,
            }
          : undefined
      }
      actual={
        data.actualCarbs && data.actualProtein && data.actualFat
          ? {
              carbs: data.actualCarbs,
              protein: data.actualProtein,
              fat: data.actualFat,
            }
          : undefined
      }
    />
  );
}
