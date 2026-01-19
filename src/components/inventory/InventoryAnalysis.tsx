"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  DollarSign,
  Target,
  Lightbulb,
  BarChart3,
  PieChart,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface InventoryAnalysis {
  memberId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalItems: number;
    totalValue: number;
    usedItems: number;
    wastedItems: number;
    wasteRate: number;
    usageRate: number;
  };
  categoryAnalysis: Array<{
    category: string;
    itemCount: number;
    totalValue: number;
    usedQuantity: number;
    wastedQuantity: number;
    wasteRate: number;
    efficiency: number;
  }>;
  usagePatterns: Array<{
    foodName: string;
    usageFrequency: number;
    averageUsage: number;
    totalUsage: number;
    wasteFrequency: number;
    efficiency: number;
  }>;
  wasteAnalysis: {
    totalWasteValue: number;
    wasteByReason: Array<{
      reason: string;
      count: number;
      value: number;
      percentage: number;
    }>;
    wasteByCategory: Array<{
      category: string;
      count: number;
      value: number;
      percentage: number;
    }>;
    topWastedItems: Array<{
      foodName: string;
      wasteCount: number;
      totalWasteValue: number;
      wasteRate: number;
    }>;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    potentialSavings?: number;
  }>;
}

interface InventoryAnalysisProps {
  memberId: string;
}

const periodOptions = [
  { value: 7, label: "最近7天" },
  { value: 30, label: "最近30天" },
  { value: 90, label: "最近3个月" },
];

const priorityColors = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-green-100 text-green-800",
};

const priorityLabels = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

export function InventoryAnalysis({ memberId }: InventoryAnalysisProps) {
  const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchAnalysis();
  }, [memberId, period]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const response = await fetch(
        `/api/inventory/analysis?memberId=${memberId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      );
      const result = await response.json();

      if (result.success) {
        setAnalysis(result.data);
      }
    } catch (error) {
      console.error("获取库存分析失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return "text-green-600";
    if (efficiency >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getEfficiencyLabel = (efficiency: number) => {
    if (efficiency >= 80) return "优秀";
    if (efficiency >= 60) return "良好";
    if (efficiency >= 40) return "一般";
    return "较差";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>无法获取分析数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 时间选择 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">库存分析报告</h3>
        <Select
          value={period.toString()}
          onValueChange={(value) => setPeriod(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 总览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">总物品数</p>
                <p className="text-xl font-semibold">
                  {analysis.summary.totalItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">总价值</p>
                <p className="text-xl font-semibold">
                  ¥{analysis.summary.totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">使用率</p>
                <p className="text-xl font-semibold text-green-600">
                  {analysis.summary.usageRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <Progress value={analysis.summary.usageRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">浪费率</p>
                <p className="text-xl font-semibold text-red-600">
                  {analysis.summary.wasteRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <Progress value={analysis.summary.wasteRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 详细分析 */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">分类分析</TabsTrigger>
          <TabsTrigger value="usage">使用模式</TabsTrigger>
          <TabsTrigger value="waste">浪费分析</TabsTrigger>
          <TabsTrigger value="recommendations">优化建议</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>分类效率分析</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.categoryAnalysis.map((category) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{category.category}</span>
                        <Badge variant="outline">{category.itemCount} 种</Badge>
                        <span className="text-sm text-gray-500">
                          ¥{category.totalValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div
                            className={`text-sm font-medium ${getEfficiencyColor(category.efficiency)}`}
                          >
                            {getEfficiencyLabel(category.efficiency)}
                          </div>
                          <div className="text-xs text-gray-500">
                            效率 {category.efficiency.toFixed(1)}%
                          </div>
                        </div>
                        {category.wasteRate > 20 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Progress value={category.efficiency} className="h-2" />
                        <div className="text-xs text-gray-500 mt-1">
                          使用 {category.usedQuantity.toFixed(1)} | 浪费{" "}
                          {category.wastedQuantity.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <Progress
                          value={Math.min(100, category.wasteRate * 2)}
                          className="h-2 bg-red-100"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          浪费率 {category.wasteRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>使用频率分析</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.usagePatterns.slice(0, 10).map((pattern, index) => (
                  <div
                    key={pattern.foodName}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-medium">{pattern.foodName}</div>
                        <div className="text-sm text-gray-500">
                          使用 {pattern.usageFrequency} 次 • 平均{" "}
                          {pattern.averageUsage.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${getEfficiencyColor(pattern.efficiency)}`}
                      >
                        {getEfficiencyLabel(pattern.efficiency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        效率 {pattern.efficiency.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waste" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 浪费原因 */}
            <Card>
              <CardHeader>
                <CardTitle>浪费原因分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.wasteAnalysis.wasteByReason.map((reason) => (
                    <div key={reason.reason} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{reason.reason}</span>
                        <span className="text-sm text-gray-500">
                          ¥{reason.value.toFixed(2)} (
                          {reason.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={reason.percentage} className="h-2" />
                      <div className="text-xs text-gray-500">
                        {reason.count} 次浪费
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 浪费分类 */}
            <Card>
              <CardHeader>
                <CardTitle>分类浪费分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.wasteAnalysis.wasteByCategory.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.category}</span>
                        <span className="text-sm text-gray-500">
                          ¥{category.value.toFixed(2)} (
                          {category.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                      <div className="text-xs text-gray-500">
                        {category.count} 次浪费
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 浪费最多的物品 */}
          <Card>
            <CardHeader>
              <CardTitle>浪费最多的物品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.wasteAnalysis.topWastedItems
                  .slice(0, 5)
                  .map((item, index) => (
                    <div
                      key={item.foodName}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="font-medium">{item.foodName}</div>
                          <div className="text-sm text-gray-500">
                            浪费 {item.wasteCount} 次 • 价值 ¥
                            {item.totalWasteValue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">
                          浪费率 {item.wasteRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>优化建议</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">
                            {recommendation.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {recommendation.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          priorityColors[
                            recommendation.priority as keyof typeof priorityColors
                          ]
                        }
                      >
                        {
                          priorityLabels[
                            recommendation.priority as keyof typeof priorityLabels
                          ]
                        }
                        优先级
                      </Badge>
                    </div>

                    {recommendation.potentialSavings && (
                      <div className="text-sm text-green-600 mt-2">
                        💰 预计节省：¥
                        {recommendation.potentialSavings.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {analysis.recommendations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>库存管理表现良好，暂无特别建议</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
