"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Apple,
  TrendingUp,
  Target,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  AlertCircle,
} from "lucide-react";

interface NutritionData {
  date: Date;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  vitamins?: {
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    vitaminE?: number;
  };
  minerals?: {
    calcium?: number;
    iron?: number;
    magnesium?: number;
    zinc?: number;
  };
}

interface NutritionTrendChartProps {
  memberId: string;
  days?: number;
  viewMode?: "trends" | "macros" | "micros" | "goals";
}

interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function NutritionTrendChart({
  memberId,
  days = 30,
  viewMode = "trends",
}: NutritionTrendChartProps) {
  const [data, setData] = useState<NutritionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<MacroTargets>({
    calories: 2000,
    protein: 50,
    carbs: 250,
    fat: 65,
  });

  const macroColors = {
    calories: "#3b82f6",
    protein: "#10b981",
    carbs: "#f59e0b",
    fat: "#ef4444",
  };

  const macroLabels = {
    calories: "卡路里",
    protein: "蛋白质 (g)",
    carbs: "碳水化合物 (g)",
    fat: "脂肪 (g)",
  };

  useEffect(() => {
    loadData();
  }, [memberId, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 模拟API调用 - 实际应该调用真实的营养数据API
      const mockData: NutritionData[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        mockData.push({
          date,
          calories: 1800 + Math.random() * 600 - 300,
          protein: 45 + Math.random() * 20 - 10,
          carbs: 220 + Math.random() * 80 - 40,
          fat: 60 + Math.random() * 20 - 10,
          fiber: 20 + Math.random() * 10 - 5,
          vitamins: {
            vitaminA: 700 + Math.random() * 300 - 150,
            vitaminC: 80 + Math.random() * 40 - 20,
            vitaminD: 15 + Math.random() * 10 - 5,
            vitaminE: 12 + Math.random() * 6 - 3,
          },
          minerals: {
            calcium: 1000 + Math.random() * 400 - 200,
            iron: 15 + Math.random() * 8 - 4,
            magnesium: 350 + Math.random() * 100 - 50,
            zinc: 10 + Math.random() * 5 - 2.5,
          },
        });
      }

      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">加载营养数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>暂无营养数据</p>
        </div>
      </div>
    );
  }

  // 格式化趋势数据
  const trendData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    }),
    fullDate: item.date,
    calories: Math.round(item.calories || 0),
    protein: Math.round(item.protein || 0),
    carbs: Math.round(item.carbs || 0),
    fat: Math.round(item.fat || 0),
  }));

  // 计算宏量营养素平均值
  const avgMacros = {
    calories: Math.round(
      data.reduce((acc, d) => acc + (d.calories || 0), 0) / data.length,
    ),
    protein: Math.round(
      data.reduce((acc, d) => acc + (d.protein || 0), 0) / data.length,
    ),
    carbs: Math.round(
      data.reduce((acc, d) => acc + (d.carbs || 0), 0) / data.length,
    ),
    fat: Math.round(
      data.reduce((acc, d) => acc + (d.fat || 0), 0) / data.length,
    ),
  };

  // 宏量营养素比例数据
  const macroRatioData = [
    {
      name: "蛋白质",
      value: avgMacros.protein * 4,
      color: macroColors.protein,
    },
    {
      name: "碳水化合物",
      value: avgMacros.carbs * 4,
      color: macroColors.carbs,
    },
    { name: "脂肪", value: avgMacros.fat * 9, color: macroColors.fat },
  ];

  // 微量营养素数据
  const microData = data.slice(-7).map((item) => ({
    date: new Date(item.date).toLocaleDateString("zh-CN", { weekday: "short" }),
    vitaminA: item.vitamins?.vitaminA || 0,
    vitaminC: item.vitamins?.vitaminC || 0,
    vitaminD: item.vitamins?.vitaminD || 0,
    calcium: (item.minerals?.calcium || 0) / 10, // 缩放以便显示
    iron: (item.minerals?.iron || 0) * 10, // 放大以便显示
  }));

  // 目标达成度数据
  const goalAchievementData = Object.entries(avgMacros).map(([key, value]) => ({
    nutrient: macroLabels[key as keyof typeof macroLabels],
    actual: value,
    target: targets[key as keyof MacroTargets],
    percentage: Math.round((value / targets[key as keyof MacroTargets]) * 100),
  }));

  const renderTrendsView = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={trendData}
        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
        <XAxis
          dataKey="date"
          className="text-xs text-gray-600"
          tick={{ fontSize: 12 }}
        />
        <YAxis className="text-xs text-gray-600" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="calories"
          stroke={macroColors.calories}
          strokeWidth={2}
          name="卡路里"
        />
        <Line
          type="monotone"
          dataKey="protein"
          stroke={macroColors.protein}
          strokeWidth={2}
          name="蛋白质"
        />
        <Line
          type="monotone"
          dataKey="carbs"
          stroke={macroColors.carbs}
          strokeWidth={2}
          name="碳水"
        />
        <Line
          type="monotone"
          dataKey="fat"
          stroke={macroColors.fat}
          strokeWidth={2}
          name="脂肪"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderMacrosView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          宏量营养素比例
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={macroRatioData}
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
              {macroRatioData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          平均每日摄入量
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={Object.entries(avgMacros).map(([key, value]) => ({
              name: macroLabels[key as keyof typeof macroLabels],
              value: value,
              target: targets[key as keyof MacroTargets],
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" name="实际摄入" />
            <Bar dataKey="target" fill="#e5e7eb" name="建议摄入" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderMicrosView = () => (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-4">
        微量营养素趋势（最近7天）
      </h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={microData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="vitaminA"
            stroke="#8b5cf6"
            name="维生素A"
          />
          <Line
            type="monotone"
            dataKey="vitaminC"
            stroke="#06b6d4"
            name="维生素C"
          />
          <Line
            type="monotone"
            dataKey="vitaminD"
            stroke="#f59e0b"
            name="维生素D"
          />
          <Line
            type="monotone"
            dataKey="calcium"
            stroke="#10b981"
            name="钙(x10)"
          />
          <Line
            type="monotone"
            dataKey="iron"
            stroke="#ef4444"
            name="铁(x10)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderGoalsView = () => (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-4">营养目标达成度</h4>
      <div className="space-y-4">
        {goalAchievementData.map((item, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="w-24 text-sm text-gray-600">{item.nutrient}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-900">
                  {item.actual} / {item.target}
                </span>
                <span
                  className={`text-sm font-medium ${
                    item.percentage >= 100
                      ? "text-green-600"
                      : item.percentage >= 80
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {item.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    item.percentage >= 100
                      ? "bg-green-600"
                      : item.percentage >= 80
                        ? "bg-yellow-600"
                        : "bg-red-600"
                  }`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Apple className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              营养趋势分析
            </h3>
            <p className="text-sm text-gray-500">
              最近 {days} 天的营养摄入情况
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            <option value={7}>7天</option>
            <option value={30}>30天</option>
            <option value={90}>90天</option>
          </select>
        </div>
      </div>

      {/* 视图选择器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => (viewMode = "trends")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "trends"
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200"
          } border`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>趋势图</span>
        </button>
        <button
          onClick={() => (viewMode = "macros")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "macros"
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200"
          } border`}
        >
          <PieChartIcon className="h-4 w-4" />
          <span>宏量营养素</span>
        </button>
        <button
          onClick={() => (viewMode = "micros")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "micros"
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200"
          } border`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>微量营养素</span>
        </button>
        <button
          onClick={() => (viewMode = "goals")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "goals"
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200"
          } border`}
        >
          <Target className="h-4 w-4" />
          <span>目标达成</span>
        </button>
      </div>

      {/* 图表内容 */}
      <div className="mb-6">
        {viewMode === "trends" && renderTrendsView()}
        {viewMode === "macros" && renderMacrosView()}
        {viewMode === "micros" && renderMicrosView()}
        {viewMode === "goals" && renderGoalsView()}
      </div>

      {/* 营养建议 */}
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Target className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-green-900">营养建议</h4>
            <p className="text-sm text-green-700 mt-1">
              {viewMode === "trends" &&
                "您的营养摄入总体稳定，建议保持均衡饮食，适当增加蛋白质摄入。"}
              {viewMode === "macros" &&
                "宏量营养素比例基本合理，建议适当增加优质蛋白质的比例。"}
              {viewMode === "micros" &&
                "微量营养素摄入整体良好，维生素D可能需要额外补充。"}
              {viewMode === "goals" &&
                "大部分营养目标达成良好，建议关注未达标的营养素摄入。"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
