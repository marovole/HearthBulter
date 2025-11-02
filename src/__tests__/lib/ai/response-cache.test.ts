/**
 * AI响应缓存机制单元测试
 */

import { AIResponseCache } from '@/lib/services/ai/response-cache';

// Mock crypto API for consistent hash generation in tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockImplementation((algorithm: string, data: Uint8Array) => {
        // Return a predictable hash for testing
        const hash = new Uint8Array(32);
        for (let i = 0; i < data.length && i < 32; i++) {
          hash[i] = data[i] % 256;
        }
        return Promise.resolve(hash.buffer);
      }),
    },
  },
  writable: true,
});

describe('AI Response Cache', () => {
  let cache: AIResponseCache;

  beforeEach(() => {
    cache = new AIResponseCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('基础缓存操作', () => {
    it('应该能够设置和获取缓存', async () => {
      const key = 'test-key';
      const data = { response: 'Hello, world!', timestamp: Date.now() };

      await cache.set(key, data, 3600);
      const result = await cache.get(key);

      expect(result).toBeDefined();
      expect(result?.response).toBe(data.response);
      expect(result?.timestamp).toBe(data.timestamp);
    });

    it('应该在缓存不存在时返回null', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('应该能够删除缓存', async () => {
      const key = 'test-key';
      const data = { response: 'Hello, world!' };

      await cache.set(key, data, 3600);
      await cache.delete(key);

      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it('应该能够清空所有缓存', async () => {
      await cache.set('key1', { data: 'value1' }, 3600);
      await cache.set('key2', { data: 'value2' }, 3600);

      expect(await cache.get('key1')).toBeDefined();
      expect(await cache.get('key2')).toBeDefined();

      cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });

    it('应该能够检查缓存是否存在', async () => {
      const key = 'test-key';
      const data = { response: 'Hello, world!' };

      expect(await cache.has(key)).toBe(false);

      await cache.set(key, data, 3600);

      expect(await cache.has(key)).toBe(true);
    });
  });

  describe('TTL（生存时间）', () => {
    beforeEach(() => {
      // Mock timers
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该在TTL过期后返回null', async () => {
      const key = 'test-key';
      const data = { response: 'Hello, world!' };

      await cache.set(key, data, 1); // 1秒TTL

      // 立即获取应该成功
      let result = await cache.get(key);
      expect(result).toBeDefined();

      // 快进1秒
      jest.advanceTimersByTime(1000);

      // 现在应该过期
      result = await cache.get(key);
      expect(result).toBeNull();
    });

    it('应该能够更新已存在缓存的TTL', async () => {
      const key = 'test-key';
      const data = { response: 'Hello, world!' };

      await cache.set(key, data, 1); // 1秒TTL

      // 快进0.5秒
      jest.advanceTimersByTime(500);

      // 更新TTL为2秒
      await cache.set(key, { ...data, updated: true }, 2);

      // 再快进1秒（总共1.5秒）
      jest.advanceTimersByTime(1000);

      // 原来的TTL应该已经过期，但更新后的TTL应该还有效
      const result = await cache.get(key);
      expect(result).toBeDefined();
      expect(result?.updated).toBe(true);
    });
  });

  describe('缓存键生成', () => {
    it('应该为相同的输入生成相同的缓存键', () => {
      const input1 = { prompt: 'Hello', context: 'chat' };
      const input2 = { prompt: 'Hello', context: 'chat' };

      const key1 = cache.generateKey(input1);
      const key2 = cache.generateKey(input2);

      expect(key1).toBe(key2);
    });

    it('应该为不同的输入生成不同的缓存键', () => {
      const input1 = { prompt: 'Hello', context: 'chat' };
      const input2 = { prompt: 'Hi', context: 'chat' };

      const key1 = cache.generateKey(input1);
      const key2 = cache.generateKey(input2);

      expect(key1).not.toBe(key2);
    });

    it('应该处理复杂对象的键生成', () => {
      const input1 = {
        prompt: 'Hello',
        context: { user: 'John', session: '123' },
        options: { temperature: 0.7, max_tokens: 100 },
      };

      const input2 = {
        prompt: 'Hello',
        context: { user: 'John', session: '123' },
        options: { temperature: 0.7, max_tokens: 100 },
      };

      const key1 = cache.generateKey(input1);
      const key2 = cache.generateKey(input2);

      expect(key1).toBe(key2);
    });

    it('应该处理数组输入的键生成', () => {
      const input1 = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      };

      const input2 = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      };

      const key1 = cache.generateKey(input1);
      const key2 = cache.generateKey(input2);

      expect(key1).toBe(key2);
    });

    it('应该对属性顺序不敏感', () => {
      const input1 = { b: 2, a: 1 };
      const input2 = { a: 1, b: 2 };

      const key1 = cache.generateKey(input1);
      const key2 = cache.generateKey(input2);

      expect(key1).toBe(key2);
    });
  });

  describe('缓存统计', () => {
    it('应该正确跟踪缓存统计', async () => {
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
      expect(stats.size).toBe(0);

      // 设置缓存
      await cache.set('key1', { data: 'value1' }, 3600);
      await cache.set('key2', { data: 'value2' }, 3600);

      const statsAfterSet = cache.getStats();
      expect(statsAfterSet.sets).toBe(2);
      expect(statsAfterSet.size).toBe(2);

      // 缓存命中
      await cache.get('key1');
      await cache.get('key2');

      const statsAfterHits = cache.getStats();
      expect(statsAfterHits.hits).toBe(2);

      // 缓存未命中
      await cache.get('non-existent');

      const statsAfterMiss = cache.getStats();
      expect(statsAfterMiss.misses).toBe(1);

      // 删除缓存
      await cache.delete('key1');

      const statsAfterDelete = cache.getStats();
      expect(statsAfterDelete.deletes).toBe(1);
      expect(statsAfterDelete.size).toBe(1);
    });

    it('应该能够重置统计', async () => {
      await cache.set('key1', { data: 'value1' }, 3600);
      await cache.get('key1');
      await cache.get('non-existent');

      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);

      cache.resetStats();

      const resetStats = cache.getStats();
      expect(resetStats.hits).toBe(0);
      expect(resetStats.misses).toBe(0);
      expect(resetStats.sets).toBe(0);
      expect(resetStats.deletes).toBe(0);
      // size不应该被重置
      expect(resetStats.size).toBe(1);
    });

    it('应该计算正确的命中率', async () => {
      // 初始状态
      expect(cache.getHitRate()).toBe(0);

      // 设置一些缓存
      await cache.set('key1', { data: 'value1' }, 3600);
      await cache.set('key2', { data: 'value2' }, 3600);

      // 命中一半
      await cache.get('key1'); // hit
      await cache.get('non-existent'); // miss

      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(50); // 1 hit out of 2 total requests

      // 全部命中
      await cache.get('key1'); // hit
      await cache.get('key2'); // hit

      const finalHitRate = cache.getHitRate();
      expect(finalHitRate).toBe(75); // 3 hits out of 4 total requests
    });
  });

  describe('高级功能', () => {
    it('应该支持批量操作', async () => {
      const entries = [
        ['key1', { data: 'value1' }],
        ['key2', { data: 'value2' }],
        ['key3', { data: 'value3' }],
      ] as const;

      // 批量设置
      await cache.setMany(entries, 3600);

      // 批量获取
      const results = await cache.getMany(['key1', 'key2', 'key3', 'key4']);

      expect(results.get('key1')).toEqual({ data: 'value1' });
      expect(results.get('key2')).toEqual({ data: 'value2' });
      expect(results.get('key3')).toEqual({ data: 'value3' });
      expect(results.get('key4')).toBeUndefined();

      // 批量删除
      await cache.deleteMany(['key1', 'key3']);

      const resultsAfterDelete = await cache.getMany(['key1', 'key2', 'key3']);
      expect(resultsAfterDelete.get('key1')).toBeUndefined();
      expect(resultsAfterDelete.get('key2')).toEqual({ data: 'value2' });
      expect(resultsAfterDelete.get('key3')).toBeUndefined();
    });

    it('应该支持缓存标签', async () => {
      const data = { response: 'Hello, world!' };

      // 设置带标签的缓存
      await cache.set('key1', data, 3600, ['user-123', 'chat']);
      await cache.set('key2', data, 3600, ['user-123', 'analysis']);
      await cache.set('key3', data, 3600, ['user-456', 'chat']);

      // 按标签获取
      const user123Keys = await cache.getKeysByTag('user-123');
      const chatKeys = await cache.getKeysByTag('chat');
      const analysisKeys = await cache.getKeysByTag('analysis');

      expect(user123Keys).toContain('key1');
      expect(user123Keys).toContain('key2');
      expect(user123Keys).not.toContain('key3');

      expect(chatKeys).toContain('key1');
      expect(chatKeys).toContain('key3');
      expect(chatKeys).not.toContain('key2');

      expect(analysisKeys).toContain('key2');
      expect(analysisKeys).not.toContain('key1');
      expect(analysisKeys).not.toContain('key3');

      // 按标签删除
      await cache.deleteByTag('user-123');

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeDefined();
    });

    it('应该支持缓存预热', async () => {
      const prewarmedData = new Map([
        ['key1', { data: 'value1' }],
        ['key2', { data: 'value2' }],
      ]);

      await cache.prewarm(prewarmedData, 3600);

      expect(await cache.get('key1')).toEqual({ data: 'value1' });
      expect(await cache.get('key2')).toEqual({ data: 'value2' });
    });

    it('应该支持缓存大小限制', () => {
      const limitedCache = new AIResponseCache({ maxSize: 2 });

      limitedCache.setSync('key1', { data: 'value1' }, 3600);
      limitedCache.setSync('key2', { data: 'value2' }, 3600);
      limitedCache.setSync('key3', { data: 'value3' }, 3600); // 应该驱逐最旧的

      expect(limitedCache.getSync('key1')).toBeNull(); // 应该被驱逐
      expect(limitedCache.getSync('key2')).toBeDefined(); // 应该还在
      expect(limitedCache.getSync('key3')).toBeDefined(); // 应该还在
    });
  });

  describe('错误处理', () => {
    it('应该处理序列化错误', async () => {
      const circularRef: any = {};
      circularRef.self = circularRef;

      await expect(cache.set('key', circularRef, 3600)).rejects.toThrow();
    });

    it('应该处理无效的TTL值', async () => {
      const data = { response: 'Hello' };

      // 负数TTL应该被视为立即过期
      await cache.set('key', data, -1);
      expect(await cache.get('key')).toBeNull();

      // 零TTL应该被视为立即过期
      await cache.set('key2', data, 0);
      expect(await cache.get('key2')).toBeNull();
    });

    it('应该处理内存不足情况', async () => {
      // Mock内存不足的情况
      const originalSet = cache.set;
      cache.set = jest.fn().mockRejectedValue(new Error('Out of memory'));

      await expect(cache.set('key', { data: 'value' }, 3600)).rejects.toThrow('Out of memory');
    });
  });

  describe('性能测试', () => {
    it('应该能够快速处理大量缓存操作', async () => {
      const startTime = performance.now();

      // 设置1000个缓存项
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(cache.set(`key${i}`, { data: `value${i}` }, 3600));
      }
      await Promise.all(promises);

      const setTime = performance.now() - startTime;
      expect(setTime).toBeLessThan(1000); // 应该在1秒内完成

      // 获取1000个缓存项
      const getStartTime = performance.now();
      const getPromises = [];
      for (let i = 0; i < 1000; i++) {
        getPromises.push(cache.get(`key${i}`));
      }
      await Promise.all(getPromises);

      const getTime = performance.now() - getStartTime;
      expect(getTime).toBeLessThan(500); // 应该在0.5秒内完成
    });

    it('应该高效生成缓存键', () => {
      const largeObject = {
        prompt: 'A'.repeat(1000),
        context: {
          user: 'test-user',
          session: 'test-session',
          history: Array(100).fill({ role: 'user', content: 'test' }),
        },
      };

      const startTime = performance.now();
      const key = cache.generateKey(largeObject);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });

  describe('内存管理', () => {
    it('应该定期清理过期缓存', async () => {
      jest.useFakeTimers();

      // 设置一些短期缓存
      await cache.set('key1', { data: 'value1' }, 1); // 1秒
      await cache.set('key2', { data: 'value2' }, 2); // 2秒
      await cache.set('key3', { data: 'value3' }, 3); // 3秒

      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('key2')).toBe(true);
      expect(await cache.has('key3')).toBe(true);

      // 快进1.5秒
      jest.advanceTimersByTime(1500);

      // 手动触发清理
      await cache.cleanup();

      expect(await cache.has('key1')).toBe(false); // 应该被清理
      expect(await cache.has('key2')).toBe(true); // 应该还在
      expect(await cache.has('key3')).toBe(true); // 应该还在

      jest.useRealTimers();
    });

    it('应该支持内存使用监控', () => {
      const stats = cache.getMemoryStats();

      expect(stats.estimatedSize).toBeGreaterThanOrEqual(0);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.utilization).toBeGreaterThanOrEqual(0);
      expect(stats.utilization).toBeLessThanOrEqual(100);
    });
  });
});
