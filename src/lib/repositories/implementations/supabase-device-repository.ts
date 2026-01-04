/**
 * Supabase DeviceRepository 实现
 *
 * 提供基于 Supabase 的设备连接数据访问
 * 当前实现状态：部分实现，核心查询和更新方法已完成
 *
 * @module supabase-device-repository
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeviceRepository } from '../interfaces/device-repository';
import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  DeviceConnectionDTO,
  DeviceConnectionCreateInputDTO,
  DeviceConnectionUpdateInputDTO,
  DeviceConnectionFilterDTO,
} from '../types/device';

/**
 * SupabaseDeviceRepository
 *
 * 部分实现版本，核心查询方法已完成
 */
export class SupabaseDeviceRepository implements DeviceRepository {
  constructor(private client: SupabaseClient) {}

  async createDeviceConnection(
    _input: DeviceConnectionCreateInputDTO,
  ): Promise<DeviceConnectionDTO> {
    throw new Error(
      'SupabaseDeviceRepository.createDeviceConnection not fully implemented yet',
    );
  }

  async getDeviceConnectionById(
    id: string,
  ): Promise<DeviceConnectionDTO | null> {
    const { data, error } = await this.client
      .from('device_connections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.toDeviceConnectionDTO(data);
  }

  async getDeviceConnectionByDeviceId(
    deviceId: string,
  ): Promise<DeviceConnectionDTO | null> {
    const { data, error } = await this.client
      .from('device_connections')
      .select('*')
      .eq('deviceId', deviceId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.toDeviceConnectionDTO(data);
  }

  async listDeviceConnections(
    filter?: DeviceConnectionFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<DeviceConnectionDTO>> {
    let query = this.client
      .from('device_connections')
      .select('*', { count: 'exact' });

    // 应用过滤条件
    if (filter?.memberId) {
      query = query.eq('memberId', filter.memberId);
    }
    if (filter?.platform) {
      query = query.eq('platform', filter.platform);
    }
    if (filter?.isActive !== undefined) {
      query = query.eq('isActive', filter.isActive);
    }
    if (filter?.syncStatus) {
      query = query.eq('syncStatus', filter.syncStatus);
    }
    if (filter?.deviceType) {
      query = query.eq('deviceType', filter.deviceType);
    }

    // 分页
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query = query
      .range(offset, offset + limit - 1)
      .order('lastSyncAt', { ascending: false, nullsFirst: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []).map((device) => this.toDeviceConnectionDTO(device)),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async updateDeviceConnection(
    id: string,
    input: DeviceConnectionUpdateInputDTO,
  ): Promise<DeviceConnectionDTO> {
    const updateData: any = {};

    if (input.deviceName !== undefined)
      updateData.deviceName = input.deviceName;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.firmwareVersion !== undefined)
      updateData.firmwareVersion = input.firmwareVersion;
    if (input.accessToken !== undefined)
      updateData.accessToken = input.accessToken;
    if (input.refreshToken !== undefined)
      updateData.refreshToken = input.refreshToken;
    if (input.lastSyncAt !== undefined)
      updateData.lastSyncAt = input.lastSyncAt?.toISOString();
    if (input.syncStatus !== undefined)
      updateData.syncStatus = input.syncStatus;
    if (input.syncInterval !== undefined)
      updateData.syncInterval = input.syncInterval;
    if (input.permissions !== undefined)
      updateData.permissions = input.permissions;
    if (input.dataTypes !== undefined) updateData.dataTypes = input.dataTypes;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.isAutoSync !== undefined)
      updateData.isAutoSync = input.isAutoSync;
    if (input.disconnectionDate !== undefined) {
      updateData.disconnectionDate = input.disconnectionDate?.toISOString();
    }
    if (input.lastError !== undefined) updateData.lastError = input.lastError;
    if (input.errorCount !== undefined)
      updateData.errorCount = input.errorCount;
    if (input.retryCount !== undefined)
      updateData.retryCount = input.retryCount;

    updateData.updatedAt = new Date().toISOString();

    const { data, error } = await this.client
      .from('device_connections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this.toDeviceConnectionDTO(data);
  }

  async disconnectDevice(id: string): Promise<void> {
    const { error } = await this.client
      .from('device_connections')
      .update({
        isActive: false,
        isAutoSync: false,
        syncStatus: 'DISABLED',
        disconnectionDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async updateSyncStatus(
    id: string,
    syncStatus: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED' | 'DISABLED',
    lastSyncAt?: Date,
    lastError?: string | null,
  ): Promise<void> {
    const updateData: any = {
      syncStatus,
      updatedAt: new Date().toISOString(),
    };

    if (lastSyncAt) {
      updateData.lastSyncAt = lastSyncAt.toISOString();
    }

    if (lastError !== undefined) {
      updateData.lastError = lastError;
    }

    const { error } = await this.client
      .from('device_connections')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async incrementRetryCount(id: string): Promise<void> {
    // Supabase 不直接支持 increment，使用 read-then-write 模式
    const { data: device, error: readError } = await this.client
      .from('device_connections')
      .select('retryCount')
      .eq('id', id)
      .single();

    if (readError) throw readError;

    const { error: updateError } = await this.client
      .from('device_connections')
      .update({
        retryCount: (device.retryCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;
  }

  async resetErrorStatus(id: string): Promise<void> {
    const { error } = await this.client
      .from('device_connections')
      .update({
        errorCount: 0,
        retryCount: 0,
        lastError: null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getActiveDevicesByMember(
    memberId: string,
  ): Promise<DeviceConnectionDTO[]> {
    const { data, error } = await this.client
      .from('device_connections')
      .select('*')
      .eq('memberId', memberId)
      .eq('isActive', true)
      .order('lastSyncAt', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return (data || []).map((device) => this.toDeviceConnectionDTO(device));
  }

  /**
   * 转换 Supabase 数据为 DTO
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
      disconnectionDate: data.disconnectionDate
        ? new Date(data.disconnectionDate)
        : null,
      lastError: data.lastError,
      errorCount: data.errorCount,
      retryCount: data.retryCount,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}
