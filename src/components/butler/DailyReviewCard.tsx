'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Award, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DailyReviewCardProps {
  review: {
    reviewDate: string;
    totalTasks: number;
    completedTasks: number;
    skippedTasks: number;
    overdueTasks: number;
    summary: string | null;
    keyAchievements: string | null;
    tomorrowActions: any;
  };
}

export function DailyReviewCard({ review }: DailyReviewCardProps) {
  const completionRate =
    review.totalTasks > 0
      ? Math.round((review.completedTasks / review.totalTasks) * 100)
      : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    return format(date, 'M月d日 EEEE', { locale: zhCN });
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getCompletionEmoji = (rate: number) => {
    if (rate >= 80) return '🎉';
    if (rate >= 60) return '👍';
    if (rate >= 40) return '😊';
    return '💪';
  };

  return (
    <Card className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900'>
      <CardHeader>
        <CardTitle className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Calendar className='h-5 w-5' />
            <span>{formatDate(review.reviewDate)} 复盘</span>
          </div>
          <Badge variant='secondary' className='text-lg font-bold px-3 py-1'>
            {getCompletionEmoji(completionRate)} {completionRate}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* 统计数据 */}
        <div className='grid grid-cols-4 gap-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold'>{review.totalTasks}</div>
            <div className='text-xs text-muted-foreground'>总任务</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-600'>
              {review.completedTasks}
            </div>
            <div className='text-xs text-muted-foreground'>已完成</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-orange-600'>
              {review.skippedTasks}
            </div>
            <div className='text-xs text-muted-foreground'>已跳过</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-red-600'>
              {review.overdueTasks}
            </div>
            <div className='text-xs text-muted-foreground'>已逾期</div>
          </div>
        </div>

        {/* 摘要 */}
        {review.summary && (
          <div className='bg-background/50 rounded-lg p-3'>
            <p className='text-sm leading-relaxed whitespace-pre-line'>
              {review.summary}
            </p>
          </div>
        )}

        {/* 关键成就 */}
        {review.keyAchievements && (
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <Award className='h-4 w-4 text-yellow-500' />
              <span>关键成就</span>
            </div>
            <div className='bg-background/50 rounded-lg p-3'>
              <p className='text-sm leading-relaxed whitespace-pre-line'>
                {review.keyAchievements}
              </p>
            </div>
          </div>
        )}

        {/* 明日建议 */}
        {review.tomorrowActions && review.tomorrowActions.actions && (
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <Lightbulb className='h-4 w-4 text-blue-500' />
              <span>明日建议</span>
            </div>
            <div className='bg-background/50 rounded-lg p-3 space-y-2'>
              {review.tomorrowActions.actions.map(
                (action: string, index: number) => (
                  <div
                    key={index}
                    className='text-sm leading-relaxed flex items-start gap-2'
                  >
                    <span className='text-blue-500'>•</span>
                    <span>{action}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
