'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusIcon, SettingsIcon, TrendingUpIcon } from 'lucide-react';
import { BudgetSetting, BudgetDashboard, BudgetStatusIndicator } from '@/components/budget';
import { BudgetStatus } from '@prisma/client';

// 模拟用户ID，实际应用中从认证系统获取
const MOCK_MEMBER_ID = 'user-member-id';

export default function BudgetManagementPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBudgetCreated = (budget: any) => {
    setShowCreateDialog(false);
    setSelectedBudgetId(budget.id);
    setRefreshKey(prev => prev + 1); // 触发刷新
  };

  const handleBudgetSelect = (budgetStatus: any) => {
    setSelectedBudgetId(budgetStatus.budget.id);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">预算管理</h1>
          <p className="text-muted-foreground">
            设定和追踪您的饮食预算，优化支出结构
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              创建预算
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建新预算</DialogTitle>
              <DialogDescription>
                设定您的饮食预算计划，包括总预算和分类预算
              </DialogDescription>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <PlusIcon className="h-4 w-4 mr-2" />
                创建新预算
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setRefreshKey(prev => prev + 1)}
              >
                <TrendingUpIcon className="h-4 w-4 mr-2" />
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

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>支出分析</CardTitle>
              <CardDescription>
                详细的支出分析和趋势图表
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUpIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>支出分析功能正在开发中...</p>
                <p className="text-sm">
                  即将推出：分类支出占比、趋势图表、消费建议等
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
              <CardDescription>
                查看历史预算和支出记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <SettingsIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>历史记录功能正在开发中...</p>
                <p className="text-sm">
                  即将推出：历史预算对比、支出记录导出等
                </p>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">预算设定功能</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 支持周、月、季度、年等多种预算周期</li>
                <li>• 可设定总预算和分类预算（蔬菜、肉类、水果等）</li>
                <li>• 智能验证预算合理性，防止超支</li>
                <li>• 支持预算预警设置（80%、100%、110%）</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">支出追踪功能</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
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
