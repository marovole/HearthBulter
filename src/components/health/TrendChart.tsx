'use client';

import { useState, useEffect } from 'react';

interface TrendDataPoint {
  date: string
  value: number
}

interface TrendData {
  data: TrendDataPoint[]
  average: number | null
  min: number | null
  max: number | null
  change: number | null
}

interface TrendsResponse {
  trends: {
    weight?: TrendData
    bodyFat?: TrendData
    muscleMass?: TrendData
    heartRate?: TrendData
    bloodPressure?: {
      data: Array<{ date: string; systolic: number; diastolic: number }>
      average: { systolic: number; diastolic: number }
      min: { systolic: number; diastolic: number }
      max: { systolic: number; diastolic: number }
      change: { systolic: number; diastolic: number } | null
    }
  }
  period: {
    start: string
    end: string
  }
}

interface TrendChartProps {
  memberId: string
  type: 'weight' | 'bodyFat' | 'muscleMass' | 'heartRate' | 'bloodPressure'
  days?: number
}

export function TrendChart({ memberId, type, days = 30 }: TrendChartProps) {
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, [memberId, days]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/members/${memberId}/health-data/trends?days=${days}`
      );
      if (!response.ok) {
        throw new Error('加载趋势数据失败');
      }
      const data = await response.json();
      setTrends(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    switch (type) {
    case 'weight':
      return '体重 (kg)';
    case 'bodyFat':
      return '体脂率 (%)';
    case 'muscleMass':
      return '肌肉量 (kg)';
    case 'heartRate':
      return '心率 (bpm)';
    case 'bloodPressure':
      return '血压 (mmHg)';
    default:
      return '';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!trends) {
    return null;
  }

  const trendData = trends.trends[type];

  if (!trendData || (type !== 'bloodPressure' && trendData.data.length === 0)) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">暂无{getTypeLabel()}趋势数据</p>
      </div>
    );
  }

  // 简单趋势图渲染（使用SVG）
  if (type === 'bloodPressure') {
    const bpData = trends.trends.bloodPressure!;
    if (bpData.data.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">暂无血压趋势数据</p>
        </div>
      );
    }

    const chartWidth = 800;
    const chartHeight = 200;
    const padding = 40;
    const chartAreaWidth = chartWidth - padding * 2;
    const chartAreaHeight = chartHeight - padding * 2;

    const maxSystolic = Math.max(...bpData.data.map((d) => d.systolic));
    const minSystolic = Math.min(...bpData.data.map((d) => d.systolic));
    const maxDiastolic = Math.max(...bpData.data.map((d) => d.diastolic));
    const minDiastolic = Math.min(...bpData.data.map((d) => d.diastolic));
    const max = Math.max(maxSystolic, maxDiastolic);
    const min = Math.min(minSystolic, minDiastolic);
    const range = max - min || 1;

    const points = bpData.data.map((d, i) => {
      const x = padding + (i / (bpData.data.length - 1 || 1)) * chartAreaWidth;
      const ySystolic =
        padding +
        chartAreaHeight -
        ((d.systolic - min) / range) * chartAreaHeight;
      const yDiastolic =
        padding +
        chartAreaHeight -
        ((d.diastolic - min) / range) * chartAreaHeight;
      return { x, ySystolic, yDiastolic, date: d.date };
    });

    const systolicPath = points
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.ySystolic}`
      )
      .join(' ');
    const diastolicPath = points
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yDiastolic}`
      )
      .join(' ');

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {getTypeLabel()}趋势
        </h3>
        <svg width={chartWidth} height={chartHeight} className="w-full">
          {/* 网格线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + chartAreaHeight - ratio * chartAreaHeight;
            return (
              <line
                key={ratio}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}
          {/* 收缩压曲线 */}
          <path
            d={systolicPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
          {/* 舒张压曲线 */}
          <path
            d={diastolicPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          {/* 数据点 */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.ySystolic}
                r="3"
                fill="#ef4444"
              />
              <circle
                cx={p.x}
                cy={p.yDiastolic}
                r="3"
                fill="#3b82f6"
              />
            </g>
          ))}
        </svg>
        <div className="mt-4 flex justify-between text-sm text-gray-600">
          <div>
            <span className="text-red-600">●</span> 收缩压 平均:{' '}
            {bpData.average.systolic.toFixed(1)} mmHg
          </div>
          <div>
            <span className="text-blue-600">●</span> 舒张压 平均:{' '}
            {bpData.average.diastolic.toFixed(1)} mmHg
          </div>
        </div>
      </div>
    );
  }

  // 其他类型的趋势图
  const simpleTrendData = trendData as TrendData;
  const chartWidth = 800;
  const chartHeight = 200;
  const padding = 40;
  const chartAreaWidth = chartWidth - padding * 2;
  const chartAreaHeight = chartHeight - padding * 2;

  const values = simpleTrendData.data.map((d) => d.value);
  const max = simpleTrendData.max || Math.max(...values);
  const min = simpleTrendData.min || Math.min(...values);
  const range = max - min || 1;

  const points = simpleTrendData.data.map((d, i) => {
    const x = padding + (i / (simpleTrendData.data.length - 1 || 1)) * chartAreaWidth;
    const y = padding + chartAreaHeight - ((d.value - min) / range) * chartAreaHeight;
    return { x, y, value: d.value, date: d.date };
  });

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {getTypeLabel()}趋势
      </h3>
      <svg width={chartWidth} height={chartHeight} className="w-full">
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + chartAreaHeight - ratio * chartAreaHeight;
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}
        {/* 趋势线 */}
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" />
        {/* 数据点 */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
        ))}
      </svg>
      <div className="mt-4 flex justify-between text-sm text-gray-600">
        {simpleTrendData.average !== null && (
          <div>平均: {simpleTrendData.average.toFixed(1)}</div>
        )}
        {simpleTrendData.min !== null && (
          <div>最低: {simpleTrendData.min.toFixed(1)}</div>
        )}
        {simpleTrendData.max !== null && (
          <div>最高: {simpleTrendData.max.toFixed(1)}</div>
        )}
        {simpleTrendData.change !== null && (
          <div
            className={
              simpleTrendData.change > 0 ? 'text-green-600' : 'text-red-600'
            }
          >
            变化: {simpleTrendData.change > 0 ? '+' : ''}
            {simpleTrendData.change.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}
