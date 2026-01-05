interface AssetMetrics {
  name: string;
  type: "image" | "script" | "style" | "font" | "video" | "other";
  size: number;
  loadTime: number;
  cached: boolean;
  compressed: boolean;
  optimized: boolean;
  url: string;
  timestamp: number;
}

interface OptimizationConfig {
  imageCompression: {
    enabled: boolean;
    quality: number;
    format: "webp" | "avif" | "auto";
    lazyLoading: boolean;
    placeholder: boolean;
  };
  scriptOptimization: {
    enabled: boolean;
    minification: boolean;
    compression: boolean;
    bundling: boolean;
    treeShaking: boolean;
  };
  styleOptimization: {
    enabled: boolean;
    minification: boolean;
    criticalCSS: boolean;
    purging: boolean;
  };
  fontOptimization: {
    enabled: boolean;
    preloading: boolean;
    display: "swap" | "block" | "fallback" | "optional";
    subsetting: boolean;
  };
  caching: {
    enabled: boolean;
    strategy: "cache-first" | "network-first" | "stale-while-revalidate";
    maxAge: number;
    maxEntries: number;
  };
}

/**
 * 前端资源优化管理器
 */
export class AssetOptimizer {
  private static instance: AssetOptimizer;
  private config: OptimizationConfig;
  private metrics: Map<string, AssetMetrics> = new Map();
  private observers: PerformanceObserver[] = [];
  private cache: Map<string, any> = new Map();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeObservers();
    this.initializeServiceWorker();
  }

  static getInstance(): AssetOptimizer {
    if (!AssetOptimizer.instance) {
      AssetOptimizer.instance = new AssetOptimizer();
    }
    return AssetOptimizer.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): OptimizationConfig {
    const env = process.env.NODE_ENV || "development";
    const isProduction = env === "production";

    return {
      imageCompression: {
        enabled: isProduction,
        quality: 80,
        format: "auto",
        lazyLoading: true,
        placeholder: true,
      },
      scriptOptimization: {
        enabled: isProduction,
        minification: isProduction,
        compression: true,
        bundling: true,
        treeShaking: isProduction,
      },
      styleOptimization: {
        enabled: isProduction,
        minification: isProduction,
        criticalCSS: true,
        purging: isProduction,
      },
      fontOptimization: {
        enabled: true,
        preloading: true,
        display: "swap",
        subsetting: true,
      },
      caching: {
        enabled: true,
        strategy: "stale-while-revalidate",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxEntries: 100,
      },
    };
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers(): void {
    if (typeof window === "undefined") return;

    // 观察资源加载
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processResourceEntries(entries);
      });

      resourceObserver.observe({ entryTypes: ["resource"] });
      this.observers.push(resourceObserver);

      // 观察导航
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processNavigationEntries(entries);
      });

      navigationObserver.observe({ entryTypes: ["navigation"] });
      this.observers.push(navigationObserver);

      // 观察长任务
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processLongTaskEntries(entries);
      });

      longTaskObserver.observe({ entryTypes: ["longtask"] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn("性能观察器初始化失败:", error);
    }
  }

  /**
   * 初始化Service Worker
   */
  private initializeServiceWorker(): void {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker 注册成功:", registration);
      })
      .catch((error) => {
        console.warn("Service Worker 注册失败:", error);
      });
  }

  /**
   * 处理资源加载条目
   */
  private processResourceEntries(entries: PerformanceEntry[]): void {
    entries.forEach((entry) => {
      if (entry.entryType !== "resource") return;

      const resource = entry as PerformanceResourceTiming;
      const assetMetrics = this.createAssetMetrics(resource);

      this.metrics.set(assetMetrics.name, assetMetrics);
      this.analyzeAssetPerformance(assetMetrics);
    });
  }

  /**
   * 处理导航条目
   */
  private processNavigationEntries(entries: PerformanceEntry[]): void {
    entries.forEach((entry) => {
      if (entry.entryType !== "navigation") return;

      const navigation = entry as PerformanceNavigationTiming;
      this.analyzePageLoadPerformance(navigation);
    });
  }

  /**
   * 处理长任务条目
   */
  private processLongTaskEntries(entries: PerformanceEntry[]): void {
    entries.forEach((entry) => {
      if (entry.entryType !== "longtask") return;

      console.warn(`[PERF] 检测到长任务: ${entry.duration.toFixed(2)}ms`, {
        duration: entry.duration,
        startTime: entry.startTime,
        name: entry.name,
      });
    });
  }

  /**
   * 创建资源指标
   */
  private createAssetMetrics(
    resource: PerformanceResourceTiming,
  ): AssetMetrics {
    const url = new URL(resource.name);
    const fileName = url.pathname.split("/").pop() || "unknown";
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    let type: AssetMetrics["type"] = "other";
    if (
      ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(extension)
    ) {
      type = "image";
    } else if (["js", "mjs"].includes(extension)) {
      type = "script";
    } else if (["css"].includes(extension)) {
      type = "style";
    } else if (["woff", "woff2", "ttf", "otf", "eot"].includes(extension)) {
      type = "font";
    } else if (["mp4", "webm", "ogg"].includes(extension)) {
      type = "video";
    }

    const loadTime = resource.responseEnd - resource.startTime;
    const size = resource.transferSize || resource.encodedBodySize || 0;
    const cached = resource.transferSize === 0 && resource.decodedBodySize > 0;

    return {
      name: fileName,
      type,
      size,
      loadTime,
      cached,
      compressed: resource.encodedBodySize < resource.decodedBodySize,
      optimized: this.isAssetOptimized(fileName, type),
      url: resource.name,
      timestamp: Date.now(),
    };
  }

  /**
   * 检查资源是否已优化
   */
  private isAssetOptimized(
    fileName: string,
    type: AssetMetrics["type"],
  ): boolean {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    switch (type) {
      case "image":
        return ["webp", "avif"].includes(extension);
      case "script":
        return fileName.includes(".min.") || fileName.includes(".bundle.");
      case "style":
        return fileName.includes(".min.") || fileName.includes(".critical.");
      default:
        return false;
    }
  }

  /**
   * 分析资源性能
   */
  private analyzeAssetPerformance(metrics: AssetMetrics): void {
    const thresholds = this.getPerformanceThresholds(metrics.type);

    // 检查加载时间
    if (metrics.loadTime > thresholds.loadTime.error) {
      console.error(`[PERF-CRITICAL] 资源加载时间过长: ${metrics.name}`, {
        type: metrics.type,
        loadTime: metrics.loadTime,
        threshold: thresholds.loadTime.error,
        size: metrics.size,
        cached: metrics.cached,
      });
    } else if (metrics.loadTime > thresholds.loadTime.warning) {
      console.warn(`[PERF-WARNING] 资源加载时间偏长: ${metrics.name}`, {
        type: metrics.type,
        loadTime: metrics.loadTime,
        threshold: thresholds.loadTime.warning,
        size: metrics.size,
        cached: metrics.cached,
      });
    }

    // 检查文件大小
    if (metrics.size > thresholds.size.error) {
      console.error(`[PERF-CRITICAL] 资源文件过大: ${metrics.name}`, {
        type: metrics.type,
        size: metrics.size,
        threshold: thresholds.size.error,
        optimized: metrics.optimized,
      });
    } else if (metrics.size > thresholds.size.warning) {
      console.warn(`[PERF-WARNING] 资源文件偏大: ${metrics.name}`, {
        type: metrics.type,
        size: metrics.size,
        threshold: thresholds.size.warning,
        optimized: metrics.optimized,
      });
    }

    // 检查优化状态
    if (!metrics.optimized && !metrics.cached) {
      console.warn(`[PERF-WARNING] 资源未优化: ${metrics.name}`, {
        type: metrics.type,
        optimized: metrics.optimized,
        cached: metrics.cached,
        recommendations: this.getOptimizationRecommendations(metrics),
      });
    }
  }

  /**
   * 获取性能阈值
   */
  private getPerformanceThresholds(type: AssetMetrics["type"]) {
    const baseThresholds = {
      loadTime: { warning: 1000, error: 3000 },
      size: { warning: 1024 * 1024, error: 5 * 1024 * 1024 }, // 1MB / 5MB
    };

    switch (type) {
      case "image":
        return {
          loadTime: { warning: 500, error: 1500 },
          size: { warning: 500 * 1024, error: 2 * 1024 * 1024 }, // 500KB / 2MB
        };
      case "script":
        return {
          loadTime: { warning: 300, error: 1000 },
          size: { warning: 200 * 1024, error: 1024 * 1024 }, // 200KB / 1MB
        };
      case "style":
        return {
          loadTime: { warning: 200, error: 800 },
          size: { warning: 100 * 1024, error: 500 * 1024 }, // 100KB / 500KB
        };
      case "font":
        return {
          loadTime: { warning: 300, error: 1000 },
          size: { warning: 150 * 1024, error: 500 * 1024 }, // 150KB / 500KB
        };
      default:
        return baseThresholds;
    }
  }

  /**
   * 获取优化建议
   */
  private getOptimizationRecommendations(metrics: AssetMetrics): string[] {
    const recommendations: string[] = [];

    switch (metrics.type) {
      case "image":
        recommendations.push("使用WebP或AVIF格式");
        recommendations.push("启用图片懒加载");
        recommendations.push("使用响应式图片");
        recommendations.push("压缩图片质量");
        break;
      case "script":
        recommendations.push("压缩JavaScript代码");
        recommendations.push("启用代码分割");
        recommendations.push("移除未使用的代码");
        recommendations.push("使用Tree Shaking");
        break;
      case "style":
        recommendations.push("压缩CSS代码");
        recommendations.push("内联关键CSS");
        recommendations.push("移除未使用的样式");
        recommendations.push("使用CSS Purging");
        break;
      case "font":
        recommendations.push("使用字体子集");
        recommendations.push("启用字体预加载");
        recommendations.push("使用字体显示策略");
        break;
    }

    recommendations.push("启用资源缓存");
    recommendations.push("使用CDN分发");

    return recommendations;
  }

  /**
   * 分析页面加载性能
   */
  private analyzePageLoadPerformance(
    navigation: PerformanceNavigationTiming,
  ): void {
    const loadTime = navigation.loadEventEnd - navigation.startTime;
    const domContentLoaded =
      navigation.domContentLoadedEventEnd - navigation.startTime;
    const firstPaint = this.getMetricByName("first-paint")?.startTime || 0;
    const firstContentfulPaint =
      this.getMetricByName("first-contentful-paint")?.startTime || 0;

    const vitals = {
      loadTime,
      domContentLoaded,
      firstPaint,
      firstContentfulPaint,
      largestContentfulPaint: this.getLCP(),
      firstInputDelay: this.getFID(),
      cumulativeLayoutShift: this.getCLS(),
    };

    console.info("[PERF] 页面加载性能指标:", vitals);

    // 检查Core Web Vitals
    this.checkCoreWebVitals(vitals);
  }

  /**
   * 获取指标
   */
  private getMetricByName(name: string): PerformanceEntry | undefined {
    return performance.getEntriesByName(name).pop();
  }

  /**
   * 获取LCP (Largest Contentful Paint)
   */
  private getLCP(): number {
    // 简化实现，实际应该使用Largest Contentful Paint API
    return 0;
  }

  /**
   * 获取FID (First Input Delay)
   */
  private getFID(): number {
    // 简化实现，实际应该使用First Input Delay API
    return 0;
  }

  /**
   * 获取CLS (Cumulative Layout Shift)
   */
  private getCLS(): number {
    // 简化实现，实际应该使用Layout Shift API
    return 0;
  }

  /**
   * 检查Core Web Vitals
   */
  private checkCoreWebVitals(vitals: any): void {
    // LCP: < 2.5s (good), < 4s (needs improvement)
    if (vitals.largestContentfulPaint > 4000) {
      console.error("[PERF-CRITICAL] LCP 过慢:", vitals.largestContentfulPaint);
    } else if (vitals.largestContentfulPaint > 2500) {
      console.warn("[PERF-WARNING] LCP 偏慢:", vitals.largestContentfulPaint);
    }

    // FID: < 100ms (good), < 300ms (needs improvement)
    if (vitals.firstInputDelay > 300) {
      console.error("[PERF-CRITICAL] FID 过长:", vitals.firstInputDelay);
    } else if (vitals.firstInputDelay > 100) {
      console.warn("[PERF-WARNING] FID 偏长:", vitals.firstInputDelay);
    }

    // CLS: < 0.1 (good), < 0.25 (needs improvement)
    if (vitals.cumulativeLayoutShift > 0.25) {
      console.error("[PERF-CRITICAL] CLS 过高:", vitals.cumulativeLayoutShift);
    } else if (vitals.cumulativeLayoutShift > 0.1) {
      console.warn("[PERF-WARNING] CLS 偏高:", vitals.cumulativeLayoutShift);
    }
  }

  /**
   * 优化图片URL
   */
  optimizeImageUrl(
    url: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: "webp" | "avif" | "auto";
    },
  ): string {
    if (!this.config.imageCompression.enabled) {
      return url;
    }

    const optimizedUrl = new URL(url);
    const params = new URLSearchParams(optimizedUrl.search);

    if (options?.width) params.set("w", options.width.toString());
    if (options?.height) params.set("h", options.height.toString());
    if (options?.quality) params.set("q", options.quality.toString());
    if (options?.format && options.format !== "auto") {
      params.set("f", options.format);
    } else if (this.config.imageCompression.format !== "auto") {
      params.set("f", this.config.imageCompression.format);
    }

    params.set(
      "q",
      (options?.quality || this.config.imageCompression.quality).toString(),
    );

    optimizedUrl.search = params.toString();
    return optimizedUrl.toString();
  }

  /**
   * 预加载资源
   */
  preloadResource(
    url: string,
    type: "script" | "style" | "image" | "font",
  ): void {
    if (typeof document === "undefined") return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.href = url;

    switch (type) {
      case "script":
        link.as = "script";
        break;
      case "style":
        link.as = "style";
        break;
      case "image":
        link.as = "image";
        break;
      case "font":
        link.as = "font";
        link.type = "font/woff2";
        link.crossOrigin = "anonymous";
        break;
    }

    document.head.appendChild(link);
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const allMetrics = Array.from(this.metrics.values());

    const totalSize = allMetrics.reduce((sum, m) => sum + m.size, 0);
    const totalLoadTime = Math.max(...allMetrics.map((m) => m.loadTime));
    const cachedCount = allMetrics.filter((m) => m.cached).length;
    const optimizedCount = allMetrics.filter((m) => m.optimized).length;

    const metricsByType = {
      image: allMetrics.filter((m) => m.type === "image"),
      script: allMetrics.filter((m) => m.type === "script"),
      style: allMetrics.filter((m) => m.type === "style"),
      font: allMetrics.filter((m) => m.type === "font"),
      other: allMetrics.filter((m) => m.type === "other"),
    };

    return {
      totalAssets: allMetrics.length,
      totalSize,
      totalLoadTime,
      cachedCount,
      optimizedCount,
      cacheHitRate: (cachedCount / allMetrics.length) * 100,
      optimizationRate: (optimizedCount / allMetrics.length) * 100,
      metricsByType,
      slowAssets: allMetrics.filter((m) => m.loadTime > 1000),
      largeAssets: allMetrics.filter((m) => m.size > 1024 * 1024),
      unoptimizedAssets: allMetrics.filter((m) => !m.optimized && !m.cached),
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取配置
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * 清理指标
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.cache.clear();
  }
}

// 创建单例实例
export const assetOptimizer = AssetOptimizer.getInstance();

// React Hook for asset optimization
export function useAssetOptimization() {
  const [report, setReport] = React.useState(() =>
    assetOptimizer.getPerformanceReport(),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setReport(assetOptimizer.getPerformanceReport());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    report,
    optimizeImageUrl: assetOptimizer.optimizeImageUrl.bind(assetOptimizer),
    preloadResource: assetOptimizer.preloadResource.bind(assetOptimizer),
  };
}

export default assetOptimizer;
