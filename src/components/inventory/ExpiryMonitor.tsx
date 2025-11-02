'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  TrendingDown,
  Trash2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ExpiryAlert {
  id: string
  itemId: string
  foodName: string
  expiryDate: string
  daysToExpiry: number
  status: string
  quantity: number
  unit: string
  storageLocation: string
}

interface ExpirySummary {
  memberId: string
  expiredItems: ExpiryAlert[]
  expiringItems: ExpiryAlert[]
  totalExpiredValue: number
  totalExpiringValue: number
  recommendations: string[]
}

interface ExpiryMonitorProps {
  memberId: string
  onRefresh?: () => void
}

export function ExpiryMonitor({ memberId, onRefresh }: ExpiryMonitorProps) {
  const [summary, setSummary] = useState<ExpirySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchExpiryAlerts();
  }, [memberId]);

  const fetchExpiryAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/expiry?memberId=${memberId}`);
      const result = await response.json();

      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('获取保质期提醒失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchExpiryAlerts();
    onRefresh?.();
  };

  const handleProcessExpired = async (itemIds: string[]) => {
    if (!confirm(`确定要处理这 ${itemIds.length} 件过期物品吗？这将在库存中移除它们并创建浪费记录。`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/inventory/expiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          itemIds,
          wasteReason: 'EXPIRED',
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchExpiryAlerts();
        onRefresh?.();
      } else {
        alert(result.error || '处理失败');
      }
    } catch (error) {
      console.error('处理过期物品失败:', error);
      alert('处理失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const getExpiryProgress = (daysToExpiry: number) => {
    if (daysToExpiry < 0) return 100;
    if (daysToExpiry > 30) return 0;
    return Math.max(0, Math.min(100, ((30 - daysToExpiry) / 30) * 100));
  };

  const getExpiryColor = (daysToExpiry: number) => {
    if (daysToExpiry < 0) return 'text-red-600';
    if (daysToExpiry <= 3) return 'text-red-500';
    if (daysToExpiry <= 7) return 'text-yellow-600';
    if (daysToExpiry <= 14) return 'text-orange-500';
    return 'text-green-600';
  };

  const getStorageLocationLabel = (location: string) => {
    const labels: { [key: string]: string } = {
      REFRIGERATOR: '冷藏',
      FREEZER: '冷冻',
      PANTRY: '常温',
      COUNTER: '台面',
      CABINET: '橱柜',
      OTHER: '其他',
    };
    return labels[location] || location;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>无法获取保质期信息</p>
      </div>
    );
  }

  const hasAlerts = summary.expiredItems.length > 0 || summary.expiringItems.length > 0;

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={summary.expiredItems.length > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">已过期</p>
                <p className="text-2xl font-bold text-red-600">{summary.expiredItems.length}</p>
                <p className="text-xs text-gray-500">
                  损失 ¥{summary.totalExpiredValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.expiringItems.length > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">即将过期</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.expiringItems.length}</p>
                <p className="text-xs text-gray-500">
                  价值 ¥{summary.totalExpiringValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">状态良好</p>
                <p className="text-2xl font-bold text-green-600">
                  {hasAlerts ? '需关注' : '正常'}
                </p>
                <p className="text-xs text-gray-500">
                  {hasAlerts ? '请及时处理' : '无过期风险'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 建议和操作 */}
      {summary.recommendations.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {summary.recommendations.map((recommendation, index) => (
                <div key={index}>• {recommendation}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">保质期详情</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={processing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 详细列表 */}
      <Tabs defaultValue="expired" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expired" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>已过期 ({summary.expiredItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>即将过期 ({summary.expiringItems.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expired" className="space-y-4">
          {summary.expiredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>太好了！没有过期物品</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  以下 {summary.expiredItems.length} 件物品已过期，建议立即处理
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleProcessExpired(summary.expiredItems.map(item => item.itemId))}
                  disabled={processing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  批量处理
                </Button>
              </div>

              {summary.expiredItems.map((item) => (
                <Card key={item.id} className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium">{item.foodName}</h4>
                          <Badge variant="destructive">已过期</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">数量：</span>
                            {item.quantity} {item.unit}
                          </div>
                          <div>
                            <span className="font-medium">过期时间：</span>
                            {format(new Date(item.expiryDate), 'yyyy-MM-dd', { locale: zhCN })}
                          </div>
                          <div>
                            <span className="font-medium">存储位置：</span>
                            {getStorageLocationLabel(item.storageLocation)}
                          </div>
                          <div className="text-red-600">
                            <span className="font-medium">过期天数：</span>
                            {Math.abs(item.daysToExpiry)} 天
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleProcessExpired([item.itemId])}
                        disabled={processing}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          {summary.expiringItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>近期没有即将过期的物品</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                以下 {summary.expiringItems.length} 件物品即将过期，建议优先使用
              </p>

              {summary.expiringItems.map((item) => (
                <Card key={item.id} className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium">{item.foodName}</h4>
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            {item.daysToExpiry} 天后过期
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">数量：</span>
                            {item.quantity} {item.unit}
                          </div>
                          <div>
                            <span className="font-medium">过期时间：</span>
                            {format(new Date(item.expiryDate), 'yyyy-MM-dd', { locale: zhCN })}
                          </div>
                          <div>
                            <span className="font-medium">存储位置：</span>
                            {getStorageLocationLabel(item.storageLocation)}
                          </div>
                          <div className={getExpiryColor(item.daysToExpiry)}>
                            <span className="font-medium">剩余：</span>
                            {item.daysToExpiry} 天
                          </div>
                        </div>

                        <div className="w-full">
                          <Progress 
                            value={getExpiryProgress(item.daysToExpiry)} 
                            className="h-2"
                          />
                        </div>
                      </div>

                      <div className="ml-4">
                        <Clock className={`h-5 w-5 ${getExpiryColor(item.daysToExpiry)}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
