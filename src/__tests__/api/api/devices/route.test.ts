/**
 * api/devices/route.ts API 测试
 * 设备管理API测试
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from '@/app/api/devices/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { optimizedQuery } from '@/lib/middleware/query-optimization';
import {
  createMockSession,
  createMockDeviceWithMember,
  createMockMember,
  createMockDevice,
  type MockDeviceWithMember,
} from '@/__tests__/mocks/typed-mocks';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    familyMember: {
      findFirst: jest.fn(),
    },
    deviceConnection: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/middleware/query-optimization', () => ({
  optimizedQuery: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

// 类型安全的Mock设置
const mockAuth = jest.mocked(auth);
const mockOptimizedQuery = {
  findMany: jest.mocked(optimizedQuery.findMany),
  count: jest.mocked(optimizedQuery.count),
};
const mockPrismaFamilyMember = {
  findFirst: jest.mocked(prisma.familyMember.findFirst),
};
const mockPrismaDeviceConnection = {
  findFirst: jest.mocked(prisma.deviceConnection.findFirst),
  create: jest.mocked(prisma.deviceConnection.create),
};

const mockDevices: MockDeviceWithMember[] = [
  createMockDeviceWithMember({
    id: 'device-1',
    deviceId: 'apple-watch-123',
    deviceName: 'Apple Watch',
    deviceType: 'SMARTWATCH',
    manufacturer: 'Apple',
    model: 'Series 8',
    platform: 'APPLE_HEALTHKIT',
    isActive: true,
    syncStatus: 'SUCCESS',
    lastSyncAt: new Date('2024-01-15'),
    connectionDate: new Date('2024-01-01'),
  }),
  createMockDeviceWithMember({
    id: 'device-2',
    deviceId: 'fitbit-456',
    deviceName: 'Fitbit Versa',
    deviceType: 'FITNESS_BAND',
    manufacturer: 'Fitbit',
    model: 'Versa 3',
    platform: 'FITBIT',
    isActive: true,
    syncStatus: 'PENDING',
    lastSyncAt: new Date('2024-01-14'),
    connectionDate: new Date('2024-01-02'),
  }),
];

describe('/api/devices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_CODES = 'ADMIN123';
  });

  describe('GET - Get Device List', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockSession({ user: { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER' } }));
      mockOptimizedQuery.findMany.mockResolvedValue(mockDevices);
      mockOptimizedQuery.count.mockResolvedValue(2);
    });

    it('should return device list with pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices?page=1&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(10);
      expect(optimizedQuery.findMany).toHaveBeenCalledWith(
        'deviceConnection',
        expect.objectContaining({
          where: expect.any(Object),
          include: expect.any(Object),
          orderBy: { lastSyncAt: 'desc' },
          skip: 0,
          take: 10,
          useCache: true,
        })
      );
    });

    it('should filter by memberId', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices?memberId=member-1');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(optimizedQuery.findMany).toHaveBeenCalledWith(
        'deviceConnection',
        expect.objectContaining({
          where: expect.objectContaining({ memberId: 'member-1' }),
        })
      );
    });

    it('should filter by platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices?platform=APPLE_HEALTHKIT');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(optimizedQuery.findMany).toHaveBeenCalledWith(
        'deviceConnection',
        expect.objectContaining({
          where: expect.objectContaining({ platform: 'APPLE_HEALTHKIT' }),
        })
      );
    });

    it('should filter by isActive status', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices?isActive=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(optimizedQuery.findMany).toHaveBeenCalledWith(
        'deviceConnection',
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should handle empty device list', async () => {
      mockOptimizedQuery.findMany.mockResolvedValue([]);
      mockOptimizedQuery.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/devices');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data).toHaveLength(0);
      expect(data.total).toBe(0);
      expect(data.totalPages).toBe(0);
    });
  });

  describe('POST - Connect Device', () => {
    const validDeviceData = {
      memberId: 'member-1',
      deviceId: 'apple-watch-789',
      deviceName: 'Apple Watch Series 9',
      deviceType: 'SMARTWATCH',
      manufacturer: 'Apple',
      model: 'Series 9',
      firmwareVersion: '10.0',
      platform: 'APPLE_HEALTHKIT',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      permissions: ['READ_STEPS', 'READ_HEART_RATE', 'READ_CALORIES', 'READ_SLEEP'],
      dataTypes: ['STEPS', 'HEART_RATE', 'CALORIES_BURNED', 'SLEEP_DURATION', 'SLEEP_QUALITY'],
      syncInterval: 1800,
    };

    const mockConnectedDevice = {
      ...validDeviceData,
      id: 'device-3',
      isActive: true,
      syncStatus: 'PENDING',
      connectionDate: new Date(),
      lastSyncAt: null,
      retryCount: 0,
    };

    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockSession({ user: { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER' } }));
      mockPrismaFamilyMember.findFirst.mockResolvedValue(createMockMember({ id: 'member-1', name: '张三' }) as any);
      mockPrismaDeviceConnection.findFirst.mockResolvedValue(null);
      mockPrismaDeviceConnection.create.mockResolvedValue(mockConnectedDevice as any);
    });

    it('should connect Apple HealthKit device successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({ ...validDeviceData }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.deviceId).toBe('apple-watch-789');
      expect(data.data.syncStatus).toBe('PENDING');
      expect(data.message).toBe('设备连接成功');
    });

    it('should connect Huawei Health device successfully', async () => {
      const huaweiDevice = {
        ...validDeviceData,
        platform: 'HUAWEI_HEALTH',
      };

      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({ ...huaweiDevice }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.platform).toBe('HUAWEI_HEALTH');
    });

    it('should connect other platform device successfully', async () => {
      const otherDevice = {
        ...validDeviceData,
        platform: 'GOOGLE_FIT',
      };

      mockPrismaDeviceConnection.create.mockResolvedValue({
        ...mockConnectedDevice,
        platform: 'GOOGLE_FIT',
        syncStatus: 'PENDING',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({ ...otherDevice }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.deviceConnection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncStatus: 'PENDING',
          }),
        })
      );
    });

    it('should use default sync interval if not provided', async () => {
      const deviceWithoutInterval = { ...validDeviceData };
      delete deviceWithoutInterval.syncInterval;

      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify(deviceWithoutInterval),
      });
      await POST(request);

      expect(mockPrismaDeviceConnection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ syncInterval: 1800 }),
        })
      );
    });
  });

  describe('Authorization', () => {
    it('POST: should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('未授权访问');
    });

    it('POST: should return 403 when user has no access to member', async () => {
      mockAuth.mockResolvedValue(createMockSession({ user: { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER' } }));
      mockPrismaFamilyMember.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-2',
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'SMARTWATCH',
          manufacturer: 'Test',
          platform: 'APPLE_HEALTHKIT',
          permissions: [],
          dataTypes: [],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无权限访问该家庭成员');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockSession({ user: { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER' } }));
      mockPrismaFamilyMember.findFirst.mockResolvedValue(createMockMember({ id: 'member-1' }) as any);
    });

    it('POST: should return 409 when device already exists', async () => {
      mockPrismaDeviceConnection.findFirst.mockResolvedValue(
        createMockDevice({ id: 'existing-device', isActive: true }) as any
      );

      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-1',
          deviceId: 'apple-watch-123',
          deviceName: 'Apple Watch',
          deviceType: 'SMARTWATCH',
          manufacturer: 'Apple',
          platform: 'APPLE_HEALTHKIT',
          permissions: [],
          dataTypes: [],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('设备已存在');
    });

    it('POST: should return 400 for invalid device type', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-1',
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'INVALID_TYPE',
          manufacturer: 'Test',
          platform: 'APPLE_HEALTHKIT',
          permissions: [],
          dataTypes: [],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('参数错误');
    });

    it('POST: should return 400 for invalid platform', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-1',
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'SMARTWATCH',
          manufacturer: 'Test',
          platform: 'INVALID_PLATFORM',
          permissions: [],
          dataTypes: [],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('参数错误');
    });

    it('POST: should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-1',
          deviceName: 'Test Device',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('参数错误');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(createMockSession({ user: { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER' } }));
    });

    it('GET: should handle database errors gracefully', async () => {
      mockOptimizedQuery.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/devices');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('获取健康评分数据失败');
    });

    it('POST: should handle database errors gracefully', async () => {
      mockPrismaFamilyMember.findFirst.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/devices', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'member-1',
          deviceId: 'device-1',
          deviceName: 'Test Device',
          deviceType: 'SMARTWATCH',
          manufacturer: 'Test',
          platform: 'APPLE_HEALTHKIT',
          permissions: [],
          dataTypes: [],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });
  });
});
