"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  CalendarIcon,
  TargetIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  BudgetStatus as BudgetStatusType,
  FoodCategory,
  BudgetPeriod,
} from "@prisma/client";

interface BudgetStatus {
  budget: any;
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  categoryUsage: {
    [key in FoodCategory]?: {
      budget: number;
      used: number;
      remaining: number;
      percentage: number;
    };
  };
  dailyAverage: number;
  daysRemaining: number;
  projectedSpend: number;
  alerts: string[];
}

interface BudgetDashboardProps {
  memberId: string;
  budgetId?: string;
}

const categoryIcons = {
  [FoodCategory.VEGETABLES]: "🥬",
  [FoodCategory.FRUITS]: "🍎",
  [FoodCategory.GRAINS]: "🌾",
  [FoodCategory.PROTEIN]: "🥩",
  [FoodCategory.SEAFOOD]: "🐟",
  [FoodCategory.DAIRY]: "🥛",
  [FoodCategory.OILS]: "🫒",
  [FoodCategory.SNACKS]: "🍿",
  [FoodCategory.BEVERAGES]: "🥤",
  [FoodCategory.OTHER]: "📦",
};

const categoryColors = {
  [FoodCategory.VEGETABLES]: "bg-green-500",
  [FoodCategory.FRUITS]: "bg-orange-500",
  [FoodCategory.GRAINS]: "bg-yellow-500",
  [FoodCategory.PROTEIN]: "bg-red-500",
  [FoodCategory.SEAFOOD]: "bg-blue-500",
  [FoodCategory.DAIRY]: "bg-indigo-500",
  [FoodCategory.OILS]: "bg-purple-500",
  [FoodCategory.SNACKS]: "bg-pink-500",
  [FoodCategory.BEVERAGES]: "bg-cyan-500",
  [FoodCategory.OTHER]: "bg-gray-500",
};

const periodLabels = {
  [BudgetPeriod.WEEKLY]: "周预算",
  [BudgetPeriod.MONTHLY]: "月预算",
  [BudgetPeriod.QUARTERLY]: "季度预算",
  [BudgetPeriod.YEARLY]: "年预算",
  [BudgetPeriod.CUSTOM]: "自定义预算",
};

export function BudgetDashboard({ memberId, budgetId }: BudgetDashboardProps) {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBudgetStatus = async () => {
    try {
      const url = budgetId
        ? `/api/budget/current?budgetId=${budgetId}`
        : `/api/budget/current?memberId=${memberId}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("获取预算状态失败");
      }

      const data = await response.json();
      setBudgetStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取预算状态失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBudgetStatus();
  }, [memberId, budgetId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBudgetStatus();
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return "text-red-600";
    if (percentage >= 80) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getAlertVariant = (alerts: string[]) => {
    if (alerts.some((alert) => alert.includes("严重超支")))
      return "destructive";
    if (
      alerts.some((alert) => alert.includes("已用完") || alert.includes("超支"))
    )
      return "destructive";
    if (alerts.some((alert) => alert.includes("即将用完"))) return "default";
    return "default";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !budgetStatus) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertDescription>{error || "没有找到活跃的预算"}</AlertDescription>
      </Alert>
    );
  }

  const {
    budget,
    usedAmount,
    remainingAmount,
    usagePercentage,
    categoryUsage,
    dailyAverage,
    daysRemaining,
    projectedSpend,
    alerts,
  } = budgetStatus;

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{budget.name}</h2>
          <p className="text-muted-foreground">
            {periodLabels[budget.period as BudgetPeriod]} ·{" "}
            {format(new Date(budget.startDate), "yyyy-MM-dd")} 至{" "}
            {format(new Date(budget.endDate), "yyyy-MM-dd")}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "刷新中..." : "刷新"}
        </Button>
      </div>

      {/* 预警信息 */}
      {alerts.length > 0 && (
        <Alert variant={getAlertVariant(alerts)}>
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {alerts.map((alert, index) => (
                <div key={index}>{alert}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总预算</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{budget.totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">预算周期内可用总额</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已使用</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getUsageColor(usagePercentage)}`}
            >
              ¥{usedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              使用率 {usagePercentage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">剩余预算</CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${remainingAmount > 0 ? "text-green-600" : "text-red-600"}`}
            >
              ¥{remainingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              还剩 {daysRemaining} 天
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">日均支出</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{dailyAverage.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              预计总支出 ¥{projectedSpend.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息标签页 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="categories">分类详情</TabsTrigger>
          <TabsTrigger value="trends">趋势分析</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>预算使用进度</CardTitle>
              <CardDescription>当前预算使用情况概览</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>总体进度</span>
                  <span className={getUsageColor(usagePercentage)}>
                    {usagePercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(usagePercentage, 100)}
                  className="h-2"
                />
                {usagePercentage > 100 && (
                  <p className="text-xs text-red-600">
                    预算已超支 {(usagePercentage - 100).toFixed(1)}%
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {((remainingAmount / budget.totalAmount) * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">预算剩余比例</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div
                    className={`text-2xl font-bold ${projectedSpend > budget.totalAmount ? "text-red-600" : "text-green-600"}`}
                  >
                    {projectedSpend > budget.totalAmount ? "+" : ""}
                    {(
                      ((projectedSpend - budget.totalAmount) /
                        budget.totalAmount) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <p className="text-sm text-muted-foreground">预计超支/节省</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>分类预算详情</CardTitle>
              <CardDescription>各食材类别的预算使用情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categoryUsage).map(([category, usage]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {categoryIcons[category as FoodCategory]}
                        </span>
                        <span className="font-medium">{category}</span>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-medium ${getUsageColor(usage.percentage)}`}
                        >
                          ¥{usage.used.toFixed(2)} / ¥{usage.budget.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {usage.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(usage.percentage, 100)}
                      className="h-2"
                    />
                    {usage.percentage > 100 && (
                      <p className="text-xs text-red-600">
                        超支 ¥{(usage.used - usage.budget).toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}

                {Object.keys(categoryUsage).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无分类预算设定
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>支出趋势分析</CardTitle>
              <CardDescription>基于当前支出速度的预测分析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <CalendarIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-bold">{daysRemaining}</div>
                  <p className="text-sm text-muted-foreground">剩余天数</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingDownIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-bold">
                    ¥{dailyAverage.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">日均支出</p>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <TrendingUpIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div
                    className={`text-lg font-bold ${projectedSpend > budget.totalAmount ? "text-red-600" : "text-green-600"}`}
                  >
                    ¥{projectedSpend.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">预计总支出</p>
                </div>
              </div>

              {projectedSpend > budget.totalAmount && (
                <Alert>
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertDescription>
                    按当前支出速度，预计将超支 ¥
                    {(projectedSpend - budget.totalAmount).toFixed(2)}。
                    建议控制日均支出在 ¥
                    {(
                      budget.totalAmount /
                      (daysRemaining +
                        Math.ceil(
                          (new Date().getTime() -
                            new Date(budget.startDate).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ))
                    ).toFixed(2)}{" "}
                    以内。
                  </AlertDescription>
                </Alert>
              )}

              {projectedSpend < budget.totalAmount && (
                <Alert>
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertDescription>
                    按当前支出速度，预计将节省 ¥
                    {(budget.totalAmount - projectedSpend).toFixed(2)}。
                    可以考虑增加营养品质或尝试新的食材。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
