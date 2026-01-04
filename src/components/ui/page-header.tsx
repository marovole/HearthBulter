'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  backButton?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  backButton,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between space-y-2 pb-4',
        className,
      )}
    >
      <div className='space-y-1'>
        <div className='flex items-center space-x-2'>
          {backButton}
          <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
        </div>
        {subtitle && (
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        )}
      </div>
      {actions && <div className='flex items-center space-x-2'>{actions}</div>}
    </div>
  );
}
