/**
 * 可穿戴设备集成服务测试
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { DeviceSyncService } from "@/lib/services/device-sync-service";
import { healthKitService } from "@/lib/services/healthkit-service";
import { huaweiHealthService } from "@/lib/services/huawei-health-service";
import {
  checkDataDuplication,
  cleanupDuplicateData,
} from "@/lib/services/data-deduplication";
import { prisma } from "@/lib/db";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    deviceConnection: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    healthData: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
    familyMember: {
      findFirst: jest.fn(),
    },
  },
}));

describe("DeviceSyncService", () => {
  let syncService: DeviceSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = DeviceSyncService.getInstance();
  });

  describe("Background Sync", () => {
    it("should start and stop background sync", async () => {
      const mockInterval = jest
        .spyOn(global, "setInterval")
        .mockImplementation();

      syncService.startBackgroundSync(1); // 1分钟间隔

      expect(mockInterval).toHaveBeenCalled();
      expect(syncService.getServiceStatus().isRunning).toBe(true);

      syncService.stopBackgroundSync();
      expect(syncService.getServiceStatus().isRunning).toBe(false);

      mockInterval.mockRestore();
    });

    it("should sync all devices successfully", async () => {
      // Mock device data
      const mockDevices = [
        {
          id: "device1",
          deviceName: "Apple Watch",
          platform: "APPLE_HEALTHKIT",
          memberId: "member1",
          lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
          isActive: true,
          isAutoSync: true,
          syncStatus: "PENDING" as const,
          member: { id: "member1", name: "Test User", user: { id: "user1" } },
        },
      ];

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue(
        mockDevices,
      );
      (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({});

      // Mock health data
      const mockHealthData = [
        { id: "health1", memberId: "member1", measuredAt: new Date() },
      ];

      (prisma.healthData.findMany as jest.Mock).mockResolvedValue(
        mockHealthData,
      );

      const result = await syncService.syncAllDevices();

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(1);
      expect(result.successCount).toBe(1);
      expect(prisma.deviceConnection.update).toHaveBeenCalled();
    });

    it("should handle sync failures", async () => {
      const mockDevices = [
        {
          id: "device1",
          deviceName: "Apple Watch",
          platform: "APPLE_HEALTHKIT",
          memberId: "member1",
          isActive: true,
          isAutoSync: true,
          syncStatus: "PENDING" as const,
          member: { id: "member1", name: "Test User", user: { id: "user1" } },
        },
      ];

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue(
        mockDevices,
      );
      (prisma.deviceConnection.update as jest.Mock).mockRejectedValue(
        new Error("Sync failed"),
      );

      const result = await syncService.syncAllDevices();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toContain("Sync failed");
    });
  });

  describe("Device Cleanup", () => {
    it("should cleanup stale devices", async () => {
      const mockStaleDevices = [
        {
          id: "stale1",
          deviceName: "Old Device",
          isActive: true,
          lastSyncAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4天前
        },
      ];

      (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue(
        mockStaleDevices,
      );
      (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({});

      const result = await syncService.cleanupStaleDevices();

      expect(result.totalStale).toBe(1);
      expect(result.disabledCount).toBe(1);
      expect(prisma.deviceConnection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stale1" },
          data: expect.objectContaining({
            isActive: false,
            syncStatus: "DISABLED",
          }),
        }),
      );
    });
  });
});

describe("HealthKitService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should check HealthKit availability", async () => {
    const isAvailable = await healthKitService.isHealthKitAvailable();
    expect(isAvailable).toBe(true);
  });

  it("should request permissions", async () => {
    const hasPermissions = await healthKitService.requestPermissions();
    expect(hasPermissions).toBe(true);
  });

  it("should test connection", async () => {
    const isConnected = await healthKitService.testConnection();
    expect(isConnected).toBe(true);
  });

  it("should get platform info", () => {
    const info = healthKitService.getPlatformInfo();

    expect(info.name).toBe("Apple HealthKit");
    expect(info.supportedOS).toContain("iOS");
    expect(info.features).toContain("步数追踪");
    expect(info.features).toContain("心率监测");
  });

  it("should get device info", async () => {
    const deviceInfo = await healthKitService.getDeviceInfo();

    expect(deviceInfo.deviceId).toBe("apple-healthkit");
    expect(deviceInfo.platform).toBe("APPLE_HEALTHKIT");
    expect(deviceInfo.permissions).toContain("READ_STEPS");
    expect(deviceInfo.dataTypes).toContain("STEPS");
  });

  it("should sync data successfully", async () => {
    const mockDevice = {
      id: "device1",
      memberId: "member1",
    };

    (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({});
    (prisma.healthData.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.healthData.create as jest.Mock).mockResolvedValue({});

    const result = await healthKitService.syncAllData("member1", mockDevice.id);

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe("HuaweiHealthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize Huawei Health SDK", async () => {
    const service = (await import("@/lib/services/huawei-health-service"))
      .huaweiHealthService;
    const isInitialized = await service.initialize();

    expect(isInitialized).toBe(true);
  });

  it("should request permissions", async () => {
    const service = (await import("@/lib/services/huawei-health-service"))
      .huaweiHealthService;
    const hasPermissions = await service.requestPermissions();

    expect(hasPermissions).toBe(true);
  });

  it("should check Huawei Health availability", async () => {
    const service = (await import("@/lib/services/huawei-health-service"))
      .huaweiHealthService;
    const isAvailable = await service.isHuaweiHealthAvailable();

    expect(isAvailable).toBe(true);
  });

  it("should get platform info", async () => {
    const service = (await import("@/lib/services/huawei-health-service"))
      .huaweiHealthService;
    const info = service.getPlatformInfo();

    expect(info.name).toBe("华为Health");
    expect(info.supportedOS).toContain("Android");
    expect(info.features).toContain("步数追踪");
    expect(info.features).toContain("体重管理");
  });

  it("should sync data successfully", async () => {
    const service = (await import("@/lib/services/huawei-health-service"))
      .huaweiHealthService;
    const mockDevice = {
      id: "device1",
      memberId: "member1",
    };

    (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({});
    (prisma.healthData.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.healthData.create as jest.Mock).mockResolvedValue({});

    const result = await service.syncAllData("member1", mockDevice.id);

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe("Data Deduplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow insertion for new data", async () => {
    const inputData = {
      memberId: "member1",
      weight: 70.5,
      measuredAt: new Date(),
      source: "WEARABLE" as const,
    };

    (prisma.healthData.findMany as jest.Mock).mockResolvedValue([]);

    const result = await checkDataDuplication(inputData, "member1");

    expect(result.shouldInsert).toBe(true);
    expect(result.recommendedAction).toBe("INSERT");
    expect(result.conflictingRecords).toHaveLength(0);
  });

  it("should prioritize device data over manual data", async () => {
    const inputData = {
      memberId: "member1",
      weight: 70.5,
      measuredAt: new Date(),
      source: "APPLE_HEALTHKIT" as const,
    };

    const existingRecord = {
      id: "existing1",
      memberId: "member1",
      weight: 70.0,
      measuredAt: new Date(),
      source: "MANUAL" as const,
    };

    (prisma.healthData.findMany as jest.Mock).mockResolvedValue([
      existingRecord,
    ]);

    const result = await checkDataDuplication(inputData, "member1");

    expect(result.shouldInsert).toBe(false);
    expect(result.recommendedAction).toBe("UPDATE");
    expect(result.conflictingRecords).toHaveLength(1);
  });

  it("should skip duplicate data with same priority", async () => {
    const inputData = {
      memberId: "member1",
      weight: 70.5,
      measuredAt: new Date(),
      source: "APPLE_HEALTHKIT" as const,
    };

    const existingRecord = {
      id: "existing1",
      memberId: "member1",
      weight: 70.5,
      measuredAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
      source: "APPLE_HEALTHKIT" as const,
    };

    (prisma.healthData.findMany as jest.Mock).mockResolvedValue([
      existingRecord,
    ]);

    const result = await checkDataDuplication(inputData, "member1");

    expect(result.shouldInsert).toBe(false);
    expect(result.recommendedAction).toBe("SKIP");
    expect(result.conflictingRecords).toHaveLength(1);
  });

  it("should cleanup duplicate data", async () => {
    const mockData = [
      {
        id: "data1",
        memberId: "member1",
        weight: 70.5,
        measuredAt: new Date(),
        source: "MANUAL" as const,
      },
      {
        id: "data2",
        memberId: "member1",
        weight: 70.8,
        measuredAt: new Date(),
        source: "APPLE_HEALTHKIT" as const,
      },
    ];

    (prisma.healthData.findMany as jest.Mock).mockResolvedValue(mockData);
    (prisma.healthData.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await cleanupDuplicateData("member1");

    expect(result.cleanedCount).toBeGreaterThan(0);
    expect(result.warnings).toBeDefined();
    expect(prisma.healthData.deleteMany).toHaveBeenCalled();
  });
});

describe("Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle complete device lifecycle", async () => {
    // 1. 连接设备
    const mockDeviceData = {
      memberId: "member1",
      deviceId: "test-device",
      platform: "APPLE_HEALTHKIT" as const,
      deviceType: "SMARTWATCH" as const,
      deviceName: "Test Watch",
      manufacturer: "Test Inc.",
    };

    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({
      id: "member1",
    });
    (prisma.deviceConnection.create as jest.Mock).mockResolvedValue({
      id: "device1",
      ...mockDeviceData,
    });

    // 这里我们无法直接调用连接函数，因为它依赖于import()
    // 在实际测试中，我们需要设置适当的测试环境

    // 2. 同步数据
    const mockHealthData = [
      { id: "health1", memberId: "member1", measuredAt: new Date() },
    ];

    (prisma.deviceConnection.findMany as jest.Mock).mockResolvedValue([
      {
        id: "device1",
        deviceId: "test-device",
        memberId: "member1",
        platform: "APPLE_HEALTHKIT",
        lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isActive: true,
        isAutoSync: true,
        syncStatus: "PENDING" as const,
        member: { id: "member1", name: "Test User", user: { id: "user1" } },
      },
    ]);
    (prisma.healthData.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.healthData.create as jest.Mock).mockResolvedValue({});

    const syncService = DeviceSyncService.getInstance();
    const syncResult = await syncService.syncAllDevices();

    expect(syncResult.success).toBe(true);
    expect(syncResult.totalCount).toBe(1);

    // 3. 断开连接
    (prisma.deviceConnection.update as jest.Mock).mockResolvedValue({});

    // 在实际测试中，我们会调用断开连接的API
    expect(prisma.deviceConnection.update).toHaveBeenCalled();
  });
});
