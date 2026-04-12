/**
 * Convex Device Repository 实现
 *
 * 基于 Convex 实现设备连接数据访问层
 *
 * @module convex-device-repository
 */

import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  DeviceConnectionDTO,
  DeviceConnectionCreateInputDTO,
  DeviceConnectionUpdateInputDTO,
  DeviceConnectionFilterDTO,
} from "../types/device";
import type { DeviceRepository } from "../interfaces/device-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

// Convex 文档类型定义
type DeviceConnectionDoc = Doc<"deviceConnections"> & {
  memberId: Id<"familyMembers">;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  manufacturer: string;
  model?: string;
  firmwareVersion?: string;
  platform: string;
  accessToken?: string;
  refreshToken?: string;
  lastSyncAt?: number;
  syncStatus: string;
  syncInterval: number;
  permissions?: string[];
  dataTypes?: string[];
  isActive: boolean;
  isAutoSync: boolean;
  connectionDate: number;
  disconnectionDate?: number;
  lastError?: string;
  errorCount: number;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
};

export class ConvexDeviceRepository implements DeviceRepository {
  // ==================== CRUD 操作 ====================

  async createDeviceConnection(
    input: DeviceConnectionCreateInputDTO
  ): Promise<DeviceConnectionDTO> {
    const id = await convexClient.mutation(api.devices.createConnection, {
      memberId: input.memberId as Id<"familyMembers">,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      deviceType: input.deviceType,
      manufacturer: input.manufacturer,
      model: input.model,
      firmwareVersion: input.firmwareVersion,
      platform: input.platform,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      permissions: input.permissions,
      dataTypes: input.dataTypes,
      syncInterval: input.syncInterval ?? 1800,
      syncStatus: "PENDING",
      isActive: true,
      isAutoSync: false,
      connectionDate: Date.now(),
      errorCount: 0,
      retryCount: 0,
    });

    const doc = await convexClient.query<DeviceConnectionDoc | null>(api.devices.getById, {
      id: id as Id<"deviceConnections">,
    });

    if (!doc) {
      throw new Error("Failed to create device connection");
    }

    return this.mapDeviceConnectionDoc(doc);
  }

  async getDeviceConnectionById(id: string): Promise<DeviceConnectionDTO | null> {
    const doc = await convexClient.query<DeviceConnectionDoc | null>(api.devices.getById, {
      id: id as Id<"deviceConnections">,
    });

    if (!doc) return null;
    return this.mapDeviceConnectionDoc(doc);
  }

  async getDeviceConnectionByDeviceId(deviceId: string): Promise<DeviceConnectionDTO | null> {
    const doc = await convexClient.query<DeviceConnectionDoc | null>(
      api.devices.getActiveByDeviceId,
      { deviceId }
    );

    if (!doc) return null;
    return this.mapDeviceConnectionDoc(doc);
  }

  async listDeviceConnections(
    filter?: DeviceConnectionFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<DeviceConnectionDTO>> {
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? 10;

    // 构建 memberIds 数组（Convex listConnections 需要）
    const memberIds = filter?.memberId ? [filter.memberId as Id<"familyMembers">] : [];

    const result = await convexClient.query<{
      data: DeviceConnectionDoc[];
      total: number;
    }>(api.devices.listConnections, {
      memberIds,
      memberId: filter?.memberId as Id<"familyMembers"> | undefined,
      platform: filter?.platform,
      isActive: filter?.isActive,
      offset,
      limit,
    });

    const items = result.data.map((doc) => this.mapDeviceConnectionDoc(doc));

    return {
      items,
      total: result.total,
      hasMore: offset + items.length < result.total,
    };
  }

  async updateDeviceConnection(
    id: string,
    input: DeviceConnectionUpdateInputDTO
  ): Promise<DeviceConnectionDTO> {
    const patch: Record<string, unknown> = {};

    if (input.deviceName !== undefined) patch.deviceName = input.deviceName;
    if (input.model !== undefined) patch.model = input.model;
    if (input.firmwareVersion !== undefined) patch.firmwareVersion = input.firmwareVersion;
    if (input.accessToken !== undefined) patch.accessToken = input.accessToken;
    if (input.refreshToken !== undefined) patch.refreshToken = input.refreshToken;
    if (input.lastSyncAt !== undefined) patch.lastSyncAt = input.lastSyncAt?.getTime();
    if (input.syncStatus !== undefined) patch.syncStatus = input.syncStatus;
    if (input.syncInterval !== undefined) patch.syncInterval = input.syncInterval;
    if (input.permissions !== undefined) patch.permissions = input.permissions;
    if (input.dataTypes !== undefined) patch.dataTypes = input.dataTypes;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    if (input.isAutoSync !== undefined) patch.isAutoSync = input.isAutoSync;
    if (input.disconnectionDate !== undefined)
      patch.disconnectionDate = input.disconnectionDate?.getTime();
    if (input.lastError !== undefined) patch.lastError = input.lastError;
    if (input.errorCount !== undefined) patch.errorCount = input.errorCount;
    if (input.retryCount !== undefined) patch.retryCount = input.retryCount;

    await convexClient.mutation(api.devices.updateConnection, {
      id: id as Id<"deviceConnections">,
      patch,
    });

    const updated = await convexClient.query<DeviceConnectionDoc | null>(api.devices.getById, {
      id: id as Id<"deviceConnections">,
    });

    if (!updated) {
      throw new Error(`Device connection not found: ${id}`);
    }

    return this.mapDeviceConnectionDoc(updated);
  }

  async disconnectDevice(id: string): Promise<void> {
    await convexClient.mutation(api.devices.updateConnection, {
      id: id as Id<"deviceConnections">,
      patch: {
        isActive: false,
        isAutoSync: false,
        syncStatus: "DISABLED",
        disconnectionDate: Date.now(),
      },
    });
  }

  async updateSyncStatus(
    id: string,
    syncStatus: "PENDING" | "SYNCING" | "SUCCESS" | "FAILED" | "DISABLED",
    lastSyncAt?: Date,
    lastError?: string | null
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      syncStatus,
    };

    if (lastSyncAt) patch.lastSyncAt = lastSyncAt.getTime();
    if (lastError !== undefined) patch.lastError = lastError;

    await convexClient.mutation(api.devices.updateConnection, {
      id: id as Id<"deviceConnections">,
      patch,
    });
  }

  async incrementRetryCount(id: string): Promise<void> {
    const doc = await convexClient.query<DeviceConnectionDoc | null>(api.devices.getById, {
      id: id as Id<"deviceConnections">,
    });

    if (!doc) throw new Error(`Device connection not found: ${id}`);

    await convexClient.mutation(api.devices.updateConnection, {
      id: id as Id<"deviceConnections">,
      patch: {
        retryCount: (doc.retryCount || 0) + 1,
      },
    });
  }

  async resetErrorStatus(id: string): Promise<void> {
    await convexClient.mutation(api.devices.updateConnection, {
      id: id as Id<"deviceConnections">,
      patch: {
        errorCount: 0,
        retryCount: 0,
        lastError: null,
      },
    });
  }

  async getActiveDevicesByMember(memberId: string): Promise<DeviceConnectionDTO[]> {
    const result = await convexClient.query<{
      data: DeviceConnectionDoc[];
      total: number;
    }>(api.devices.listConnections, {
      memberIds: [memberId as Id<"familyMembers">],
      memberId: memberId as Id<"familyMembers">,
      isActive: true,
    });

    return result.data.map((doc) => this.mapDeviceConnectionDoc(doc));
  }

  // ==================== 辅助方法 ====================

  private mapDeviceConnectionDoc(doc: DeviceConnectionDoc): DeviceConnectionDTO {
    return {
      id: doc._id as string,
      memberId: doc.memberId as string,
      deviceId: doc.deviceId,
      deviceType: doc.deviceType as
        | "SMARTWATCH"
        | "FITNESS_BAND"
        | "SMART_SCALE"
        | "BLOOD_PRESSURE_MONITOR"
        | "GLUCOSE_METER"
        | "SMART_RING"
        | "OTHER",
      deviceName: doc.deviceName,
      manufacturer: doc.manufacturer,
      model: doc.model ?? null,
      firmwareVersion: doc.firmwareVersion ?? null,
      platform: doc.platform as
        | "APPLE_HEALTHKIT"
        | "HUAWEI_HEALTH"
        | "GOOGLE_FIT"
        | "XIAOMI_HEALTH"
        | "SAMSUNG_HEALTH"
        | "GARMIN_CONNECT"
        | "FITBIT"
        | "OTHER_PLATFORM",
      accessToken: doc.accessToken ?? null,
      refreshToken: doc.refreshToken ?? null,
      lastSyncAt: doc.lastSyncAt ? new Date(doc.lastSyncAt) : null,
      syncStatus: doc.syncStatus as "PENDING" | "SYNCING" | "SUCCESS" | "FAILED" | "DISABLED",
      syncInterval: doc.syncInterval,
      permissions: (doc.permissions || []) as Array<
        | "READ_STEPS"
        | "READ_HEART_RATE"
        | "READ_CALORIES"
        | "READ_SLEEP"
        | "READ_WEIGHT"
        | "READ_BLOOD_PRESSURE"
        | "READ_DISTANCE"
        | "READ_ACTIVE_MINUTES"
        | "READ_EXERCISE"
      >,
      dataTypes: (doc.dataTypes || []) as Array<
        | "STEPS"
        | "HEART_RATE"
        | "CALORIES_BURNED"
        | "SLEEP_DURATION"
        | "SLEEP_QUALITY"
        | "WEIGHT"
        | "BODY_FAT"
        | "MUSCLE_MASS"
        | "BLOOD_PRESSURE"
        | "DISTANCE"
        | "ACTIVE_MINUTES"
        | "EXERCISE_TYPE"
        | "EXERCISE_DURATION"
        | "RESTING_HEART_RATE"
        | "FLOORS_CLIMBED"
        | "STANDING_HOURS"
      >,
      isActive: doc.isActive,
      isAutoSync: doc.isAutoSync,
      connectionDate: new Date(doc.connectionDate),
      disconnectionDate: doc.disconnectionDate ? new Date(doc.disconnectionDate) : null,
      lastError: doc.lastError ?? null,
      errorCount: doc.errorCount,
      retryCount: doc.retryCount,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    };
  }
}
