/**
 * api/social/share/[token]/route.ts API 测试
 * 分享内容访问和统计API测试
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST, DELETE } from '@/app/api/social/share/[token]/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    sharedContent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockSharedContent = {
  id: 'share-1',
  shareToken: 'test-token-123',
  contentType: 'HEALTH_REPORT',
  title: '我的健康报告',
  description: '2024年1月健康数据总结',
  imageUrl: 'https://example.com/image.jpg',
  viewCount: 50,
  likeCount: 10,
  commentCount: 5,
  shareCount: 3,
  status: 'ACTIVE',
  privacyLevel: 'PUBLIC',
  allowComment: true,
  allowLike: true,
  createdAt: new Date('2024-01-01'),
  expiresAt: null,
  metadata: { reportId: 'report-1' },
  member: {
    id: 'member-1',
    name: '测试用户',
    avatar: null,
  },
};

describe('/api/social/share/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GET - Get Share Content', () => {
    it('should return share content with valid token', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(mockSharedContent);
      (prisma.sharedContent.update as jest.Mock).mockResolvedValue({
        ...mockSharedContent,
        viewCount: 51,
      });

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123');
      const response = await GET(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.id).toBe('share-1');
      expect(data.data.title).toBe('我的健康报告');
      expect(data.data.viewCount).toBe(51);
      expect(prisma.sharedContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { viewCount: 51 },
        })
      );
    });

    it('should return 400 when token is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/social/share/');
      const response = await GET(request, { params: Promise.resolve({ token: '' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('缺少分享token');
    });

    it('should return 404 when share content does not exist', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/social/share/invalid-token');
      const response = await GET(request, { params: Promise.resolve({ token: 'invalid-token' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('分享内容不存在');
    });

    it('should return 410 when share is inactive', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue({
        ...mockSharedContent,
        status: 'REVOKED',
      });

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123');
      const response = await GET(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toBe('分享已失效');
    });

    it('should return 410 when share is expired', async () => {
      const expiredContent = {
        ...mockSharedContent,
        expiresAt: new Date('2024-01-10'), // 已过期
      };
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(expiredContent);
      (prisma.sharedContent.update as jest.Mock).mockResolvedValue({
        ...expiredContent,
        status: 'EXPIRED',
      });

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123');
      const response = await GET(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toBe('分享已过期');
      expect(prisma.sharedContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'EXPIRED' },
        })
      );
    });
  });

  describe('POST - Track Share Interaction', () => {
    it('should track click action', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(mockSharedContent);
      (prisma.sharedContent.update as jest.Mock).mockResolvedValue({
        ...mockSharedContent,
        clickCount: 51,
      });

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123', {
        method: 'POST',
        body: JSON.stringify({ action: 'click' }),
      });
      const response = await POST(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('统计更新成功');
      expect(prisma.sharedContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { clickCount: 51 },
        })
      );
    });

    it('should track share action', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(mockSharedContent);
      (prisma.sharedContent.update as jest.Mock).mockResolvedValue({
        ...mockSharedContent,
        shareCount: 4,
      });

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123', {
        method: 'POST',
        body: JSON.stringify({ action: 'share' }),
      });
      const response = await POST(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(200);
      expect(prisma.sharedContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { shareCount: 4 },
        })
      );
    });

    it('should track conversion action', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(mockSharedContent);
      (prisma.sharedContent.update as jest.Mock).mockResolvedValue({
        ...mockSharedContent,
        conversionCount: 6,
      });

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123', {
        method: 'POST',
        body: JSON.stringify({ action: 'conversion' }),
      });
      const response = await POST(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(200);
      expect(prisma.sharedContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { conversionCount: 6 },
        })
      );
    });

    it('should return 400 for unsupported action', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(mockSharedContent);

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
      });
      const response = await POST(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('不支持的动作类型');
    });
  });

  describe('DELETE - Revoke Share', () => {
    it('should revoke share with authentication', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(mockSharedContent);
      (prisma.sharedContent.update as jest.Mock).mockResolvedValue({
        ...mockSharedContent,
        status: 'REVOKED',
      });

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123');
      const response = await DELETE(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('分享已撤回');
      expect(prisma.sharedContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'REVOKED' },
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123');
      const response = await DELETE(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('未授权');
    });

    it('should return 403 when user is not the owner', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-2' } }); // 不同用户
      (prisma.sharedContent.findUnique as jest.Mock).mockResolvedValue(mockSharedContent);

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123');
      const response = await DELETE(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无权操作该分享');
    });
  });

  describe('Error Handling', () => {
    it('GET: should handle database errors gracefully', async () => {
      (prisma.sharedContent.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/social/share/test-token-123');
      const response = await GET(request, { params: Promise.resolve({ token: 'test-token-123' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('获取分享内容失败');
    });
  });
});
