'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface HealthScoreGaugeProps {
  score: number; // 0-100
  breakdown?: {
    bmiScore: number;
    nutritionScore: number;
    activityScore: number;
    dataCompletenessScore: number;
  };
}

export function HealthScoreGauge({ score, breakdown }: HealthScoreGaugeProps) {
  // 创建半圆仪表盘数据
  const data = [
    { name: '已得分', value: score },
    { name: '剩余', value: 100 - score },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // 绿色
    if (score >= 60) return '#3b82f6'; // 蓝色
    if (score >= 40) return '#f59e0b'; // 橙色
    return '#ef4444'; // 红色
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '需改进';
  };

  return (
    <div className='w-full'>
      <ResponsiveContainer width='100%' height={200}>
        <PieChart>
          <Pie
            data={data}
            cx='50%'
            cy='100%'
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey='value'
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? getScoreColor(score) : '#e5e7eb'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
            }}
            formatter={(value: number) => [`${value}分`, '']}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 分数显示 */}
      <div className='mt-4 text-center'>
        <div
          className='text-4xl font-bold'
          style={{ color: getScoreColor(score) }}
        >
          {score}
        </div>
        <div className='text-sm text-gray-600 mt-1'>总分</div>
        <div
          className='text-sm font-medium mt-2'
          style={{ color: getScoreColor(score) }}
        >
          {getScoreLabel(score)}
        </div>
      </div>

      {/* 评分明细 */}
      {breakdown && (
        <div className='mt-6 space-y-2'>
          <div className='text-xs font-medium text-gray-700 mb-2'>
            评分明细：
          </div>
          <div className='space-y-1'>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-gray-600'>BMI评分</span>
              <span className='text-xs font-semibold text-gray-900'>
                {breakdown.bmiScore}/30
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-gray-600'>营养达标率</span>
              <span className='text-xs font-semibold text-gray-900'>
                {breakdown.nutritionScore}/30
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-gray-600'>运动频率</span>
              <span className='text-xs font-semibold text-gray-900'>
                {breakdown.activityScore}/20
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-gray-600'>数据完整性</span>
              <span className='text-xs font-semibold text-gray-900'>
                {breakdown.dataCompletenessScore}/20
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
