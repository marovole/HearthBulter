'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { TaskCard } from '@/components/butler/TaskCard';
import { DailyReviewCard } from '@/components/butler/DailyReviewCard';
import { cn } from '@/lib/utils';

type TabValue = 'my-tasks' | 'family' | 'notifications';

interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  dueDate: string | null;
  assignee: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  metadata: any;
  actionUrl: string | null;
}

interface FocusTasks {
  priority: TaskDTO[];
  normal: TaskDTO[];
  overdue: TaskDTO[];
}

interface ButlerInboxProps {
  memberId: string;
  familyId: string;
}

export function ButlerInbox({ memberId, familyId }: ButlerInboxProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>('my-tasks');
  const [focusTasks, setFocusTasks] = useState<FocusTasks>({
    priority: [],
    normal: [],
    overdue: [],
  });
  const [dailyReview, setDailyReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [memberId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 并行加载今日焦点和每日复盘
      const [focusResponse, reviewResponse] = await Promise.all([
        fetch(`/api/families/${familyId}/tasks/focus?memberId=${memberId}`),
        fetch(
          `/api/families/${familyId}/daily-reviews/latest?memberId=${memberId}`,
        ),
      ]);

      if (focusResponse.ok) {
        const focusData = await focusResponse.json();
        setFocusTasks(focusData.data);
      }

      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        setDailyReview(reviewData.data);
      }
    } catch (error) {
      console.error('Error loading inbox data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletingTaskId(taskId);
      const response = await fetch(
        `/api/families/${familyId}/tasks/${taskId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );

      if (response.ok) {
        // 乐观更新：从列表中移除任务
        setFocusTasks((prev) => ({
          priority: prev.priority.filter((t) => t.id !== taskId),
          normal: prev.normal.filter((t) => t.id !== taskId),
          overdue: prev.overdue.filter((t) => t.id !== taskId),
        }));
      } else {
        console.error('Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleSkipTask = async (taskId: string, reason?: string) => {
    try {
      setSkippingTaskId(taskId);
      const response = await fetch(
        `/api/families/${familyId}/tasks/${taskId}/skip`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );

      if (response.ok) {
        // 乐观更新：从列表中移除任务
        setFocusTasks((prev) => ({
          priority: prev.priority.filter((t) => t.id !== taskId),
          normal: prev.normal.filter((t) => t.id !== taskId),
          overdue: prev.overdue.filter((t) => t.id !== taskId),
        }));
      } else {
        console.error('Failed to skip task');
      }
    } catch (error) {
      console.error('Error skipping task:', error);
    } finally {
      setSkippingTaskId(null);
    }
  };

  const allTasks = [
    ...focusTasks.priority,
    ...focusTasks.normal,
    ...focusTasks.overdue,
  ];
  const completedCount =
    allTasks.length === 0
      ? 0
      : Math.round(
          ((allTasks.length - focusTasks.overdue.length) / allTasks.length) *
            100,
        );

  if (loading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='h-8 bg-muted rounded w-48 animate-pulse' />
          <div className='h-10 bg-muted rounded w-32 animate-pulse' />
        </div>
        <Card className='animate-pulse'>
          <CardHeader>
            <div className='h-6 bg-muted rounded w-24' />
          </CardHeader>
          <CardContent className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-24 bg-muted rounded' />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 头部 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>管家收件箱</h1>
          <p className='text-muted-foreground mt-1'>
            今天已完成 {completedCount}% 的任务
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')}>返回仪表板</Button>
      </div>

      {/* 每日复盘卡片 */}
      {dailyReview && <DailyReviewCard review={dailyReview} />}

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Inbox className='h-5 w-5' />
            今日任务
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className='w-full'
          >
            <TabsList className='grid w-full max-w-md grid-cols-3'>
              <TabsTrigger value='my-tasks'>我的任务</TabsTrigger>
              <TabsTrigger value='family'>家庭汇总</TabsTrigger>
              <TabsTrigger value='notifications'>所有通知</TabsTrigger>
            </TabsList>

            <TabsContent value='my-tasks' className='space-y-4 mt-6'>
              {/* 高优先级任务 */}
              {focusTasks.priority.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
                    <TrendingUp className='h-4 w-4 text-amber-500' />
                    今日焦点
                  </div>
                  {focusTasks.priority.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => handleCompleteTask(task.id)}
                      onSkip={(reason) => handleSkipTask(task.id, reason)}
                      isCompleting={completingTaskId === task.id}
                      isSkipping={skippingTaskId === task.id}
                    />
                  ))}
                </div>
              )}

              {/* 普通任务 */}
              {focusTasks.normal.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
                    <Calendar className='h-4 w-4' />
                    待处理任务
                  </div>
                  {focusTasks.normal.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => handleCompleteTask(task.id)}
                      onSkip={(reason) => handleSkipTask(task.id, reason)}
                      isCompleting={completingTaskId === task.id}
                      isSkipping={skippingTaskId === task.id}
                    />
                  ))}
                </div>
              )}

              {/* 逾期任务 */}
              {focusTasks.overdue.length > 0 && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-red-500'>
                    <XCircle className='h-4 w-4' />
                    逾期任务 ({focusTasks.overdue.length})
                  </div>
                  {focusTasks.overdue.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => handleCompleteTask(task.id)}
                      onSkip={(reason) => handleSkipTask(task.id, reason)}
                      isCompleting={completingTaskId === task.id}
                      isSkipping={skippingTaskId === task.id}
                    />
                  ))}
                </div>
              )}

              {/* 空状态 */}
              {allTasks.length === 0 && (
                <div className='text-center py-12'>
                  <CheckCircle2 className='h-16 w-16 mx-auto text-muted-foreground mb-4' />
                  <h3 className='text-lg font-semibold mb-2'>太棒了！</h3>
                  <p className='text-muted-foreground mb-4'>
                    今天没有待处理的任务
                  </p>
                  <Button
                    variant='outline'
                    onClick={() => router.push('/dashboard')}
                  >
                    返回仪表板
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value='family' className='mt-6'>
              <div className='text-center py-12'>
                <p className='text-muted-foreground'>家庭汇总功能即将推出</p>
              </div>
            </TabsContent>

            <TabsContent value='notifications' className='mt-6'>
              <div className='text-center py-12'>
                <p className='text-muted-foreground'>所有通知功能即将推出</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
