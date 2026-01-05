"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface NutritionChartProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

const COLORS = {
  protein: "#3B82F6", // blue-500
  carbs: "#10B981", // emerald-500
  fat: "#F59E0B", // amber-500
};

const MACRO_LABELS = {
  protein: "蛋白质",
  carbs: "碳水化合物",
  fat: "脂肪",
};

export function NutritionChart({
  calories,
  protein,
  carbs,
  fat,
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFat,
}: NutritionChartProps) {
  // 计算宏量营养素的热量贡献
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;

  // 饼图数据
  const pieData = [
    {
      name: MACRO_LABELS.protein,
      value: proteinCalories,
      grams: protein,
      percentage: ((proteinCalories / calories) * 100).toFixed(1),
      color: COLORS.protein,
    },
    {
      name: MACRO_LABELS.carbs,
      value: carbsCalories,
      grams: carbs,
      percentage: ((carbsCalories / calories) * 100).toFixed(1),
      color: COLORS.carbs,
    },
    {
      name: MACRO_LABELS.fat,
      value: fatCalories,
      grams: fat,
      percentage: ((fatCalories / calories) * 100).toFixed(1),
      color: COLORS.fat,
    },
  ];

  // 柱状图数据（实际 vs 目标）
  const barData = [
    {
      name: "热量",
      actual: calories,
      target: targetCalories || calories,
      unit: "kcal",
    },
    {
      name: "蛋白质",
      actual: protein,
      target: targetProtein || protein,
      unit: "g",
    },
    {
      name: "碳水",
      actual: carbs,
      target: targetCarbs || carbs,
      unit: "g",
    },
    {
      name: "脂肪",
      actual: fat,
      target: targetFat || fat,
      unit: "g",
    },
  ];

  // 自定义饼图标签
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage}%`}
      </text>
    );
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            热量: {data.value.toFixed(0)} kcal ({data.percentage}%)
          </p>
          <p className="text-sm text-gray-600">
            重量: {data.grams.toFixed(1)} g
          </p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual = payload[0].value;
      const target = payload[1].value;
      const unit = payload[0].payload.unit;
      const achievement = ((actual / target) * 100).toFixed(1);

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">
            实际: {actual.toFixed(1)} {unit}
          </p>
          <p className="text-sm text-gray-600">
            目标: {target.toFixed(1)} {unit}
          </p>
          <p className="text-sm font-medium">达成率: {achievement}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 宏量营养素分布饼图 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">营养素分布</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} ({entry.payload.percentage}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 营养目标对比柱状图 */}
      {(targetCalories || targetProtein || targetCarbs || targetFat) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            目标达成情况
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<BarTooltip />} />
              <Legend />
              <Bar dataKey="actual" fill="#3B82F6" name="实际" />
              <Bar dataKey="target" fill="#E5E7EB" name="目标" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 营养质量指标 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">营养密度</h4>
          <div className="text-2xl font-bold text-gray-900">
            {((calories / (protein + carbs + fat)) * 100).toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">kcal/100g营养素</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">蛋白质质量</h4>
          <div className="text-2xl font-bold text-blue-600">
            {(((protein * 4) / calories) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">热量贡献率</div>
        </div>
      </div>

      {/* 营养建议 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 营养建议</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {protein < 20 && <div>• 蛋白质摄入偏低，建议增加优质蛋白质来源</div>}
          {fat > 35 && <div>• 脂肪含量较高，可考虑减少油脂使用</div>}
          {carbs > 65 && (
            <div>• 碳水化合物占比较高，建议增加蛋白质和蔬菜比例</div>
          )}
          {calories > 800 && <div>• 热量较高，适合运动后食用或作为主餐</div>}
          {protein >= 20 && fat <= 35 && carbs <= 65 && calories <= 800 && (
            <div>• 营养搭配均衡，符合健康饮食标准</div>
          )}
        </div>
      </div>
    </div>
  );
}
