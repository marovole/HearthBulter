"use client";

import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, TrendingDown, Target } from "lucide-react";
import { EmptyStateGuide } from "./EmptyStateGuide";

interface NutritionData {
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
}

interface NutritionAnalysis {
  target: NutritionData;
  actual: NutritionData;
  adherenceRate: number;
  period: "daily" | "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
}

interface NutritionAnalysisChartProps {
  memberId: string;
  period?: "daily" | "weekly" | "monthly";
}

const COLORS = {
  carbs: "#3b82f6", // 蓝色
  protein: "#10b981", // 绿色
  fat: "#f59e0b", // 橙色
};

const NUTRITION_LABELS = {
  carbs: "碳水化合物",
  protein: "蛋白质",
  fat: "脂肪",
};

export function NutritionAnalysisChart({
  memberId,
  period = "daily",
}: NutritionAnalysisChartProps) {
  const [data, setData] = useState<NutritionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [memberId, period]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/dashboard/nutrition-analysis?memberId=${memberId}&period=${period}`,
      );
      if (!response.ok) {
        throw new Error("加载营养分析数据失败");
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={loadData}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyStateGuide
        memberId={memberId}
        type="nutrition"
        onInitialize={loadData}
      />
    );
  }

  // 准备饼图数据
  const macroData = [
    {
      name: NUTRITION_LABELS.carbs,
      value: data.actual.carbs,
      target: data.target.carbs,
    },
    {
      name: NUTRITION_LABELS.protein,
      value: data.actual.protein,
      target: data.target.protein,
    },
    {
      name: NUTRITION_LABELS.fat,
      value: data.actual.fat,
      target: data.target.fat,
    },
  ];

  // 准备对比数据
  const comparisonData = [
    {
      nutrient: "碳水化合物",
      实际: data.actual.carbs,
      目标: data.target.carbs,
    },
    {
      nutrient: "蛋白质",
      实际: data.actual.protein,
      目标: data.target.protein,
    },
    { nutrient: "脂肪", 实际: data.actual.fat, 目标: data.target.fat },
  ];

  // 计算营养不平衡检测
  const detectImbalance = () => {
    const issues = [];

    if (data.actual.carbs < data.target.carbs * 0.8) {
      issues.push({
        type: "carbs",
        message: "碳水化合物摄入偏低",
        severity: "medium",
      });
    } else if (data.actual.carbs > data.target.carbs * 1.2) {
      issues.push({
        type: "carbs",
        message: "碳水化合物摄入偏高",
        severity: "low",
      });
    }

    if (data.actual.protein < data.target.protein * 0.8) {
      issues.push({
        type: "protein",
        message: "蛋白质摄入偏低",
        severity: "high",
      });
    } else if (data.actual.protein > data.target.protein * 1.2) {
      issues.push({
        type: "protein",
        message: "蛋白质摄入偏高",
        severity: "medium",
      });
    }

    if (data.actual.fat < data.target.fat * 0.8) {
      issues.push({ type: "fat", message: "脂肪摄入偏低", severity: "low" });
    } else if (data.actual.fat > data.target.fat * 1.2) {
      issues.push({ type: "fat", message: "脂肪摄入偏高", severity: "medium" });
    }

    return issues;
  };

  const imbalanceIssues = detectImbalance();

  // 自定义工具提示
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.nutrient || data.name}</p>
          {data.value !== undefined && (
            <p className="text-sm">实际: {data.value}g</p>
          )}
          {data.target !== undefined && (
            <p className="text-sm text-gray-500">目标: {data.target}g</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              营养摄入分析
              <Badge
                variant={data.adherenceRate >= 80 ? "default" : "destructive"}
              >
                达标率 {data.adherenceRate.toFixed(1)}%
              </Badge>
            </CardTitle>
            <CardDescription>
              {period === "daily"
                ? "今日"
                : period === "weekly"
                  ? "本周"
                  : "本月"}
              营养摄入情况
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              热量: {data.actual.calories} / {data.target.calories} kcal
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="comparison">对比</TabsTrigger>
            <TabsTrigger value="insights">分析</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 营养素分布饼图 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">
                  营养素分布
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {macroData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            COLORS[entry.name as keyof typeof COLORS] ||
                            "#8884d8"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 营养素数值 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">营养素详情</h3>
                {Object.entries(NUTRITION_LABELS).map(([key, label]) => {
                  const actual = data.actual[key as keyof NutritionData];
                  const target = data.target[key as keyof NutritionData];
                  const percentage = target > 0 ? (actual / target) * 100 : 0;
                  const color = COLORS[key as keyof typeof COLORS];

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm text-gray-600">
                          {actual}g / {target}g
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, percentage)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {percentage.toFixed(1)}%{" "}
                        {percentage >= 100
                          ? "✅"
                          : percentage >= 80
                            ? "🟡"
                            : "🔴"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">实际 vs 目标</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nutrient" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="实际" fill="#3b82f6" />
                  <Bar dataKey="目标" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                营养分析洞察
                {imbalanceIssues.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {imbalanceIssues.length} 个问题
                  </Badge>
                )}
              </h3>

              {imbalanceIssues.length > 0 ? (
                <div className="space-y-3">
                  {imbalanceIssues.map((issue, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        issue.severity === "high"
                          ? "bg-red-50 border-red-200 text-red-800"
                          : issue.severity === "medium"
                            ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                            : "bg-blue-50 border-blue-200 text-blue-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">{issue.message}</span>
                      </div>
                      {issue.type === "protein" && (
                        <div className="mt-2 text-sm">
                          建议：增加鸡胸肉、鱼类、豆制品等高蛋白食物摄入
                        </div>
                      )}
                      {issue.type === "carbs" &&
                        issue.message.includes("偏低") && (
                        <div className="mt-2 text-sm">
                            建议：适量增加全谷物、薯类等复合碳水化合物
                        </div>
                      )}
                      {issue.type === "fat" &&
                        issue.message.includes("偏高") && (
                        <div className="mt-2 text-sm">
                            建议：选择橄榄油、坚果等健康脂肪，控制油炸食品
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <Target className="w-5 h-5" />
                    <span className="font-medium">营养摄入均衡</span>
                  </div>
                  <p className="mt-2 text-sm text-green-700">
                    您的营养摄入比例基本符合目标，继续保持良好的饮食习惯！
                  </p>
                </div>
              )}

              {/* 营养建议 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">个性化建议</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  {data.actual.protein < data.target.protein && (
                    <li>• 每餐确保摄入优质蛋白质，有助于肌肉维持和修复</li>
                  )}
                  {data.actual.carbs < data.target.carbs && (
                    <li>• 选择低GI碳水化合物，提供稳定能量</li>
                  )}
                  {data.adherenceRate >= 80 && (
                    <li>• 您的营养控制做得很好，继续保持规律饮食</li>
                  )}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
