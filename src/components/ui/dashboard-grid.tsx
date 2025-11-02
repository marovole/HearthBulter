'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: number
  autoFit?: boolean
  minItemWidth?: string
}

interface GridItemProps {
  children: React.ReactNode
  className?: string
  span?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  order?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
}

/**
 * 响应式仪表盘网格组件
 */
export function DashboardGrid({
  children,
  className,
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 6,
  autoFit = false,
  minItemWidth = '280px',
}: DashboardGridProps) {
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('xs');
      else if (width < 768) setScreenSize('sm');
      else if (width < 1024) setScreenSize('md');
      else if (width < 1280) setScreenSize('lg');
      else if (width < 1536) setScreenSize('xl');
      else setScreenSize('2xl');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const getGridCols = () => {
    if (autoFit) {
      return `grid-cols-[repeat(auto-fit,minmax(${minItemWidth},1fr))]`;
    }
    return `grid-cols-${cols[screenSize] || 1}`;
  };

  const getGapClass = () => {
    const gapMap: Record<number, string> = {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
      10: 'gap-10',
      12: 'gap-12',
    };
    return gapMap[gap] || 'gap-6';
  };

  return (
    <div
      className={cn(
        'grid',
        getGridCols(),
        getGapClass(),
        'transition-all duration-300 ease-in-out',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 网格项组件
 */
export function DashboardGridItem({
  children,
  className,
  span = { xs: 1, sm: 1, md: 1, lg: 1, xl: 1, '2xl': 1 },
  order,
}: GridItemProps) {
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('xs');
      else if (width < 768) setScreenSize('sm');
      else if (width < 1024) setScreenSize('md');
      else if (width < 1280) setScreenSize('lg');
      else if (width < 1536) setScreenSize('xl');
      else setScreenSize('2xl');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const getSpanClass = () => {
    return `col-span-${span[screenSize] || 1}`;
  };

  const getOrderClass = () => {
    if (!order) return '';
    return `order-${order[screenSize] || 1}`;
  };

  return (
    <div
      className={cn(
        getSpanClass(),
        getOrderClass(),
        'transition-all duration-300 ease-in-out',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 预定义的仪表盘布局
 */
export const DashboardLayouts = {
  // 标准布局：2x2网格
  standard: {
    component: ({ children }: { children: React.ReactNode }) => (
      <DashboardGrid cols={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} gap={6}>
        {children}
      </DashboardGrid>
    ),
  },

  // 紧凑布局：3列网格
  compact: {
    component: ({ children }: { children: React.ReactNode }) => (
      <DashboardGrid cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }} gap={4}>
        {children}
      </DashboardGrid>
    ),
  },

  // 宽松布局：2列，更大间距
  spacious: {
    component: ({ children }: { children: React.ReactNode }) => (
      <DashboardGrid cols={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }} gap={8}>
        {children}
      </DashboardGrid>
    ),
  },

  // 自适应布局
  autoFit: {
    component: ({ children }: { children: React.ReactNode }) => (
      <DashboardGrid autoFit minItemWidth="320px" gap={6}>
        {children}
      </DashboardGrid>
    ),
  },

  // 混合布局：主内容区域 + 侧边栏
  mixed: {
    component: ({ children }: { children: React.ReactNode }) => {
      const childrenArray = React.Children.toArray(children);
      
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 主内容区域 */}
          <div className="lg:col-span-8">
            <DashboardGrid cols={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 2 }} gap={6}>
              {childrenArray.slice(0, -1)}
            </DashboardGrid>
          </div>
          
          {/* 侧边栏 */}
          <div className="lg:col-span-4">
            {childrenArray[childrenArray.length - 1]}
          </div>
        </div>
      );
    },
  },
};

/**
 * 仪表盘容器组件
 */
interface DashboardContainerProps {
  children: React.ReactNode
  layout?: keyof typeof DashboardLayouts
  className?: string
  loading?: boolean
  error?: string
  onRetry?: () => void
}

export function DashboardContainer({
  children,
  layout = 'standard',
  className,
  loading = false,
  error,
  onRetry,
}: DashboardContainerProps) {
  const LayoutComponent = DashboardLayouts[layout].component;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 mb-2">加载失败</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <LayoutComponent>{children}</LayoutComponent>
    </div>
  );
}
