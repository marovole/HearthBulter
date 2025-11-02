/**
 * Apple HealthKit 集成服务
 * 提供Apple Health数据的读取和同步功能
 */

import { addHours, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import type { AppleHealthData, DeviceConnectionInput, SyncResult } from '@/types/wearable-devices';
import type { DeviceConnection, HealthData, HealthDataType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkDataDuplication, batchDeduplicate } from './data-deduplication';

/**
 * Apple HealthKit 服务类
 */
export class HealthKitService {
  private static instance: HealthKitService;
  private deviceId: string = 'apple-healthkit';

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

      return Object.values(mockPermissions).every(permission => permission);
    } catch (error) {
      console.error('HealthKit权限请求失败:', error);
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
      console.error('HealthKit可用性检查失败:', error);
      return false;
    }
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo(): Promise<Partial<DeviceConnectionInput>> {
    return {
      deviceId: this.deviceId,
      deviceType: 'SMARTWATCH',
      deviceName: 'Apple Health',
      manufacturer: 'Apple Inc.',
      platform: 'APPLE_HEALTHKIT',
      permissions: [
        'READ_STEPS',
        'READ_HEART_RATE',
        'READ_CALORIES',
        'READ_SLEEP',
        'READ_DISTANCE',
        'READ_ACTIVE_MINUTES',
      ],
      dataTypes: [
        'STEPS',
        'HEART_RATE',
        'CALORIES_BURNED',
        'SLEEP_DURATION',
        'SLEEP_QUALITY',
        'DISTANCE',
        'ACTIVE_MINUTES',
      ],
    };
  }

  /**
   * 同步步数数据
   */
  async syncStepsData(
    memberId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HealthData[]> {
    const stepsData = [];
    
    // 在实际实现中，这里会调用HealthKit API获取步数数据
    const mockStepsData = this.generateMockStepsData(startDate, endDate);
    
    for (const dayData of mockStepsData) {
      const healthInput = {
        memberId,
        measuredAt: dayData.date,
        source: 'APPLE_HEALTHKIT' as const,
        notes: `步数: ${dayData.steps}`,
      };

      // 检查去重
      const deduplicationResult = await checkDataDuplication(healthInput, memberId);
      
      if (deduplicationResult.shouldInsert) {
        const healthRecord = await prisma.healthData.create({
          data: healthInput,
        });
        stepsData.push(healthRecord);
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
    endDate: Date
  ): Promise<HealthData[]> {
    const heartRateData = [];
    
    const mockHeartRateData = this.generateMockHeartRateData(startDate, endDate);
    
    for (const record of mockHeartRateData) {
      const healthInput = {
        memberId,
        heartRate: record.value,
        measuredAt: record.timestamp,
        source: 'APPLE_HEALTHKIT' as const,
        notes: `心率: ${record.value} bpm`,
      };

      const deduplicationResult = await checkDataDuplication(healthInput, memberId);
      
      if (deduplicationResult.shouldInsert) {
        const healthRecord = await prisma.healthData.create({
          data: healthInput,
        });
        heartRateData.push(healthRecord);
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
    endDate: Date
  ): Promise<HealthData[]> {
    const sleepData = [];
    
    const mockSleepData = this.generateMockSleepData(startDate, endDate);
    
    for (const record of mockSleepData) {
      const healthInput = {
        memberId,
        measuredAt: record.date,
        source: 'APPLE_HEALTHKIT' as const,
        notes: `睡眠时长: ${record.duration}小时, 质量: ${record.quality}`,
      };

      const deduplicationResult = await checkDataDuplication(healthInput, memberId);
      
      if (deduplicationResult.shouldInsert) {
        const healthRecord = await prisma.healthData.create({
          data: healthInput,
        });
        sleepData.push(healthRecord);
      }
    }

    return sleepData;
  }

  /**
   * 同步所有类型的数据
   */
  async syncAllData(
    memberId: string,
    deviceConnectionId: string,
    lastSyncDate?: Date
  ): Promise<SyncResult> {
    const startDate = lastSyncDate || subDays(new Date(), 7); // 如果没有上次同步日期，同步最近7天
    const endDate = new Date();
    
    const errors: string[] = [];
    let totalSynced = 0;

    try {
      // 同步步数数据
      const stepsData = await this.syncStepsData(memberId, startDate, endDate);
      totalSynced += stepsData.length;

      // 同步心率数据
      const heartRateData = await this.syncHeartRateData(memberId, startDate, endDate);
      totalSynced += heartRateData.length;

      // 同步睡眠数据
      const sleepData = await this.syncSleepData(memberId, startDate, endDate);
      totalSynced += sleepData.length;

      // 更新设备连接的同步状态
      await prisma.deviceConnection.update({
        where: { id: deviceConnectionId },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS',
          errorCount: 0,
          lastError: null,
          retryCount: 0,
        },
      });

    } catch (error) {
      errors.push(`HealthKit同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 更新错误状态
      await prisma.deviceConnection.update({
        where: { id: deviceConnectionId },
        data: {
          syncStatus: 'FAILED',
          lastError: error instanceof Error ? error.message : '未知错误',
          errorCount: { increment: 1 },
        },
      });
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
  private generateMockStepsData(startDate: Date, endDate: Date): AppleHealthData[] {
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
  private generateMockHeartRateData(startDate: Date, endDate: Date): Array<{timestamp: Date, value: number}> {
    const data: Array<{timestamp: Date, value: number}> = [];
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
  private generateMockSleepData(startDate: Date, endDate: Date): Array<{date: Date, duration: number, quality: number}> {
    const data: Array<{date: Date, duration: number, quality: number}> = [];
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
      console.error('HealthKit连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取支持的权限列表
   */
  getSupportedPermissions(): string[] {
    return [
      'READ_STEPS',
      'READ_HEART_RATE', 
      'READ_CALORIES',
      'READ_SLEEP',
      'READ_DISTANCE',
      'READ_ACTIVE_MINUTES',
      'READ_WEIGHT',
      'READ_BLOOD_PRESSURE',
    ];
  }

  /**
   * 获取平台信息
   */
  getPlatformInfo() {
    return {
      name: 'Apple HealthKit',
      version: '1.0',
      supportedOS: ['iOS'],
      minVersion: 'iOS 13.0',
      features: [
        '步数追踪',
        '心率监测',
        '睡眠分析',
        '卡路里消耗',
        '运动记录',
        '体重管理',
        '血压监测',
      ],
    };
  }
}

// 导出单例实例
export const healthKitService = HealthKitService.getInstance();

// 导出工具函数
export async function connectHealthKitDevice(
  memberId: string,
  deviceInfo: Partial<DeviceConnectionInput>
): Promise<DeviceConnection> {
  const service = HealthKitService.getInstance();
  
  // 测试连接
  const isConnected = await service.testConnection();
  if (!isConnected) {
    throw new Error('HealthKit连接失败，请检查权限设置');
  }

  // 获取设备信息
  const fullDeviceInfo = await service.getDeviceInfo();
  const deviceData = { ...fullDeviceInfo, ...deviceInfo, memberId };

  // 创建设备连接记录
  const deviceConnection = await prisma.deviceConnection.create({
    data: {
      ...deviceData,
      syncStatus: 'SUCCESS',
      lastSyncAt: new Date(),
    },
  });

  // 执行初始同步
  await service.syncAllData(memberId, deviceConnection.id);

  return deviceConnection;
}

export async function disconnectHealthKitDevice(deviceId: string): Promise<void> {
  await prisma.deviceConnection.update({
    where: { deviceId },
    data: {
      isActive: false,
      isAutoSync: false,
      syncStatus: 'DISABLED',
      disconnectionDate: new Date(),
    },
  });
}
