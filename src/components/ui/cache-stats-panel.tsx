'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import {
  cacheStatsService,
  getCacheMetrics,
  getCacheHitRate,
  type CacheMetrics,
  type TimeWindowStats,
  type CacheTypeStats,
  type CacheKeyStats,
} from '@/lib/services/cache-stats-service';
import { cn } from '@/lib/utils';

interface CacheStatsPanelProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // 毫秒
  className?: string;
}

export function CacheStatsPanel({
  autoRefresh = true,
  refreshInterval = 30000, // 30秒
  className,
}: CacheStatsPanelProps) {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [timeWindows, setTimeWindows] = useState<TimeWindowStats[]>([]);
  const [cacheTypes, setCacheTypes] = useState<CacheTypeStats[]>([]);
  const [hotKeys, setHotKeys] = useState<CacheKeyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadStats();

    if (autoRefresh) {
      const interval = setInterval(loadStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      const metricsData = getCacheMetrics();
      const timeWindowsData = cacheStatsService.getAllTimeWindows();
      const cacheTypesData = cacheStatsService.getCacheTypeStats();
      const hotKeysData = cacheStatsService.getHotKeys(10);

      setMetrics(metricsData);
      setTimeWindows(timeWindowsData);
      setCacheTypes(cacheTypesData);
      setHotKeys(hotKeysData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  const getHitRateColor = (hitRate: number): string => {
    if (hitRate >= 80) return 'text-green-600';
    if (hitRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHitRateBadgeVariant = (hitRate: number) => {
    if (hitRate >= 80) return 'default';
    if (hitRate >= 60) return 'secondary';
    return 'destructive';
  };

  if (isLoading && !metrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>加载缓存统计中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">无法加载缓存统计数据</p>
        </CardContent>
      </Card>
    );
  }

  const hitRateData = timeWindows.map(window => ({
    time: window.window,
    hitRate: window.hitRate,
    hits: window.hits,
    misses: window.misses,
  }));

  const cacheTypeData = cacheTypes.map(type => ({
    name: type.cacheType === 'redis' ? 'Redis' : type.cacheType === 'memory' ? '内存' : '未命中',
    value: type.hits + type.misses + type.sets + type.deletes,
    hitRate: type.hitRate,
    color: type.cacheType === 'redis' ? '#8884d8' : type.cacheType === 'memory' ? '#82ca9d' : '#ffc658',
  }));

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                缓存性能监控
              </CardTitle>
              <CardDescription>
                实时监控缓存命中率和性能指标
                {lastUpdate && (
                  <span className="ml-2 text-xs">
                    • 最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              刷新
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 命中率 */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold mb-1">
                {metrics.hitRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">命中率</div>
              <Progress value={metrics.hitRate} className="mt-2" />
            </div>

            {/* 总请求数 */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold mb-1">
                {metrics.totalRequests.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">总请求数</div>
            </div>

            {/* 平均响应时间 */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold mb-1">
                {metrics.averageResponseTime}ms
              </div>
              <div className="text-sm text-muted-foreground">平均响应时间</div>
            </div>

            {/* 内存使用 */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-2xl font-bold mb-1">
                {formatBytes(metrics.memoryUsage)}
              </div>
              <div className="text-sm text-muted-foreground">内存使用</div>
            </div>
          </div>

          {/* 性能评估 */}
          <div className="mt-6">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">性能评估</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Alert className={cn(
                'border-2',
                metrics.hitRate >= 80 ? 'border-green-200 bg-green-50' :
                  metrics.hitRate >= 60 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'
              )}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>缓存效率:</strong>{' '}
                  {metrics.hitRate >= 80 ? '优秀' :
                    metrics.hitRate >= 60 ? '良好' : '需要优化'}
                </AlertDescription>
              </Alert>

              <Alert className={cn(
                'border-2',
                metrics.averageResponseTime <= 50 ? 'border-green-200 bg-green-50' :
                  metrics.averageResponseTime <= 200 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'
              )}>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>响应速度:</strong>{' '}
                  {metrics.averageResponseTime <= 50 ? '快速' :
                    metrics.averageResponseTime <= 200 ? '正常' : '较慢'}
                </AlertDescription>
              </Alert>

              <Alert className="border-2 border-blue-200 bg-blue-50">
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  <strong>服务状态:</strong> 运行 {formatUptime(metrics.uptime)}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细统计 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="performance">性能</TabsTrigger>
          <TabsTrigger value="keys">热点键</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 时间窗口命中率趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">命中率趋势</CardTitle>
                <CardDescription>不同时间窗口的缓存命中率</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={hitRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '命中率']} />
                    <Line
                      type="monotone"
                      dataKey="hitRate"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 缓存类型分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">缓存类型分布</CardTitle>
                <CardDescription>不同缓存类型的请求分布</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={cacheTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {cacheTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 基础统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基础统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{metrics.hits.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">命中次数</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{metrics.misses.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">未命中次数</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{metrics.sets.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">设置次数</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{metrics.itemCount.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">缓存项数量</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 响应时间分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">响应时间统计</CardTitle>
                <CardDescription>缓存操作的响应时间分布</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">平均响应时间</span>
                  <Badge variant="outline">{metrics.averageResponseTime}ms</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">95%响应时间</span>
                  <Badge variant="outline">{metrics.p95ResponseTime}ms</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">99%响应时间</span>
                  <Badge variant="outline">{metrics.p99ResponseTime}ms</Badge>
                </div>
              </CardContent>
            </Card>

            {/* 缓存类型性能对比 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">缓存类型性能</CardTitle>
                <CardDescription>不同缓存类型的性能对比</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cacheTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cacheType" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="averageResponseTime" fill="#8884d8" name="平均响应时间(ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">热点缓存键</CardTitle>
              <CardDescription>访问频率最高的缓存键</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {hotKeys.map((key, index) => (
                    <div key={key.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">
                            {key.key}
                          </code>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>命中: {key.hits}</span>
                          <span>未命中: {key.misses}</span>
                          <span>频率: {key.accessFrequency.toFixed(2)}/分钟</span>
                          <span>大小: {formatBytes(key.size)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getHitRateBadgeVariant((key.hits / (key.hits + key.misses)) * 100)}>
                          {((key.hits / (key.hits + key.misses)) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {hotKeys.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无缓存键统计数据
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 简化的缓存状态指示器
interface CacheStatusIndicatorProps {
  className?: string;
}

export function CacheStatusIndicator({ className }: CacheStatusIndicatorProps) {
  const [hitRate, setHitRate] = useState(0);

  useEffect(() => {
    const updateHitRate = () => {
      const rate = getCacheHitRate();
      setHitRate(rate);
    };

    updateHitRate();
    const interval = setInterval(updateHitRate, 10000); // 每10秒更新

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Database className="w-4 h-4" />
      <span className="text-sm">缓存命中率</span>
      <Badge className={cn(
        getHitRateColor(hitRate).replace('text-', 'bg-').replace('-600', '-100'),
        getHitRateColor(hitRate)
      )}>
        {hitRate.toFixed(1)}%
      </Badge>
    </div>
  );

  function getHitRateColor(rate: number): string {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
}
