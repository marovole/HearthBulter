/**
 * 加密工具单元测试
 */

import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  generateEncryptionKey,
  isEncryptedFormat,
  hashData,
  secureCompare,
} from '@/lib/security/encryption';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// 生成测试用的加密密钥（32 字节 = 256 位）
function generateTestKey(): string {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return Buffer.from(key).toString('base64');
}

describe('Encryption Module', () => {
  const TEST_KEY = generateTestKey();

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encrypt / decrypt', () => {
    it('应该成功加密和解密字符串', async () => {
      const plaintext = 'Hello, World! 你好，世界！';

      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('应该生成正确格式的加密数据', async () => {
      const plaintext = 'test data';

      const encrypted = await encrypt(plaintext);
      const parts = encrypted.split('$');

      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('v1'); // 版本
      expect(parts[1]).toBeTruthy(); // IV
      expect(parts[2]).toBeTruthy(); // 密文
      expect(parts[3]).toBeTruthy(); // 标签
    });

    it('应该为相同明文生成不同的密文（随机 IV）', async () => {
      const plaintext = 'same text';

      const encrypted1 = await encrypt(plaintext);
      const encrypted2 = await encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // 但都能正确解密
      expect(await decrypt(encrypted1)).toBe(plaintext);
      expect(await decrypt(encrypted2)).toBe(plaintext);
    });

    it('应该加密空字符串', async () => {
      const plaintext = '';

      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('应该加密长文本', async () => {
      const plaintext = 'a'.repeat(10000);

      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('应该加密特殊字符', async () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~\n\t\r';

      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('应该检测被篡改的数据', async () => {
      const plaintext = 'sensitive data';
      const encrypted = await encrypt(plaintext);

      // 篡改密文部分
      const parts = encrypted.split('$');
      const ciphertext = parts[2];
      if (ciphertext) {
        parts[2] = `tampered${ciphertext.slice(8)}`;
      }
      const tampered = parts.join('$');

      await expect(decrypt(tampered)).rejects.toThrow();
    });

    it('应该拒绝无效格式的数据', async () => {
      await expect(decrypt('invalid-data')).rejects.toThrow();
      await expect(decrypt('v1$only$three')).rejects.toThrow();
    });
  });

  describe('encryptObject / decryptObject', () => {
    it('应该加密和解密对象', async () => {
      const data = {
        accessToken: 'token-123',
        refreshToken: 'refresh-456',
        expiresAt: '2024-12-31T23:59:59Z',
        metadata: { platform: 'taobao' },
      };

      const encrypted = await encryptObject(data);
      const decrypted = await decryptObject<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('应该加密和解密数组', async () => {
      const data = [1, 2, 3, 'test', { key: 'value' }];

      const encrypted = await encryptObject(data);
      const decrypted = await decryptObject<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });

    it('应该加密和解密嵌套对象', async () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const encrypted = await encryptObject(data);
      const decrypted = await decryptObject<typeof data>(encrypted);

      expect(decrypted).toEqual(data);
    });
  });

  describe('generateEncryptionKey', () => {
    it('应该生成有效的加密密钥', async () => {
      const key = await generateEncryptionKey();

      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');

      // Base64 解码后应为 32 字节
      const decoded = Buffer.from(key, 'base64');
      expect(decoded.byteLength).toBe(32);
    });

    it('应该生成唯一的密钥', async () => {
      const keys = new Set();

      for (let i = 0; i < 10; i++) {
        keys.add(await generateEncryptionKey());
      }

      expect(keys.size).toBe(10);
    });
  });

  describe('isEncryptedFormat', () => {
    it('应该识别有效的加密格式', async () => {
      const encrypted = await encrypt('test');

      expect(isEncryptedFormat(encrypted)).toBe(true);
    });

    it('应该拒绝无效的格式', () => {
      expect(isEncryptedFormat('plain text')).toBe(false);
      expect(isEncryptedFormat('v1$only$three')).toBe(false);
      expect(isEncryptedFormat('')).toBe(false);
      expect(isEncryptedFormat(null as any)).toBe(false);
      expect(isEncryptedFormat(undefined as any)).toBe(false);
    });

    it('应该拒绝错误版本的格式', () => {
      expect(isEncryptedFormat('v2$a$b$c')).toBe(false);
    });
  });

  describe('hashData', () => {
    it('应该生成一致的哈希值', async () => {
      const data = 'test data';

      const hash1 = await hashData(data);
      const hash2 = await hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('应该为不同数据生成不同的哈希值', async () => {
      const hash1 = await hashData('data1');
      const hash2 = await hashData('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('应该生成固定长度的哈希值', async () => {
      const shortHash = await hashData('a');
      const longHash = await hashData('a'.repeat(10000));

      // SHA-256 产生 32 字节 = 44 个 Base64 字符
      expect(shortHash.length).toBe(longHash.length);
    });
  });

  describe('secureCompare', () => {
    it('应该正确比较相同的字符串', () => {
      expect(secureCompare('test', 'test')).toBe(true);
      expect(secureCompare('', '')).toBe(true);
    });

    it('应该正确比较不同的字符串', () => {
      expect(secureCompare('test', 'Test')).toBe(false);
      expect(secureCompare('test', 'test1')).toBe(false);
      expect(secureCompare('test1', 'test')).toBe(false);
    });

    it('应该处理长字符串', () => {
      const str1 = 'a'.repeat(1000);
      const str2 = 'a'.repeat(1000);
      const str3 = `${'a'.repeat(999)}b`;

      expect(secureCompare(str1, str2)).toBe(true);
      expect(secureCompare(str1, str3)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('应该在缺少加密密钥时抛出错误', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      await expect(encrypt('test')).rejects.toThrow('ENCRYPTION_KEY');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('应该在密钥长度无效时抛出错误', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = Buffer.from('short').toString('base64'); // 太短

      await expect(encrypt('test')).rejects.toThrow('密钥长度无效');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
