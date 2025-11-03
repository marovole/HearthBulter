/**
 * 输入验证测试
 * 全面测试API输入验证、数据清理、错误处理等功能
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { validationMiddleware, commonSchemas } from '@/lib/middleware/validation-middleware';
import { SQLInjectionDetector, XSSDetector } from '@/lib/security/security-middleware';
import { checkSecurity } from '@/lib/security/security-middleware';

describe('输入验证测试', () => {
  describe('基础验证测试', () => {
    test('应该验证字符串输入', () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
      });

      const validInputs = [
        { name: 'John Doe' },
        { name: '正常中文' },
        { name: '用户123' },
        { name: 'a'.repeat(100) },
      ];

      const invalidInputs = [
        { name: '' },
        { name: 'a'.repeat(101) },
        { name: null },
        { name: undefined },
        { name: 123 },
      ];

      validInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
      });

      invalidInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    test('应该验证数字输入', () => {
      const schema = z.object({
        age: z.number().min(0).max(150),
        score: z.number().min(0).max(100).step(0.1),
      });

      const validInputs = [
        { age: 0, score: 0 },
        { age: 25, score: 85.5 },
        { age: 150, score: 100 },
      ];

      const invalidInputs = [
        { age: -1, score: -1 },
        { age: 151, score: 101 },
        { age: '25', score: '85.5' },
        { age: null, score: undefined },
      ];

      validInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
      });

      invalidInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    test('应该验证数组输入', () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1).max(10),
        scores: z.array(z.number().min(0).max(100)),
      });

      const validInputs = [
        { tags: ['tag1'], scores: [100, 85, 90] },
        { tags: ['tag1', 'tag2', 'tag3'], scores: [] },
        { tags: ['a', 'b', 'c', 'd', 'e'], scores: [50, 60, 70, 80, 90] },
      ];

      const invalidInputs = [
        { tags: [], scores: [101] },
        { tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10', 'tag11'], scores: [] },
        { tags: null, scores: [100] },
      ];

      validInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
      });

      invalidInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    test('应该验证日期输入', () => {
      const schema = z.object({
        birthDate: z.string().datetime(),
        appointmentDate: z.string().datetime().optional(),
      });

      const validInputs = [
        { birthDate: '1990-01-01T00:00:00.000Z' },
        { birthDate: '2024-12-31T23:59:59.999Z', appointmentDate: '2024-01-15T10:00:00.000Z' },
      ];

      const invalidInputs = [
        { birthDate: 'invalid-date' },
        { birthDate: '1990-13-01T00:00:00.000Z' },
        { birthDate: '1990-01-32T00:00:00.000Z' },
        { birthDate: 1234567890 },
      ];

      validInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(true);
      });

      invalidInputs.forEach(input => {
        const result = schema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('查询参数验证测试', () => {
    test('应该验证分页参数', () => {
      const testCases = [
        { query: 'page=1&limit=20', valid: true },
        { query: 'page=5&limit=50', valid: true },
        { query: 'page=0&limit=20', valid: false },
        { query: 'page=-1&limit=20', valid: false },
        { query: 'page=1&limit=0', valid: false },
        { query: 'page=1&limit=101', valid: false },
        { query: 'page=abc&limit=20', valid: false },
        { query: 'page=1&limit=abc', valid: false },
      ];

      testCases.forEach(({ query, valid }) => {
        const url = new URL(`http://localhost:3000/api/test?${query}`);
        const queryParams = Object.fromEntries(url.searchParams);
        
        const result = commonSchemas.pagination.safeParse(queryParams);
        
        if (valid) {
          expect(result.success).toBe(true);
          expect(result.data.page).toBeGreaterThan(0);
          expect(result.data.limit).toBeGreaterThan(0);
          expect(result.data.limit).toBeLessThanOrEqual(100);
        } else {
          expect(result.success).toBe(false);
        }
      });
    });

    test('应该验证搜索参数', () => {
      const testCases = [
        { query: 'term=John&filters={}', valid: true },
        { query: 'term=张三&filters={"status":"active"}', valid: true },
        { query: 'term=', valid: true },
        { query: `term=${'a'.repeat(101)}`, valid: false },
        { query: 'filters=invalid-json', valid: false },
      ];

      testCases.forEach(({ query, valid }) => {
        const url = new URL(`http://localhost:3000/api/test?${query}`);
        const queryParams = Object.fromEntries(url.searchParams);
        
        const result = commonSchemas.search.safeParse(queryParams);
        
        if (valid) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
        }
      });
    });

    test('应该验证排序参数', () => {
      const testCases = [
        { query: 'field=name&order=asc', valid: true },
        { query: 'field=createdAt&order=desc', valid: true },
        { query: 'field=invalid', valid: true }, // sort schema 不限制字段
        { query: 'field=name&order=invalid', valid: false },
      ];

      testCases.forEach(({ query, valid }) => {
        const url = new URL(`http://localhost:3000/api/test?${query}`);
        const queryParams = Object.fromEntries(url.searchParams);
        
        const result = commonSchemas.sort.safeParse(queryParams);
        
        if (valid) {
          expect(result.success).toBe(true);
          expect(['asc', 'desc']).toContain(result.data.order);
        } else {
          expect(result.success).toBe(false);
        }
      });
    });
  });

  describe('请求体验证测试', () => {
    test('应该验证JSON请求体', async () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        age: z.number().min(0).max(150),
      });

      const validBodies = [
        { name: 'John Doe', email: 'john@example.com', age: 25 },
        { name: '张三', email: 'zhangsan@example.com', age: 30 },
        { name: 'User', email: 'user@test.org', age: 0 },
      ];

      const invalidBodies = [
        { name: '', email: 'john@example.com', age: 25 },
        { name: 'John Doe', email: 'invalid-email', age: 25 },
        { name: 'John Doe', email: 'john@example.com', age: -1 },
        { name: 'John Doe', email: 'john@example.com', age: 151 },
      ];

      for (const body of validBodies) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await validationMiddleware.validateRequest(request, {
          body: schema,
        });

        expect(result.success).toBe(true);
        expect(result.data?.body).toEqual(body);
      }

      for (const body of invalidBodies) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await validationMiddleware.validateRequest(request, {
          body: schema,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      }
    });

    test('应该验证文件上传', async () => {
      const schema = z.object({
        name: z.string().min(1).max(255),
        type: z.string().regex(/^(image\/|text\/|application\/pdf)$/),
        size: z.number().max(50 * 1024 * 1024), // 50MB
        content: z.any(),
      });

      const validFiles = [
        { name: 'image.jpg', type: 'image/jpeg', size: 1024, content: Buffer.from('fake-image-data') },
        { name: 'document.pdf', type: 'application/pdf', size: 2048, content: Buffer.from('fake-pdf-data') },
        { name: 'notes.txt', type: 'text/plain', size: 512, content: Buffer.from('fake-text-data') },
      ];

      const invalidFiles = [
        { name: 'script.js', type: 'application/javascript', size: 1024, content: Buffer.from('fake-js-data') },
        { name: 'large.jpg', type: 'image/jpeg', size: 100 * 1024 * 1024, content: Buffer.from('fake-large-data') },
        { name: '', type: 'image/jpeg', size: 1024, content: Buffer.from('fake-data') },
      ];

      for (const file of validFiles) {
        const result = commonSchemas.file.safeParse(file);
        expect(result.success).toBe(true);
      }

      for (const file of invalidFiles) {
        const result = commonSchemas.file.safeParse(file);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('数据清理测试', () => {
    test('应该清理SQL注入字符', () => {
      const maliciousInputs = [
        '\'; DROP TABLE users; --',
        '\' OR \'1\'=\'1',
        'admin\'--',
        '\' UNION SELECT * FROM users --',
        '1; DELETE FROM users WHERE 1=1; --',
      ];

      maliciousInputs.forEach(input => {
        const sanitized = SQLInjectionDetector.sanitize(input);
        
        expect(sanitized).not.toContain('\'');
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('UNION');
        expect(sanitized).not.toContain('SELECT');
        expect(sanitized).not.toContain('DELETE');
      });
    });

    test('应该清理XSS字符', () => {
      const maliciousInputs = [
        '<script>alert(\'XSS\')</script>',
        '<img src=x onerror=alert(\'XSS\')>',
        'javascript:alert(\'XSS\')',
        '<svg onload=alert(\'XSS\')>',
        'expression(alert(\'XSS\'))',
      ];

      maliciousInputs.forEach(input => {
        const sanitized = XSSDetector.sanitize(input);
        
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('</script>');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('expression(');
      });
    });

    test('应该清理复杂对象', () => {
      const maliciousObject = {
        name: 'admin\'; DROP TABLE users; --',
        email: 'test@example.com',
        profile: {
          bio: '<script>alert(\'XSS\')</script>',
          tags: ['tag1', 'tag2<script>alert(\'XSS\')</script>'],
          metadata: {
            sql: '\'; DROP TABLE users; --',
            xss: '<img src=x onerror=alert(\'XSS\')>',
          },
        },
        array: [
          'normal',
          '\'; SELECT * FROM users --',
          '<script>alert(\'XSS\')</script>',
          { nested: '\'; DROP TABLE users; --' },
        ],
      };

      const sqlSanitized = SQLInjectionDetector.sanitize(maliciousObject);
      const xssSanitized = XSSDetector.sanitize(maliciousObject);

      // 检查SQL注入清理
      expect(sqlSanitized.name).not.toContain('\'');
      expect(sqlSanitized.name).not.toContain(';');
      expect(sqlSanitized.name).not.toContain('DROP');
      expect((sqlSanitized.profile as any).bio).not.toContain('\'');
      expect(((sqlSanitized.profile as any).metadata as any).sql).not.toContain('\'');

      // 检查XSS清理
      expect(xssSanitized.name).not.toContain('<script>');
      expect((xssSanitized.profile as any).bio).not.toContain('<script>');
      expect(((xssSanitized.profile as any).metadata as any).xss).not.toContain('<script>');
      expect((xssSanitized.array as string[])[2]).not.toContain('<script>');
    });
  });

  describe('中间件集成测试', () => {
    test('应该正确验证请求', async () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
      });

      const validRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
        }),
      });

      const result = await validationMiddleware.validateRequest(validRequest, {
        body: schema,
      });

      expect(result.success).toBe(true);
      expect(result.data?.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result.sanitized?.body).toBeDefined();
    });

    test('应该返回验证错误', async () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
      });

      const invalidRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email',
        }),
      });

      const result = await validationMiddleware.validateRequest(invalidRequest, {
        body: schema,
      });

      expect(result.success).toBe(false);
      expect(result.errors?.body).toBeDefined();
      expect(result.errors?.body).toHaveLength(2);
    });

    test('应该处理无效的请求体格式', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const invalidJsonRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const result = await validationMiddleware.validateRequest(invalidJsonRequest, {
        body: schema,
      });

      expect(result.success).toBe(false);
      expect(result.errors?.body).toBeDefined();
    });
  });

  describe('安全验证集成测试', () => {
    test('应该检测和阻止SQL注入', async () => {
      const maliciousRequest = new NextRequest(
        'http://localhost:3000/api/users?id=1\'; DROP TABLE users; --',
        {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        }
      );

      const securityResult = await checkSecurity(maliciousRequest, {
        preventSQLInjection: true,
        enableAudit: true,
      });

      expect(securityResult.safe).toBe(false);
      expect(securityResult.threats).toBeDefined();
      expect(securityResult.threats!.some(t => t.includes('SQL注入'))).toBe(true);
      expect(securityResult.audit).toBeDefined();
      expect(securityResult.audit!.blocked).toBe(true);
    });

    test('应该检测和阻止XSS攻击', async () => {
      const maliciousRequest = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '<script>alert(\'XSS\')</script>',
          bio: '<img src=x onerror=alert(\'XSS\')>',
        }),
      });

      const securityResult = await checkSecurity(maliciousRequest, {
        preventXSS: true,
        enableAudit: true,
      });

      expect(securityResult.safe).toBe(false);
      expect(securityResult.threats).toBeDefined();
      expect(securityResult.threats!.some(t => t.includes('XSS'))).toBe(true);
      expect(securityResult.audit).toBeDefined();
      expect(securityResult.audit!.blocked).toBe(true);
    });

    test('应该允许安全的请求', async () => {
      const safeRequest = new NextRequest('http://localhost:3000/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          bio: 'This is a safe bio without any malicious content.',
        }),
      });

      const securityResult = await checkSecurity(safeRequest, {
        preventSQLInjection: true,
        preventXSS: true,
        enableAudit: true,
      });

      expect(securityResult.safe).toBe(true);
      expect(securityResult.threats).toBeUndefined();
      if (securityResult.audit) {
        expect(securityResult.audit.blocked).toBe(false);
      }
    });
  });

  describe('错误处理测试', () => {
    test('应该格式化Zod验证错误', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0),
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email',
          age: -1,
        }),
      });

      const result = await validationMiddleware.validateRequest(request, {
        body: schema,
      });

      expect(result.success).toBe(false);
      expect(result.errors?.body).toBeDefined();
      
      const errors = result.errors!.body;
      expect(errors).toHaveLength(3);
      
      // 检查错误消息格式
      expect(errors.some(e => e.includes('name'))).toBe(true);
      expect(errors.some(e => e.includes('email'))).toBe(true);
      expect(errors.some(e => e.includes('age'))).toBe(true);
    });

    test('应该处理类型错误', async () => {
      const schema = z.object({
        count: z.number(),
        active: z.boolean(),
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          count: 'not-a-number',
          active: 'not-a-boolean',
        }),
      });

      const result = await validationMiddleware.validateRequest(request, {
        body: schema,
      });

      expect(result.success).toBe(false);
      expect(result.errors?.body).toBeDefined();
      
      const errors = result.errors!.body;
      expect(errors.some(e => e.includes('类型错误'))).toBe(true);
    });

    test('应该处理枚举错误', async () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
        priority: z.enum(['low', 'medium', 'high']),
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'invalid-status',
          priority: 'invalid-priority',
        }),
      });

      const result = await validationMiddleware.validateRequest(request, {
        body: schema,
      });

      expect(result.success).toBe(false);
      expect(result.errors?.body).toBeDefined();
      
      const errors = result.errors!.body;
      expect(errors.some(e => e.includes('无效的值'))).toBe(true);
      expect(errors.some(e => e.includes('status'))).toBe(true);
      expect(errors.some(e => e.includes('priority'))).toBe(true);
    });
  });

  describe('性能测试', () => {
    test('验证性能应该在合理范围内', async () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        age: z.number().min(0).max(150),
        tags: z.array(z.string()).max(10),
      });

      const iterations = 100;
      const validationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            age: 20 + (i % 80),
            tags: [`tag${i % 5}`],
          }),
        });

        const startTime = performance.now();
        const result = await validationMiddleware.validateRequest(request, {
          body: schema,
          query: commonSchemas.pagination,
        });
        const endTime = performance.now();

        validationTimes.push(endTime - startTime);
        expect(result.success).toBe(true);
      }

      const avgTime = validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length;
      const maxTime = Math.max(...validationTimes);

      expect(avgTime).toBeLessThan(50); // 平均验证时间应小于50ms
      expect(maxTime).toBeLessThan(100); // 最大验证时间应小于100ms

      console.log(`输入验证平均时间: ${avgTime.toFixed(2)}ms, 最大时间: ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('边界条件测试', () => {
    test('应该处理空请求', async () => {
      const schema = z.object({
        name: z.string().optional(),
        email: z.string().optional(),
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await validationMiddleware.validateRequest(request, {
        body: schema,
      });

      expect(result.success).toBe(true);
      expect(result.data?.body).toEqual({});
    });

    test('应该处理极大请求', async () => {
      const schema = z.object({
        data: z.array(z.string()).max(1000),
      });

      const largeArray = Array.from({ length: 1000 }, (_, i) => `item-${i}`);
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: largeArray }),
      });

      const startTime = performance.now();
      const result = await validationMiddleware.validateRequest(request, {
        body: schema,
      });
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // 大数组验证应在100ms内完成
    });

    test('应该处理特殊字符', async () => {
      const schema = z.object({
        name: z.string().max(100),
        description: z.string().max(500),
      });

      const specialInputs = [
        { name: '用户名', description: '包含中文的描述' },
        { name: 'Username', description: 'Description with émojis 😀🎉' },
        { name: 'Юзер', description: 'Описание на русском' },
        { name: 'مستخدم', description: 'وصف باللغة العربية' },
        { name: 'ユーザー', description: '日本語の説明' },
      ];

      for (const input of specialInputs) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        });

        const result = await validationMiddleware.validateRequest(request, {
          body: schema,
        });

        expect(result.success).toBe(true);
        expect(result.data?.body).toEqual(input);
      }
    });
  });
});
