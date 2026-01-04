/**
 * 性能基准测试
 * 测试API响应时间、数据库查询性能、内存使用等关键指标
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { performance } from 'perf_hooks';
import { prisma } from '@/lib/db';
import { optimizedQuery } from '@/lib/middleware/query-optimization';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';
import { rateLimiter } from '@/lib/middleware/rate-limit-middleware';

// 性能基准配置
const BENCHMARK_CONFIG = {
  // 响应时间基准 (毫秒)
  RESPONSE_TIME: {
    FAST: 100, // 快速响应
    NORMAL: 500, // 正常响应
    SLOW: 1000, // 慢速响应
    CRITICAL: 2000, // 关键慢速
  },

  // 数据库查询基准 (毫秒)
  DATABASE_QUERY: {
    FAST: 50, // 快速查询
    NORMAL: 100, // 正常查询
    SLOW: 300, // 慢速查询
    CRITICAL: 500, // 关键慢查询
  },

  // 内存使用基准 (MB)
  MEMORY_USAGE: {
    LOW: 100, // 低内存使用
    NORMAL: 200, // 正常内存使用
    HIGH: 500, // 高内存使用
    CRITICAL: 1000, // 关键高内存
  },

  // 频率限制基准
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1分钟窗口
    MAX_REQUESTS: 100, // 最大请求数
  },
};

describe('性能基准测试', () => {
  beforeAll(async () => {
    // 清理测试数据
    await cleanupTestData();

    // 创建测试数据
    await createTestData();
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();

    // 清理性能监控数据
    performanceMonitor.clearAll();
  });

  beforeEach(() => {
    // 重置性能监控
    performanceMonitor.resetMetrics();

    // 清理频率限制记录
    rateLimiter.clearAll();
  });

  describe('API响应时间基准测试', () => {
    test('GET /api/families 响应时间应在基准范围内', async () => {
      const startTime = performance.now();

      const response = await fetch(
        'http://localhost:3000/api/families?page=1&limit=20',
      );
      const endTime = performance.now();

      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(BENCHMARK_CONFIG.RESPONSE_TIME.NORMAL);
      expect(responseTime).toBeGreaterThan(0);

      console.log(`GET /api/families 响应时间: ${responseTime.toFixed(2)}ms`);
    });

    test('POST /api/families 创建家庭响应时间应在基准范围内', async () => {
      const familyData = {
        name: `测试家庭_${Date.now()}`,
        description: '性能测试家庭',
      };

      const startTime = performance.now();

      const response = await fetch('http://localhost:3000/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(familyData),
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(BENCHMARK_CONFIG.RESPONSE_TIME.NORMAL);

      console.log(`POST /api/families 响应时间: ${responseTime.toFixed(2)}ms`);
    });

    test('分页查询响应时间应稳定', async () => {
      const pages = [1, 5, 10];
      const responseTimes: number[] = [];

      for (const page of pages) {
        const startTime = performance.now();

        const response = await fetch(
          `http://localhost:3000/api/families?page=${page}&limit=20`,
        );
        const endTime = performance.now();

        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);

        expect(response.ok).toBe(true);
      }

      // 验证响应时间稳定性 (标准差不应超过平均值的50%)
      const avgTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const variance =
        responseTimes.reduce(
          (acc, time) => acc + Math.pow(time - avgTime, 2),
          0,
        ) / responseTimes.length;
      const stdDev = Math.sqrt(variance);

      expect(stdDev).toBeLessThan(avgTime * 0.5);

      console.log(
        `分页查询平均响应时间: ${avgTime.toFixed(2)}ms, 标准差: ${stdDev.toFixed(2)}ms`,
      );
    });
  });

  describe('数据库查询性能基准测试', () => {
    test('家庭查询性能应满足基准', async () => {
      const iterations = 10;
      const queryTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        const families = await optimizedQuery.findMany('family', {
          take: 20,
          where: { deletedAt: null },
          include: {
            members: {
              where: { deletedAt: null },
              select: { id: true, name: true },
            },
          },
        });

        const endTime = performance.now();
        const queryTime = endTime - startTime;
        queryTimes.push(queryTime);

        expect(families).toBeDefined();
      }

      const avgQueryTime =
        queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxQueryTime = Math.max(...queryTimes);

      expect(avgQueryTime).toBeLessThan(BENCHMARK_CONFIG.DATABASE_QUERY.NORMAL);
      expect(maxQueryTime).toBeLessThan(BENCHMARK_CONFIG.DATABASE_QUERY.SLOW);

      console.log(
        `家庭查询平均时间: ${avgQueryTime.toFixed(2)}ms, 最大时间: ${maxQueryTime.toFixed(2)}ms`,
      );
    });

    test('家庭成员查询性能应满足基准', async () => {
      const iterations = 10;
      const queryTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        const members = await optimizedQuery.findMany('familyMember', {
          take: 50,
          where: { deletedAt: null },
          include: {
            family: {
              select: { id: true, name: true },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        const endTime = performance.now();
        const queryTime = endTime - startTime;
        queryTimes.push(queryTime);

        expect(members).toBeDefined();
      }

      const avgQueryTime =
        queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxQueryTime = Math.max(...queryTimes);

      expect(avgQueryTime).toBeLessThan(BENCHMARK_CONFIG.DATABASE_QUERY.NORMAL);
      expect(maxQueryTime).toBeLessThan(BENCHMARK_CONFIG.DATABASE_QUERY.SLOW);

      console.log(
        `家庭成员查询平均时间: ${avgQueryTime.toFixed(2)}ms, 最大时间: ${maxQueryTime.toFixed(2)}ms`,
      );
    });

    test('计数查询性能应满足基准', async () => {
      const iterations = 20;
      const queryTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        const count = await optimizedQuery.count('family', { deletedAt: null });

        const endTime = performance.now();
        const queryTime = endTime - startTime;
        queryTimes.push(queryTime);

        expect(count).toBeGreaterThanOrEqual(0);
      }

      const avgQueryTime =
        queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxQueryTime = Math.max(...queryTimes);

      expect(avgQueryTime).toBeLessThan(BENCHMARK_CONFIG.DATABASE_QUERY.FAST);
      expect(maxQueryTime).toBeLessThan(BENCHMARK_CONFIG.DATABASE_QUERY.NORMAL);

      console.log(
        `计数查询平均时间: ${avgQueryTime.toFixed(2)}ms, 最大时间: ${maxQueryTime.toFixed(2)}ms`,
      );
    });
  });

  describe('内存使用基准测试', () => {
    test('内存使用应在基准范围内', async () => {
      const initialMemory = process.memoryUsage();

      // 执行一系列操作
      await performMemoryIntensiveOperations();

      const finalMemory = process.memoryUsage();

      const memoryUsed =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      const heapUsedMB = finalMemory.heapUsed / 1024 / 1024; // MB

      expect(memoryUsed).toBeLessThan(BENCHMARK_CONFIG.MEMORY_USAGE.HIGH);
      expect(heapUsedMB).toBeLessThan(BENCHMARK_CONFIG.MEMORY_USAGE.CRITICAL);

      console.log(
        `内存使用增长: ${memoryUsed.toFixed(2)}MB, 总堆内存: ${heapUsedMB.toFixed(2)}MB`,
      );
    });

    test('内存泄漏检测', async () => {
      const initialMemory = process.memoryUsage();

      // 重复执行操作以检测内存泄漏
      for (let i = 0; i < 10; i++) {
        await performMemoryIntensiveOperations();

        // 强制垃圾回收 (如果可用)
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();

      const memoryGrowth =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      // 内存增长应低于阈值
      expect(memoryGrowth).toBeLessThan(BENCHMARK_CONFIG.MEMORY_USAGE.NORMAL);

      console.log(`10轮操作后内存增长: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('频率限制性能基准测试', () => {
    test('频率限制检查性能应满足基准', async () => {
      const iterations = 1000;
      const checkTimes: number[] = [];

      // 模拟请求
      for (let i = 0; i < iterations; i++) {
        const mockRequest = {
          url: 'http://localhost:3000/api/test',
          headers: {
            'x-forwarded-for': `192.168.1.${i % 255}`,
          },
        } as Request;

        const startTime = performance.now();

        const result = await rateLimiter.checkLimit(mockRequest, {
          windowMs: BENCHMARK_CONFIG.RATE_LIMIT.WINDOW_MS,
          maxRequests: BENCHMARK_CONFIG.RATE_LIMIT.MAX_REQUESTS,
          identifier: 'ip',
        });

        const endTime = performance.now();
        const checkTime = endTime - startTime;
        checkTimes.push(checkTime);

        expect(result).toBeDefined();
        expect(typeof result.allowed).toBe('boolean');
      }

      const avgCheckTime =
        checkTimes.reduce((a, b) => a + b, 0) / checkTimes.length;
      const maxCheckTime = Math.max(...checkTimes);

      expect(avgCheckTime).toBeLessThan(1); // 平均检查时间应小于1ms
      expect(maxCheckTime).toBeLessThan(5); // 最大检查时间应小于5ms

      console.log(
        `频率限制检查平均时间: ${avgCheckTime.toFixed(4)}ms, 最大时间: ${maxCheckTime.toFixed(4)}ms`,
      );
    });

    test('频率限制准确性测试', async () => {
      const ip = '192.168.1.100';
      const limit = 10;

      // 发送限制内的请求
      for (let i = 0; i < limit; i++) {
        const mockRequest = {
          url: 'http://localhost:3000/api/test',
          headers: { 'x-forwarded-for': ip },
        } as Request;

        const result = await rateLimiter.checkLimit(mockRequest, {
          windowMs: 60000,
          maxRequests: limit,
          identifier: 'ip',
        });

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit - i - 1);
      }

      // 发送超出限制的请求
      const mockRequest = {
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-for': ip },
      } as Request;

      const result = await rateLimiter.checkLimit(mockRequest, {
        windowMs: 60000,
        maxRequests: limit,
        identifier: 'ip',
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);

      console.log(`频率限制准确性: 前${limit}次通过，第${limit + 1}次被限制`);
    });
  });

  describe('性能监控基准测试', () => {
    test('性能监控开销应低于基准', async () => {
      const iterations = 100;
      const monitoringTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const mockRequest = {
          url: `http://localhost:3000/api/test_${i}`,
          method: 'GET',
        } as NextRequest;

        const startTime = performance.now();

        const requestId = performanceMonitor.startMonitoring(mockRequest);

        // 模拟一些处理时间
        await new Promise((resolve) => setTimeout(resolve, 10));

        const response = new Response('OK', { status: 200 });
        performanceMonitor.endMonitoring(
          requestId,
          200,
          response as NextResponse,
        );

        const endTime = performance.now();
        const monitoringTime = endTime - startTime;
        monitoringTimes.push(monitoringTime);
      }

      const avgMonitoringTime =
        monitoringTimes.reduce((a, b) => a + b, 0) / monitoringTimes.length;

      expect(avgMonitoringTime).toBeLessThan(5); // 平均监控开销应小于5ms

      console.log(`性能监控平均开销: ${avgMonitoringTime.toFixed(4)}ms`);
    });

    test('性能指标收集准确性', async () => {
      // 清空之前的监控数据
      performanceMonitor.clearAll();

      // 执行一系列操作
      for (let i = 0; i < 10; i++) {
        const mockRequest = {
          url: `http://localhost:3000/api/test_${i}`,
          method: 'GET',
        } as NextRequest;

        const requestId = performanceMonitor.startMonitoring(mockRequest);

        // 模拟不同的响应时间
        await new Promise((resolve) =>
          setTimeout(resolve, 50 + Math.random() * 100),
        );

        const response = new Response('OK', { status: 200 });
        performanceMonitor.endMonitoring(
          requestId,
          200,
          response as NextResponse,
        );
      }

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.responseTime.total).toBe(10);
      expect(metrics.responseTime.avg).toBeGreaterThan(50);
      expect(metrics.responseTime.avg).toBeLessThan(150);
      expect(metrics.responseTime.min).toBeGreaterThan(0);
      expect(metrics.responseTime.max).toBeGreaterThan(
        metrics.responseTime.min,
      );
      expect(metrics.responseTime.p95).toBeGreaterThan(
        metrics.responseTime.min,
      );
      expect(metrics.responseTime.p99).toBeGreaterThan(
        metrics.responseTime.p95,
      );

      console.log(
        `性能指标收集准确性: 总请求数=${metrics.responseTime.total}, 平均响应时间=${metrics.responseTime.avg.toFixed(2)}ms`,
      );
    });
  });

  describe('并发性能基准测试', () => {
    test('并发请求处理性能', async () => {
      const concurrentRequests = 50;
      const requestTimes: number[] = [];

      const promises = Array.from(
        { length: concurrentRequests },
        async (_, i) => {
          const startTime = performance.now();

          const response = await fetch(
            `http://localhost:3000/api/families?page=${i + 1}&limit=10`,
          );
          const endTime = performance.now();

          const requestTime = endTime - startTime;
          requestTimes.push(requestTime);

          return { ok: response.ok, time: requestTime };
        },
      );

      const results = await Promise.all(promises);

      // 验证所有请求都成功
      results.forEach((result) => {
        expect(result.ok).toBe(true);
      });

      const avgTime =
        requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length;
      const maxTime = Math.max(...requestTimes);
      const minTime = Math.min(...requestTimes);

      expect(avgTime).toBeLessThan(BENCHMARK_CONFIG.RESPONSE_TIME.NORMAL * 2); // 并发时允许稍慢
      expect(maxTime).toBeLessThan(BENCHMARK_CONFIG.RESPONSE_TIME.CRITICAL);

      console.log(
        `并发${concurrentRequests}个请求: 平均=${avgTime.toFixed(2)}ms, 最大=${maxTime.toFixed(2)}ms, 最小=${minTime.toFixed(2)}ms`,
      );
    });
  });

  // 辅助函数
  async function cleanupTestData() {
    // 清理测试数据
    await prisma.familyMember.deleteMany({
      where: { name: { contains: '测试' } },
    });

    await prisma.family.deleteMany({
      where: { name: { contains: '测试' } },
    });
  }

  async function createTestData() {
    // 创建测试家庭
    const family = await prisma.family.create({
      data: {
        name: `性能测试家庭_${Date.now()}`,
        description: '性能测试用家庭',
      },
    });

    // 创建测试家庭成员
    for (let i = 0; i < 10; i++) {
      await prisma.familyMember.create({
        data: {
          name: `测试成员_${i}`,
          gender: 'OTHER',
          birthDate: new Date('1990-01-01'),
          familyId: family.id,
          role: 'MEMBER',
        },
      });
    }
  }

  async function performMemoryIntensiveOperations() {
    // 执行内存密集型操作
    const families = await optimizedQuery.findMany('family', {
      take: 100,
      where: { deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          include: {
            healthData: {
              take: 10,
              orderBy: { measuredAt: 'desc' },
            },
          },
        },
      },
    });

    // 处理数据以增加内存使用
    const processedData = families.map((family) => ({
      ...family,
      membersCount: family.members.length,
      processedAt: new Date(),
    }));

    return processedData;
  }
});
