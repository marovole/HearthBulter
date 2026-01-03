/**
 * API 路由单元测试示例
 */

jest.mock('@/lib/services/ai/response-cache', () => ({
  aiResponseCache: {
    getStats: jest.fn(),
    getCacheInfo: jest.fn(),
  },
}));

jest.mock('@/lib/services/ai/rate-limiter', () => ({
  rateLimiter: {
    checkLimit: jest.fn(),
    getStats: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';
import { aiResponseCache } from '@/lib/services/ai/response-cache';
import { rateLimiter } from '@/lib/services/ai/rate-limiter';
import type { NextRequest } from 'next/server';

const loadRoute = async () => {
  const routeModule = await import('@/app/api/ai/cache-stats/route');
  return routeModule.GET;
};

describe('API Routes', () => {
  describe('/api/ai/cache-stats', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      });

      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        retryAfter: null,
      });

      (rateLimiter.getStats as jest.Mock).mockResolvedValue({
        totalRequests: 10,
        blockedRequests: 1,
        activeUsers: 3,
      });

      (aiResponseCache.getStats as jest.Mock).mockReturnValue({
        hits: 2,
        misses: 1,
        sets: 3,
        evictions: 0,
        totalSize: 2,
        hitRate: 66.7,
      });

      (aiResponseCache.getCacheInfo as jest.Mock).mockReturnValue([
        {
          key: 'sample-key',
          cachedAt: Date.now(),
          expiresAt: Date.now() + 60000,
          hitCount: 2,
          size: 128,
        },
      ]);
    });

    it('should return cache statistics successfully', async () => {
      const request = new Request('http://localhost:3000/api/ai/cache-stats');
      const GET = await loadRoute();

      const response = await GET(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('cache');
      expect(data.cache).toHaveProperty('stats');
      expect(data.cache).toHaveProperty('topEntries');
      expect(data).toHaveProperty('rateLimit');
      expect(data).toHaveProperty('performance');
      expect(data).toHaveProperty('recommendations');
    });

    it('should return 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/ai/cache-stats');
      const GET = await loadRoute();

      const response = await GET(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
    });
  });
});
