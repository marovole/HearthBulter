/**
 * api/social/stats/route.ts API 测试
 * 完善的社交分享统计API测试
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from '@/app/api/social/stats/route';
import { auth } from '@/lib/auth';
import { shareTrackingService } from '@/lib/services/social/share-tracking';
import { prisma } from '@/lib/db';

// Mock Next.js auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock share tracking service
jest.mock('@/lib/services/social/share-tracking', () => ({
  shareTrackingService: {
    getShareStatistics: jest.fn(),
    getUserShareAnalytics: jest.fn(),
    getGlobalShareAnalytics: jest.fn(),
    generateShareTrackingReport: jest.fn(),
  },
}));

// Mock database
jest.mock('@/lib/db', () => ({
  prisma: {
    familyMember: {
      findFirst: jest.fn(),
    },
    sharedContent: {
      findUnique: jest.fn(),
    },
  },
}));

describe('/api/social/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置环境变量
    process.env.ADMIN_CODES = 'ADMIN123,ADMIN456';
  });

  describe('Authentication', () => {
    it('GET: should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/social/stats');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('未授权访问');
    });

    it('POST: should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('未授权访问');
    });
  });

  describe('GET - Share Token Query', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('should return stats for specific share token', async () => {
      const mockStats = {
        totalViews: 100,
        totalClicks: 25,
        totalConversions: 5,
        uniqueViewers: 80,
        avgViewTime: 120,
        conversionRate: 20,
      };

      (shareTrackingService.getShareStatistics as jest.Mock).mockResolvedValue(mockStats);
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue({
        id: 'share-1',
        privacyLevel: 'PUBLIC',
        member: {
          user: { id: 'user-1' },
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?token=share-token-123'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.type).toBe('share');
      expect(data.data.token).toBe('share-token-123');
      expect(data.data.stats).toEqual(mockStats);
      expect(shareTrackingService.getShareStatistics).toHaveBeenCalledWith('share-token-123');
    });

    it('should return 404 when share content does not exist', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?token=invalid-token'
      );
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('分享内容不存在');
    });

    it('should return 403 for private share content without access', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue({
        id: 'share-1',
        privacyLevel: 'PRIVATE',
        member: {
          user: { id: 'user-2' }, // 不同用户
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?token=private-token'
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无权限查看该分享统计');
    });
  });

  describe('GET - User Analytics', () => {
    const mockUserAnalytics = {
      totalShares: 15,
      totalViews: 450,
      totalClicks: 120,
      totalConversions: 25,
      avgConversionRate: 20.83,
      topContent: [
        { id: 'share-1', title: '健康报告', views: 150, conversions: 20 },
        { id: 'share-2', title: '营养计划', views: 120, conversions: 15 },
      ],
      period: '30d',
    };

    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (shareTrackingService.getUserShareAnalytics as jest.Mock).mockResolvedValue(mockUserAnalytics);
    });

    it('should return user analytics with memberId', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?memberId=member-1&type=user&period=7d'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.type).toBe('user');
      expect(data.data.period).toBe('7d');
      expect(data.data.analytics).toEqual(mockUserAnalytics);
    });

    it('should return 403 when user has no access to member', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?memberId=member-2'
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无权限访问该家庭成员');
    });

    it('should use default period (30d) when not provided', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?memberId=member-1'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.period).toBe('30d');
    });
  });

  describe('GET - Global Analytics', () => {
    const mockGlobalAnalytics = {
      totalUsers: 50,
      totalShares: 1200,
      totalViews: 45000,
      totalClicks: 12500,
      totalConversions: 2500,
      activeSharers: 35,
      globalConversionRate: 20.0,
      topPerformers: [
        { memberId: 'member-1', totalShares: 50, totalConversions: 100 },
        { memberId: 'member-2', totalShares: 40, totalConversions: 80 },
      ],
      period: '30d',
    };

    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (shareTrackingService.getGlobalShareAnalytics as jest.Mock).mockResolvedValue(mockGlobalAnalytics);
    });

    it('should return global analytics', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?type=global&period=30d'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.type).toBe('global');
      expect(data.data.analytics).toEqual(mockGlobalAnalytics);
    });

    it('should use default type (user) when not provided', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/social/stats'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.type).toBe('user');
    });
  });

  describe('POST - Admin Report Generation', () => {
    const mockReport = {
      reportTitle: '分享统计报告',
      generatedAt: '2024-01-01T00:00:00Z',
      period: '30d',
      summary: {
        totalShares: 100,
        totalViews: 5000,
        totalClicks: 1200,
        totalConversions: 250,
        conversionRate: 20.83,
      },
      topContent: [
        { title: '健康报告', views: 1000, conversions: 200 },
        { title: '营养计划', views: 800, conversions: 150 },
      ],
    };

    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (shareTrackingService.generateShareTrackingReport as jest.Mock).mockResolvedValue(mockReport);
    });

    it('should generate JSON report for admin', async () => {
      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({
          adminCode: 'ADMIN123',
          period: '30d',
          format: 'json',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockReport);
      expect(shareTrackingService.generateShareTrackingReport).toHaveBeenCalledWith(
        undefined,
        '30d'
      );
    });

    it('should generate CSV report', async () => {
      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({
          adminCode: 'ADMIN123',
          period: '30d',
          format: 'csv',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('share-report-30d.csv');
    });

    it('should return 403 for invalid admin code', async () => {
      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({
          adminCode: 'INVALID_CODE',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无管理员权限');
    });
  });

  describe('POST - User Report Generation', () => {
    const mockReport = {
      reportTitle: '个人分享统计报告',
      generatedAt: '2024-01-01T00:00:00Z',
      period: '30d',
      summary: {
        totalShares: 15,
        totalViews: 450,
        totalClicks: 120,
        totalConversions: 25,
        conversionRate: 20.83,
      },
      topContent: [
        { title: '健康报告', views: 150, conversions: 20 },
        { title: '营养计划', views: 120, conversions: 15 },
      ],
    };

    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (shareTrackingService.generateShareTrackingReport as jest.Mock).mockResolvedValue(mockReport);
    });

    it('should generate report for specific member', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-1',
          period: '30d',
          format: 'json',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockReport);
      expect(shareTrackingService.generateShareTrackingReport).toHaveBeenCalledWith(
        'member-1',
        '30d'
      );
    });

    it('should return 403 when user has no access to member', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-2',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无权限访问该家庭成员');
    });

    it('should use default format (json) when not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({
          adminCode: 'ADMIN123',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('GET: should handle service errors gracefully', async () => {
      (shareTrackingService.getUserShareAnalytics as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/social/stats?memberId=member-1'
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('服务器内部错误');
    });

    it('POST: should handle service errors gracefully', async () => {
      (shareTrackingService.generateShareTrackingReport as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      const request = new NextRequest('http://localhost:3000/api/social/stats', {
        method: 'POST',
        body: JSON.stringify({
          adminCode: 'ADMIN123',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('服务器内部错误');
    });
  });
});
