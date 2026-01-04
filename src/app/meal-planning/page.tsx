'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MealCalendarView } from '@/components/meal-planning/MealCalendarView';
import { MealListView } from '@/components/meal-planning/MealListView';
import { NutritionSummary } from '@/components/meal-planning/NutritionSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  List,
  Clock,
  Utensils,
  TrendingUp,
  Heart,
  AlertTriangle,
  Plus,
  Settings,
  Download,
} from 'lucide-react';
import { toast } from '@/lib/toast';

type ViewMode = 'day' | 'week' | 'month' | 'list';

interface MealPlanData {
  id: string;
  startDate: Date;
  endDate: Date;
  goalType: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: any[];
  nutritionSummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    averageDailyCalories: number;
    goalAchievementRate: number;
  };
}

export default function MealPlanningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plan');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchMealPlan();
    }
  }, [session, currentDate, viewMode]);

  const fetchMealPlan = async () => {
    try {
      setLoading(true);
      const startDate =
        viewMode === 'day'
          ? currentDate
          : viewMode === 'week'
            ? startOfWeek(currentDate, { weekStartsOn: 1 })
            : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      const endDate =
        viewMode === 'day'
          ? currentDate
          : viewMode === 'week'
            ? addDays(startDate, 6)
            : new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0,
              );

      const response = await fetch(
        `/api/meal-plans?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('获取食谱计划失败');
      }

      const data = await response.json();
      setMealPlan(data);
    } catch (error) {
      console.error('获取食谱计划失败:', error);
      toast.error('获取食谱计划失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateDate = (direction: 'prev' | 'next') => {
    const newDate =
      direction === 'prev'
        ? viewMode === 'week'
          ? subWeeks(currentDate, 1)
          : viewMode === 'month'
            ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
            : addDays(currentDate, -1)
        : viewMode === 'week'
          ? addWeeks(currentDate, 1)
          : viewMode === 'month'
            ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            : addDays(currentDate, 1);

    setCurrentDate(newDate);
  };

  const handleGenerateNewPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: currentDate.toISOString(),
          days: viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30,
        }),
      });

      if (!response.ok) {
        throw new Error('生成食谱计划失败');
      }

      const data = await response.json();
      setMealPlan(data);
      toast.success('食谱计划生成成功！');
    } catch (error) {
      console.error('生成食谱计划失败:', error);
      toast.error('生成食谱计划失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPlan = () => {
    if (!mealPlan) return;

    // 导出功能实现
    const exportData = {
      plan: mealPlan,
      exportDate: new Date().toISOString(),
      viewMode,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-plan-${format(currentDate, 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('食谱计划已导出');
  };

  if (status === 'loading' || loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>加载食谱计划中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* 页面头部 */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center gap-3'>
              <Utensils className='h-8 w-8 text-blue-600' />
              <div>
                <h1 className='text-xl font-bold text-gray-900'>食谱规划</h1>
                <p className='text-sm text-gray-500'>个性化健康食谱管理</p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleExportPlan}
                disabled={!mealPlan}
              >
                <Download className='h-4 w-4 mr-2' />
                导出
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => router.push('/meal-planning/settings')}
              >
                <Settings className='h-4 w-4 mr-2' />
                设置
              </Button>
              <Button onClick={handleGenerateNewPlan} disabled={loading}>
                <Plus className='h-4 w-4 mr-2' />
                生成新计划
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='space-y-6'
        >
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='plan' className='flex items-center gap-2'>
              <Calendar className='h-4 w-4' />
              食谱计划
            </TabsTrigger>
            <TabsTrigger value='nutrition' className='flex items-center gap-2'>
              <TrendingUp className='h-4 w-4' />
              营养分析
            </TabsTrigger>
            <TabsTrigger value='favorites' className='flex items-center gap-2'>
              <Heart className='h-4 w-4' />
              收藏管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value='plan' className='space-y-6'>
            {/* 视图模式切换和日期导航 */}
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleNavigateDate('prev')}
                    >
                      ←
                    </Button>
                    <div className='text-center min-w-48'>
                      <h2 className='text-lg font-semibold'>
                        {viewMode === 'day' &&
                          format(currentDate, 'yyyy年M月d日', { locale: zhCN })}
                        {viewMode === 'week' &&
                          `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy年M月d日', { locale: zhCN })} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'M月d日', { locale: zhCN })}`}
                        {viewMode === 'month' &&
                          format(currentDate, 'yyyy年M月', { locale: zhCN })}
                      </h2>
                      <p className='text-sm text-gray-500'>
                        {viewMode === 'day' && '日视图'}
                        {viewMode === 'week' && '周视图'}
                        {viewMode === 'month' && '月视图'}
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleNavigateDate('next')}
                    >
                      →
                    </Button>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Button
                      variant={viewMode === 'day' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setViewMode('day')}
                    >
                      <Clock className='h-4 w-4 mr-2' />日
                    </Button>
                    <Button
                      variant={viewMode === 'week' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setViewMode('week')}
                    >
                      <Calendar className='h-4 w-4 mr-2' />周
                    </Button>
                    <Button
                      variant={viewMode === 'month' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setViewMode('month')}
                    >
                      <Calendar className='h-4 w-4 mr-2' />月
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setViewMode('list')}
                    >
                      <List className='h-4 w-4 mr-2' />
                      列表
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {mealPlan ? (
                  <>
                    {viewMode === 'list' ? (
                      <MealListView meals={mealPlan.meals} />
                    ) : (
                      <MealCalendarView
                        meals={mealPlan.meals}
                        viewMode={viewMode}
                        currentDate={currentDate}
                        onMealUpdate={fetchMealPlan}
                      />
                    )}
                  </>
                ) : (
                  <div className='text-center py-12'>
                    <Utensils className='h-16 w-16 text-gray-300 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      暂无食谱计划
                    </h3>
                    <p className='text-gray-500 mb-6'>
                      点击&quot;生成新计划&quot;开始您的个性化食谱规划
                    </p>
                    <Button onClick={handleGenerateNewPlan}>
                      <Plus className='h-4 w-4 mr-2' />
                      生成新计划
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='nutrition' className='space-y-6'>
            {mealPlan ? (
              <NutritionSummary planId={mealPlan.id} />
            ) : (
              <Card>
                <CardContent className='text-center py-12'>
                  <TrendingUp className='h-16 w-16 text-gray-300 mx-auto mb-4' />
                  <h3 className='text-lg font-medium text-gray-900 mb-2'>
                    暂无营养数据
                  </h3>
                  <p className='text-gray-500'>请先生成食谱计划</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value='favorites' className='space-y-6'>
            <Card>
              <CardContent className='text-center py-12'>
                <Heart className='h-16 w-16 text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  收藏功能开发中
                </h3>
                <p className='text-gray-500'>敬请期待更多功能</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
