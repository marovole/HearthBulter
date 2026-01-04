'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Info,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Zap,
  Shield,
  Brain,
} from 'lucide-react';

interface MacroNutrientChartProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  goalType?: 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | 'BALANCED';
}

interface MacroData {
  name: string;
  value: number;
  calories: number;
  color: string;
  percentage: number;
  targetPercentage?: number;
}

interface ComparisonData {
  nutrient: string;
  actual: number;
  target: number;
  percentage: number;
  color: string;
}

const MACRO_COLORS = {
  protein: '#3B82F6', // blue
  carbs: '#10B981', // green
  fat: '#F59E0B', // yellow
};

const MACRO_GOALS = {
  WEIGHT_LOSS: {
    protein: 30,
    carbs: 40,
    fat: 30,
    description: '减脂期间建议高蛋白、中等碳水、低脂肪',
  },
  MUSCLE_GAIN: {
    protein: 40,
    carbs: 40,
    fat: 20,
    description: '增肌期间建议高蛋白、高碳水、低脂肪',
  },
  MAINTENANCE: {
    protein: 25,
    carbs: 45,
    fat: 30,
    description: '保持期间建议均衡营养分配',
  },
  BALANCED: {
    protein: 25,
    carbs: 50,
    fat: 25,
    description: '均衡饮食建议标准营养分配',
  },
};

export function MacroNutrientChart({
  calories,
  protein,
  carbs,
  fat,
  fiber = 0,
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFat,
  goalType = 'BALANCED',
}: MacroNutrientChartProps) {
  const [activeView, setActiveView] = useState<'pie' | 'bar' | 'radar'>('pie');
  const [macroData, setMacroData] = useState<MacroData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [goalData, setGoalData] = useState<any[]>([]);

  useEffect(() => {
    const proteinCalories = protein * 4;
    const carbsCalories = carbs * 4;
    const fatCalories = fat * 9;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    // 计算实际宏量营养素数据
    const actualMacros: MacroData[] = [
      {
        name: '蛋白质',
        value: protein,
        calories: proteinCalories,
        color: MACRO_COLORS.protein,
        percentage:
          totalMacroCalories > 0
            ? (proteinCalories / totalMacroCalories) * 100
            : 0,
      },
      {
        name: '碳水化合物',
        value: carbs,
        calories: carbsCalories,
        color: MACRO_COLORS.carbs,
        percentage:
          totalMacroCalories > 0
            ? (carbsCalories / totalMacroCalories) * 100
            : 0,
      },
      {
        name: '脂肪',
        value: fat,
        calories: fatCalories,
        color: MACRO_COLORS.fat,
        percentage:
          totalMacroCalories > 0 ? (fatCalories / totalMacroCalories) * 100 : 0,
      },
    ];

    // 添加目标比例
    const goal = MACRO_GOALS[goalType];
    actualMacros.forEach((macro) => {
      macro.targetPercentage =
        goal[
          macro.name === '蛋白质'
            ? 'protein'
            : macro.name === '碳水化合物'
              ? 'carbs'
              : 'fat'
        ];
    });

    setMacroData(actualMacros);

    // 计算对比数据
    const comparison: ComparisonData[] = [
      {
        nutrient: '蛋白质',
        actual: protein,
        target: targetProtein || (goal.protein * calories) / 400,
        percentage: targetProtein ? (protein / targetProtein) * 100 : 100,
        color: MACRO_COLORS.protein,
      },
      {
        nutrient: '碳水化合物',
        actual: carbs,
        target: targetCarbs || (goal.carbs * calories) / 400,
        percentage: targetCarbs ? (carbs / targetCarbs) * 100 : 100,
        color: MACRO_COLORS.carbs,
      },
      {
        nutrient: '脂肪',
        actual: fat,
        target: targetFat || (goal.fat * calories) / 900,
        percentage: targetFat ? (fat / targetFat) * 100 : 100,
        color: MACRO_COLORS.fat,
      },
    ];

    setComparisonData(comparison);

    // 雷达图数据
    const radarData = [
      {
        nutrient: '蛋白质',
        actual: (proteinCalories / totalMacroCalories) * 100,
        target: goal.protein,
        fullMark: 50,
      },
      {
        nutrient: '碳水化合物',
        actual: (carbsCalories / totalMacroCalories) * 100,
        target: goal.carbs,
        fullMark: 60,
      },
      {
        nutrient: '脂肪',
        actual: (fatCalories / totalMacroCalories) * 100,
        target: goal.fat,
        fullMark: 40,
      },
    ];

    setGoalData(radarData);
  }, [
    calories,
    protein,
    carbs,
    fat,
    targetProtein,
    targetCarbs,
    targetFat,
    goalType,
  ]);

  const getGoalStatus = (
    actual: number,
    target: number,
  ): 'good' | 'warning' | 'danger' => {
    const percentage = (actual / target) * 100;
    if (percentage >= 90 && percentage <= 110) return 'good';
    if (percentage >= 80 && percentage < 90) return 'warning';
    if (percentage > 110 && percentage <= 120) return 'warning';
    return 'danger';
  };

  const getStatusColor = (status: 'good' | 'warning' | 'danger'): string => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'danger':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-3 border border-gray-200 rounded-lg shadow-lg'>
          <p className='font-medium'>{payload[0].name}</p>
          <p className='text-sm text-gray-600'>
            {payload[0].value?.toFixed(1)}g (
            {payload[0].payload?.percentage?.toFixed(1)}%)
          </p>
          <p className='text-sm text-gray-600'>
            {payload[0].payload?.calories?.toFixed(0)} kcal
          </p>
        </div>
      );
    }
    return null;
  };

  const renderPieChart = () => (
    <div className='space-y-4'>
      <div className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={macroData}
              cx='50%'
              cy='50%'
              labelLine={false}
              label={({ name, percentage }) =>
                `${name} ${percentage.toFixed(1)}%`
              }
              outerRadius={80}
              fill='#8884d8'
              dataKey='value'
            >
              {macroData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className='grid grid-cols-3 gap-4'>
        {macroData.map((macro) => (
          <div key={macro.name} className='text-center'>
            <div
              className='w-4 h-4 rounded-full mx-auto mb-2'
              style={{ backgroundColor: macro.color }}
            />
            <div className='text-sm font-medium'>{macro.name}</div>
            <div className='text-xs text-gray-600'>
              {macro.value.toFixed(1)}g ({macro.percentage.toFixed(1)}%)
            </div>
            <div className='text-xs text-gray-500'>
              {macro.calories.toFixed(0)} kcal
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBarChart = () => (
    <div className='space-y-4'>
      <div className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='nutrient' />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey='actual' fill='#3B82F6' name='实际' />
            <Bar dataKey='target' fill='#10B981' name='目标' />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 目标达成度 */}
      <div className='space-y-3'>
        {comparisonData.map((item) => {
          const status = getGoalStatus(item.actual, item.target);
          return (
            <div key={item.nutrient} className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='font-medium'>{item.nutrient}</span>
                <span className={getStatusColor(status)}>
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(item.percentage, 150)}
                className='h-2'
              />
              <div className='flex justify-between text-xs text-gray-600'>
                <span>实际: {item.actual.toFixed(1)}g</span>
                <span>目标: {item.target.toFixed(1)}g</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRadarChart = () => (
    <div className='space-y-4'>
      <div className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <RadarChart data={goalData}>
            <PolarGrid />
            <PolarAngleAxis dataKey='nutrient' />
            <PolarRadiusAxis angle={90} domain={[0, 60]} />
            <Radar
              name='实际比例'
              dataKey='actual'
              stroke='#3B82F6'
              fill='#3B82F6'
              fillOpacity={0.6}
            />
            <Radar
              name='目标比例'
              dataKey='target'
              stroke='#10B981'
              fill='#10B981'
              fillOpacity={0.3}
            />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 目标说明 */}
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <div className='flex items-center gap-2 mb-2'>
          <Target className='h-4 w-4 text-blue-600' />
          <span className='font-medium text-blue-900'>
            {goalType === 'WEIGHT_LOSS'
              ? '减脂'
              : goalType === 'MUSCLE_GAIN'
                ? '增肌'
                : goalType === 'MAINTENANCE'
                  ? '保持'
                  : '均衡'}
            目标
          </span>
        </div>
        <p className='text-sm text-blue-800'>
          {MACRO_GOALS[goalType].description}
        </p>
        <div className='mt-3 grid grid-cols-3 gap-2 text-xs'>
          <div className='text-center'>
            <div className='font-medium text-blue-900'>蛋白质</div>
            <div>{MACRO_GOALS[goalType].protein}%</div>
          </div>
          <div className='text-center'>
            <div className='font-medium text-blue-900'>碳水</div>
            <div>{MACRO_GOALS[goalType].carbs}%</div>
          </div>
          <div className='text-center'>
            <div className='font-medium text-blue-900'>脂肪</div>
            <div>{MACRO_GOALS[goalType].fat}%</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <PieChartIcon className='h-5 w-5' />
          宏量营养素分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as any)}
        >
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='pie' className='flex items-center gap-2'>
              <PieChartIcon className='h-4 w-4' />
              饼图
            </TabsTrigger>
            <TabsTrigger value='bar' className='flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              对比
            </TabsTrigger>
            <TabsTrigger value='radar' className='flex items-center gap-2'>
              <Activity className='h-4 w-4' />
              雷达
            </TabsTrigger>
          </TabsList>

          <TabsContent value='pie' className='space-y-4'>
            {renderPieChart()}
          </TabsContent>

          <TabsContent value='bar' className='space-y-4'>
            {renderBarChart()}
          </TabsContent>

          <TabsContent value='radar' className='space-y-4'>
            {renderRadarChart()}
          </TabsContent>
        </Tabs>

        {/* 营养建议 */}
        <div className='mt-6 space-y-3'>
          <div className='flex items-center gap-2'>
            <Brain className='h-4 w-4 text-purple-600' />
            <span className='font-medium text-purple-900'>营养建议</span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {macroData.map((macro) => {
              const targetPercentage = macro.targetPercentage || 25;
              const diff = macro.percentage - targetPercentage;

              if (Math.abs(diff) < 5) return null;

              return (
                <div
                  key={macro.name}
                  className='flex items-center gap-2 text-sm'
                >
                  {diff > 0 ? (
                    <Zap className='h-4 w-4 text-orange-500' />
                  ) : (
                    <Shield className='h-4 w-4 text-blue-500' />
                  )}
                  <span className='text-gray-700'>
                    {macro.name}
                    {diff > 0 ? '偏高' : '偏低'}
                    {Math.abs(diff).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
