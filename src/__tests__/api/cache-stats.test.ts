/**
 * API 路由单元测试示例
 */

import { GET } from '@/app/api/ai/cache-stats/route';

// Mock the performance monitor
jest.mock('@/lib/monitoring/performance-monitor-v2', () => ({
  performanceMonitor: {
    getMetrics: jest.fn().mockReturnValue({
      cacheHitRate: 85,
      avgResponseTime: 120,
      totalRequests: 1000,
      errorRate: 2,
    }),
  },
}));

// Mock Redis client
jest.mock('@/lib/cache/redis-client', () => ({
  CacheService: {
    getInstance: jest.fn().mockReturnValue({
      getStats: jest.fn().mockResolvedValue({
        hitRate: 85,
        missRate: 15,
        totalKeys: 150,
        memoryUsage: '2MB',
      }),
    }),
  },
}));

describe('API Routes', () => {
  describe('/api/ai/cache-stats', () => {
    it('should return cache statistics successfully', async () => {
      const request = new Request('http://localhost:3000/api/ai/cache-stats');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('cacheHitRate');
      expect(data.data).toHaveProperty('avgResponseTime');
      expect(data.data).toHaveProperty('totalRequests');
      expect(data.data).toHaveProperty('errorRate');
    });

    it('should handle errors gracefully', async () => {
      // Mock an error scenario
      jest.doMock('@/lib/monitoring/performance-monitor-v2', () => ({
        performanceMonitor: {
          getMetrics: jest.fn().mockImplementation(() => {
            throw new Error('Monitor error');
          }),
        },
      }));

      const request = new Request('http://localhost:3000/api/ai/cache-stats');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });
});