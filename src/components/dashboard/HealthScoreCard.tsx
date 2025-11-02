'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';

interface HealthScoreData {
  totalScore: number
  breakdown: {
    bmiScore: number
    nutritionScore: number
    activityScore: number
    dataCompletenessScore: number
  }
  details: {
    bmi: number | null
    bmiCategory: 'underweight' | 'normal' | 'overweight' | 'obese' | null
    nutritionAdherenceRate: number
    activityFrequency: number
    dataCompletenessRate: number
  }
  recommendations: string[]
}

interface HealthScoreHistory {
  date: string
  score: number
}

interface HealthScoreCardProps {
  memberId: string
}

const SCORE_COLORS = {
  excellent: '#10b981', // 绿色
  good: '#3b82f6', // 蓝色
  average: '#f59e0b', // 橙色
  poor: '#ef4444', // 红色
};

const BREAKDOWN_LABELS = {
  bmiScore: 'BMI指数',
  nutritionScore: '营养达标',
  activityScore: '运动频率',
  dataCompletenessScore: '数据完整',
};

const BREAKDOWN_COLORS = {
  bmiScore: '#8b5cf6',
  nutritionScore: '#10b981',
  activityScore: '#f59e0b',
  dataCompletenessScore: '#3b82f6',
};

export function HealthScoreCard({ memberId }: HealthScoreCardProps) {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [history, setHistory] = useState<HealthScoreHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [memberId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/health-score?memberId=${memberId}`);
      if (!response.ok) {
        throw new Error('加载健康评分失败');
      }
      const result = await response.json();
      setData(result.data);
      
      // 加载历史数据
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/dashboard/health-score/history?memberId=${memberId}`);
      if (response.ok) {
        const result = await response.json();
        setHistory(result.data || []);
      }
    } catch (err) {
      console.error('加载健康评分历史失败:', err);
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
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>暂无数据</p>
      </div>
    );
  }

  // 获取评分等级
  const getScoreGrade = (score: number) => {
    if (score >= 80) return { grade: '优秀', color: SCORE_COLORS.excellent, icon: CheckCircle };
    if (score >= 60) return { grade: '良好', color: SCORE_COLORS.good, icon: TrendingUp };
    if (score >= 40) return { grade: '一般', color: SCORE_COLORS.average, icon: AlertCircle };
    return { grade: '需改善', color: SCORE_COLORS.poor, icon: TrendingDown };
  };

  const scoreGrade = getScoreGrade(data.totalScore);
  const GradeIcon = scoreGrade.icon;

  // 准备饼图数据
  const breakdownData = Object.entries(data.breakdown).map(([key, value]) => ({
    name: BREAKDOWN_LABELS[key as keyof typeof BREAKDOWN_LABELS],
    value,
    color: BREAKDOWN_COLORS[key as keyof typeof BREAKDOWN_COLORS],
  }));

  // 准备历史数据
  const chartHistory = history.slice(-30); // 最近30天

  // 自定义工具提示
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{payload[0].payload.name}</p>
          <p className="text-sm">分数: {payload[0].value}分</p>
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
              <Heart className="w-5 h-5 text-red-500" />
              健康评分
              <Badge 
                variant="outline" 
                style={{ borderColor: scoreGrade.color, color: scoreGrade.color }}
                className="flex items-center gap-1"
              >
                <GradeIcon className="w-3 h-3" />
                {scoreGrade.grade}
              </Badge>
            </CardTitle>
            <CardDescription>
              基于BMI、营养、运动和数据完整性的综合评分
            </CardDescription>
          </div>
          <div className="text-right">
            <div 
              className="text-3xl font-bold"
              style={{ color: scoreGrade.color }}
            >
              {data.totalScore}
            </div>
            <div className="text-sm text-gray-500">满分100分</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="breakdown">分项</TabsTrigger>
            <TabsTrigger value="insights">洞察</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 评分环形图 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">评分分布</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {breakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 详细指标 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">各项指标</h3>
                {Object.entries(data.breakdown).map(([key, value]) => {
                  const maxScore = key === 'bmiScore' || key === 'nutritionScore' ? 30 : 20;
                  const percentage = (value / maxScore) * 100;
                  const label = BREAKDOWN_LABELS[key as keyof typeof BREAKDOWN_LABELS];
                  const color = BREAKDOWN_COLORS[key as keyof typeof BREAKDOWN_COLORS];

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm text-gray-600">
                          {value}/{maxScore}分
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2"
                        style={{ 
                          '--progress-background': color, 
                        } as React.CSSProperties}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BMI详情 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  BMI指数
                </h4>
                <div className="text-2xl font-bold mb-1">
                  {data.details.bmi?.toFixed(1) || '--'}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {data.details.bmiCategory === 'normal' && '正常范围'}
                  {data.details.bmiCategory === 'underweight' && '偏瘦'}
                  {data.details.bmiCategory === 'overweight' && '超重'}
                  {data.details.bmiCategory === 'obese' && '肥胖'}
                </div>
                <div className="text-xs text-gray-500">
                  得分: {data.breakdown.bmiScore}/30
                </div>
              </div>

              {/* 营养详情 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  营养达标
                </h4>
                <div className="text-2xl font-bold mb-1">
                  {data.details.nutritionAdherenceRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  营养摄入达标率
                </div>
                <div className="text-xs text-gray-500">
                  得分: {data.breakdown.nutritionScore}/30
                </div>
              </div>

              {/* 运动详情 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  运动频率
                </h4>
                <div className="text-2xl font-bold mb-1">
                  {data.details.activityFrequency}/30
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  过去30天记录天数
                </div>
                <div className="text-xs text-gray-500">
                  得分: {data.breakdown.activityScore}/20
                </div>
              </div>

              {/* 数据完整度 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  数据完整
                </h4>
                <div className="text-2xl font-bold mb-1">
                  {data.details.dataCompletenessRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  健康指标完整度
                </div>
                <div className="text-xs text-gray-500">
                  得分: {data.breakdown.dataCompletenessScore}/20
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {/* 健康建议 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                个性化建议
              </h3>
              {data.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {data.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-blue-800">{recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">健康状况良好</span>
                  </div>
                  <p className="mt-2 text-sm text-green-700">
                    您的健康数据表现优秀，继续保持当前的健康生活方式！
                  </p>
                </div>
              )}
            </div>

            {/* 历史趋势 */}
            {chartHistory.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">评分趋势</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(label) => {
                        return new Date(label).toLocaleDateString('zh-CN');
                      }}
                      formatter={(value: number) => [`${value}分`, '健康评分']}
                    />
                    <Bar dataKey="score" fill={scoreGrade.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
