/**
 * Token 生成器单元测试
 */

import {
  generateSecureShareToken,
  verifyShareToken,
  generateSecureRandomToken,
  generateUrlSafeToken,
  createOneTimeToken,
  verifyOneTimeToken,
} from '@/lib/security/token-generator';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// 设置测试环境变量
const TEST_SECRET = 'test-secret-key-for-token-generation-minimum-32-chars';

describe('Token Generator', () => {
  beforeAll(() => {
    process.env.TOKEN_SECRET_KEY = TEST_SECRET;
    process.env.NEXTAUTH_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    delete process.env.TOKEN_SECRET_KEY;
  });

  describe('generateSecureShareToken', () => {
    it('应该生成有效的 JWT Token', async () => {
      const token = await generateSecureShareToken(
        'resource-123',
        'report',
        'owner-456',
        7,
        ['read']
      );

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      // JWT 格式: header.payload.signature
      expect(token.split('.')).toHaveLength(3);
    });

    it('应该使用默认参数生成 Token', async () => {
      const token = await generateSecureShareToken(
        'resource-123',
        'report',
        'owner-456'
      );

      expect(token).toBeTruthy();
    });

    it('应该包含正确的 payload 信息', async () => {
      const token = await generateSecureShareToken(
        'resource-123',
        'report',
        'owner-456',
        7,
        ['read', 'download']
      );

      const result = await verifyShareToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.resourceId).toBe('resource-123');
      expect(result.payload?.resourceType).toBe('report');
      expect(result.payload?.ownerId).toBe('owner-456');
      expect(result.payload?.permissions).toEqual(['read', 'download']);
    });
  });

  describe('verifyShareToken', () => {
    it('应该验证有效的 Token', async () => {
      const token = await generateSecureShareToken(
        'resource-123',
        'report',
        'owner-456'
      );

      const result = await verifyShareToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeTruthy();
    });

    it('应该拒绝无效的 Token', async () => {
      const result = await verifyShareToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('应该拒绝被篡改的 Token', async () => {
      const token = await generateSecureShareToken(
        'resource-123',
        'report',
        'owner-456'
      );

      // 篡改 token
      const tamperedToken = token.slice(0, -10) + 'tampered12';

      const result = await verifyShareToken(tamperedToken);

      expect(result.valid).toBe(false);
    });

    it('应该检测过期的 Token', async () => {
      // 创建一个立即过期的 token（通过直接创建 JWT）
      const { SignJWT } = await import('jose');

      const secretKey = new TextEncoder().encode(TEST_SECRET);
      const expiredToken = await new SignJWT({
        resourceId: 'resource-123',
        resourceType: 'report',
        ownerId: 'owner-456',
        permissions: ['read'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('health-butler')
        .setAudience('share-token')
        .setExpirationTime(new Date(Date.now() - 1000)) // 已过期
        .sign(secretKey);

      const result = await verifyShareToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('过期');
    });
  });

  describe('generateSecureRandomToken', () => {
    it('应该生成指定长度的随机 Token', () => {
      const token = generateSecureRandomToken(32);

      // 32 字节 = 64 个十六进制字符
      expect(token).toHaveLength(64);
    });

    it('应该使用默认长度生成 Token', () => {
      const token = generateSecureRandomToken();

      // 默认 32 字节 = 64 个十六进制字符
      expect(token).toHaveLength(64);
    });

    it('应该生成唯一的 Token', () => {
      const tokens = new Set();

      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureRandomToken());
      }

      expect(tokens.size).toBe(100);
    });

    it('应该只包含有效的十六进制字符', () => {
      const token = generateSecureRandomToken();

      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateUrlSafeToken', () => {
    it('应该生成 URL 安全的 Token', () => {
      const token = generateUrlSafeToken(32);

      // URL 安全的 Base64 不包含 +, /, =
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token).not.toContain('=');
    });

    it('应该生成唯一的 Token', () => {
      const tokens = new Set();

      for (let i = 0; i < 100; i++) {
        tokens.add(generateUrlSafeToken());
      }

      expect(tokens.size).toBe(100);
    });
  });

  describe('createOneTimeToken / verifyOneTimeToken', () => {
    it('应该创建和验证一次性 Token', async () => {
      const data = { action: 'reset-password', email: 'test@example.com' };

      const token = await createOneTimeToken(data, 30);
      const result = await verifyOneTimeToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.action).toBe('reset-password');
      expect(result.payload?.email).toBe('test@example.com');
      expect(result.payload?.oneTime).toBe(true);
    });

    it('应该拒绝无效的一次性 Token', async () => {
      const result = await verifyOneTimeToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
