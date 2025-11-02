import { performanceTestManager, TestConfig, TestType } from './performance-testing';
import { logger } from '@/lib/logging/structured-logger';

// 基准测试套件配置
interface BenchmarkSuite {
  name: string;
  description: string;
  version: string;
  tests: TestConfig[];
  environment: {
    name: string;
    url: string;
    description: string;
  };
  schedule?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    time?: string; // for daily/weekly
  };
}

// 基准测试结果
interface BenchmarkSuiteResult {
  suiteId: string;
  suiteName: string;
  executedAt: Date;
  environment: string;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallScore: number; // 0-100
    performance: 'excellent' | 'good' | 'fair' | 'poor';
  };
  testResults: Array<{
    testName: string;
    passed: boolean;
    score: number;
    metrics: {
      responseTime: number;
      throughput: number;
      errorRate: number;
    };
  }>;
  recommendations: string[];
  comparison?: {
    previousScore: number;
    scoreChange: number;
    performanceTrend: 'improved' | 'stable' | 'degraded';
  };
}

/**
 * 基准测试套件管理器
 */
export class BenchmarkSuiteManager {
  private static instance: BenchmarkSuiteManager;
  private suites: Map<string, BenchmarkSuite> = new Map();
  private results: BenchmarkSuiteResult[] = [];
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.loadDefaultSuites();
    this.startScheduledJobs();
  }

  static getInstance(): BenchmarkSuiteManager {
    if (!BenchmarkSuiteManager.instance) {
      BenchmarkSuiteManager.instance = new BenchmarkSuiteManager();
    }
    return BenchmarkSuiteManager.instance;
  }

  /**
   * 加载默认测试套件
   */
  private loadDefaultSuites(): void {
    // API性能基准测试
    const apiBenchmarkSuite: BenchmarkSuite = {
      name: 'API Performance Benchmark',
      description: 'API接口性能基准测试',
      version: '1.0.0',
      environment: {
        name: process.env.NODE_ENV || 'development',
        url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        description: '本地开发环境',
      },
      tests: [
        {
          name: 'Food Search API Load Test',
          type: TestType.LOAD,
          duration: 60,
          concurrency: 50,
          rampUp: 10,
          target: {
            url: '/api/foods/search?q=chicken',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          thresholds: {
            responseTime: {
              avg: 200,
              p95: 500,
              p99: 1000,
            },
            errorRate: 1,
            throughput: {
              min: 100,
              max: 2000,
            },
          },
        },
        {
          name: 'User Profile API Load Test',
          type: TestType.LOAD,
          duration: 60,
          concurrency: 30,
          rampUp: 5,
          target: {
            url: '/api/user/profile',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          },
          thresholds: {
            responseTime: {
              avg: 150,
              p95: 300,
              p99: 600,
            },
            errorRate: 0.5,
            throughput: {
              min: 80,
              max: 1500,
            },
          },
        },
        {
          name: 'Nutrition Goals API Load Test',
          type: TestType.LOAD,
          duration: 60,
          concurrency: 20,
          rampUp: 5,
          target: {
            url: '/api/nutrition/goals',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
          },
          thresholds: {
            responseTime: {
              avg: 100,
              p95: 200,
              p99: 400,
            },
            errorRate: 0.5,
            throughput: {
              min: 60,
              max: 1000,
            },
          },
        },
      ],
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '02:00', // 凌晨2点执行
      },
    };

    // 页面加载性能基准测试
    const pageLoadBenchmarkSuite: BenchmarkSuite = {
      name: 'Page Load Performance Benchmark',
      description: '页面加载性能基准测试',
      version: '1.0.0',
      environment: {
        name: process.env.NODE_ENV || 'development',
        url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        description: '前端页面性能测试',
      },
      tests: [
        {
          name: 'Homepage Load Test',
          type: TestType.LOAD,
          duration: 30,
          concurrency: 10,
          rampUp: 3,
          target: {
            url: '/',
            method: 'GET',
          },
          thresholds: {
            responseTime: {
              avg: 800,
              p95: 1500,
              p99: 2500,
            },
            errorRate: 0,
            throughput: {
              min: 20,
              max: 100,
            },
          },
        },
        {
          name: 'Dashboard Load Test',
          type: TestType.LOAD,
          duration: 30,
          concurrency: 8,
          rampUp: 2,
          target: {
            url: '/dashboard',
            method: 'GET',
          },
          thresholds: {
            responseTime: {
              avg: 1200,
              p95: 2000,
              p99: 3000,
            },
            errorRate: 0,
            throughput: {
              min: 15,
              max: 80,
            },
          },
        },
      ],
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '03:00',
      },
    };

    this.suites.set('api-benchmark', apiBenchmarkSuite);
    this.suites.set('page-load-benchmark', pageLoadBenchmarkSuite);

    logger.info('基准测试套件已加载', {
      type: 'benchmark',
      suitesCount: this.suites.size,
      suites: Array.from(this.suites.keys()),
    });
  }

  /**
   * 启动定时任务
   */
  private startScheduledJobs(): void {
    for (const [suiteId, suite] of this.suites.entries()) {
      if (suite.schedule?.enabled) {
        this.scheduleSuite(suiteId, suite);
      }
    }
  }

  /**
   * 安排测试套件执行
   */
  private scheduleSuite(suiteId: string, suite: BenchmarkSuite): void {
    const { frequency, time } = suite.schedule!;

    const scheduleNextExecution = () => {
      const now = new Date();
      let nextExecution: Date;

      switch (frequency) {
        case 'hourly':
          nextExecution = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case 'daily':
          if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            nextExecution = new Date(now);
            nextExecution.setHours(hours, minutes, 0, 0);
            if (nextExecution <= now) {
              nextExecution.setDate(nextExecution.getDate() + 1);
            }
          } else {
            nextExecution = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          }
          break;
        case 'weekly':
          nextExecution = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          return;
      }

      const delay = nextExecution.getTime() - now.getTime();

      const timeout = setTimeout(async () => {
        try {
          await this.executeSuite(suiteId);
        } catch (error) {
          logger.error('定时基准测试执行失败', error as Error, {
            type: 'benchmark',
            suiteId,
            suiteName: suite.name,
          });
        }

        // 安排下一次执行
        scheduleNextExecution();
      }, delay);

      this.scheduledJobs.set(suiteId, timeout);

      logger.info('基准测试已安排', {
        type: 'benchmark',
        suiteId,
        suiteName: suite.name,
        nextExecution: nextExecution.toISOString(),
      });
    };

    scheduleNextExecution();
  }

  /**
   * 执行测试套件
   */
  async executeSuite(suiteId: string): Promise<BenchmarkSuiteResult> {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`测试套件不存在: ${suiteId}`);
    }

    logger.info('开始执行基准测试套件', {
      type: 'benchmark',
      suiteId,
      suiteName: suite.name,
      testsCount: suite.tests.length,
    });

    const executedAt = new Date();
    const testResults: BenchmarkSuiteResult['testResults'] = [];

    let totalTests = 0;
    let passedTests = 0;
    let totalScore = 0;

    // 逐个执行测试
    for (const testConfig of suite.tests) {
      totalTests++;
      const testUrl = suite.environment.url + testConfig.target.url;

      const modifiedConfig = {
        ...testConfig,
        target: {
          ...testConfig.target,
          url: testUrl,
        },
      };

      try {
        const testId = await performanceTestManager.runTest(modifiedConfig);
        const testStatus = performanceTestManager.getTestStatus(testId);

        if (testStatus.status === 'completed' && testStatus.result) {
          const result = testStatus.result;
          const score = this.calculateTestScore(result, testConfig.thresholds);
          const passed = result.passed;

          if (passed) passedTests++;
          totalScore += score;

          testResults.push({
            testName: testConfig.name,
            passed,
            score,
            metrics: {
              responseTime: result.summary.averageResponseTime,
              throughput: result.summary.throughput,
              errorRate: result.summary.errorRate,
            },
          });

          logger.info('基准测试完成', {
            type: 'benchmark',
            suiteId,
            testName: testConfig.name,
            passed,
            score,
            responseTime: result.summary.averageResponseTime,
            throughput: result.summary.throughput,
          });

        } else {
          testResults.push({
            testName: testConfig.name,
            passed: false,
            score: 0,
            metrics: {
              responseTime: 0,
              throughput: 0,
              errorRate: 100,
            },
          });
        }

      } catch (error) {
        logger.error('基准测试失败', error as Error, {
          type: 'benchmark',
          suiteId,
          testName: testConfig.name,
        });

        testResults.push({
          testName: testConfig.name,
          passed: false,
          score: 0,
          metrics: {
            responseTime: 0,
            throughput: 0,
            errorRate: 100,
          },
        });
      }
    }

    const overallScore = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;
    const performance = this.getPerformanceGrade(overallScore);

    const suiteResult: BenchmarkSuiteResult = {
      suiteId,
      suiteName: suite.name,
      executedAt,
      environment: suite.environment.name,
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        overallScore,
        performance,
      },
      testResults,
      recommendations: this.generateSuiteRecommendations(testResults, overallScore),
    };

    // 与上次结果比较
    const previousResult = this.results.find(r => r.suiteId === suiteId);
    if (previousResult) {
      suiteResult.comparison = {
        previousScore: previousResult.summary.overallScore,
        scoreChange: overallScore - previousResult.summary.overallScore,
        performanceTrend: this.getPerformanceTrend(overallScore, previousResult.summary.overallScore),
      };
    }

    this.results.push(suiteResult);

    // 保留最近30次结果
    if (this.results.length > 30) {
      this.results = this.results.slice(-30);
    }

    logger.info('基准测试套件执行完成', {
      type: 'benchmark',
      suiteId,
      suiteName: suite.name,
      overallScore,
      performance,
      passedTests,
      totalTests,
    });

    return suiteResult;
  }

  /**
   * 计算测试分数
   */
  private calculateTestScore(result: any, thresholds: any): number {
    let score = 100;

    // 响应时间评分 (40%)
    const responseTimeScore = this.calculateResponseTimeScore(
      result.summary.averageResponseTime,
      thresholds.responseTime
    );
    score = score * 0.6 + responseTimeScore * 0.4;

    // 错误率评分 (30%)
    const errorRateScore = Math.max(0, 100 - (result.summary.errorRate * 10));
    score = score * 0.7 + errorRateScore * 0.3;

    // 吞吐量评分 (30%)
    const throughputScore = this.calculateThroughputScore(
      result.summary.throughput,
      thresholds.throughput
    );
    score = score * 0.7 + throughputScore * 0.3;

    return Math.round(score);
  }

  /**
   * 计算响应时间分数
   */
  private calculateResponseTimeScore(actualTime: number, threshold: any): number {
    if (actualTime <= threshold.avg) return 100;
    if (actualTime >= threshold.p99) return 0;

    const range = threshold.p99 - threshold.avg;
    const excess = actualTime - threshold.avg;
    return Math.max(0, 100 - (excess / range) * 100);
  }

  /**
   * 计算吞吐量分数
   */
  private calculateThroughputScore(actualThroughput: number, threshold: any): number {
    if (actualThroughput >= threshold.max) return 100;
    if (actualThroughput <= threshold.min) return 50;

    const range = threshold.max - threshold.min;
    const excess = actualThroughput - threshold.min;
    return 50 + (excess / range) * 50;
  }

  /**
   * 获取性能等级
   */
  private getPerformanceGrade(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * 获取性能趋势
   */
  private getPerformanceTrend(currentScore: number, previousScore: number): 'improved' | 'stable' | 'degraded' {
    const change = currentScore - previousScore;
    if (change > 5) return 'improved';
    if (change < -5) return 'degraded';
    return 'stable';
  }

  /**
   * 生成套件建议
   */
  private generateSuiteRecommendations(testResults: BenchmarkSuiteResult['testResults'], overallScore: number): string[] {
    const recommendations: string[] = [];

    // 基于整体分数的建议
    if (overallScore < 60) {
      recommendations.push('系统性能需要显著改进，建议进行全面性能优化');
    } else if (overallScore < 80) {
      recommendations.push('系统性能有改进空间，建议优化关键瓶颈');
    }

    // 基于失败测试的建议
    const failedTests = testResults.filter(t => !t.passed);
    if (failedTests.length > 0) {
      recommendations.push(`有 ${failedTests.length} 个测试未通过，需要优先解决`);
      failedTests.forEach(test => {
        if (test.metrics.responseTime > 1000) {
          recommendations.push(`优化 ${test.testName} 的响应时间`);
        }
        if (test.metrics.errorRate > 1) {
          recommendations.push(`降低 ${test.testName} 的错误率`);
        }
        if (test.metrics.throughput < 50) {
          recommendations.push(`提高 ${test.testName} 的吞吐量`);
        }
      });
    }

    // 基于低分测试的建议
    const lowScoreTests = testResults.filter(t => t.score < 70);
    if (lowScoreTests.length > 0) {
      recommendations.push('关注低分测试项目，这些是性能瓶颈所在');
    }

    return recommendations;
  }

  /**
   * 添加测试套件
   */
  addSuite(suiteId: string, suite: BenchmarkSuite): void {
    this.suites.set(suiteId, suite);

    // 如果有定时任务，重新安排
    if (suite.schedule?.enabled) {
      const existingJob = this.scheduledJobs.get(suiteId);
      if (existingJob) {
        clearTimeout(existingJob);
      }
      this.scheduleSuite(suiteId, suite);
    }

    logger.info('基准测试套件已添加', {
      type: 'benchmark',
      suiteId,
      suiteName: suite.name,
    });
  }

  /**
   * 移除测试套件
   */
  removeSuite(suiteId: string): void {
    // 取消定时任务
    const job = this.scheduledJobs.get(suiteId);
    if (job) {
      clearTimeout(job);
      this.scheduledJobs.delete(suiteId);
    }

    // 删除套件
    this.suites.delete(suiteId);

    logger.info('基准测试套件已移除', {
      type: 'benchmark',
      suiteId,
    });
  }

  /**
   * 获取测试套件列表
   */
  getSuites(): Array<{ id: string; suite: BenchmarkSuite }> {
    return Array.from(this.suites.entries()).map(([id, suite]) => ({ id, suite }));
  }

  /**
   * 获取测试结果
   */
  getResults(suiteId?: string, limit?: number): BenchmarkSuiteResult[] {
    let results = this.results;
    if (suiteId) {
      results = results.filter(r => r.suiteId === suiteId);
    }

    results = results.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    return limit ? results.slice(0, limit) : results;
  }

  /**
   * 获取最新结果
   */
  getLatestResults(): { [suiteId: string]: BenchmarkSuiteResult | null } {
    const latest: { [suiteId: string]: BenchmarkSuiteResult | null } = {};

    for (const suiteId of this.suites.keys()) {
      const results = this.getResults(suiteId, 1);
      latest[suiteId] = results.length > 0 ? results[0] : null;
    }

    return latest;
  }

  /**
   * 生成性能趋势报告
   */
  generateTrendReport(suiteId: string, days: number = 7): {
    suiteId: string;
    suiteName: string;
    period: { start: Date; end: Date };
    dataPoints: Array<{
      date: Date;
      score: number;
      performance: string;
      passedTests: number;
      totalTests: number;
    }>;
    trend: 'improving' | 'stable' | 'degrading';
    averageScore: number;
    recommendations: string[];
  } | null {
    const suite = this.suites.get(suiteId);
    if (!suite) return null;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const results = this.getResults(suiteId).filter(
      result => result.executedAt >= startDate && result.executedAt <= endDate
    );

    if (results.length === 0) return null;

    const dataPoints = results.map(result => ({
      date: result.executedAt,
      score: result.summary.overallScore,
      performance: result.summary.performance,
      passedTests: result.summary.passedTests,
      totalTests: result.summary.totalTests,
    }));

    const averageScore = Math.round(
      dataPoints.reduce((sum, point) => sum + point.score, 0) / dataPoints.length
    );

    const scores = dataPoints.map(point => point.score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    const trend = secondHalfAvg > firstHalfAvg + 5 ? 'improving' :
                  secondHalfAvg < firstHalfAvg - 5 ? 'degrading' : 'stable';

    const recommendations = this.generateTrendRecommendations(trend, averageScore);

    return {
      suiteId,
      suiteName: suite.name,
      period: { start: startDate, end: endDate },
      dataPoints,
      trend,
      averageScore,
      recommendations,
    };
  }

  /**
   * 生成趋势建议
   */
  private generateTrendRecommendations(trend: 'improving' | 'stable' | 'degrading', averageScore: number): string[] {
    const recommendations: string[] = [];

    if (trend === 'improving') {
      recommendations.push('性能趋势良好，继续保持当前的优化策略');
      if (averageScore >= 90) {
        recommendations.push('系统性能优秀，可以适当降低监控频率');
      }
    } else if (trend === 'degrading') {
      recommendations.push('性能呈下降趋势，需要立即分析和优化');
      recommendations.push('检查最近的代码变更和系统配置');
      recommendations.push('增加监控频率，密切关注性能变化');
    } else {
      recommendations.push('性能趋势稳定，继续监控并寻找优化机会');
      if (averageScore < 80) {
        recommendations.push('虽然趋势稳定，但整体性能有改进空间');
      }
    }

    return recommendations;
  }
}

// 创建单例实例
export const benchmarkSuiteManager = BenchmarkSuiteManager.getInstance();

// 导出便捷方法
export const executeBenchmarkSuite = (suiteId: string) => benchmarkSuiteManager.executeSuite(suiteId);
export const getBenchmarkSuites = () => benchmarkSuiteManager.getSuites();
export const getBenchmarkResults = (suiteId?: string, limit?: number) => benchmarkSuiteManager.getResults(suiteId, limit);
export const generateTrendReport = (suiteId: string, days?: number) => benchmarkSuiteManager.generateTrendReport(suiteId, days);

export default benchmarkSuiteManager;