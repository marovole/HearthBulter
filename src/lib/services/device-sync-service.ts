import { addMinutes, subMinutes, isAfter } from "date-fns";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import type { SyncResult } from "@/types/wearable-devices";
import { healthKitService } from "./healthkit-service";
import { huaweiHealthService } from "./huawei-health-service";

export type SyncStatus = "PENDING" | "SYNCING" | "SUCCESS" | "FAILED" | "DISABLED";

type DeviceConnectionRecord = {
  _id: Id<"deviceConnections">;
  memberId: Id<"familyMembers">;
  deviceName: string;
  platform: string;
  lastSyncAt?: number;
  syncInterval?: number;
  syncStatus: SyncStatus;
  isActive: boolean;
  isAutoSync: boolean;
  errorCount?: number;
  retryCount?: number;
  lastError?: string | null;
  member?: {
    id: Id<"familyMembers">;
    name: string;
    userId?: Id<"users">;
  } | null;
};

export class DeviceSyncService {
  private static instance: DeviceSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  static getInstance(): DeviceSyncService {
    if (!DeviceSyncService.instance) {
      DeviceSyncService.instance = new DeviceSyncService();
    }
    return DeviceSyncService.instance;
  }

  startBackgroundSync(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      this.stopBackgroundSync();
    }

    console.log(`启动设备后台同步任务，间隔 ${intervalMinutes} 分钟`);

    this.syncAllDevices();

    this.syncInterval = setInterval(
      () => {
        this.syncAllDevices();
      },
      intervalMinutes * 60 * 1000
    );

    this.isRunning = true;
  }

  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    console.log("设备后台同步任务已停止");
  }

  async syncAllDevices(): Promise<SyncAllResult> {
    console.log("开始同步所有活跃设备...");

    const startTime = new Date();
    const results: DeviceSyncResult[] = [];

    try {
      const activeDevices = await convexClient.query<DeviceConnectionRecord[]>(
        api.devices.listActiveAutoSync,
        {}
      );

      console.log(`找到 ${activeDevices.length} 个活跃设备`);

      const syncPromises = activeDevices.map((device) => this.syncSingleDevice(device));

      const deviceResults = await Promise.all(syncPromises);
      results.push(...deviceResults);

      const summary = this.summarizeSyncResults(results);
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(
        `设备同步完成，耗时 ${duration}ms，成功 ${summary.successCount}/${summary.totalCount}`
      );

      const errors = results.flatMap((result) => result.errors ?? []);

      return {
        success: summary.errorCount === 0,
        totalCount: summary.totalCount,
        successCount: summary.successCount,
        errorCount: summary.errorCount,
        syncedDataCount: summary.syncedDataCount,
        duration,
        startTime,
        endTime,
        results,
        errors: summary.errorCount > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error("设备同步失败:", error);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        success: false,
        totalCount: 0,
        successCount: 0,
        errorCount: 1,
        syncedDataCount: 0,
        duration,
        startTime,
        endTime,
        results: [],
        errors: [error instanceof Error ? error.message : "未知错误"],
      };
    }
  }

  private async syncSingleDevice(device: DeviceConnectionRecord): Promise<DeviceSyncResult> {
    const startTime = new Date();

    try {
      if (!this.shouldSyncDevice(device)) {
        return {
          deviceId: device._id,
          deviceName: device.deviceName,
          platform: device.platform,
          success: true,
          skipped: true,
          reason: "未到同步时间",
          syncedDataCount: 0,
          duration: 0,
          startTime,
          endTime: new Date(),
        };
      }

      await convexClient.mutation(api.devices.updateConnection, {
        id: device._id,
        patch: {
          syncStatus: "SYNCING",
        },
      });

      let syncResult: SyncResult;
      const lastSyncDate = device.lastSyncAt ? new Date(device.lastSyncAt) : undefined;
      if (device.platform === "APPLE_HEALTHKIT") {
        syncResult = await healthKitService.syncAllData(
          device.memberId as string,
          device._id,
          lastSyncDate
        );
      } else if (device.platform === "HUAWEI_HEALTH") {
        syncResult = await huaweiHealthService.syncAllData(
          device.memberId as string,
          device._id,
          lastSyncDate
        );
      } else {
        throw new Error(`不支持的平台: ${device.platform}`);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      if (syncResult.success) {
        await convexClient.mutation(api.devices.updateConnection, {
          id: device._id,
          patch: {
            syncStatus: "SUCCESS",
            lastSyncAt: syncResult.lastSyncDate.getTime(),
            errorCount: 0,
            lastError: null,
            retryCount: 0,
          },
        });

        return {
          deviceId: device._id,
          deviceName: device.deviceName,
          platform: device.platform,
          success: true,
          syncedDataCount: syncResult.syncedCount,
          duration,
          startTime,
          endTime,
        };
      }

      await convexClient.mutation(api.devices.updateConnection, {
        id: device._id,
        patch: {
          syncStatus: "FAILED",
          lastError: syncResult.errors[0],
          errorCount: (device.errorCount ?? 0) + 1,
        },
      });

      return {
        deviceId: device._id,
        deviceName: device.deviceName,
        platform: device.platform,
        success: false,
        syncedDataCount: 0,
        duration,
        startTime,
        endTime,
        errors: syncResult.errors,
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.error(`设备 ${device.deviceName} 同步失败:`, error);

      try {
        await convexClient.mutation(api.devices.updateConnection, {
          id: device._id,
          patch: {
            syncStatus: "FAILED",
            lastError: error instanceof Error ? error.message : "未知错误",
            errorCount: (device.errorCount ?? 0) + 1,
          },
        });
      } catch (updateError) {
        console.error("更新设备错误状态失败:", updateError);
      }

      return {
        deviceId: device._id,
        deviceName: device.deviceName,
        platform: device.platform,
        success: false,
        syncedDataCount: 0,
        duration,
        startTime,
        endTime,
        errors: [error instanceof Error ? error.message : "未知错误"],
      };
    }
  }

  private shouldSyncDevice(device: DeviceConnectionRecord): boolean {
    if (!device.isActive || !device.isAutoSync) {
      return false;
    }

    const lastSync = device.lastSyncAt ? new Date(device.lastSyncAt) : null;
    if (!lastSync) {
      return true;
    }

    const interval = device.syncInterval || 1800;
    const nextSyncTime = addMinutes(lastSync, interval / 60);

    return isAfter(new Date(), nextSyncTime);
  }

  private summarizeSyncResults(results: DeviceSyncResult[]): SyncSummary {
    const totalCount = results.length;
    const successCount = results.filter((r) => r.success).length;
    const errorCount = totalCount - successCount;
    const syncedDataCount = results.reduce((sum, result) => sum + result.syncedDataCount, 0);

    return {
      totalCount,
      successCount,
      errorCount,
      syncedDataCount,
    };
  }

  async getSyncStatus(): Promise<SyncStatusSummary> {
    const thirtyMinutesAgo = subMinutes(new Date(), 30);

    const devices = await convexClient.query<DeviceConnectionRecord[]>(
      api.devices.listActiveAutoSync,
      {}
    );

    const recentSyncs = devices.filter((device) =>
      device.lastSyncAt ? isAfter(new Date(device.lastSyncAt), thirtyMinutesAgo) : false
    );

    const staleDevices = devices.filter((device) =>
      device.lastSyncAt ? isAfter(thirtyMinutesAgo, new Date(device.lastSyncAt)) : true
    );

    return {
      totalDevices: devices.length,
      recentlySynced: recentSyncs.length,
      staleDevices: staleDevices.length,
      lastSyncTime: devices[0]?.lastSyncAt ? new Date(devices[0].lastSyncAt) : null,
      status: this.isRunning ? "RUNNING" : "STOPPED",
      devices: devices.map((device) => ({
        id: device._id,
        name: device.deviceName,
        platform: device.platform,
        status: device.syncStatus,
        lastSyncAt: device.lastSyncAt ? new Date(device.lastSyncAt) : null,
        errorCount: device.errorCount || 0,
        lastError: device.lastError || undefined,
      })),
    };
  }
}

export interface DeviceSyncResult {
  deviceId: Id<"deviceConnections">;
  deviceName: string;
  platform: string;
  success: boolean;
  skipped?: boolean;
  reason?: string;
  syncedDataCount: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  errors?: string[];
}

export interface SyncAllResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  errorCount: number;
  syncedDataCount: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  results: DeviceSyncResult[];
  errors?: string[];
}

export interface SyncSummary {
  totalCount: number;
  successCount: number;
  errorCount: number;
  syncedDataCount: number;
}

export interface SyncStatusSummary {
  totalDevices: number;
  recentlySynced: number;
  staleDevices: number;
  lastSyncTime: Date | null;
  status: "RUNNING" | "STOPPED";
  devices: Array<{
    id: Id<"deviceConnections">;
    name: string;
    platform: string;
    status: SyncStatus;
    lastSyncAt: Date | null;
    errorCount: number;
    lastError?: string;
  }>;
}

export const deviceSyncService = DeviceSyncService.getInstance();
