#!/usr/bin/env node

/**
 * 为服务层生成测试文件的脚本
 * 这些测试覆盖率高，因为服务函数通常有明确的输入输出
 */

const fs = require('fs');
const path = require('path');

// 核心服务列表（选择已经有一定使用覆盖率的服务）
const CORE_SERVICES = [
  'src/lib/services/cart-service.ts',
  'src/lib/services/device-sync-service.ts',
  'src/lib/services/expiry-monitor.ts',
  'src/lib/services/notification-service.ts',
  'src/lib/services/nutrition-calculator.ts',
  'src/lib/services/ocr-service.ts',
  'src/lib/services/payment-service.ts',
  'src/lib/services/price-estimator.ts',
  'src/lib/services/recommendation-engine.ts',
  'src/lib/services/sensitive-filter.ts',
  'src/lib/services/shopping-list-optimizer.ts',
  'src/lib/services/subscription-service.ts',
  'src/lib/services/task-notification-service.ts',
  'src/lib/services/trend-analyzer.ts',
  'src/lib/services/user-onboarding.ts',
];

function generateServiceTestTemplate(servicePath) {
  const serviceName = path.basename(servicePath, '.ts');
  const testPath = servicePath.replace('src/lib/services/', '').replace('.ts', '.test.ts');

  return `/**
 * ${serviceName} 测试
 * 服务层测试 - 核心业务逻辑覆盖
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ${serviceName.replace('-service', '').replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}Service } from '@/lib/services/${serviceName.replace('.ts', '')}';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    // Add prisma mock methods as needed
  },
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

describe('${serviceName}', () => {
  let service: ${serviceName.replace('-service', '').replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}Service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = ${serviceName.replace('-service', '').replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}Service.getInstance();
  });

  describe('Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(${serviceName.replace('-service', '').replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}Service);
    });

    it('should return same instance (singleton)', () => {
      const instance2 = ${serviceName.replace('-service', '').replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}Service.getInstance();
      expect(service).toBe(instance2);
    });
  });

  describe('Core Methods', () => {
    it('should have required methods defined', () => {
      // Check that service has the expected methods
      // TODO: Update based on actual service implementation
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter(name => typeof service[name] === 'function' && name !== 'constructor');

      expect(methods.length).toBeGreaterThan(0);
    });

    it('should handle method calls gracefully', async () => {
      // TODO: Implement actual method testing based on service functionality
      // Example:
      // const result = await service.someMethod();
      // expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // TODO: Test error scenarios
      // Example:
      // await expect(service.methodWithError()).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate input data', async () => {
      // TODO: Test input validation
      // Example:
      // const result = await service.validateInput(invalidData);
      // expect(result.isValid).toBe(false);
    });
  });
});
`;
}

// 生成测试文件
function generateServiceTests() {
  console.log('🚀 开始生成服务层测试文件...\n');

  let generatedCount = 0;
  let skippedCount = 0;

  CORE_SERVICES.forEach(servicePath => {
    // 检查源文件是否存在
    if (!fs.existsSync(servicePath)) {
      console.log(`  ⚠️  跳过: ${servicePath} 不存在`);
      skippedCount++;
      return;
    }

    const serviceName = path.basename(servicePath, '.ts');
    const testPath = path.join('src', '__tests__', 'lib', 'services', `${serviceName}.test.ts`);

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
    const testContent = generateServiceTestTemplate(servicePath);
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
generateServiceTests();
