import { performance } from 'perf_hooks';
import { logger } from '@/lib/logging/structured-logger';
import { securityAudit } from '@/lib/security/security-audit';

// 测试类型
export enum TestType {
  LOAD = 'load',           // 负载测试
  STRESS = 'stress',       // 压力测试
  SPIKE = 'spike',         // 峰值测试
  ENDURANCE = 'endurance', // 耐久测试
  SCALABILITY = 'scalability', // 扩展性测试
}

// 测试配置
interface TestConfig {
  name: string;
  type: TestType;
  duration: number; // 测试持续时间（秒）
  concurrency: number; // 并发用户数
  rampUp: number; // 启动时间（秒）
  rampDown?: number; // 结束时间（秒）
  target: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
  };
  thresholds: {
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    errorRate: number; // 错误率百分比
    throughput: {
      min: number; // 最小吞吐量（请求/秒）
      max: number; // 最大响应时间
    };
  };
  scenarios?: TestScenario[];
}

// 测试场景
interface TestScenario {
  name: string;
  weight: number; // 权重（百分比）
  requests: TestRequest[];
}

// 测试请求
interface TestRequest {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  thinkTime?: number; // 思考时间（毫秒）
}

// 测试结果
interface TestResult {
  id: string;
  config: TestConfig;
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    errorRate: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    throughput: number;
  };
  details: {
    responseTimes: number[];
    errors: Array<{
      timestamp: Date;
      error: string;
      statusCode?: number;
    }>;
    timeline: Array<{
      timestamp: Date;
      activeUsers: number;
      requestsPerSecond: number;
      averageResponseTime: number;
    }>;
  };
  passed: boolean;
  recommendations: string[];
}

// 性能基准
interface PerformanceBenchmark {
  name: string;
  version: string;
  date: Date;
  environment: string;
  results: TestResult[];
  baseline?: TestResult;
  comparison: {
    responseTimeChange: number;
    throughputChange: number;
    errorRateChange: number;
    overallPerformance: 'improved' | 'degraded' | 'stable';
  };
}

/**
 * 性能测试管理器
 */
export class PerformanceTestManager {
  private static instance: PerformanceTestManager;
  private runningTests: Map<string, TestRunner> = new Map();
  private benchmarks: PerformanceBenchmark[] = [];
  private testHistory: TestResult[] = [];

  private constructor() {
    this.loadDefaultConfigs();
  }

  static getInstance(): PerformanceTestManager {
    if (!PerformanceTestManager.instance) {
      PerformanceTestManager.instance = new PerformanceTestManager();
    }
    return PerformanceTestManager.instance;
  }

  /**
   * 加载默认配置
   */
  private loadDefaultConfigs(): void {
    // 可以在这里定义默认的测试配置
  }

  /**
   * 执行性能测试
   */
  async runTest(config: TestConfig): Promise<string> {
    const testId = this.generateTestId();
    const runner = new TestRunner(testId, config);

    this.runningTests.set(testId, runner);

    try {
      logger.info('性能测试开始', {
        type: 'performance_test',
        testId,
        testName: config.name,
        testType: config.type,
        concurrency: config.concurrency,
        duration: config.duration,
      });

      const result = await runner.execute();
      this.testHistory.push(result);

      logger.info('性能测试完成', {
        type: 'performance_test',
        testId,
        testName: config.name,
        passed: result.passed,
        totalRequests: result.summary.totalRequests,
        averageResponseTime: result.summary.averageResponseTime,
        errorRate: result.summary.errorRate,
      });

      securityAudit.logEvent({
        type: 'system_event' as any,
        severity: result.passed ? ('low' as any) : ('medium' as any),
        title: `性能测试${result.passed ? '通过' : '失败'}`,
        description: `${config.name}测试${result.passed ? '通过' : '失败'}，平均响应时间: ${result.summary.averageResponseTime}ms`,
        outcome: result.passed ? 'success' : 'failure',
        metadata: {
          testId,
          testName: config.name,
          testType: config.type,
          summary: result.summary,
        },
      });

      return testId;

    } catch (error) {
      logger.error('性能测试执行失败', error as Error, {
        type: 'performance_test',
        testId,
        testName: config.name,
      });

      throw error;

    } finally {
      this.runningTests.delete(testId);
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId: string): {
    status: 'running' | 'completed' | 'failed' | 'not_found';
    progress?: number;
    result?: TestResult;
  } {
    const runner = this.runningTests.get(testId);

    if (!runner) {
      // 检查是否在历史记录中
      const historyResult = this.testHistory.find(result => result.id === testId);
      if (historyResult) {
        return {
          status: 'completed',
          result: historyResult,
        };
      }

      return { status: 'not_found' };
    }

    return {
      status: 'running',
      progress: runner.getProgress(),
    };
  }

  /**
   * 生成测试ID
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成性能基准
   */
  generateBenchmark(testResults: TestResult[], name: string): PerformanceBenchmark {
    const baseline = this.benchmarks[0]?.results[0]; // 使用第一个基准作为基线
    const environment = process.env.NODE_ENV || 'development';

    const benchmark: PerformanceBenchmark = {
      name,
      version: '1.0.0',
      date: new Date(),
      environment,
      results: testResults,
      baseline,
      comparison: baseline ? this.compareResults(testResults[0], baseline) : {
        responseTimeChange: 0,
        throughputChange: 0,
        errorRateChange: 0,
        overallPerformance: 'stable' as const,
      },
    };

    this.benchmarks.push(benchmark);

    logger.info('性能基准已生成', {
      type: 'performance_benchmark',
      benchmarkName: name,
      resultsCount: testResults.length,
      overallPerformance: benchmark.comparison.overallPerformance,
    });

    return benchmark;
  }

  /**
   * 比较测试结果
   */
  private compareResults(current: TestResult, baseline: TestResult) {
    const responseTimeChange = ((current.summary.averageResponseTime - baseline.summary.averageResponseTime) / baseline.summary.averageResponseTime) * 100;
    const throughputChange = ((current.summary.throughput - baseline.summary.throughput) / baseline.summary.throughput) * 100;
    const errorRateChange = current.summary.errorRate - baseline.summary.errorRate;

    let overallPerformance: 'improved' | 'degraded' | 'stable' = 'stable';

    if (responseTimeChange < -10 && throughputChange > 5 && errorRateChange <= 0) {
      overallPerformance = 'improved';
    } else if (responseTimeChange > 10 || throughputChange < -5 || errorRateChange > 1) {
      overallPerformance = 'degraded';
    }

    return {
      responseTimeChange,
      throughputChange,
      errorRateChange,
      overallPerformance,
    };
  }

  /**
   * 获取测试历史
   */
  getTestHistory(limit?: number): TestResult[] {
    const history = [...this.testHistory].sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 获取基准列表
   */
  getBenchmarks(): PerformanceBenchmark[] {
    return [...this.benchmarks].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(testId: string): {
    test: TestResult;
    analysis: {
      performanceTrend: 'improving' | 'stable' | 'degrading';
      bottlenecks: string[];
      recommendations: string[];
      riskAssessment: 'low' | 'medium' | 'high';
    };
  } | null {
    const test = this.testHistory.find(t => t.id === testId);
    if (!test) return null;

    const analysis = this.analyzeTestResult(test);

    return {
      test,
      analysis,
    };
  }

  /**
   * 分析测试结果
   */
  private analyzeTestResult(test: TestResult) {
    const recommendations: string[] = [];
    const bottlenecks: string[] = [];

    // 分析响应时间
    if (test.summary.averageResponseTime > test.config.thresholds.responseTime.avg) {
      bottlenecks.push('平均响应时间超过阈值');
      recommendations.push('优化数据库查询和缓存策略');
    }

    if (test.summary.p95 > test.config.thresholds.responseTime.p95) {
      bottlenecks.push('95百分位响应时间过长');
      recommendations.push('检查长尾请求并优化热点代码');
    }

    // 分析错误率
    if (test.summary.errorRate > test.config.thresholds.errorRate) {
      bottlenecks.push('错误率过高');
      recommendations.push('检查错误日志并修复异常处理');
    }

    // 分析吞吐量
    if (test.summary.throughput < test.config.thresholds.throughput.min) {
      bottlenecks.push('吞吐量不足');
      recommendations.push('增加服务器资源或优化代码性能');
    }

    // 风险评估
    let riskAssessment: 'low' | 'medium' | 'high' = 'low';
    if (bottlenecks.length > 3 || test.summary.errorRate > 5) {
      riskAssessment = 'high';
    } else if (bottlenecks.length > 1 || test.summary.errorRate > 1) {
      riskAssessment = 'medium';
    }

    // 性能趋势分析
    const recentTests = this.testHistory
      .filter(t => t.config.name === test.config.name)
      .slice(-5);

    let performanceTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentTests.length >= 3) {
      const recent = recentTests.slice(-3);
      const times = recent.map(t => t.summary.averageResponseTime);
      if (times[times.length - 1] < times[0]) {
        performanceTrend = 'improving';
      } else if (times[times.length - 1] > times[0]) {
        performanceTrend = 'degrading';
      }
    }

    return {
      performanceTrend,
      bottlenecks,
      recommendations,
      riskAssessment,
    };
  }

  /**
   * 清理测试历史
   */
  cleanupHistory(olderThanDays: number = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.testHistory.length;

    this.testHistory = this.testHistory.filter(test => test.endTime > cutoffDate);

    logger.info('性能测试历史已清理', {
      type: 'performance_test',
      removedCount: beforeCount - this.testHistory.length,
      remainingCount: this.testHistory.length,
    });
  }
}

/**
 * 测试运行器
 */
class TestRunner {
  private testId: string;
  private config: TestConfig;
  private startTime?: Date;
  private endTime?: Date;
  private isRunning = false;
  private progress = 0;

  private responseTimes: number[] = [];
  private errors: TestResult['details']['errors'] = [];
  private timeline: TestResult['details']['timeline'] = [];

  constructor(testId: string, config: TestConfig) {
    this.testId = testId;
    this.config = config;
  }

  /**
   * 执行测试
   */
  async execute(): Promise<TestResult> {
    this.startTime = new Date();
    this.isRunning = true;

    try {
      // 启动并发用户
      const promises = [];
      for (let i = 0; i < this.config.concurrency; i++) {
        const delay = (i / this.config.concurrency) * this.config.rampUp * 1000;
        promises.push(this.runUser(i, delay));
      }

      // 等待所有用户完成
      await Promise.all(promises);

      this.endTime = new Date();
      this.isRunning = false;

      return this.generateResult();

    } catch (error) {
      this.endTime = new Date();
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 运行单个用户
   */
  private async runUser(userId: number, startDelay: number): Promise<void> {
    // 等待启动时间
    await new Promise(resolve => setTimeout(resolve, startDelay));

    const endTime = Date.now() + this.config.duration * 1000;
    const requests = this.config.scenarios?.[0]?.requests || [{
      name: 'default',
      url: this.config.target.url,
      method: this.config.target.method,
      headers: this.config.target.headers,
      body: this.config.target.body,
    }];

    while (Date.now() < endTime && this.isRunning) {
      for (const request of requests) {
        if (!this.isRunning) break;

        try {
          const responseTime = await this.executeRequest(request);
          this.responseTimes.push(responseTime);

        } catch (error) {
          this.errors.push({
            timestamp: new Date(),
            error: error instanceof Error ? error.message : '未知错误',
          });
        }

        // 思考时间
        if (request.thinkTime) {
          await new Promise(resolve => setTimeout(resolve, request.thinkTime));
        }
      }

      // 更新进度
      this.progress = Math.min(100, ((Date.now() - (this.startTime?.getTime() || 0)) / (this.config.duration * 1000)) * 100);
    }
  }

  /**
   * 执行单个请求
   */
  private async executeRequest(request: TestRequest): Promise<number> {
    const startTime = performance.now();

    try {
      const options: RequestInit = {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers,
        },
      };

      if (request.body && (request.method === 'POST' || request.method === 'PUT')) {
        options.body = JSON.stringify(request.body);
      }

      const response = await fetch(request.url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return performance.now() - startTime;

    } catch (error) {
      this.errors.push({
        timestamp: new Date(),
        error: error instanceof Error ? error.message : '请求失败',
      });
      throw error;
    }
  }

  /**
   * 生成测试结果
   */
  private generateResult(): TestResult {
    const duration = this.endTime!.getTime() - this.startTime!.getTime() / 1000;
    const totalRequests = this.responseTimes.length + this.errors.length;
    const successfulRequests = this.responseTimes.length;
    const failedRequests = this.errors.length;

    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    const summary = {
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      averageResponseTime,
      minResponseTime: sortedTimes[0] || 0,
      maxResponseTime: sortedTimes[sortedTimes.length - 1] || 0,
      p50: this.percentile(sortedTimes, 0.5),
      p95: this.percentile(sortedTimes, 0.95),
      p99: this.percentile(sortedTimes, 0.99),
      throughput: totalRequests / duration,
    };

    const passed = this.evaluateThresholds(summary);

    return {
      id: this.testId,
      config: this.config,
      startTime: this.startTime!,
      endTime: this.endTime!,
      duration,
      summary,
      details: {
        responseTimes: this.responseTimes,
        errors: this.errors,
        timeline: this.timeline,
      },
      passed,
      recommendations: this.generateRecommendations(summary, passed),
    };
  }

  /**
   * 计算百分位数
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * 评估阈值
   */
  private evaluateThresholds(summary: TestResult['summary']): boolean {
    const thresholds = this.config.thresholds;

    return (
      summary.averageResponseTime <= thresholds.responseTime.avg &&
      summary.p95 <= thresholds.responseTime.p95 &&
      summary.p99 <= thresholds.responseTime.p99 &&
      summary.errorRate <= thresholds.errorRate &&
      summary.throughput >= thresholds.throughput.min
    );
  }

  /**
   * 生成建议
   */
  private generateRecommendations(summary: TestResult['summary'], passed: boolean): string[] {
    const recommendations: string[] = [];

    if (!passed) {
      if (summary.averageResponseTime > this.config.thresholds.responseTime.avg) {
        recommendations.push('优化平均响应时间，当前值超过阈值');
      }

      if (summary.p95 > this.config.thresholds.responseTime.p95) {
        recommendations.push('优化95百分位响应时间，改善用户体验');
      }

      if (summary.errorRate > this.config.thresholds.errorRate) {
        recommendations.push('降低错误率，检查系统稳定性');
      }

      if (summary.throughput < this.config.thresholds.throughput.min) {
        recommendations.push('提高系统吞吐量，考虑增加资源或优化代码');
      }
    } else {
      recommendations.push('性能测试通过，系统表现良好');
    }

    return recommendations;
  }

  /**
   * 获取进度
   */
  getProgress(): number {
    return this.progress;
  }
}

// 创建单例实例
export const performanceTestManager = PerformanceTestManager.getInstance();

// 导出便捷方法
export const runPerformanceTest = (config: TestConfig) => performanceTestManager.runTest(config);
export const getTestStatus = (testId: string) => performanceTestManager.getTestStatus(testId);
export const generateBenchmark = (results: TestResult[], name: string) => performanceTestManager.generateBenchmark(results, name);

export default performanceTestManager;
