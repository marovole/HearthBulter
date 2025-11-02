'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface MacroData {
  carbs: number
  protein: number
  fat: number
}

interface MacroPieChartProps {
  target?: MacroData
  actual?: MacroData
  size?: { width: number; height: number }
}

const COLORS = {
  carbs: '#3b82f6', // 蓝色
  protein: '#10b981', // 绿色
  fat: '#f59e0b', // 橙色
};

export function MacroPieChart({
  target,
  actual,
  size = { width: 400, height: 300 },
}: MacroPieChartProps) {
  // 如果没有实际数据，使用目标数据
  const data = actual || target;

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>暂无营养数据</p>
      </div>
    );
  }

  // 计算总热量
  const totalCalories = data.carbs * 4 + data.protein * 4 + data.fat * 9;

  // 计算百分比
  const carbsPercent = (data.carbs * 4 / totalCalories) * 100;
  const proteinPercent = (data.protein * 4 / totalCalories) * 100;
  const fatPercent = (data.fat * 9 / totalCalories) * 100;

  const chartData = [
    { name: '碳水化合物', value: carbsPercent, calories: data.carbs * 4, grams: data.carbs },
    { name: '蛋白质', value: proteinPercent, calories: data.protein * 4, grams: data.protein },
    { name: '脂肪', value: fatPercent, calories: data.fat * 9, grams: data.fat },
  ];

  const renderCustomLabel = (entry: any) => {
    return `${entry.name}: ${entry.value.toFixed(1)}%`;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={size.height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.name === '碳水化合物'
                    ? COLORS.carbs
                    : entry.name === '蛋白质'
                      ? COLORS.protein
                      : COLORS.fat
                }
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
            }}
            formatter={(value: number, name: string, props: any) => {
              return [
                `${value.toFixed(1)}% (${props.payload.grams.toFixed(1)}g, ${props.payload.calories.toFixed(0)}kcal)`,
                name,
              ];
            }}
          />
          <Legend
            formatter={(value) => {
              const item = chartData.find((d) => d.name === value);
              return item ? `${value} (${item.value.toFixed(1)}%)` : value;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 详细数据 */}
      <div className="mt-4 space-y-2">
        {chartData.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{
                  backgroundColor:
                    item.name === '碳水化合物'
                      ? COLORS.carbs
                      : item.name === '蛋白质'
                        ? COLORS.protein
                        : COLORS.fat,
                }}
              />
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">
                {item.grams.toFixed(1)}g
              </span>
              <span className="text-xs text-gray-500 ml-2">
                ({item.value.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">总热量</span>
            <span className="font-semibold text-gray-900">
              {totalCalories.toFixed(0)} kcal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

