/**
 * Apple HealthKit 集成服务
 * 提供Apple Health数据的读取和同步功能
 */

import {
  addHours,
  startOfDay,
  endOfDay,
  subDays,
  isWithinInterval,
} from "date-fns";
import { randomUUID } from "crypto";
import type {
  AppleHealthData,
  DeviceConnectionInput,
  SyncResult,
} from "@/types/wearable-devices";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import { checkDataDuplication } from "./data-deduplication";

/**
 * Apple HealthKit 服务类
 */
export class HealthKitService {
  private static instance: HealthKitService;
  private deviceId: string = "apple-healthkit";

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  /**
   * 请求HealthKit权限
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // 在实际实现中，这里会调用react-native-health的API
      // 由于这是Next.js环境，我们模拟权限请求

      // 模拟的权限请求结果
      const mockPermissions = {
        steps: true,
        heartRate: true,
        calories: true,
        sleep: true,
        distance: true,
        activeMinutes: true,
      };

      return Object.values(mockPermissions).every((permission) => permission);
    } catch (error) {
      console.error("HealthKit权限请求失败:", error);
      return false;
    }
  }

  /**
   * 检查HealthKit是否可用
   */
  async isHealthKitAvailable(): Promise<boolean> {
    try {
      // 在实际实现中，这里会检查设备是否支持HealthKit
      // 模拟检查结果
      return true;
    } catch (error) {
      console.error("HealthKit可用性检查失败:", error);
      return false;
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(): Promise<Partial<DeviceConnectionInput>> {
    return {
      deviceId: this.deviceId,
      deviceType: "SMARTWATCH",
      deviceName: "Apple Health",
      manufacturer: "Apple Inc.",
      platform: "APPLE_HEALTHKIT",
      permissions: [
        "READ_STEPS",
        "READ_HEART_RATE",
        "READ_CALORIES",
        "READ_SLEEP",
        "READ_DISTANCE",
        "READ_ACTIVE_MINUTES",
      ],
      dataTypes: [
        "STEPS",
        "HEART_RATE",
        "CALORIES_BURNED",
        "SLEEP_DURATION",
        "SLEEP_QUALITY",
        "DISTANCE",
        "ACTIVE_MINUTES",
      ],
    };
  }

  /**
   * 同步步数数据
   */
  async syncStepsData(
    memberId: string,
    startDate: Date,
    endDate: Date,
    deviceConnectionId?: Id<"deviceConnections">,
  ): Promise<Array<Id<"healthData">>> {
    const stepsData: Array<Id<"healthData">> = [];

    const mockStepsData = this.generateMockStepsData(startDate, endDate);

    for (const dayData of mockStepsData) {
      const healthInput = {
        memberId,
        measuredAt: dayData.date,
        source: "APPLE_HEALTHKIT" as const,
        notes: `步数: ${dayData.steps}`,
        deviceConnectionId: deviceConnectionId
          ? String(deviceConnectionId)
          : undefined,
      };

      const deduplicationResult = await checkDataDuplication(
        healthInput,
        memberId,
      );

      if (deduplicationResult.shouldInsert) {
        const response = await convexClient.mutation<{
          success: true;
          data: { recordId: Id<"healthData"> };
        }>(api.health.addRecord, {
          memberId: memberId as Id<"familyMembers">,
          measuredAt: dayData.date.getTime(),
          source: "APPLE_HEALTHKIT",
          notes: healthInput.notes,
          deviceConnectionId,
        });
        stepsData.push(response.data.recordId);
      }
    }

    return stepsData;
  }

  /**
   * 同步心率数据
   */
  async syncHeartRateData(
    memberId: string,
    startDate: Date,
    endDate: Date,
    deviceConnectionId?: Id<"deviceConnections">,
  ): Promise<Array<Id<"healthData">>> {
    const heartRateData: Array<Id<"healthData">> = [];

    const mockHeartRateData = this.generateMockHeartRateData(
      startDate,
      endDate,
    );

    for (const record of mockHeartRateData) {
      const healthInput = {
        memberId,
        heartRate: record.value,
        measuredAt: record.timestamp,
        source: "APPLE_HEALTHKIT" as const,
        notes: `心率: ${record.value} bpm`,
        deviceConnectionId: deviceConnectionId
          ? String(deviceConnectionId)
          : undefined,
      };

      const deduplicationResult = await checkDataDuplication(
        healthInput,
        memberId,
      );

      if (deduplicationResult.shouldInsert) {
        const response = await convexClient.mutation<{
          success: true;
          data: { recordId: Id<"healthData"> };
        }>(api.health.addRecord, {
          memberId: memberId as Id<"familyMembers">,
          heartRate: record.value,
          measuredAt: record.timestamp.getTime(),
          source: "APPLE_HEALTHKIT",
          notes: healthInput.notes,
          deviceConnectionId,
        });
        heartRateData.push(response.data.recordId);
      }
    }

    return heartRateData;
  }

  /**
   * 同步睡眠数据
   */
  async syncSleepData(
    memberId: string,
    startDate: Date,
    endDate: Date,
    deviceConnectionId?: Id<"deviceConnections">,
  ): Promise<Array<Id<"healthData">>> {
    const sleepData: Array<Id<"healthData">> = [];

    const mockSleepData = this.generateMockSleepData(startDate, endDate);

    for (const record of mockSleepData) {
      const healthInput = {
        memberId,
        measuredAt: record.date,
        source: "APPLE_HEALTHKIT" as const,
        notes: `睡眠时长: ${record.duration}小时, 质量: ${record.quality}`,
        deviceConnectionId: deviceConnectionId
          ? String(deviceConnectionId)
          : undefined,
      };

      const deduplicationResult = await checkDataDuplication(
        healthInput,
        memberId,
      );

      if (deduplicationResult.shouldInsert) {
        const response = await convexClient.mutation<{
          success: true;
          data: { recordId: Id<"healthData"> };
        }>(api.health.addRecord, {
          memberId: memberId as Id<"familyMembers">,
          measuredAt: record.date.getTime(),
          source: "APPLE_HEALTHKIT",
          notes: healthInput.notes,
          deviceConnectionId,
        });
        sleepData.push(response.data.recordId);
      }
    }

    return sleepData;
  }

  /**
   * 同步所有类型的数据
   */
  async syncAllData(
    memberId: string,
    deviceConnectionId: Id<"deviceConnections">,
    lastSyncDate?: Date,
  ): Promise<SyncResult> {
    const startDate = lastSyncDate || subDays(new Date(), 7);
    const endDate = new Date();

    const errors: string[] = [];
    let totalSynced = 0;

    try {
      const stepsData = await this.syncStepsData(
        memberId,
        startDate,
        endDate,
        deviceConnectionId,
      );
      totalSynced += stepsData.length;

      const heartRateData = await this.syncHeartRateData(
        memberId,
        startDate,
        endDate,
        deviceConnectionId,
      );
      totalSynced += heartRateData.length;

      const sleepData = await this.syncSleepData(
        memberId,
        startDate,
        endDate,
        deviceConnectionId,
      );
      totalSynced += sleepData.length;
    } catch (error) {
      errors.push(
        `HealthKit同步失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }

    return {
      success: errors.length === 0,
      syncedCount: totalSynced,
      skippedCount: 0, // 在实际实现中，应该计算跳过的记录数
      errors,
      lastSyncDate: new Date(),
    };
  }

  /**
   * 生成模拟步数数据
   */
  private generateMockStepsData(
    startDate: Date,
    endDate: Date,
  ): AppleHealthData[] {
    const data: AppleHealthData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      data.push({
        steps: Math.floor(Math.random() * 8000) + 4000, // 4000-12000步
        date: new Date(currentDate),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * 生成模拟心率数据
   */
  private generateMockHeartRateData(
    startDate: Date,
    endDate: Date,
  ): Array<{ timestamp: Date; value: number }> {
    const data: Array<{ timestamp: Date; value: number }> = [];
    const currentTimestamp = new Date(startDate);

    while (currentTimestamp <= endDate) {
      // 每小时生成一个心率数据点
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(currentTimestamp);
        timestamp.setHours(hour, 0, 0, 0);

        data.push({
          timestamp,
          value: Math.floor(Math.random() * 30) + 60, // 60-90 bpm
        });
      }

      currentTimestamp.setDate(currentTimestamp.getDate() + 1);
    }

    return data;
  }

  /**
   * 生成模拟睡眠数据
   */
  private generateMockSleepData(
    startDate: Date,
    endDate: Date,
  ): Array<{ date: Date; duration: number; quality: number }> {
    const data: Array<{ date: Date; duration: number; quality: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      data.push({
        date: new Date(currentDate),
        duration: Math.random() * 3 + 5, // 5-8小时
        quality: Math.random() * 30 + 60, // 60-90分
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 测试HealthKit是否可用
      const isAvailable = await this.isHealthKitAvailable();
      if (!isAvailable) {
        return false;
      }

      // 测试权限
      const hasPermissions = await this.requestPermissions();
      return hasPermissions;
    } catch (error) {
      console.error("HealthKit连接测试失败:", error);
      return false;
    }
  }

  /**
   * 获取支持的权限列表
   */
  getSupportedPermissions(): string[] {
    return [
      "READ_STEPS",
      "READ_HEART_RATE",
      "READ_CALORIES",
      "READ_SLEEP",
      "READ_DISTANCE",
      "READ_ACTIVE_MINUTES",
      "READ_WEIGHT",
      "READ_BLOOD_PRESSURE",
    ];
  }

  /**
   * 获取平台信息
   */
  getPlatformInfo() {
    return {
      name: "Apple HealthKit",
      version: "1.0",
      supportedOS: ["iOS"],
      minVersion: "iOS 13.0",
      features: [
        "步数追踪",
        "心率监测",
        "睡眠分析",
        "卡路里消耗",
        "运动记录",
        "体重管理",
        "血压监测",
      ],
    };
  }
}

// 导出单例实例
export const healthKitService = HealthKitService.getInstance();

type PlatformConnectionInfo = {
  id: string;
  syncStatus: "PENDING" | "SYNCING" | "SUCCESS" | "FAILED" | "DISABLED";
  lastSyncAt?: Date;
};

export async function connectHealthKitDevice(
  memberId: string,
  deviceInfo: Partial<DeviceConnectionInput>,
): Promise<PlatformConnectionInfo> {
  const service = HealthKitService.getInstance();

  const isConnected = await service.testConnection();
  if (!isConnected) {
    throw new Error("HealthKit连接失败，请检查权限设置");
  }

  void memberId;
  void deviceInfo;

  return {
    id: randomUUID(),
    syncStatus: "PENDING",
    lastSyncAt: undefined,
  };
}

export async function disconnectHealthKitDevice(
  deviceId: string,
): Promise<void> {
  void deviceId;
}
