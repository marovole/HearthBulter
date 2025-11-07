'use client';

import { useState, useEffect } from 'react';
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
} from 'recharts';
import { EmptyStateGuide } from './EmptyStateGuide';

interface WeightTrendData {
  data: Array<{ date: Date; weight: number }>
  min: number
  max: number
  average: number
  change: number
  changePercent: number
  currentWeight: number | null
  targetWeight: number | null
  anomalies: Array<{
    date: Date
    weight: number
    reason: string
    severity: 'low' | 'medium' | 'high'
  }>
}

interface WeightTrendChartProps {
  memberId: string
  days?: number
}

export function WeightTrendChart({
  memberId,
  days = 30,
}: WeightTrendChartProps) {
  const [data, setData] = useState<WeightTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [memberId, days]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/dashboard/weight-trend?memberId=${memberId}&days=${days}`
      );
      if (!response.ok) {
        throw new Error('加载体重趋势数据失败');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
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

  if (!data || data.data.length === 0) {
    return <EmptyStateGuide memberId={memberId} type="weight" onInitialize={loadData} />;
  }

  // 格式化数据供图表使用
  const chartData = data.data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    }),
    weight: item.weight,
    fullDate: item.date,
  }));

  // 异常点标记
  const anomalyDates = new Set(
    data.anomalies.map((a) => new Date(a.date).toLocaleDateString())
  );

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis
            dataKey="date"
            className="text-xs text-gray-600"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-xs text-gray-600"
            domain={['dataMin - 2', 'dataMax + 2']}
            tick={{ fontSize: 12 }}
            label={{
              value: '体重 (kg)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
            }}
            labelFormatter={(label) => {
              const item = chartData.find((d) => d.date === label);
              return item
                ? new Date(item.fullDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
                : label;
            }}
            formatter={(value: number) => [`${value.toFixed(1)} kg`, '体重']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="体重"
          />
          {data.average && (
            <ReferenceLine
              y={data.average}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              label={{
                value: `平均: ${data.average.toFixed(1)}kg`,
                position: 'right',
                fill: '#64748b',
              }}
            />
          )}
          {data.targetWeight && (
            <ReferenceLine
              y={data.targetWeight}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{
                value: `目标: ${data.targetWeight.toFixed(1)}kg`,
                position: 'right',
                fill: '#059669',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* 统计信息 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">当前体重</p>
          <p className="text-lg font-semibold text-gray-900">
            {data.currentWeight?.toFixed(1) || '--'} kg
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">平均体重</p>
          <p className="text-lg font-semibold text-gray-900">
            {data.average.toFixed(1)} kg
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">变化</p>
          <p
            className={`text-lg font-semibold ${
              data.change >= 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {data.change >= 0 ? '+' : ''}
            {data.change.toFixed(1)} kg ({data.changePercent >= 0 ? '+' : ''}
            {data.changePercent.toFixed(1)}%)
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-600 text-xs">异常点</p>
          <p className="text-lg font-semibold text-gray-900">
            {data.anomalies.length} 个
          </p>
        </div>
      </div>

      {/* 异常提示 */}
      {data.anomalies.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">异常检测：</p>
          {data.anomalies.slice(0, 3).map((anomaly, index) => (
            <div
              key={index}
              className={`text-xs p-2 rounded ${
                anomaly.severity === 'high'
                  ? 'bg-red-50 text-red-800'
                  : anomaly.severity === 'medium'
                    ? 'bg-yellow-50 text-yellow-800'
                    : 'bg-blue-50 text-blue-800'
              }`}
            >
              {new Date(anomaly.date).toLocaleDateString('zh-CN')}: {anomaly.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

