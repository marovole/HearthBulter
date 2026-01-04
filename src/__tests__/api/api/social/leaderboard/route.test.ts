/**
 * api/social/leaderboard/route.ts API 测试
 * 完善的排行榜API测试
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '@/app/api/social/leaderboard/route';
import { auth } from '@/lib/auth';
import { leaderboardService } from '@/lib/services/social/leaderboard';
import { prisma } from '@/lib/db';
import { LeaderboardResult } from '@/lib/services/social/leaderboard';

// Mock Next.js auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock leaderboard service
jest.mock('@/lib/services/social/leaderboard', () => ({
  leaderboardService: {
    getLeaderboard: jest.fn(),
    getRankingHistory: jest.fn(),
  },
}));

// Mock database
jest.mock('@/lib/db', () => ({
  prisma: {
    familyMember: {
      findFirst: jest.fn(),
    },
  },
}));

const mockLeaderboardResult: LeaderboardResult = {
  type: 'HEALTH_SCORE',
  title: '健康评分排行榜',
  description: '基于用户的综合健康数据评分',
  unit: '分',
  timeframe: 'weekly',
  totalUsers: 5,
  data: [
    {
      memberId: 'member-1',
      memberName: '用户1',
      value: 95,
      rank: 1,
      avatar: null,
      change: 'same',
    },
    {
      memberId: 'member-2',
      memberName: '用户2',
      value: 88,
      rank: 2,
      avatar: null,
      change: 'up',
      changeValue: 2,
    },
  ],
  lastUpdated: new Date(),
};

describe('/api/social/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard',
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('未授权访问');
    });

    it('should proceed when user is authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (leaderboardService.getLeaderboard as jest.Mock).mockResolvedValue(
        mockLeaderboardResult,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('should return 400 when type is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard',
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('无效的排行榜类型');
    });

    it('should return 400 for invalid type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=INVALID_TYPE',
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('无效的排行榜类型');
    });

    it('should return 400 for invalid timeframe', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE&timeframe=invalid',
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('无效的时间范围');
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (leaderboardService.getLeaderboard as jest.Mock).mockResolvedValue(
        mockLeaderboardResult,
      );
    });

    it('should return 403 when memberId is provided but user has no access', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE&memberId=member-2',
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无权限访问该家庭成员');
    });

    it('should proceed when user has access to member', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-2',
      });
      (leaderboardService.getLeaderboard as jest.Mock).mockResolvedValue(
        mockLeaderboardResult,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE&memberId=member-2',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Business Logic', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('should return leaderboard data with correct parameters', async () => {
      (leaderboardService.getLeaderboard as jest.Mock).mockResolvedValue(
        mockLeaderboardResult,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE&timeframe=weekly&limit=10',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(leaderboardService.getLeaderboard).toHaveBeenCalledWith(
        'HEALTH_SCORE',
        undefined,
        'weekly',
        10,
      );
      expect(data.data).toEqual(mockLeaderboardResult);
    });

    it('should handle ranking history request', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (leaderboardService.getRankingHistory as jest.Mock).mockResolvedValue([
        { date: '2024-01-01', rank: 1, value: 95 },
        { date: '2024-01-02', rank: 2, value: 90 },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE&memberId=member-1&history=true',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(leaderboardService.getRankingHistory).toHaveBeenCalled();
    });

    it('should use default limit when not provided', async () => {
      (leaderboardService.getLeaderboard as jest.Mock).mockResolvedValue(
        mockLeaderboardResult,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE',
      );
      await GET(request);

      expect(leaderboardService.getLeaderboard).toHaveBeenCalledWith(
        'HEALTH_SCORE',
        undefined,
        undefined,
        50, // default limit
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('should handle service errors gracefully', async () => {
      (leaderboardService.getLeaderboard as jest.Mock).mockRejectedValue(
        new Error('Service error'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/social/leaderboard?type=HEALTH_SCORE',
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('服务器内部错误');
    });
  });
});
