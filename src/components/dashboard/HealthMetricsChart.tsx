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
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import {
  Activity,
  TrendingUp,
  Heart,
  Calendar,
  Target,
  AlertCircle,
} from "lucide-react";

interface HealthMetricData {
  date: Date;
  weight?: number;
  bodyFat?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
}

interface HealthMetricsChartProps {
  memberId: string;
  days?: number;
  metrics?: ("weight" | "bodyFat" | "bloodPressure" | "heartRate")[];
}

interface MetricConfig {
  key: keyof HealthMetricData;
  label: string;
  color: string;
  unit: string;
  icon: React.ComponentType<any>;
  targetValue?: number;
  normalRange?: { min: number; max: number };
}

export function HealthMetricsChart({
  memberId,
  days = 30,
  metrics = ["weight", "bodyFat", "bloodPressure"],
}: HealthMetricsChartProps) {
  const [data, setData] = useState<HealthMetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>("weight");

  const metricConfigs: Record<string, MetricConfig> = {
    weight: {
      key: "weight",
      label: "体重",
      color: "#3b82f6",
      unit: "kg",
      icon: TrendingUp,
      targetValue: 70,
      normalRange: { min: 50, max: 90 },
    },
    bodyFat: {
      key: "bodyFat",
      label: "体脂率",
      color: "#10b981",
      unit: "%",
      icon: Activity,
      targetValue: 20,
      normalRange: { min: 10, max: 30 },
    },
    bloodPressure: {
      key: "systolic",
      label: "血压",
      color: "#ef4444",
      unit: "mmHg",
      icon: Heart,
      targetValue: 120,
      normalRange: { min: 90, max: 140 },
    },
    heartRate: {
      key: "heartRate",
      label: "心率",
      color: "#f59e0b",
      unit: "bpm",
      icon: Heart,
      targetValue: 72,
      normalRange: { min: 60, max: 100 },
    },
  };

  useEffect(() => {
    loadData();
  }, [memberId, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 模拟API调用 - 实际应该调用真实的健康数据API
      const mockData: HealthMetricData[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        mockData.push({
          date,
          weight: 70 + Math.random() * 5 - 2.5,
          bodyFat: 18 + Math.random() * 6 - 3,
          systolic: 120 + Math.random() * 20 - 10,
          diastolic: 80 + Math.random() * 10 - 5,
          heartRate: 72 + Math.random() * 20 - 10,
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
            <p className="mt-2 text-sm text-gray-500">加载健康数据中...</p>
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
          <p>暂无健康数据</p>
        </div>
      </div>
    );
  }

  // 格式化数据供图表使用
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    }),
    fullDate: item.date,
    weight: item.weight?.toFixed(1) || null,
    bodyFat: item.bodyFat?.toFixed(1) || null,
    systolic: item.systolic || null,
    diastolic: item.diastolic || null,
    heartRate: item.heartRate || null,
  }));

  const currentConfig = metricConfigs[selectedMetric];
  const Icon = currentConfig.icon;

  // 计算统计信息
  const currentValues = data
    .map((d) => d[currentConfig.key])
    .filter((v) => v !== undefined) as number[];
  const currentValue = currentValues[currentValues.length - 1] || 0;
  const averageValue =
    currentValues.reduce((a, b) => a + b, 0) / currentValues.length || 0;
  const changeValue =
    currentValues.length > 1 ? currentValue - currentValues[0] : 0;

  const renderChart = () => {
    if (selectedMetric === "bloodPressure") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-600"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-gray-600"
              domain={[60, 160]}
              tick={{ fontSize: 12 }}
              label={{
                value: "血压 (mmHg)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
              }}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.date === label);
                return item
                  ? new Date(item.fullDate).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : label;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="systolic"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="收缩压"
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="舒张压"
            />
            <ReferenceLine
              y={120}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label="收缩压目标"
            />
            <ReferenceLine
              y={80}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label="舒张压目标"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis
            dataKey="date"
            className="text-xs text-gray-600"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-xs text-gray-600"
            domain={["dataMin - 5", "dataMax + 5"]}
            tick={{ fontSize: 12 }}
            label={{
              value: `${currentConfig.label} (${currentConfig.unit})`,
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.375rem",
            }}
            labelFormatter={(label) => {
              const item = chartData.find((d) => d.date === label);
              return item
                ? new Date(item.fullDate).toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : label;
            }}
            formatter={(value: number) => [
              `${value?.toFixed(1)} ${currentConfig.unit}`,
              currentConfig.label,
            ]}
          />
          <Area
            type="monotone"
            dataKey={selectedMetric}
            stroke={currentConfig.color}
            fill={currentConfig.color}
            fillOpacity={0.3}
            strokeWidth={2}
            name={currentConfig.label}
          />
          {currentConfig.targetValue && (
            <ReferenceLine
              y={currentConfig.targetValue}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{
                value: `目标: ${currentConfig.targetValue}${currentConfig.unit}`,
                position: "right",
                fill: "#059669",
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Icon className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              健康数据趋势
            </h3>
            <p className="text-sm text-gray-500">最近 {days} 天的数据</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={days}
            onChange={(e) => {
              // 这里可以触发重新加载不同天数的数据
            }}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={7}>7天</option>
            <option value={30}>30天</option>
            <option value={90}>90天</option>
            <option value={180}>180天</option>
          </select>
        </div>
      </div>

      {/* 指标选择器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {metrics.map((metric) => {
          const config = metricConfigs[metric];
          const MetricIcon = config.icon;
          return (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === metric
                  ? "bg-blue-100 text-blue-700 border-blue-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200"
              } border`}
            >
              <MetricIcon className="h-4 w-4" />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* 图表 */}
      {renderChart()}

      {/* 统计信息 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">当前值</p>
          <p className="text-lg font-semibold text-gray-900">
            {currentValue.toFixed(1)} {currentConfig.unit}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">平均值</p>
          <p className="text-lg font-semibold text-gray-900">
            {averageValue.toFixed(1)} {currentConfig.unit}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">变化</p>
          <p
            className={`text-lg font-semibold ${
              changeValue >= 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {changeValue >= 0 ? "+" : ""}
            {changeValue.toFixed(1)} {currentConfig.unit}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">目标值</p>
          <p className="text-lg font-semibold text-blue-600">
            {currentConfig.targetValue || "--"} {currentConfig.unit}
          </p>
        </div>
      </div>

      {/* 健康建议 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Target className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">健康建议</h4>
            <p className="text-sm text-blue-700 mt-1">
              {selectedMetric === "weight" &&
                "您的体重趋势稳定，继续保持当前的饮食和运动习惯。"}
              {selectedMetric === "bodyFat" &&
                "体脂率在正常范围内，建议增加有氧运动来进一步改善。"}
              {selectedMetric === "bloodPressure" &&
                "血压水平良好，请继续保持健康的生活方式。"}
              {selectedMetric === "heartRate" &&
                "心率正常，规律的运动有助于维持心血管健康。"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
