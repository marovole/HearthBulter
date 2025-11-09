#!/usr/bin/env node

/**
 * 快速生成 API 路由测试的脚本
 * 为未覆盖的核心 API 路由生成基础测试模板
 */

const fs = require('fs');
const path = require('path');

// 定义需要生成测试的核心 API 路由
const CORE_API_ROUTES = [
  // 购物车相关
  'api/cart/route.ts',
  'api/cart/[id]/route.ts',
  'api/cart/add/route.ts',
  'api/cart/update/route.ts',

  // 电子商务平台
  'api/ecommerce/orders/route.ts',
  'api/ecommerce/orders/[id]/route.ts',
  'api/ecommerce/products/route.ts',
  'api/ecommerce/products/[id]/route.ts',
  'api/ecommerce/products/[id]/reviews/route.ts',

  // 支付相关
  'api/payment/checkout/route.ts',
  'api/payment/confirm/route.ts',
  'api/payment/webhook/route.ts',

  // 偏好设置
  'api/preferences/route.ts',
  'api/preferences/[id]/route.ts',

  // 提示模板
  'api/prompt-templates/route.ts',
  'api/prompt-templates/[id]/route.ts',

  // 报告
  'api/reports/route.ts',
  'api/reports/[id]/route.ts',
  'api/reports/[id]/download/route.ts',

  // 社交功能
  'api/social/leaderboard/route.ts',
  'api/social/stats/route.ts',
  'api/social/achievements/route.ts',
  'api/social/achievements/[id]/route.ts',
  'api/social/share/[token]/route.ts',

  // 标签
  'api/tags/route.ts',
  'api/tags/[id]/route.ts',

  // 任务
  'api/tasks/route.ts',
  'api/tasks/[id]/route.ts',
  'api/tasks/stats/route.ts',

  // 通知
  'api/notifications/route.ts',
  'api/notifications/[id]/route.ts',
  'api/notifications/settings/route.ts',

  // 设备
  'api/devices/route.ts',
  'api/devices/[id]/route.ts',
  'api/devices/sync/route.ts',

  // 订阅
  'api/subscription/route.ts',
  'api/subscription/plans/route.ts',
  'api/subscription/cancel/route.ts',
];

// 测试模板生成函数
function generateTestTemplate(apiPath) {
  const routeName = apiPath.replace(/\//g, '_').replace(/\.ts$/, '');
  const testPath = apiPath.replace('api/', '').replace(/\[(.*?)\]/g, '$$1'); // 将 [param] 转换为 $param

  return `/**
 * ${apiPath} API 测试
 * Generated test file - please expand with actual test cases
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock Next.js auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock database
jest.mock('@/lib/db', () => ({
  prisma: {
    // Add mock implementations based on the API requirements
  },
}));

describe('${routeName}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should handle GET request', async () => {
      // Import the route handler
      const { GET } = require('@/app/${apiPath.replace(/\.ts$/, '')}');

      // Setup mocks
      // TODO: Configure mocks based on actual API logic

      const { req, res } = createMocks({
        method: 'GET',
        url: '/${testPath}',
      });

      // Execute
      // const response = await GET(new NextRequest('http://localhost:3000/${testPath}'), { params: {} });

      // Assert
      // expect(response.status).toBeDefined();

      // TODO: Add more specific assertions
    });
  });

  describe('POST', () => {
    it('should handle POST request', async () => {
      // Import the route handler if POST exists
      // const { POST } = require('@/app/${apiPath.replace(/\.ts$/, '')}');

      // TODO: Implement POST test
    });
  });

  describe('PUT', () => {
    it('should handle PUT request', async () => {
      // TODO: Implement PUT test if applicable
    });
  });

  describe('DELETE', () => {
    it('should handle DELETE request', async () => {
      // TODO: Implement DELETE test if applicable
    });
  });
});
`;
}

// 生成测试文件
function generateTests() {
  console.log('🚀 开始生成 API 路由测试文件...\n');

  let generatedCount = 0;
  let skippedCount = 0;

  CORE_API_ROUTES.forEach(apiPath => {
    const sourcePath = path.join('src', 'app', apiPath);
    const testPath = path.join('src', '__tests__', 'api', apiPath.replace(/\.ts$/, '.test.ts'));

    // 检查源文件是否存在
    if (!fs.existsSync(sourcePath)) {
      console.log(`  ⚠️  跳过: ${sourcePath} 不存在`);
      skippedCount++;
      return;
    }

    // 检查测试文件是否已存在
    if (fs.existsSync(testPath)) {
      console.log(`  ⚠️  跳过: ${testPath} 已存在`);
      skippedCount++;
      return;
    }

    // 确保测试目录存在
    const testDir = path.dirname(testPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 生成测试文件
    const testContent = generateTestTemplate(apiPath);
    fs.writeFileSync(testPath, testContent);

    console.log(`  ✅ 已生成: ${testPath}`);
    generatedCount++;
  });

  console.log(`\n📊 生成完成！`);
  console.log(`   - 已生成: ${generatedCount} 个测试文件`);
  console.log(`   - 已跳过: ${skippedCount} 个文件`);
  console.log('\n⚠️  注意：生成的测试文件需要进一步补充实际的测试用例');
}

// 执行生成
generateTests();
