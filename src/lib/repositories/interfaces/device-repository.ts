/**
 * Device Repository Interface
 *
 * 设备连接数据访问接口
 *
 * Note: 此 Repository 仅负责设备连接的基础 CRUD 操作
 * 外部服务调用（HealthKit, Huawei Health 等）应保留在服务层
 *
 * @module device-repository
 */

import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  DeviceConnectionDTO,
  DeviceConnectionCreateInputDTO,
  DeviceConnectionUpdateInputDTO,
  DeviceConnectionFilterDTO,
} from '../types/device';

/**
 * Device Repository 接口
 */
export interface DeviceRepository {
  /**
   * 创建设备连接
   *
   * @param input - 设备连接创建数据
   * @returns 创建的设备连接
   */
  createDeviceConnection(input: DeviceConnectionCreateInputDTO): Promise<DeviceConnectionDTO>;

  /**
   * 根据 ID 查询设备连接
   *
   * @param id - 设备连接 ID
   * @returns 设备连接，如果不存在返回 null
   */
  getDeviceConnectionById(id: string): Promise<DeviceConnectionDTO | null>;

  /**
   * 根据 deviceId 查询设备连接
   *
   * @param deviceId - 设备 ID
   * @returns 设备连接，如果不存在返回 null
   */
  getDeviceConnectionByDeviceId(deviceId: string): Promise<DeviceConnectionDTO | null>;

  /**
   * 查询设备连接列表（支持过滤和分页）
   *
   * @param filter - 过滤条件
   * @param pagination - 分页参数
   * @returns 分页后的设备连接列表
   */
  listDeviceConnections(
    filter?: DeviceConnectionFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<DeviceConnectionDTO>>;

  /**
   * 更新设备连接
   *
   * @param id - 设备连接 ID
   * @param input - 更新数据
   * @returns 更新后的设备连接
   */
  updateDeviceConnection(
    id: string,
    input: DeviceConnectionUpdateInputDTO
  ): Promise<DeviceConnectionDTO>;

  /**
   * 断开设备连接（软删除）
   *
   * @param id - 设备连接 ID
   */
  disconnectDevice(id: string): Promise<void>;

  /**
   * 更新同步状态
   *
   * @param id - 设备连接 ID
   * @param syncStatus - 同步状态
   * @param lastSyncAt - 最后同步时间（可选）
   * @param lastError - 错误信息（可选）
   */
  updateSyncStatus(
    id: string,
    syncStatus: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED' | 'DISABLED',
    lastSyncAt?: Date,
    lastError?: string | null
  ): Promise<void>;

  /**
   * 增加重试计数
   *
   * @param id - 设备连接 ID
   */
  incrementRetryCount(id: string): Promise<void>;

  /**
   * 重置错误状态
   *
   * @param id - 设备连接 ID
   */
  resetErrorStatus(id: string): Promise<void>;

  /**
   * 查询成员的所有活跃设备
   *
   * @param memberId - 成员 ID
   * @returns 活跃设备列表
   */
  getActiveDevicesByMember(memberId: string): Promise<DeviceConnectionDTO[]>;
}
