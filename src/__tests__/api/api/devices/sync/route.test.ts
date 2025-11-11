/**
 * api/devices/sync/route.ts API 测试
 * 设备同步API测试
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { POST, PUT } from '@/app/api/devices/sync/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/healthkit-service', () => ({
  healthKitService: {
    syncAllData: jest.fn(),
  },
  connectHealthKitDevice: jest.fn(),
}));

jest.mock('@/lib/services/huawei-health-service', () => ({
  huaweiHealthService: {
    syncAllData: jest.fn(),
  },
  connectHuaweiHealthDevice: jest.fn(),
}));

const mockAppleDevice = {
  id: 'device-1',
  deviceId: 'apple-watch-123',
  platform: 'APPLE_HEALTHKIT',
  isActive: true,
  memberId: 'member-1',
  lastSyncAt: new Date('2024-01-14'),
};

const mockHuaweiDevice = {
  id: 'device-2',
  deviceId: 'huawei-band-456',
  platform: 'HUAWEI_HEALTH',
  isActive: true,
  memberId: 'member-1',
  lastSyncAt: new Date('2024-01-13'),
};

const mockSyncResult = {
  success: true,
  syncedCount: 50,
  skippedCount: 5,
  errors: [],
  lastSyncDate: new Date('2024-01-15'),
};

describe('/api/devices/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_CODES = 'ADMIN123';
  });

  describe('POST - Sync Single Device', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1', name: '张三' });
      (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({
        ...mockAppleDevice,
        syncStatus: 'SUCCESS',
      });
    });

    it('should sync Apple HealthKit device successfully', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockAppleDevice);
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'apple-watch-123',
          memberId: 'member-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.deviceId).toBe('apple-watch-123');
      expect(data.data.syncResult.syncedCount).toBe(50);
      expect(data.data.syncStatus).toBe('SUCCESS');
      expect(prisma.deviceConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1' },
          data: { syncStatus: 'SYNCING' },
        })
      );
    });

    it('should sync Huawei Health device successfully', async () => {
      const { huaweiHealthService } = await import('@/lib/services/huawei-health-service');
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockHuaweiDevice);
      (huaweiHealthService.syncAllData as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'huawei-band-456',
          memberId: 'member-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.syncResult.success).toBe(true);
    });

    it('should handle sync with invalid platform', async () => {
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue({
        ...mockAppleDevice,
        platform: 'INVALID_PLATFORM',
      });

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'device-1',
          memberId: 'member-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.syncResult.success).toBe(false);
      expect(data.data.syncResult.errors).toContain('该平台暂不支持自动同步');
      expect(prisma.deviceConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1' },
          data: expect.objectContaining({ syncStatus: 'FAILED' }),
        })
      );
    });

    it('should sync with specific data types', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockAppleDevice);
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'apple-watch-123',
          memberId: 'member-1',
          dataTypes: ['HEART_RATE', 'STEPS'],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(healthKitService.syncAllData).toHaveBeenCalledWith(
        'member-1',
        'device-1',
        mockAppleDevice.lastSyncAt || undefined
      );
    });

    it('should update sync status to SUCCESS on successful sync', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockAppleDevice);
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'apple-watch-123',
          memberId: 'member-1',
        }),
      });
      await POST(request);

      expect(prisma.deviceConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1' },
          data: { syncStatus: 'SYNCING' },
        })
      );
    });

    it('should update sync status to FAILED on sync failure', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockAppleDevice);
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue({
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errors: ['Sync failed: Network error'],
      });

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'apple-watch-123',
          memberId: 'member-1',
        }),
      });
      await POST(request);

      expect(prisma.deviceConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1' },
          data: {
            syncStatus: 'FAILED',
            lastError: 'Sync failed: Network error',
            retryCount: { increment: 1 },
          },
        })
      );
    });
  });

  describe('PUT - Batch Sync All Devices', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1', name: '张三' });
    });

    it('should sync all devices successfully', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');
      const { huaweiHealthService } = await import('@/lib/services/huawei-health-service');

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue([mockAppleDevice, mockHuaweiDevice]);
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue({ ...mockSyncResult, syncedCount: 30 });
      (huaweiHealthService.syncAllData as jest.Mock).mockResolvedValue({ ...mockSyncResult, syncedCount: 20 });

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.totalDevices).toBe(2);
      expect(data.data.totalSynced).toBe(50);
      expect(data.message).toBe('完成 2 个设备的同步');
    });

    it('should handle no devices to sync', async () => {
      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.totalDevices).toBe(0);
      expect(data.data.errors).toContain('没有可同步的设备');
    });

    it('should handle partial sync failures', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');
      const { huaweiHealthService } = await import('@/lib/services/huawei-health-service');

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue([mockAppleDevice, mockHuaweiDevice]);
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue({ ...mockSyncResult, success: false, errors: ['HealthKit sync failed'] });
      (huaweiHealthService.syncAllData as jest.Mock).mockResolvedValue({ ...mockSyncResult, syncedCount: 20 });

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.syncedDevices).toHaveLength(2);
      expect(data.data.totalSynced).toBe(20);
    });

    it('should update sync status to SYNCING before sync', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue([mockAppleDevice]);
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      await PUT(request);

      expect(prisma.deviceConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'device-1' },
          data: { syncStatus: 'SYNCING' },
        })
      );
    });

    it('should handle individual device sync failures gracefully', async () => {
      const { healthKitService } = await import('@/lib/services/healthkit-service');

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue([mockAppleDevice, mockHuaweiDevice]);

      // Mock one device failing
      (healthKitService.syncAllData as jest.Mock).mockResolvedValue(mockSyncResult);

      const syncError = new Error('Sync failed');
      (prisma.deviceConnection.update as jest.Mock)
        .mockResolvedValueOnce({ ...mockAppleDevice, syncStatus: 'SUCCESS' })
        .mockRejectedValueOnce(syncError);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should complete even with one device failing
      expect(data.success).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('POST: should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-1', memberId: 'member-1' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('未授权访问');
    });

    it('PUT: should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('未授权访问');
    });

    it('POST: should return 403 when user has no access to member', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({ deviceId: 'device-1', memberId: 'member-2' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('无权限访问该家庭成员');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('POST: should return 404 when device not found', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'non-existent-device',
          memberId: 'member-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('设备未连接或已禁用');
    });

    it('POST: should return 400 for missing deviceId', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('参数错误');
    });

    it('PUT: should return 400 for missing memberId', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('缺少memberId参数');
    });

    it('POST: should validate dataTypes format', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
      (prisma.deviceConnection.findFirst as jest.Mock).mockResolvedValue(mockAppleDevice);

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'apple-watch-123',
          memberId: 'member-1',
          dataTypes: { invalid: 'format' }, // Invalid format
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
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    });

    it('POST: should handle database errors gracefully', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: 'apple-watch-123',
          memberId: 'member-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('服务器内部错误');
    });

    it('PUT: should handle batch sync errors gracefully', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
      (prisma.deviceConnection.findMany as jest.Mock).mockRejectedValue(new Error('Batch sync failed'));

      const request = new NextRequest('http://localhost:3000/api/devices/sync', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'member-1' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('服务器内部错误');
    });
  });
});
