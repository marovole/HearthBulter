/**
 * Performance Optimizer
 * 性能优化工具
 *
 * 提供图表渲染优化、数据懒加载、缓存管理等功能
 */

import { useMemo, useCallback, useRef, useEffect, useState } from "react";

/**
 * 图表数据优化器
 */
export class ChartDataOptimizer {
  /**
   * 数据采样：减少数据点数量以提高渲染性能
   */
  static sampleData(data: any[], maxPoints: number = 100): any[] {
    if (data.length <= maxPoints) return data;

    const step = Math.ceil(data.length / maxPoints);
    const sampled = [];

    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }

    // 确保包含最后一个数据点
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1]);
    }

    return sampled;
  }

  /**
   * 数据平滑：减少噪声，提高图表可读性
   */
  static smoothData(data: number[], windowSize: number = 3): number[] {
    if (data.length < windowSize) return data;

    const smoothed = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(data.length, i + halfWindow + 1);
      const window = data.slice(start, end);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(average);
    }

    return smoothed;
  }

  /**
   * 数据聚合：将时间序列数据按时间段聚合
   */
  static aggregateDataByTime(
    data: Array<{ date: Date; value: number }>,
    interval: "hour" | "day" | "week" | "month",
  ): Array<{ date: Date; value: number; count: number }> {
    const grouped = new Map<string, number[]>();

    data.forEach((item) => {
      const key = this.getTimeKey(item.date, interval);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item.value);
    });

    return Array.from(grouped.entries()).map(([key, values]) => ({
      date: new Date(key),
      value: values.reduce((sum, val) => sum + val, 0) / values.length,
      count: values.length,
    }));
  }

  private static getTimeKey(date: Date, interval: string): string {
    switch (interval) {
    case "hour":
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    case "day":
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    case "week":
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
    case "month":
      return `${date.getFullYear()}-${date.getMonth()}`;
    default:
      return date.toISOString();
    }
  }
}

/**
 * 懒加载Hook
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  dependencies: any[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;

    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        setData(result);
        loadedRef.current = true;
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
      });
  }, dependencies);

  const reload = useCallback(() => {
    loadedRef.current = false;
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        setData(result);
        loadedRef.current = true;
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loader]);

  return { data, loading, error, reload };
}

/**
 * 虚拟化列表Hook
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length,
    );

    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight,
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
  };
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor(name: string) {
  const startTimeRef = useRef<number>();
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    startTimeRef.current = performance.now();

    return () => {
      if (startTimeRef.current) {
        const duration = performance.now() - startTimeRef.current;
        console.log(
          `[Performance] ${name} render #${renderCountRef.current}: ${duration.toFixed(2)}ms`,
        );
      }
    };
  });

  const measureFunction = useCallback(
    <T extends any[], R>(fn: (...args: T) => R, fnName?: string) => {
      return (...args: T): R => {
        const start = performance.now();
        const result = fn(...args);
        const end = performance.now();

        console.log(
          `[Performance] ${fnName || name}: ${(end - start).toFixed(2)}ms`,
        );
        return result;
      };
    },
    [name],
  );

  return { measureFunction };
}

/**
 * 内存缓存管理器
 */
export class MemoryCacheManager {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 100, cleanupIntervalMs: number = 60000) {
    this.maxSize = maxSize;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  set(key: string, data: any, ttl: number = 300000) {
    // 默认5分钟TTL
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

/**
 * 全局缓存实例
 */
export const globalCache = new MemoryCacheManager(200, 60000);

/**
 * 图表渲染优化Hook
 */
export function useOptimizedChart(data: any[], maxPoints: number = 100) {
  const optimizedData = useMemo(() => {
    return ChartDataOptimizer.sampleData(data, maxPoints);
  }, [data, maxPoints]);

  const memoizedData = useMemo(() => optimizedData, [optimizedData]);

  return memoizedData;
}

/**
 * 防抖Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流Hook
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastExecuted.current >= delay) {
          setThrottledValue(value);
          lastExecuted.current = Date.now();
        }
      },
      delay - (Date.now() - lastExecuted.current),
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

/**
 * 资源预加载工具
 */
export class ResourcePreloader {
  private preloadedImages = new Set<string>();
  private preloadedScripts = new Set<string>();

  /**
   * 预加载图片
   */
  preloadImage(src: string): Promise<HTMLImageElement> {
    if (this.preloadedImages.has(src)) {
      return Promise.resolve(new Image());
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.preloadedImages.add(src);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * 预加载脚本
   */
  preloadScript(src: string): Promise<void> {
    if (this.preloadedScripts.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.onload = () => {
        this.preloadedScripts.add(src);
        resolve();
      };
      script.onerror = reject;
      script.src = src;
      document.head.appendChild(script);
    });
  }

  /**
   * 预加载多个资源
   */
  async preloadResources(
    resources: Array<{ type: "image" | "script"; src: string }>,
  ) {
    const promises = resources.map((resource) => {
      if (resource.type === "image") {
        return this.preloadImage(resource.src);
      } else if (resource.type === "script") {
        return this.preloadScript(resource.src);
      }
    });

    return Promise.allSettled(promises);
  }
}

export const resourcePreloader = new ResourcePreloader();
