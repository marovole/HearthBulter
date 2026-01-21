// @ts-nocheck - Legacy migration: pending full type safety review
/**
 * Neon DeviceRepository 实现
 *
 * 提供基于 Neon PostgreSQL 的设备连接数据访问
 *
 * @module neon-device-repository
 */

import { neonAdapter } from "@/lib/db/neon-adapter";
import type { DeviceRepository } from "../interfaces/device-repository";
import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  DeviceConnectionDTO,
  DeviceConnectionCreateInputDTO,
  DeviceConnectionUpdateInputDTO,
  DeviceConnectionFilterDTO,
} from "../types/device";

/**
 * NeonDeviceRepository
 *
 * Neon PostgreSQL 实现版本
 */
export class NeonDeviceRepository implements DeviceRepository {
  async createDeviceConnection(
    input: DeviceConnectionCreateInputDTO
  ): Promise<DeviceConnectionDTO> {
    const data = await neonAdapter.deviceConnection.create({
      data: {
        memberId: input.memberId,
        deviceId: input.deviceId,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        manufacturer: input.manufacturer,
        model: input.model,
        firmwareVersion: input.firmwareVersion,
        platform: input.platform,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        syncStatus: input.syncStatus ?? "PENDING",
        syncInterval: input.syncInterval,
        permissions: input.permissions ?? [],
        dataTypes: input.dataTypes ?? [],
        isActive: input.isActive ?? true,
        isAutoSync: input.isAutoSync ?? false,
        connectionDate: new Date(),
      },
    });

    return this.toDeviceConnectionDTO(data);
  }

  async getDeviceConnectionById(id: string): Promise<DeviceConnectionDTO | null> {
    const data = await neonAdapter.deviceConnection.findUnique({
      where: { id },
    });

    if (!data) return null;
    return this.toDeviceConnectionDTO(data);
  }

  async getDeviceConnectionByDeviceId(deviceId: string): Promise<DeviceConnectionDTO | null> {
    const data = await neonAdapter.deviceConnection.findFirst({
      where: { deviceId },
    });

    if (!data) return null;
    return this.toDeviceConnectionDTO(data);
  }

  async listDeviceConnections(
    filter?: DeviceConnectionFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<DeviceConnectionDTO>> {
    const where: any = {};

    if (filter?.memberId) where.memberId = filter.memberId;
    if (filter?.platform) where.platform = filter.platform;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    if (filter?.syncStatus) where.syncStatus = filter.syncStatus;
    if (filter?.deviceType) where.deviceType = filter.deviceType;

    const limit = pagination?.limit ?? 10;
    const offset = pagination?.offset ?? 0;

    const [data, total] = await Promise.all([
      neonAdapter.deviceConnection.findMany({
        where,
        orderBy: { lastSyncAt: "desc" },
        take: limit,
        skip: offset,
      }),
      neonAdapter.deviceConnection.count({ where }),
    ]);

    const items = (data || []).map((device) => this.toDeviceConnectionDTO(device));

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async updateDeviceConnection(
    id: string,
    input: DeviceConnectionUpdateInputDTO
  ): Promise<DeviceConnectionDTO> {
    const updateData: any = { updatedAt: new Date() };

    if (input.deviceName !== undefined) updateData.deviceName = input.deviceName;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.firmwareVersion !== undefined) updateData.firmwareVersion = input.firmwareVersion;
    if (input.accessToken !== undefined) updateData.accessToken = input.accessToken;
    if (input.refreshToken !== undefined) updateData.refreshToken = input.refreshToken;
    if (input.lastSyncAt !== undefined) updateData.lastSyncAt = input.lastSyncAt;
    if (input.syncStatus !== undefined) updateData.syncStatus = input.syncStatus;
    if (input.syncInterval !== undefined) updateData.syncInterval = input.syncInterval;
    if (input.permissions !== undefined) updateData.permissions = input.permissions;
    if (input.dataTypes !== undefined) updateData.dataTypes = input.dataTypes;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.isAutoSync !== undefined) updateData.isAutoSync = input.isAutoSync;
    if (input.disconnectionDate !== undefined)
      updateData.disconnectionDate = input.disconnectionDate;
    if (input.lastError !== undefined) updateData.lastError = input.lastError;
    if (input.errorCount !== undefined) updateData.errorCount = input.errorCount;
    if (input.retryCount !== undefined) updateData.retryCount = input.retryCount;

    const data = await neonAdapter.deviceConnection.update({
      where: { id },
      data: updateData,
    });

    return this.toDeviceConnectionDTO(data);
  }

  async disconnectDevice(id: string): Promise<void> {
    await neonAdapter.deviceConnection.update({
      where: { id },
      data: {
        isActive: false,
        isAutoSync: false,
        syncStatus: "DISABLED",
        disconnectionDate: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateSyncStatus(
    id: string,
    syncStatus: "PENDING" | "SYNCING" | "SUCCESS" | "FAILED" | "DISABLED",
    lastSyncAt?: Date,
    lastError?: string | null
  ): Promise<void> {
    const updateData: any = {
      syncStatus,
      updatedAt: new Date(),
    };

    if (lastSyncAt) updateData.lastSyncAt = lastSyncAt;
    if (lastError !== undefined) updateData.lastError = lastError;

    await neonAdapter.deviceConnection.update({
      where: { id },
      data: updateData,
    });
  }

  async incrementRetryCount(id: string): Promise<void> {
    const device = await neonAdapter.deviceConnection.findUnique({
      where: { id },
    });

    if (!device) throw new Error(`Device connection not found: ${id}`);

    await neonAdapter.deviceConnection.update({
      where: { id },
      data: {
        retryCount: (device.retryCount || 0) + 1,
        updatedAt: new Date(),
      },
    });
  }

  async resetErrorStatus(id: string): Promise<void> {
    await neonAdapter.deviceConnection.update({
      where: { id },
      data: {
        errorCount: 0,
        retryCount: 0,
        lastError: null,
        updatedAt: new Date(),
      },
    });
  }

  async getActiveDevicesByMember(memberId: string): Promise<DeviceConnectionDTO[]> {
    const data = await neonAdapter.deviceConnection.findMany({
      where: {
        memberId,
        isActive: true,
      },
      orderBy: { lastSyncAt: "desc" },
    });

    return (data || []).map((device) => this.toDeviceConnectionDTO(device));
  }

  /**
   * 转换数据为 DTO
   */
  private toDeviceConnectionDTO(data: any): DeviceConnectionDTO {
    return {
      id: data.id,
      memberId: data.memberId,
      deviceId: data.deviceId,
      deviceType: data.deviceType,
      deviceName: data.deviceName,
      manufacturer: data.manufacturer,
      model: data.model,
      firmwareVersion: data.firmwareVersion,
      platform: data.platform,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      lastSyncAt: data.lastSyncAt ? new Date(data.lastSyncAt) : null,
      syncStatus: data.syncStatus,
      syncInterval: data.syncInterval,
      permissions: data.permissions || [],
      dataTypes: data.dataTypes || [],
      isActive: data.isActive,
      isAutoSync: data.isAutoSync,
      connectionDate: new Date(data.connectionDate),
      disconnectionDate: data.disconnectionDate ? new Date(data.disconnectionDate) : null,
      lastError: data.lastError,
      errorCount: data.errorCount,
      retryCount: data.retryCount,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}
