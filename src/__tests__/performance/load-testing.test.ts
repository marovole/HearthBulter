/**
 * 负载测试
 * 测试系统在高并发、大数据量下的性能表现
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { NextRequest } from 'next/server';

// 负载测试配置
const LOAD_TEST_CONFIG = {
  // 并发用户数
  CONCURRENT_USERS: [10, 50, 100, 200],
  
  // 每用户请求数
  REQUESTS_PER_USER: 10,
  
  // 请求间隔 (毫秒)
  REQUEST_INTERVAL: 100,
  
  // 测试超时 (毫秒)
  TEST_TIMEOUT: 60000,
  
  // 性能基准
  BENCHMARKS: {
    RESPONSE_TIME: {
      EXCELLENT: 100,  // 优秀
      GOOD: 300,       // 良好
      ACCEPTABLE: 500,  // 可接受
      POOR: 1000,       // 较差
    },
    ERROR_RATE: {
      EXCELLENT: 0,    // 0%
      GOOD: 0.1,       // 0.1%
      ACCEPTABLE: 1,    // 1%
      POOR: 5,          // 5%
    },
    THROUGHPUT: {
      MIN: 100,        // 最小100 RPS
      GOOD: 500,       // 良好500 RPS
      EXCELLENT: 1000,  // 优秀1000 RPS
    },
  },
};

// 负载测试结果接口
interface LoadTestResult {
  concurrentUsers: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  errorRate: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  throughput: number // 每秒请求数
  duration: number
  errors: Array<{
    type: string
    message: string
    count: number
  }>
}

describe('负载测试', () => {
  const testResults: LoadTestResult[] = [];

  beforeAll(async () => {
    // 预热服务器
    await warmupServer();
  });

  afterAll(() => {
    // 生成负载测试报告
    generateLoadTestReport(testResults);
  });

  describe('基础负载测试', () => {
    test.concurrent.each(LOAD_TEST_CONFIG.CONCURRENT_USERS)(
      '应该处理 %d 个并发用户',
      async (concurrentUsers) => {
        const result = await runLoadTest({
          concurrentUsers,
          requestsPerUser: LOAD_TEST_CONFIG.REQUESTS_PER_USER,
          requestInterval: LOAD_TEST_CONFIG.REQUEST_INTERVAL,
          endpoint: '/api/families',
          method: 'GET',
        });

        testResults.push(result);

        // 验证基础性能指标
        expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.ACCEPTABLE);
        expect(result.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.RESPONSE_TIME.ACCEPTABLE);
        expect(result.throughput).toBeGreaterThan(LOAD_TEST_CONFIG.BENCHMARKS.THROUGHPUT.MIN);

        console.log(`并发用户 ${concurrentUsers}:`, {
          错误率: `${result.errorRate.toFixed(2)}%`,
          平均响应时间: `${result.averageResponseTime.toFixed(2)}ms`,
          吞吐量: `${result.throughput.toFixed(2)} RPS`,
        });
      },
      LOAD_TEST_CONFIG.TEST_TIMEOUT
    );
  });

  describe('API端点负载测试', () => {
    test('GET /api/families 负载测试', async () => {
      const result = await runLoadTest({
        concurrentUsers: 50,
        requestsPerUser: 20,
        requestInterval: 50,
        endpoint: '/api/families?page=1&limit=20',
        method: 'GET',
      });

      // 验证GET端点性能
      expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.GOOD);
      expect(result.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.RESPONSE_TIME.GOOD);
      expect(result.throughput).toBeGreaterThan(LOAD_TEST_CONFIG.BENCHMARKS.THROUGHPUT.GOOD);

      console.log('GET /api/families 负载测试结果:', formatTestResult(result));
    });

    test('POST /api/families 负载测试', async () => {
      const result = await runLoadTest({
        concurrentUsers: 20,
        requestsPerUser: 10,
        requestInterval: 200,
        endpoint: '/api/families',
        method: 'POST',
        body: {
          name: `负载测试家庭_${Date.now()}`,
          description: '负载测试用家庭',
        },
      });

      // 验证POST端点性能
      expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.ACCEPTABLE);
      expect(result.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.RESPONSE_TIME.ACCEPTABLE);

      console.log('POST /api/families 负载测试结果:', formatTestResult(result));
    });

    test('数据库查询负载测试', async () => {
      const result = await runLoadTest({
        concurrentUsers: 30,
        requestsPerUser: 15,
        requestInterval: 100,
        endpoint: '/api/families/members',
        method: 'GET',
      });

      // 验证数据库查询性能
      expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.ACCEPTABLE);
      expect(result.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.RESPONSE_TIME.GOOD);

      console.log('数据库查询负载测试结果:', formatTestResult(result));
    });
  });

  describe('安全负载测试', () => {
    test('SQL注入攻击负载测试', async () => {
      const result = await runLoadTest({
        concurrentUsers: 20,
        requestsPerUser: 10,
        requestInterval: 50,
        endpoint: '/api/users?id=1\'; DROP TABLE users; --',
        method: 'GET',
      });

      // 所有SQL注入请求都应该被阻止
      expect(result.errorRate).toBe(100);
      expect(result.failedRequests).toBe(result.totalRequests);

      console.log('SQL注入攻击负载测试结果:', formatTestResult(result));
    });

    test('XSS攻击负载测试', async () => {
      const result = await runLoadTest({
        concurrentUsers: 15,
        requestsPerUser: 8,
        requestInterval: 100,
        endpoint: '/api/profile',
        method: 'POST',
        body: {
          name: '<script>alert(\'XSS\')</script>',
          bio: '<img src=x onerror=alert(\'XSS\')>',
        },
      });

      // 所有XSS请求都应该被阻止
      expect(result.errorRate).toBe(100);
      expect(result.failedRequests).toBe(result.totalRequests);

      console.log('XSS攻击负载测试结果:', formatTestResult(result));
    });

    test('频率限制负载测试', async () => {
      const result = await runLoadTest({
        concurrentUsers: 10,
        requestsPerUser: 20,
        requestInterval: 10, // 快速请求触发频率限制
        endpoint: '/api/auth/login',
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      // 应该有部分请求被频率限制
      expect(result.errorRate).toBeGreaterThan(0);
      expect(result.throughput).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.THROUGHPUT.GOOD);

      console.log('频率限制负载测试结果:', formatTestResult(result));
    });
  });

  describe('内存和CPU负载测试', () => {
    test('大数据量处理测试', async () => {
      const largeData = {
        families: Array.from({ length: 1000 }, (_, i) => ({
          id: `family-${i}`,
          name: `家庭 ${i}`,
          members: Array.from({ length: 5 }, (_, j) => ({
            id: `member-${i}-${j}`,
            name: `成员 ${i}-${j}`,
            age: 20 + Math.floor(Math.random() * 60),
          })),
        })),
      };

      const result = await runLoadTest({
        concurrentUsers: 10,
        requestsPerUser: 5,
        requestInterval: 500,
        endpoint: '/api/families/batch',
        method: 'POST',
        body: largeData,
      });

      // 大数据量处理应该保持合理的性能
      expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.ACCEPTABLE);
      expect(result.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.RESPONSE_TIME.ACCEPTABLE);

      console.log('大数据量处理测试结果:', formatTestResult(result));
    });

    test('长时间稳定测试', async () => {
      const startTime = Date.now();
      const testDuration = 30000; // 30秒
      
      const result = await runContinuousLoadTest({
        concurrentUsers: 20,
        duration: testDuration,
        endpoint: '/api/families',
        method: 'GET',
      });

      const actualDuration = Date.now() - startTime;
      
      // 验证长时间稳定性
      expect(actualDuration).toBeGreaterThanOrEqual(testDuration * 0.9); // 允许10%误差
      expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.ACCEPTABLE);
      
      // 响应时间不应该持续增长
      expect(result.p99ResponseTime).toBeLessThan(result.averageResponseTime * 3);

      console.log('长时间稳定测试结果:', {
        持续时间: `${(actualDuration / 1000).toFixed(1)}s`,
        总请求数: result.totalRequests,
        平均响应时间: `${result.averageResponseTime.toFixed(2)}ms`,
        错误率: `${result.errorRate.toFixed(2)}%`,
      });
    });
  });

  describe('极限负载测试', () => {
    test('高并发极限测试', async () => {
      const result = await runLoadTest({
        concurrentUsers: 500,
        requestsPerUser: 5,
        requestInterval: 10,
        endpoint: '/api/families',
        method: 'GET',
      });

      // 在极限负载下，系统应该仍然可用
      expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.POOR);
      expect(result.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.RESPONSE_TIME.POOR);
      expect(result.throughput).toBeGreaterThan(0);

      console.log('高并发极限测试结果:', formatTestResult(result));
    });

    test('混合请求极限测试', async () => {
      const mixedEndpoints = [
        { endpoint: '/api/families', method: 'GET', weight: 40 },
        { endpoint: '/api/users', method: 'GET', weight: 30 },
        { endpoint: '/api/families/members', method: 'GET', weight: 20 },
        { endpoint: '/api/profile', method: 'POST', weight: 10 },
      ];

      const result = await runMixedLoadTest({
        concurrentUsers: 200,
        totalRequests: 1000,
        endpoints: mixedEndpoints,
      });

      // 混合请求应该保持合理的性能
      expect(result.errorRate).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.ERROR_RATE.ACCEPTABLE);
      expect(result.averageResponseTime).toBeLessThan(LOAD_TEST_CONFIG.BENCHMARKS.RESPONSE_TIME.ACCEPTABLE);

      console.log('混合请求极限测试结果:', formatTestResult(result));
    });
  });

  // 辅助函数
  async function warmupServer(): Promise<void> {
    const warmupRequests = 10;
    
    for (let i = 0; i < warmupRequests; i++) {
      try {
        await fetch('http://localhost:3000/api/health');
      } catch (error) {
        // 忽略预热错误
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async function runLoadTest(config: {
    concurrentUsers: number
    requestsPerUser: number
    requestInterval: number
    endpoint: string
    method: string
    body?: any
  }): Promise<LoadTestResult> {
    const startTime = Date.now();
    const requests: Promise<{
      success: boolean
      responseTime: number
      error?: string
    }>[] = [];

    // 生成所有请求
    for (let user = 0; user < config.concurrentUsers; user++) {
      for (let request = 0; request < config.requestsPerUser; request++) {
        const delay = user * config.requestInterval + request * config.requestInterval;
        
        requests.push(
          new Promise(resolve => {
            setTimeout(async () => {
              const requestStartTime = performance.now();
              
              try {
                const fetchOptions: RequestInit = {
                  method: config.method,
                  headers: { 'Content-Type': 'application/json' },
                };
                
                if (config.body && (config.method === 'POST' || config.method === 'PUT')) {
                  fetchOptions.body = JSON.stringify(config.body);
                }
                
                const response = await fetch(`http://localhost:3000${config.endpoint}`, fetchOptions);
                const responseTime = performance.now() - requestStartTime;
                
                resolve({
                  success: response.ok,
                  responseTime,
                  error: !response.ok ? `HTTP ${response.status}` : undefined,
                });
              } catch (error) {
                const responseTime = performance.now() - requestStartTime;
                
                resolve({
                  success: false,
                  responseTime,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }, delay);
          })
        );
      }
    }

    // 等待所有请求完成
    const results = await Promise.all(requests);
    const endTime = Date.now();

    // 计算统计信息
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const errorRate = (failedRequests / totalRequests) * 100;

    const responseTimes = results.map(r => r.responseTime);
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const p95ResponseTime = getPercentile(sortedTimes, 95);
    const p99ResponseTime = getPercentile(sortedTimes, 99);

    const duration = endTime - startTime;
    const throughput = (successfulRequests / duration) * 1000; // 每秒请求数

    // 错误分类统计
    const errorCounts = new Map<string, number>();
    results.filter(r => !r.success).forEach(r => {
      if (r.error) {
        errorCounts.set(r.error, (errorCounts.get(r.error) || 0) + 1);
      }
    });

    const errors = Array.from(errorCounts.entries()).map(([message, count]) => ({
      type: 'request_error',
      message,
      count,
    }));

    return {
      concurrentUsers: config.concurrentUsers,
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      duration,
      errors,
    };
  }

  async function runContinuousLoadTest(config: {
    concurrentUsers: number
    duration: number
    endpoint: string
    method: string
  }): Promise<LoadTestResult> {
    const startTime = Date.now();
    const endTime = startTime + config.duration;
    let requestCount = 0;
    const results: Array<{
      success: boolean
      responseTime: number
      error?: string
    }> = [];

    // 持续发送请求
    const sendRequests = async () => {
      while (Date.now() < endTime) {
        requestCount++;
        
        const requestStartTime = performance.now();
        
        try {
          const response = await fetch(`http://localhost:3000${config.endpoint}`, {
            method: config.method,
          });
          const responseTime = performance.now() - requestStartTime;
          
          results.push({
            success: response.ok,
            responseTime,
            error: !response.ok ? `HTTP ${response.status}` : undefined,
          });
        } catch (error) {
          const responseTime = performance.now() - requestStartTime;
          
          results.push({
            success: false,
            responseTime,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        
        // 控制请求间隔
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    // 并发发送请求
    const promises = Array.from({ length: config.concurrentUsers }, () => sendRequests());
    await Promise.all(promises);

    // 计算统计信息
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const errorRate = (failedRequests / totalRequests) * 100;

    const responseTimes = results.map(r => r.responseTime);
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const p95ResponseTime = getPercentile(sortedTimes, 95);
    const p99ResponseTime = getPercentile(sortedTimes, 99);

    const duration = Date.now() - startTime;
    const throughput = (successfulRequests / duration) * 1000;

    const errors: Array<{ type: string; message: string; count: number }> = [];

    return {
      concurrentUsers: config.concurrentUsers,
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      duration,
      errors,
    };
  }

  async function runMixedLoadTest(config: {
    concurrentUsers: number
    totalRequests: number
    endpoints: Array<{
      endpoint: string
      method: string
      weight: number
    }>
  }): Promise<LoadTestResult> {
    const startTime = Date.now();
    const requests: Promise<{
      success: boolean
      responseTime: number
      error?: string
    }>[] = [];

    // 根据权重生成请求序列
    const requestSequence: Array<{ endpoint: string; method: string }> = [];
    config.endpoints.forEach(({ endpoint, method, weight }) => {
      for (let i = 0; i < weight; i++) {
        requestSequence.push({ endpoint, method });
      }
    });

    // 随机打乱请求序列
    for (let i = requestSequence.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[requestSequence[i], requestSequence[j]] = [requestSequence[j], requestSequence[i]];
    }

    // 生成请求
    for (let i = 0; i < config.totalRequests; i++) {
      const { endpoint, method } = requestSequence[i % requestSequence.length];
      const delay = Math.floor(i / config.concurrentUsers) * 100;

      requests.push(
        new Promise(resolve => {
          setTimeout(async () => {
            const requestStartTime = performance.now();
            
            try {
              const response = await fetch(`http://localhost:3000${endpoint}`, {
                method,
              });
              const responseTime = performance.now() - requestStartTime;
              
              resolve({
                success: response.ok,
                responseTime,
                error: !response.ok ? `HTTP ${response.status}` : undefined,
              });
            } catch (error) {
              const responseTime = performance.now() - requestStartTime;
              
              resolve({
                success: false,
                responseTime,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }, delay);
        })
      );
    }

    // 等待所有请求完成
    const results = await Promise.all(requests);
    const endTime = Date.now();

    // 计算统计信息（同 runLoadTest）
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const errorRate = (failedRequests / totalRequests) * 100;

    const responseTimes = results.map(r => r.responseTime);
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const p95ResponseTime = getPercentile(sortedTimes, 95);
    const p99ResponseTime = getPercentile(sortedTimes, 99);

    const duration = endTime - startTime;
    const throughput = (successfulRequests / duration) * 1000;

    const errors: Array<{ type: string; message: string; count: number }> = [];

    return {
      concurrentUsers: config.concurrentUsers,
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      duration,
      errors,
    };
  }

  function getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  function formatTestResult(result: LoadTestResult): string {
    return JSON.stringify({
      并发用户: result.concurrentUsers,
      总请求数: result.totalRequests,
      成功请求数: result.successfulRequests,
      失败请求数: result.failedRequests,
      错误率: `${result.errorRate.toFixed(2)}%`,
      平均响应时间: `${result.averageResponseTime.toFixed(2)}ms`,
      最小响应时间: `${result.minResponseTime.toFixed(2)}ms`,
      最大响应时间: `${result.maxResponseTime.toFixed(2)}ms`,
      P95响应时间: `${result.p95ResponseTime.toFixed(2)}ms`,
      P99响应时间: `${result.p99ResponseTime.toFixed(2)}ms`,
      吞吐量: `${result.throughput.toFixed(2)} RPS`,
      持续时间: `${(result.duration / 1000).toFixed(1)}s`,
    }, null, 2);
  }

  function generateLoadTestReport(results: LoadTestResult[]): void {
    console.log('\n=== 负载测试报告 ===\n');
    
    results.forEach((result, index) => {
      console.log(`测试 ${index + 1}: 并发用户 ${result.concurrentUsers}`);
      console.log(`  总请求数: ${result.totalRequests}`);
      console.log(`  成功率: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
      console.log(`  平均响应时间: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`  P95响应时间: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`  吞吐量: ${result.throughput.toFixed(2)} RPS`);
      console.log('');
    });

    // 生成性能趋势分析
    if (results.length > 1) {
      console.log('=== 性能趋势分析 ===\n');
      
      const maxConcurrentUsers = Math.max(...results.map(r => r.concurrentUsers));
      const throughputAtMax = results.find(r => r.concurrentUsers === maxConcurrentUsers);
      
      if (throughputAtMax) {
        console.log(`最大并发用户数: ${maxConcurrentUsers}`);
        console.log(`最大吞吐量: ${throughputAtMax.throughput.toFixed(2)} RPS`);
        console.log(`响应时间: ${throughputAtMax.averageResponseTime.toFixed(2)}ms`);
        console.log(`错误率: ${throughputAtMax.errorRate.toFixed(2)}%`);
      }
    }
  }
});
