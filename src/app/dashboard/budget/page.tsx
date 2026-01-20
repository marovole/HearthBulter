"use client";

import { useEffect, useState } from "react";
import { PlusIcon, SettingsIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetDashboard, BudgetSetting, BudgetStatusIndicator } from "@/components/budget";
import type { FoodCategory } from "@/lib/repositories/types/budget";

// 模拟用户ID，实际应用中从认证系统获取
const MOCK_MEMBER_ID = "user-member-id";

type AnalysisPeriod = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

type SpendingAnalysis = {
  memberId: string;
  period: {
    start: string;
    end: string;
    type: AnalysisPeriod;
  };
  totalSpending: number;
  categorySpending: Array<{
    category: FoodCategory;
    amount: number;
    percentage: number;
    trend: "UP" | "DOWN" | "STABLE";
  }>;
  dailyAverage: number;
  comparisonWithPrevious: Array<{
    period: string;
    spending: number;
    change: number;
    changePercentage: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    category: FoodCategory;
    date: string;
  }>;
  budgetUtilization: Array<{
    budgetId: string;
    budgetName: string;
    totalBudget: number;
    used: number;
    remaining: number;
    utilizationRate: number;
    status: "HEALTHY" | "WARNING" | "OVER_BUDGET";
  }>;
  recommendations: string[];
};

type SpendingHistory = {
  spendings: Array<{
    id: string;
    amount: number;
    category: FoodCategory;
    description?: string;
    purchaseDate: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    totalAmount: number;
    totalTransactions: number;
    averageAmount: number;
    categoryBreakdown: Array<{
      count: number;
      amount: number;
      category: FoodCategory;
    }>;
  };
};

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  VEGETABLES: "蔬菜",
  FRUITS: "水果",
  GRAINS: "谷物",
  PROTEIN: "蛋白质",
  SEAFOOD: "海鲜",
  DAIRY: "乳制品",
  OILS: "油脂",
  SNACKS: "零食",
  BEVERAGES: "饮品",
  OTHER: "其他",
};

const ANALYSIS_PERIOD_LABELS: Record<AnalysisPeriod, string> = {
  WEEKLY: "近7天",
  MONTHLY: "近30天",
  QUARTERLY: "近90天",
  YEARLY: "近一年",
};

export default function BudgetManagementPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>("MONTHLY");
  const [analysisData, setAnalysisData] = useState<SpendingAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyData, setHistoryData] = useState<SpendingHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const handleBudgetCreated = (budget: { id: string }) => {
    setShowCreateDialog(false);
    setSelectedBudgetId(budget.id);
    setRefreshKey((prev) => prev + 1);
  };

  const handleBudgetSelect = (budgetStatus: { budget: { id: string } }) => {
    setSelectedBudgetId(budgetStatus.budget.id);
  };

  const fetchAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      const response = await fetch(
        `/api/budget/analyze?memberId=${MOCK_MEMBER_ID}&period=${analysisPeriod}`
      );
      if (!response.ok) {
        throw new Error("获取支出分析失败");
      }
      const data = (await response.json()) as SpendingAnalysis;
      setAnalysisData(data);
      setAnalysisError(null);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "获取支出分析失败");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!selectedBudgetId) {
      setHistoryData(null);
      return;
    }

    try {
      setHistoryLoading(true);
      const response = await fetch(
        `/api/budget/spending-history?budgetId=${selectedBudgetId}&page=${historyPage}&limit=10`
      );
      if (!response.ok) {
        throw new Error("获取历史记录失败");
      }
      const data = (await response.json()) as SpendingHistory;
      setHistoryData(data);
      setHistoryError(null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "获取历史记录失败");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [analysisPeriod, refreshKey]);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedBudgetId]);

  useEffect(() => {
    fetchHistory();
  }, [selectedBudgetId, historyPage, refreshKey]);

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">预算管理</h1>
          <p className="text-muted-foreground">设定和追踪您的饮食预算，优化支出结构</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              创建预算
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建新预算</DialogTitle>
              <DialogDescription>设定您的饮食预算计划，包括总预算和分类预算</DialogDescription>
            </DialogHeader>
            <BudgetSetting
              memberId={MOCK_MEMBER_ID}
              onSuccess={handleBudgetCreated}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 预算状态概览 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BudgetStatusIndicator
            key={refreshKey}
            memberId={MOCK_MEMBER_ID}
            budgetId={selectedBudgetId || undefined}
            showDetails={true}
            onBudgetClick={handleBudgetSelect}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowCreateDialog(true)}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                创建新预算
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setRefreshKey((prev) => prev + 1)}
              >
                <TrendingUpIcon className="mr-2 h-4 w-4" />
                刷新数据
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>预算提示</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>• 设定合理的预算有助于控制饮食支出</p>
                <p>• 分类预算可以帮助优化食材采购结构</p>
                <p>• 及时关注预算预警，避免超支</p>
                <p>• 定期分析支出趋势，调整预算策略</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 详细信息标签页 */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">预算仪表盘</TabsTrigger>
          <TabsTrigger value="analysis">支出分析</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <BudgetDashboard
            key={refreshKey}
            memberId={MOCK_MEMBER_ID}
            budgetId={selectedBudgetId || undefined}
          />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>支出分析</CardTitle>
              <CardDescription>基于预算与支出数据的趋势分析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">分析周期</span>
                <select
                  value={analysisPeriod}
                  onChange={(event) => setAnalysisPeriod(event.target.value as AnalysisPeriod)}
                  className="rounded-md border border-gray-200 px-3 py-1 text-sm"
                >
                  {Object.entries(ANALYSIS_PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAnalysis}
                  disabled={analysisLoading}
                >
                  刷新分析
                </Button>
              </div>

              {analysisLoading && (
                <div className="py-10 text-center text-muted-foreground">
                  <TrendingUpIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>正在生成分析...</p>
                </div>
              )}

              {!analysisLoading && analysisError && (
                <Alert className="border-destructive/50 text-destructive">
                  <AlertDescription>{analysisError}</AlertDescription>
                </Alert>
              )}

              {!analysisLoading && !analysisError && analysisData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">总支出</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ¥{analysisData.totalSpending.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          日均支出 ¥{analysisData.dailyAverage.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">主要支出趋势</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysisData.comparisonWithPrevious.length > 0 ? (
                          <div className="space-y-2">
                            {analysisData.comparisonWithPrevious.map((comparison) => (
                              <div
                                key={comparison.period}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">{comparison.period}</span>
                                <span className="font-medium">
                                  ¥{comparison.spending.toFixed(2)}
                                </span>
                                <span
                                  className={`flex items-center gap-1 ${
                                    comparison.change >= 0 ? "text-red-600" : "text-green-600"
                                  }`}
                                >
                                  {comparison.change >= 0 ? (
                                    <TrendingUpIcon className="h-4 w-4" />
                                  ) : (
                                    <TrendingDownIcon className="h-4 w-4" />
                                  )}
                                  {comparison.changePercentage.toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">暂无对比数据</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">预算利用率</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analysisData.budgetUtilization.length > 0 ? (
                          analysisData.budgetUtilization.map((budget) => (
                            <div key={budget.budgetId} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{budget.budgetName}</span>
                                <Badge
                                  variant={
                                    budget.status === "OVER_BUDGET"
                                      ? "destructive"
                                      : budget.status === "WARNING"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {budget.utilizationRate.toFixed(1)}%
                                </Badge>
                              </div>
                              <Progress
                                value={Math.min(budget.utilizationRate, 100)}
                                className="h-2"
                              />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">暂无预算数据</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>分类支出占比</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysisData.categorySpending.length > 0 ? (
                        analysisData.categorySpending.map((category) => (
                          <div key={category.category} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{CATEGORY_LABELS[category.category]}</span>
                              <span className="text-muted-foreground">
                                ¥{category.amount.toFixed(2)} ·{category.percentage.toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={category.percentage} className="h-2" />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无分类支出数据</p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>高支出项目</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysisData.topExpenses.length > 0 ? (
                          analysisData.topExpenses.slice(0, 5).map((expense, index) => (
                            <div
                              key={`${expense.description}-${index}`}
                              className="flex items-center justify-between text-sm"
                            >
                              <div>
                                <div className="font-medium">
                                  {expense.description || "未命名支出"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {CATEGORY_LABELS[expense.category]} ·
                                  {new Date(expense.date).toLocaleDateString("zh-CN")}
                                </div>
                              </div>
                              <span className="font-medium">¥{expense.amount.toFixed(2)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">暂无高支出记录</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>优化建议</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analysisData.recommendations.length > 0 ? (
                          analysisData.recommendations.map((tip, index) => (
                            <div key={`${tip}-${index}`} className="text-sm">
                              • {tip}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">暂无建议，预算表现良好</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {!analysisLoading && !analysisError && !analysisData && (
                <div className="py-10 text-center text-muted-foreground">
                  <TrendingUpIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>暂无支出分析数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
              <CardDescription>查看预算支出明细与统计汇总</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedBudgetId && (
                <Alert className="border-destructive/50 text-destructive">
                  <AlertDescription>请选择预算以查看历史记录</AlertDescription>
                </Alert>
              )}

              {selectedBudgetId && historyLoading && (
                <div className="py-10 text-center text-muted-foreground">
                  <SettingsIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>加载历史记录中...</p>
                </div>
              )}

              {selectedBudgetId && !historyLoading && historyError && (
                <Alert className="border-destructive/50 text-destructive">
                  <AlertDescription>{historyError}</AlertDescription>
                </Alert>
              )}

              {selectedBudgetId && !historyLoading && !historyError && historyData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">总支出</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ¥{historyData.statistics.totalAmount.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {historyData.statistics.totalTransactions} 笔记录
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">平均单笔</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ¥{historyData.statistics.averageAmount.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">当前预算周期</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">分类数量</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {historyData.statistics.categoryBreakdown.length}
                        </div>
                        <p className="text-xs text-muted-foreground">覆盖分类数</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>分类支出统计</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {historyData.statistics.categoryBreakdown.length > 0 ? (
                        historyData.statistics.categoryBreakdown.map((item) => (
                          <div key={item.category} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{CATEGORY_LABELS[item.category]}</span>
                              <span className="text-muted-foreground">
                                ¥{item.amount.toFixed(2)} · {item.count} 笔
                              </span>
                            </div>
                            <Progress
                              value={
                                historyData.statistics.totalAmount > 0
                                  ? (item.amount / historyData.statistics.totalAmount) * 100
                                  : 0
                              }
                              className="h-2"
                            />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无分类统计</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>支出明细</CardTitle>
                        <CardDescription>
                          第 {historyData.pagination.page} / {historyData.pagination.totalPages} 页
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={historyData.pagination.page <= 1}
                          onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                        >
                          上一页
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            historyData.pagination.page >= historyData.pagination.totalPages
                          }
                          onClick={() => setHistoryPage((prev) => prev + 1)}
                        >
                          下一页
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {historyData.spendings.length > 0 ? (
                        historyData.spendings.map((spending) => (
                          <div
                            key={spending.id}
                            className="flex items-center justify-between border-b border-dashed pb-3 text-sm"
                          >
                            <div>
                              <div className="font-medium">
                                {spending.description || "未命名支出"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {CATEGORY_LABELS[spending.category]} ·{" "}
                                {new Date(spending.purchaseDate).toLocaleDateString("zh-CN")}
                              </div>
                            </div>
                            <span className="font-medium">¥{spending.amount.toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-muted-foreground">暂无支出记录</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedBudgetId && !historyLoading && !historyError && !historyData && (
                <div className="py-10 text-center text-muted-foreground">
                  <SettingsIcon className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p>暂无历史记录</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 使用示例说明 */}
      <Card>
        <CardHeader>
          <CardTitle>功能说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-medium">预算设定功能</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• 支持周、月、季度、年等多种预算周期</li>
                <li>• 可设定总预算和分类预算（蔬菜、肉类、水果等）</li>
                <li>• 智能验证预算合理性，防止超支</li>
                <li>• 支持预算预警设置（80%、100%、110%）</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-medium">支出追踪功能</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• 实时显示预算使用情况和剩余金额</li>
                <li>• 分类支出追踪，了解各类别消费情况</li>
                <li>• 智能预警提醒，防止预算超支</li>
                <li>• 支出趋势分析，预测未来消费</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
