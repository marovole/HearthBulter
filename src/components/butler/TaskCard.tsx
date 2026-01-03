'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: {
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
    metadata: Record<string, unknown>;
    actionUrl: string | null;
  };
  onComplete: () => void;
  onSkip: (reason?: string) => void;
  isCompleting?: boolean;
  isSkipping?: boolean;
}

interface PriorityConfig {
  color: string;
  label: string;
  icon: string;
}

interface CategoryConfig {
  [key: string]: string;
}

const priorityConfig: Record<string, PriorityConfig> = {
  URGENT: { color: 'bg-red-500 text-white', label: 'URGENT', icon: '🔴' },
  HIGH: { color: 'bg-orange-500 text-white', label: 'HIGH', icon: '🟠' },
  MEDIUM: { color: 'bg-yellow-500 text-white', label: 'MEDIUM', icon: '🟡' },
  LOW: { color: 'bg-green-500 text-white', label: 'LOW', icon: '🟢' },
};

const categoryConfig: CategoryConfig = {
  SHOPPING: '购物',
  COOKING: '烹饪',
  CLEANING: '清洁',
  HEALTH: '健康',
  EXERCISE: '运动',
  OTHER: '其他',
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = tomorrow.toDateString() === date.toDateString();

  if (isToday) {
    return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (isTomorrow) {
    return `明天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractMetadataFields(metadata: Record<string, unknown>): {
  reason: string | undefined;
  evidence: Record<string, unknown> | undefined;
} {
  return {
    reason: metadata.reason as string | undefined,
    evidence: metadata.evidence as Record<string, unknown> | undefined,
  };
}

interface TaskActionsProps {
  isSkipping: boolean | undefined;
  isCompleting: boolean | undefined;
  onSkip: () => void;
  onComplete: () => void;
}

function TaskActions({
  isSkipping,
  isCompleting,
  onSkip,
  onComplete,
}: TaskActionsProps) {
  return (
    <div className='flex items-center gap-2'>
      <Button
        size='sm'
        variant='outline'
        className='h-8'
        onClick={onSkip}
        disabled={isSkipping || isCompleting}
      >
        {isSkipping ? (
          <>
            <X className='h-3 w-3 mr-1 animate-pulse' />
            跳过中
          </>
        ) : (
          <>
            <X className='h-3 w-3 mr-1' />
            跳过
          </>
        )}
      </Button>
      <Button
        size='sm'
        className='h-8'
        onClick={onComplete}
        disabled={isCompleting || isSkipping}
      >
        {isCompleting ? (
          <>
            <Check className='h-3 w-3 mr-1 animate-pulse' />
            完成中
          </>
        ) : (
          <>
            <Check className='h-3 w-3 mr-1' />
            完成
          </>
        )}
      </Button>
    </div>
  );
}

export function TaskCard({
  task,
  onComplete,
  onSkip,
  isCompleting,
  isSkipping,
}: TaskCardProps) {
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.MEDIUM;
  const categoryLabel = categoryConfig[task.category] || task.category;

  const { reason, evidence } = extractMetadataFields(task.metadata);

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (task.actionUrl) {
      window.location.href = task.actionUrl;
    }
  };

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        task.priority === 'URGENT' && 'border-red-200 dark:border-red-900',
        task.priority === 'HIGH' && 'border-orange-200 dark:border-orange-900',
      )}
    >
      <div className='p-4 space-y-3'>
        {/* 头部：标题和优先级 */}
        <div className='flex items-start justify-between gap-3'>
          <div className='flex-1 space-y-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-lg'>{priorityInfo.icon}</span>
              <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>
              <Badge variant='outline' className='text-xs'>
                {categoryLabel}
              </Badge>
            </div>
            <h3 className='font-semibold text-lg leading-tight'>
              {task.title}
            </h3>
            {task.description && (
              <p className='text-sm text-muted-foreground'>
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* 任务依据 */}
        {reason && (
          <div className='bg-muted/50 rounded-lg p-3 space-y-1'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <span className='text-blue-500'>💡</span>
              <span>为什么做</span>
            </div>
            <p className='text-sm text-muted-foreground pl-6'>{reason}</p>
            {evidence && typeof evidence === 'object' && (
              <div className='text-xs text-muted-foreground pl-6 space-y-1'>
                {evidence.daysUntilExpiry !== undefined && (
                  <div>• 还剩 {evidence.daysUntilExpiry} 天</div>
                )}
                {evidence.currentQuantity && (
                  <div>• 当前库存: {evidence.currentQuantity}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 快速操作链接 */}
        {task.actionUrl && (
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 text-xs'
              onClick={handleActionClick}
            >
              查看详情 <ArrowRight className='h-3 w-3 ml-1' />
            </Button>
          </div>
        )}

        {/* 底部：截止时间、分配人、操作按钮 */}
        <div className='flex items-center justify-between pt-3 border-t'>
          <div className='flex items-center gap-4 text-sm text-muted-foreground'>
            {task.dueDate && (
              <div className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                <span>{formatDueDate(task.dueDate)}</span>
              </div>
            )}
            {task.assignee && (
              <div className='flex items-center gap-2'>
                <div className='h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium'>
                  {task.assignee.name.charAt(0)}
                </div>
                <span>{task.assignee.name}</span>
              </div>
            )}
          </div>

          <TaskActions
            isSkipping={isSkipping}
            isCompleting={isCompleting}
            onSkip={onSkip}
            onComplete={onComplete}
          />
        </div>
      </div>
    </Card>
  );
}
