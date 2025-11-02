import { performance } from 'perf_hooks';

// React组件性能指标
interface ComponentMetrics {
  name: string;
  renderCount: number;
  totalTime: number;
  averageTime: number;
  maxTime: number;
  minTime: number;
  lastRenderTime: number;
  memoryUsage?: number;
  propsSize?: number;
}

// 渲染性能阈值
interface PerformanceThresholds {
  renderTime: {
    warning: number;
    error: number;
  };
  memoryUsage: {
    warning: number;
    error: number;
  };
  renderCount: {
    warning: number;
    error: number;
  };
}

// 性能事件
interface PerformanceEvent {
  type: 'render_start' | 'render_end' | 'mount' | 'unmount' | 'update';
  componentName: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * React性能监控器
 */
export class ReactPerformanceMonitor {
  private static instance: ReactPerformanceMonitor;
  private metrics: Map<string, ComponentMetrics> = new Map();
  private events: PerformanceEvent[] = [];
  private thresholds: PerformanceThresholds;
  private maxEvents = 1000;
  private isMonitoring = false;

  private constructor() {
    this.thresholds = this.getDefaultThresholds();
    this.startMonitoring();
  }

  static getInstance(): ReactPerformanceMonitor {
    if (!ReactPerformanceMonitor.instance) {
      ReactPerformanceMonitor.instance = new ReactPerformanceMonitor();
    }
    return ReactPerformanceMonitor.instance;
  }

  /**
   * 获取默认阈值
   */
  private getDefaultThresholds(): PerformanceThresholds {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';

    return {
      renderTime: {
        warning: isProduction ? 16 : 100, // 60fps = 16ms
        error: isProduction ? 50 : 500,
      },
      memoryUsage: {
        warning: 10 * 1024 * 1024, // 10MB
        error: 50 * 1024 * 1024, // 50MB
      },
      renderCount: {
        warning: 100,
        error: 500,
      },
    };
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // 定期清理事件
    setInterval(() => {
      this.cleanupEvents();
    }, 60 * 1000); // 每分钟清理一次

    // 定期报告性能
    setInterval(() => {
      this.reportPerformance();
    }, 5 * 60 * 1000); // 每5分钟报告一次
  }

  /**
   * 记录渲染开始
   */
  startRender(componentName: string, metadata?: Record<string, any>): string {
    const eventId = this.generateEventId();

    const event: PerformanceEvent = {
      type: 'render_start',
      componentName,
      timestamp: performance.now(),
      metadata,
    };

    this.events.push(event);

    return eventId;
  }

  /**
   * 记录渲染结束
   */
  endRender(componentName: string, eventId: string, metadata?: Record<string, any>): void {
    const endTime = performance.now();
    const startEvent = this.events.find(e =>
      e.type === 'render_start' &&
      e.componentName === componentName &&
      this.getEventId(e) === eventId
    );

    if (!startEvent) {
      console.warn(`未找到对应的渲染开始事件: ${componentName}`);
      return;
    }

    const duration = endTime - startEvent.timestamp;

    const event: PerformanceEvent = {
      type: 'render_end',
      componentName,
      timestamp: endTime,
      duration,
      metadata: { ...startEvent.metadata, ...metadata },
    };

    this.events.push(event);

    // 更新组件指标
    this.updateMetrics(componentName, duration, metadata);

    // 检查性能阈值
    this.checkThresholds(componentName, duration, metadata);
  }

  /**
   * 记录组件挂载
   */
  recordMount(componentName: string, metadata?: Record<string, any>): void {
    const event: PerformanceEvent = {
      type: 'mount',
      componentName,
      timestamp: performance.now(),
      metadata,
    };

    this.events.push(event);

    // 初始化指标
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, {
        name: componentName,
        renderCount: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity,
        lastRenderTime: 0,
      });
    }
  }

  /**
   * 记录组件卸载
   */
  recordUnmount(componentName: string, metadata?: Record<string, any>): void {
    const event: PerformanceEvent = {
      type: 'unmount',
      componentName,
      timestamp: performance.now(),
      metadata,
    };

    this.events.push(event);
  }

  /**
   * 记录组件更新
   */
  recordUpdate(componentName: string, metadata?: Record<string, any>): void {
    const event: PerformanceEvent = {
      type: 'update',
      componentName,
      timestamp: performance.now(),
      metadata,
    };

    this.events.push(event);
  }

  /**
   * 更新组件指标
   */
  private updateMetrics(componentName: string, duration: number, metadata?: Record<string, any>): void {
    let metrics = this.metrics.get(componentName);

    if (!metrics) {
      metrics = {
        name: componentName,
        renderCount: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity,
        lastRenderTime: 0,
      };
      this.metrics.set(componentName, metrics);
    }

    metrics.renderCount++;
    metrics.totalTime += duration;
    metrics.averageTime = metrics.totalTime / metrics.renderCount;
    metrics.maxTime = Math.max(metrics.maxTime, duration);
    metrics.minTime = Math.min(metrics.minTime, duration);
    metrics.lastRenderTime = duration;

    if (metadata) {
      if (metadata.memoryUsage) {
        metrics.memoryUsage = metadata.memoryUsage;
      }
      if (metadata.propsSize) {
        metrics.propsSize = metadata.propsSize;
      }
    }
  }

  /**
   * 检查性能阈值
   */
  private checkThresholds(componentName: string, duration: number, metadata?: Record<string, any>): void {
    const metrics = this.metrics.get(componentName);
    if (!metrics) return;

    // 检查渲染时间
    if (duration > this.thresholds.renderTime.error) {
      console.error(`[PERF-CRITICAL] 组件 ${componentName} 渲染时间过长: ${duration.toFixed(2)}ms`, {
        componentName,
        duration,
        threshold: this.thresholds.renderTime.error,
        renderCount: metrics.renderCount,
      });
    } else if (duration > this.thresholds.renderTime.warning) {
      console.warn(`[PERF-WARNING] 组件 ${componentName} 渲染时间偏长: ${duration.toFixed(2)}ms`, {
        componentName,
        duration,
        threshold: this.thresholds.renderTime.warning,
        renderCount: metrics.renderCount,
      });
    }

    // 检查内存使用
    if (metadata?.memoryUsage) {
      if (metadata.memoryUsage > this.thresholds.memoryUsage.error) {
        console.error(`[PERF-CRITICAL] 组件 ${componentName} 内存使用过高: ${(metadata.memoryUsage / 1024 / 1024).toFixed(2)}MB`, {
          componentName,
          memoryUsage: metadata.memoryUsage,
          threshold: this.thresholds.memoryUsage.error,
        });
      } else if (metadata.memoryUsage > this.thresholds.memoryUsage.warning) {
        console.warn(`[PERF-WARNING] 组件 ${componentName} 内存使用偏高: ${(metadata.memoryUsage / 1024 / 1024).toFixed(2)}MB`, {
          componentName,
          memoryUsage: metadata.memoryUsage,
          threshold: this.thresholds.memoryUsage.warning,
        });
      }
    }

    // 检查渲染次数
    if (metrics.renderCount > this.thresholds.renderCount.error) {
      console.error(`[PERF-CRITICAL] 组件 ${componentName} 渲染次数过多: ${metrics.renderCount}`, {
        componentName,
        renderCount: metrics.renderCount,
        threshold: this.thresholds.renderCount.error,
      });
    } else if (metrics.renderCount > this.thresholds.renderCount.warning) {
      console.warn(`[PERF-WARNING] 组件 ${componentName} 渲染次数偏多: ${metrics.renderCount}`, {
        componentName,
        renderCount: metrics.renderCount,
        threshold: this.thresholds.renderCount.warning,
      });
    }
  }

  /**
   * 清理事件
   */
  private cleanupEvents(): void {
    const cutoffTime = performance.now() - 60 * 1000; // 保留最近1分钟的事件

    this.events = this.events.filter(event => event.timestamp > cutoffTime);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * 报告性能
   */
  private reportPerformance(): void {
    const report = this.generatePerformanceReport();

    if (report.slowComponents.length > 0) {
      console.warn('[PERF-REPORT] 检测到慢渲染组件:', report.slowComponents);
    }

    if (report.highMemoryComponents.length > 0) {
      console.warn('[PERF-REPORT] 检测到高内存使用组件:', report.highMemoryComponents);
    }

    if (report.frequentRenderComponents.length > 0) {
      console.warn('[PERF-REPORT] 检测到频繁渲染组件:', report.frequentRenderComponents);
    }

    // 记录到日志（如果有日志系统）
    console.info('[PERF-REPORT] 性能报告已生成', {
      totalComponents: report.totalComponents,
      averageRenderTime: report.averageRenderTime,
      slowComponentsCount: report.slowComponents.length,
      highMemoryComponentsCount: report.highMemoryComponents.length,
    });
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport() {
    const allMetrics = Array.from(this.metrics.values());

    const slowComponents = allMetrics.filter(m => m.averageTime > this.thresholds.renderTime.warning);
    const highMemoryComponents = allMetrics.filter(m => m.memoryUsage && m.memoryUsage > this.thresholds.memoryUsage.warning);
    const frequentRenderComponents = allMetrics.filter(m => m.renderCount > this.thresholds.renderCount.warning);

    const totalComponents = allMetrics.length;
    const averageRenderTime = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.averageTime, 0) / allMetrics.length
      : 0;

    return {
      totalComponents,
      averageRenderTime,
      slowComponents: slowComponents.map(m => ({
        name: m.name,
        averageTime: m.averageTime,
        maxTime: m.maxTime,
        renderCount: m.renderCount,
      })),
      highMemoryComponents: highMemoryComponents.map(m => ({
        name: m.name,
        memoryUsage: m.memoryUsage!,
        renderCount: m.renderCount,
      })),
      frequentRenderComponents: frequentRenderComponents.map(m => ({
        name: m.name,
        renderCount: m.renderCount,
        averageTime: m.averageTime,
      })),
    };
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取事件ID
   */
  private getEventId(event: PerformanceEvent): string {
    return `${event.type}_${event.componentName}_${event.timestamp}`;
  }

  /**
   * 获取组件指标
   */
  getMetrics(componentName?: string): ComponentMetrics[] {
    if (componentName) {
      const metrics = this.metrics.get(componentName);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.metrics.values());
  }

  /**
   * 重置指标
   */
  resetMetrics(componentName?: string): void {
    if (componentName) {
      this.metrics.delete(componentName);
    } else {
      this.metrics.clear();
      this.events = [];
    }
  }

  /**
   * 更新阈值
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * 获取阈值
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * 启用/禁用监控
   */
  setMonitoring(enabled: boolean): void {
    this.isMonitoring = enabled;
  }

  /**
   * 检查是否正在监控
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

// 创建单例实例
export const reactPerformanceMonitor = ReactPerformanceMonitor.getInstance();

// React Hook for performance monitoring
export function useReactPerformance(componentName: string, metadata?: Record<string, any>) {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const eventIdRef = React.useRef<string>();

  React.useEffect(() => {
    reactPerformanceMonitor.recordMount(componentName, metadata);

    return () => {
      reactPerformanceMonitor.recordUnmount(componentName, metadata);
    };
  }, [componentName]);

  React.useLayoutEffect(() => {
    eventIdRef.current = reactPerformanceMonitor.startRender(componentName, metadata);

    return () => {
      if (eventIdRef.current) {
        reactPerformanceMonitor.endRender(componentName, eventIdRef.current, metadata);
      }
    };
  });

  React.useEffect(() => {
    reactPerformanceMonitor.recordUpdate(componentName, metadata);
  });

  const forceRerender = React.useCallback(() => {
    forceUpdate();
  }, []);

  return {
    forceRerender,
    getMetrics: () => reactPerformanceMonitor.getMetrics(componentName)[0],
  };
}

// Performance monitoring HOC
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  metadata?: Record<string, any>
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const PerformanceWrappedComponent = React.forwardRef<any, P>((props, ref) => {
    useReactPerformance(displayName, { ...metadata, props: Object.keys(props).length });

    return <WrappedComponent {...props} ref={ref} />;
  });

  PerformanceWrappedComponent.displayName = `withPerformanceMonitoring(${displayName})`;

  return PerformanceWrappedComponent;
}

export default reactPerformanceMonitor;