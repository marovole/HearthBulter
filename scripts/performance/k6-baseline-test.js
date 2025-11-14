/**
 * K6 性能基线测试
 *
 * 测试目标:
 * - 记录 Prisma 模式下的性能基线
 * - 为双写模式和 Supabase 模式提供对比参考
 *
 * 运行方式:
 * ```bash
 * # 安装 k6: brew install k6 (macOS) 或 https://k6.io/docs/getting-started/installation/
 *
 * # 运行基线测试(本地开发环境)
 * k6 run scripts/performance/k6-baseline-test.js
 *
 * # 运行压力测试(生产环境)
 * k6 run --vus 50 --duration 5m scripts/performance/k6-baseline-test.js
 *
 * # 生成HTML报告
 * k6 run --out json=baseline-report.json scripts/performance/k6-baseline-test.js
 * ```
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ============================================================================
// 配置
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token'; // 需要提前获取有效token

// 自定义指标
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const dbQueryTime = new Trend('db_query_time');

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // 预热: 逐步增加到10个并发用户
    { duration: '2m', target: 10 },   // 平稳运行: 保持10个并发用户
    { duration: '30s', target: 20 },  // 负载增加: 20个并发用户
    { duration: '1m', target: 20 },   // 平稳运行
    { duration: '30s', target: 0 },   // 冷却: 逐步减少到0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95%的请求延迟<500ms
    'http_req_failed': ['rate<0.01'],   // 错误率<1%
    'errors': ['rate<0.01'],            // 自定义错误率<1%
  },
};

// ============================================================================
// 辅助函数
// ============================================================================

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

function makeRequest(method, url, body = null) {
  const startTime = new Date().getTime();

  const params = {
    headers,
    timeout: '10s',
  };

  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${url}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${url}`, JSON.stringify(body), params);
  } else if (method === 'PATCH') {
    response = http.patch(`${BASE_URL}${url}`, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    response = http.del(`${BASE_URL}${url}`, null, params);
  }

  const endTime = new Date().getTime();
  const latency = endTime - startTime;

  // 记录指标
  apiLatency.add(latency);

  const success = check(response, {
    'status is 200-299': (r) => r.status >= 200 && r.status < 300,
    'response has body': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!success);

  return response;
}

// ============================================================================
// 测试场景
// ============================================================================

/**
 * 场景 1: 低风险 CRUD 操作
 */
export function scenario1_lowRiskCrud() {
  group('Low-Risk CRUD Operations', () => {
    // 1.1 查询食物分类
    group('GET /api/foods/categories/VEGETABLES', () => {
      const res = makeRequest('GET', '/api/foods/categories/VEGETABLES?limit=20');

      check(res, {
        'returns food list': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.data && Array.isArray(data.data);
          } catch (e) {
            return false;
          }
        },
      });
    });

    sleep(0.5);

    // 1.2 查询热门食物
    group('GET /api/foods/popular', () => {
      makeRequest('GET', '/api/foods/popular?limit=10');
    });

    sleep(0.5);

    // 1.3 食物搜索
    group('GET /api/foods/search', () => {
      makeRequest('GET', '/api/foods/search?q=apple&limit=10');
    });
  });
}

/**
 * 场景 2: 预算管理(写操作)
 */
export function scenario2_budgetOperations() {
  group('Budget Operations', () => {
    // 2.1 获取当前预算
    group('GET /api/budget/current', () => {
      makeRequest('GET', '/api/budget/current');
    });

    sleep(0.5);

    // 2.2 记录支出(事务操作)
    group('POST /api/budget/record-spending', () => {
      const spending = {
        budgetId: 'test-budget-id',
        amount: 25.50,
        category: 'VEGETABLES',
        description: 'K6 performance test',
        purchaseDate: new Date().toISOString(),
      };

      const res = makeRequest('POST', '/api/budget/record-spending', spending);

      check(res, {
        'spending recorded': (r) => r.status === 200 || r.status === 201,
      });
    });

    sleep(0.5);

    // 2.3 查询支出历史
    group('GET /api/budget/spending-history', () => {
      makeRequest('GET', '/api/budget/spending-history?limit=20');
    });
  });
}

/**
 * 场景 3: 通知系统
 */
export function scenario3_notifications() {
  group('Notification System', () => {
    // 3.1 获取通知列表
    group('GET /api/notifications', () => {
      makeRequest('GET', '/api/notifications?limit=20');
    });

    sleep(0.5);

    // 3.2 标记通知已读
    group('POST /api/notifications/read', () => {
      const payload = {
        notificationIds: ['test-notification-1', 'test-notification-2'],
      };

      makeRequest('POST', '/api/notifications/read', payload);
    });
  });
}

/**
 * 场景 4: 分析查询(性能敏感)
 */
export function scenario4_analytics() {
  group('Analytics Queries', () => {
    // 4.1 趋势分析
    group('GET /api/analytics/trends', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      makeRequest('GET', `/api/analytics/trends?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`);
    });

    sleep(0.5);

    // 4.2 社交统计
    group('GET /api/social/stats', () => {
      makeRequest('GET', '/api/social/stats?period=30');
    });
  });
}

/**
 * 场景 5: AI 端点
 */
export function scenario5_aiEndpoints() {
  group('AI Endpoints', () => {
    // 5.1 AI 建议历史
    group('GET /api/ai/advice-history', () => {
      makeRequest('GET', '/api/ai/advice-history?limit=10&offset=0');
    });
  });
}

// ============================================================================
// 主测试函数
// ============================================================================

export default function() {
  // 每个虚拟用户(VU)执行不同的场景
  const scenarios = [
    scenario1_lowRiskCrud,
    scenario2_budgetOperations,
    scenario3_notifications,
    scenario4_analytics,
    scenario5_aiEndpoints,
  ];

  // 随机选择一个场景执行
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(1);
}

// ============================================================================
// 测试结束后的汇总
// ============================================================================

export function handleSummary(data) {
  console.log('\n=== 性能测试汇总 ===\n');

  const metrics = data.metrics;

  // HTTP 指标
  if (metrics.http_req_duration) {
    console.log('HTTP 请求延迟:');
    console.log(`  - P50: ${metrics.http_req_duration.values.p50.toFixed(2)}ms`);
    console.log(`  - P95: ${metrics.http_req_duration.values.p95.toFixed(2)}ms`);
    console.log(`  - P99: ${metrics.http_req_duration.values.p99.toFixed(2)}ms`);
    console.log(`  - 平均: ${metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    console.log(`  - 最大: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`);
  }

  // 请求统计
  if (metrics.http_reqs) {
    console.log('请求统计:');
    console.log(`  - 总请求数: ${metrics.http_reqs.values.count}`);
    console.log(`  - 请求速率: ${metrics.http_reqs.values.rate.toFixed(2)} req/s\n`);
  }

  // 错误率
  if (metrics.http_req_failed) {
    const errorPercent = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    console.log(`错误率: ${errorPercent}%\n`);
  }

  // 生成JSON报告
  return {
    'stdout': '',
    'baseline-report.json': JSON.stringify(data, null, 2),
  };
}
