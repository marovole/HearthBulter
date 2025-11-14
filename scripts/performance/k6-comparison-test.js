/**
 * K6 性能对比测试
 *
 * 用于对比不同数据库后端的性能差异:
 * - Prisma (单写模式)
 * - Supabase (单写模式)
 * - Dual Write (双写模式)
 *
 * 运行方式:
 * ```bash
 * # 测试 Prisma 模式
 * MODE=prisma k6 run scripts/performance/k6-comparison-test.js
 *
 * # 测试 Supabase 模式
 * MODE=supabase k6 run scripts/performance/k6-comparison-test.js
 *
 * # 测试双写模式
 * MODE=dual-write k6 run scripts/performance/k6-comparison-test.js
 *
 * # 生成对比报告
 * ./scripts/performance/run-comparison.sh
 * ```
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// 配置
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';
const MODE = __ENV.MODE || 'unknown'; // prisma, supabase, dual-write

// 自定义指标
const errorRate = new Rate(`${MODE}_errors`);
const apiLatency = new Trend(`${MODE}_api_latency`);
const successCount = new Counter(`${MODE}_success`);
const failureCount = new Counter(`${MODE}_failure`);

// 测试配置
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.05'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

// ============================================================================
// 测试用例
// ============================================================================

/**
 * 测试集 1: 读操作性能
 */
function testReadOperations() {
  group(`${MODE} - Read Operations`, () => {
    const endpoints = [
      { url: '/api/foods/popular?limit=20', name: 'Popular Foods' },
      { url: '/api/budget/current', name: 'Current Budget' },
      { url: '/api/notifications?limit=20', name: 'Notifications' },
      { url: '/api/recipes/search?q=chicken&limit=10', name: 'Recipe Search' },
    ];

    endpoints.forEach(({ url, name }) => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}${url}`, { headers });
      const latency = Date.now() - startTime;

      const success = check(res, {
        [`${name}: status 200`]: (r) => r.status === 200,
        [`${name}: has data`]: (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.data !== undefined;
          } catch {
            return false;
          }
        },
      });

      apiLatency.add(latency);
      errorRate.add(!success);

      if (success) {
        successCount.add(1);
      } else {
        failureCount.add(1);
      }

      sleep(0.2);
    });
  });
}

/**
 * 测试集 2: 写操作性能
 */
function testWriteOperations() {
  group(`${MODE} - Write Operations`, () => {
    // 2.1 记录支出(事务操作)
    const spendingPayload = {
      budgetId: 'test-budget-' + Date.now(),
      amount: Math.random() * 100,
      category: 'VEGETABLES',
      description: `K6 test - ${MODE} mode`,
      purchaseDate: new Date().toISOString(),
    };

    const startTime1 = Date.now();
    const res1 = http.post(
      `${BASE_URL}/api/budget/record-spending`,
      JSON.stringify(spendingPayload),
      { headers }
    );
    const latency1 = Date.now() - startTime1;

    const success1 = check(res1, {
      'Record Spending: status 200/201': (r) => r.status === 200 || r.status === 201,
    });

    apiLatency.add(latency1);
    errorRate.add(!success1);
    success1 ? successCount.add(1) : failureCount.add(1);

    sleep(0.5);

    // 2.2 创建通知
    const notificationPayload = {
      type: 'EXPIRY_ALERT',
      title: `K6 Test Notification - ${MODE}`,
      message: 'Performance testing notification',
    };

    const startTime2 = Date.now();
    const res2 = http.post(
      `${BASE_URL}/api/notifications`,
      JSON.stringify(notificationPayload),
      { headers }
    );
    const latency2 = Date.now() - startTime2;

    const success2 = check(res2, {
      'Create Notification: status 200/201': (r) => r.status === 200 || r.status === 201,
    });

    apiLatency.add(latency2);
    errorRate.add(!success2);
    success2 ? successCount.add(1) : failureCount.add(1);
  });
}

/**
 * 测试集 3: 复杂查询性能(分析、聚合)
 */
function testComplexQueries() {
  group(`${MODE} - Complex Queries`, () => {
    // 3.1 趋势分析
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const startTime1 = Date.now();
    const res1 = http.get(
      `${BASE_URL}/api/analytics/trends?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { headers }
    );
    const latency1 = Date.now() - startTime1;

    const success1 = check(res1, {
      'Trend Analysis: status 200': (r) => r.status === 200,
    });

    apiLatency.add(latency1);
    errorRate.add(!success1);
    success1 ? successCount.add(1) : failureCount.add(1);

    sleep(0.5);

    // 3.2 社交统计
    const startTime2 = Date.now();
    const res2 = http.get(
      `${BASE_URL}/api/social/stats?period=30`,
      { headers }
    );
    const latency2 = Date.now() - startTime2;

    const success2 = check(res2, {
      'Social Stats: status 200': (r) => r.status === 200,
    });

    apiLatency.add(latency2);
    errorRate.add(!success2);
    success2 ? successCount.add(1) : failureCount.add(1);

    sleep(0.5);

    // 3.3 AI 建议历史
    const startTime3 = Date.now();
    const res3 = http.get(
      `${BASE_URL}/api/ai/advice-history?limit=20&offset=0`,
      { headers }
    );
    const latency3 = Date.now() - startTime3;

    const success3 = check(res3, {
      'AI Advice History: status 200': (r) => r.status === 200,
    });

    apiLatency.add(latency3);
    errorRate.add(!success3);
    success3 ? successCount.add(1) : failureCount.add(1);
  });
}

// ============================================================================
// 主测试函数
// ============================================================================

export default function() {
  // 顺序执行所有测试集
  testReadOperations();
  sleep(0.5);

  testWriteOperations();
  sleep(0.5);

  testComplexQueries();
  sleep(1);
}

// ============================================================================
// 测试结束后的汇总
// ============================================================================

export function handleSummary(data) {
  const metrics = data.metrics;

  console.log(`\n=== ${MODE.toUpperCase()} 模式性能测试结果 ===\n`);

  // HTTP 延迟
  if (metrics.http_req_duration) {
    console.log('HTTP 请求延迟:');
    console.log(`  - P50: ${metrics.http_req_duration.values.p50.toFixed(2)}ms`);
    console.log(`  - P95: ${metrics.http_req_duration.values.p95.toFixed(2)}ms`);
    console.log(`  - P99: ${metrics.http_req_duration.values.p99.toFixed(2)}ms`);
    console.log(`  - 平均: ${metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    console.log(`  - 最大: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`);
  }

  // API 延迟(自定义指标)
  const latencyKey = `${MODE}_api_latency`;
  if (metrics[latencyKey]) {
    console.log('API 延迟(自定义指标):');
    console.log(`  - P50: ${metrics[latencyKey].values.p50.toFixed(2)}ms`);
    console.log(`  - P95: ${metrics[latencyKey].values.p95.toFixed(2)}ms`);
    console.log(`  - P99: ${metrics[latencyKey].values.p99.toFixed(2)}ms\n`);
  }

  // 请求统计
  const successKey = `${MODE}_success`;
  const failureKey = `${MODE}_failure`;

  if (metrics[successKey] && metrics[failureKey]) {
    const total = metrics[successKey].values.count + metrics[failureKey].values.count;
    const successRate = ((metrics[successKey].values.count / total) * 100).toFixed(2);

    console.log('请求统计:');
    console.log(`  - 成功: ${metrics[successKey].values.count}`);
    console.log(`  - 失败: ${metrics[failureKey].values.count}`);
    console.log(`  - 成功率: ${successRate}%\n`);
  }

  // 错误率
  const errorKey = `${MODE}_errors`;
  if (metrics[errorKey]) {
    const errorPercent = (metrics[errorKey].values.rate * 100).toFixed(2);
    console.log(`错误率: ${errorPercent}%\n`);
  }

  // 生成JSON报告
  return {
    'stdout': '',
    [`comparison-${MODE}.json`]: JSON.stringify({
      mode: MODE,
      timestamp: new Date().toISOString(),
      metrics: {
        latency: {
          p50: metrics.http_req_duration?.values.p50,
          p95: metrics.http_req_duration?.values.p95,
          p99: metrics.http_req_duration?.values.p99,
          avg: metrics.http_req_duration?.values.avg,
          max: metrics.http_req_duration?.values.max,
        },
        requests: {
          total: metrics.http_reqs?.values.count,
          success: metrics[successKey]?.values.count,
          failure: metrics[failureKey]?.values.count,
          rate: metrics.http_reqs?.values.rate,
        },
        errors: {
          rate: metrics[errorKey]?.values.rate,
        },
      },
    }, null, 2),
  };
}
