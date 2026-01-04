'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DataPoint {
  date: Date | string;
  value: number;
}

interface TrendChartProps {
  data: DataPoint[];
  dataKey?: string;
  title?: string;
  unit?: string;
  showPredictions?: boolean;
  predictions?: DataPoint[];
  targetValue?: number;
}

export default function TrendChart({
  data,
  dataKey = 'value',
  title,
  unit = '',
  showPredictions = false,
  predictions = [],
  targetValue,
}: TrendChartProps) {
  // 格式化数据
  const formattedData = data.map((point) => ({
    date: typeof point.date === 'string' ? new Date(point.date) : point.date,
    value: point.value,
    dateStr: format(
      typeof point.date === 'string' ? new Date(point.date) : point.date,
      'MM/dd',
      { locale: zhCN },
    ),
  }));

  // 如果显示预测，添加预测数据
  if (showPredictions && predictions.length > 0) {
    const predictedData = predictions.map((point) => ({
      date: typeof point.date === 'string' ? new Date(point.date) : point.date,
      predicted: point.value,
      dateStr: format(
        typeof point.date === 'string' ? new Date(point.date) : point.date,
        'MM/dd',
        { locale: zhCN },
      ),
    }));

    // 合并数据
    formattedData.push(...predictedData);
  }

  // 如果有目标值，添加到每个数据点
  const chartData = formattedData.map((d) => ({
    ...d,
    target: targetValue,
  }));

  return (
    <div className='w-full'>
      {title && <h3 className='text-lg font-semibold mb-4'>{title}</h3>}
      <ResponsiveContainer width='100%' height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
          <XAxis
            dataKey='dateStr'
            stroke='#6b7280'
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke='#6b7280'
            style={{ fontSize: '12px' }}
            label={{ value: unit, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: any) => [`${value}${unit}`, '']}
          />
          <Legend />
          <Line
            type='monotone'
            dataKey='value'
            stroke='#667eea'
            strokeWidth={2}
            dot={{ fill: '#667eea', r: 4 }}
            name='实际值'
            connectNulls
          />
          {showPredictions && (
            <Line
              type='monotone'
              dataKey='predicted'
              stroke='#f59e0b'
              strokeWidth={2}
              strokeDasharray='5 5'
              dot={{ fill: '#f59e0b', r: 4 }}
              name='预测值'
              connectNulls
            />
          )}
          {targetValue && (
            <Line
              type='monotone'
              dataKey='target'
              stroke='#10b981'
              strokeWidth={2}
              strokeDasharray='3 3'
              dot={false}
              name='目标值'
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
