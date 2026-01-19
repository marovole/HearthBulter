/**
 * Prisma DeviceRepository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 *
 * @module prisma-device-repository
 */

import type { DeviceRepository } from "../interfaces/device-repository";
import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  DeviceConnectionDTO,
  DeviceConnectionCreateInputDTO,
  DeviceConnectionUpdateInputDTO,
  DeviceConnectionFilterDTO,
} from "../types/device";

/**
 * PrismaDeviceRepository
 *
 * 占位符实现，待后续完成 Prisma 数据访问层
 */
export class PrismaDeviceRepository implements DeviceRepository {
  async createDeviceConnection(
    _input: DeviceConnectionCreateInputDTO,
  ): Promise<DeviceConnectionDTO> {
    throw new Error(
      "PrismaDeviceRepository.createDeviceConnection not implemented",
    );
  }

  async getDeviceConnectionById(
    _id: string,
  ): Promise<DeviceConnectionDTO | null> {
    throw new Error(
      "PrismaDeviceRepository.getDeviceConnectionById not implemented",
    );
  }

  async getDeviceConnectionByDeviceId(
    _deviceId: string,
  ): Promise<DeviceConnectionDTO | null> {
    throw new Error(
      "PrismaDeviceRepository.getDeviceConnectionByDeviceId not implemented",
    );
  }

  async listDeviceConnections(
    _filter?: DeviceConnectionFilterDTO,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<DeviceConnectionDTO>> {
    throw new Error(
      "PrismaDeviceRepository.listDeviceConnections not implemented",
    );
  }

  async updateDeviceConnection(
    _id: string,
    _input: DeviceConnectionUpdateInputDTO,
  ): Promise<DeviceConnectionDTO> {
    throw new Error(
      "PrismaDeviceRepository.updateDeviceConnection not implemented",
    );
  }

  async disconnectDevice(_id: string): Promise<void> {
    throw new Error("PrismaDeviceRepository.disconnectDevice not implemented");
  }

  async updateSyncStatus(
    _id: string,
    _syncStatus: "PENDING" | "SYNCING" | "SUCCESS" | "FAILED" | "DISABLED",
    _lastSyncAt?: Date,
    _lastError?: string | null,
  ): Promise<void> {
    throw new Error("PrismaDeviceRepository.updateSyncStatus not implemented");
  }

  async incrementRetryCount(_id: string): Promise<void> {
    throw new Error(
      "PrismaDeviceRepository.incrementRetryCount not implemented",
    );
  }

  async resetErrorStatus(_id: string): Promise<void> {
    throw new Error("PrismaDeviceRepository.resetErrorStatus not implemented");
  }

  async getActiveDevicesByMember(
    _memberId: string,
  ): Promise<DeviceConnectionDTO[]> {
    throw new Error(
      "PrismaDeviceRepository.getActiveDevicesByMember not implemented",
    );
  }
}
