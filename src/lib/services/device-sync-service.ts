/**
 * 设备后台同步服务
 * 定时同步所有活跃设备的数据
 */

import { addMinutes, subMinutes, isAfter } from 'date-fns'
import { prisma } from '@/lib/db'
import { healthKitService } from './healthkit-service'
import { huaweiHealthService } from './huawei-health-service'
import type { DeviceConnection, SyncStatus } from '@prisma/client'

/**
 * 设备同步服务类
 */
export class DeviceSyncService {
  private static instance: DeviceSyncService
  private syncInterval: NodeJS.Timeout | null = null
  private isRunning = false

  static getInstance(): DeviceSyncService {
    if (!DeviceSyncService.instance) {
      DeviceSyncService.instance = new DeviceSyncService()
    }
    return DeviceSyncService.instance
  }

  /**
   * 启动后台同步任务
   */
  startBackgroundSync(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      console.log('设备同步服务已在运行')
      return
    }

    console.log(`启动设备后台同步任务，间隔 ${intervalMinutes} 分钟`)
    
    // 立即执行一次同步
    this.syncAllDevices()
    
    // 设置定时同步
    this.syncInterval = setInterval(() => {
      this.syncAllDevices()
    }, intervalMinutes * 60 * 1000)
    
    this.isRunning = true
  }

  /**
   * 停止后台同步任务
   */
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    
    this.isRunning = false
    console.log('设备后台同步任务已停止')
  }

  /**
   * 同步所有活跃设备
   */
  async syncAllDevices(): Promise<SyncAllResult> {
    console.log('开始同步所有活跃设备...')
    
    const startTime = new Date()
    const results: DeviceSyncResult[] = []
    
    try {
      // 获取所有活跃且启用自动同步的设备
      const activeDevices = await prisma.deviceConnection.findMany({
        where: {
          isActive: true,
          isAutoSync: true,
          syncStatus: {
            not: 'DISABLED'
          }
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              user: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      })

      console.log(`找到 ${activeDevices.length} 个活跃设备`)

      // 并行同步所有设备
      const syncPromises = activeDevices.map(device => 
        this.syncSingleDevice(device)
      )

      const deviceResults = await Promise.all(syncPromises)
      results.push(...deviceResults)

      // 统计结果
      const summary = this.summarizeSyncResults(results)
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      console.log(`设备同步完成，耗时 ${duration}ms，成功 ${summary.successCount}/${summary.totalCount}`)

      return {
        success: summary.errorCount === 0,
        totalCount: summary.totalCount,
        successCount: summary.successCount,
        errorCount: summary.errorCount,
        syncedDataCount: summary.syncedDataCount,
        duration,
        startTime,
        endTime,
        results
      }

    } catch (error) {
      console.error('设备同步失败:', error)
      
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

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
        errors: [error instanceof Error ? error.message : '未知错误']
      }
    }
  }

  /**
   * 同步单个设备
   */
  private async syncSingleDevice(
    device: DeviceConnection & { member: any }
  ): Promise<DeviceSyncResult> {
    const startTime = new Date()
    
    try {
      // 检查是否需要同步
      if (!this.shouldSyncDevice(device)) {
        return {
          deviceId: device.id,
          deviceName: device.deviceName,
          platform: device.platform,
          success: true,
          skipped: true,
          reason: '未到同步时间',
          syncedDataCount: 0,
          duration: 0,
          startTime,
          endTime: new Date()
        }
      }

      // 更新同步状态为同步中
      await prisma.deviceConnection.update({
        where: { id: device.id },
        data: {
          syncStatus: 'SYNCING'
        }
      })

      // 调用相应的同步服务
      let syncResult
      if (device.platform === 'APPLE_HEALTHKIT') {
        syncResult = await healthKitService.syncAllData(
          device.member.id,
          device.id,
          device.lastSyncAt || undefined
        )
      } else if (device.platform === 'HUAWEI_HEALTH') {
        syncResult = await huaweiHealthService.syncAllData(
          device.member.id,
          device.id,
          device.lastSyncAt || undefined
        )
      } else {
        throw new Error(`不支持的平台: ${device.platform}`)
      }

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      if (syncResult.success) {
        // 重置错误计数
        await prisma.deviceConnection.update({
          where: { id: device.id },
          data: {
            syncStatus: 'SUCCESS',
            lastSyncAt: syncResult.lastSyncDate,
            errorCount: 0,
            lastError: null,
            retryCount: 0
          }
        })

        return {
          deviceId: device.id,
          deviceName: device.deviceName,
          platform: device.platform,
          success: true,
          syncedDataCount: syncResult.syncedCount,
          duration,
          startTime,
          endTime
        }

      } else {
        // 增加错误计数
        await prisma.deviceConnection.update({
          where: { id: device.id },
          data: {
            syncStatus: 'FAILED',
            lastError: syncResult.errors[0],
            errorCount: { increment: 1 }
          }
        })

        return {
          deviceId: device.id,
          deviceName: device.deviceName,
          platform: device.platform,
          success: false,
          syncedDataCount: 0,
          duration,
          startTime,
          endTime,
          errors: syncResult.errors
        }
      }

    } catch (error) {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      
      console.error(`设备 ${device.deviceName} 同步失败:`, error)

      // 更新错误状态
      try {
        await prisma.deviceConnection.update({
          where: { id: device.id },
          data: {
            syncStatus: 'FAILED',
            lastError: error instanceof Error ? error.message : '未知错误',
            errorCount: { increment: 1 }
          }
        })
      } catch (updateError) {
        console.error('更新设备状态失败:', updateError)
      }

      return {
        deviceId: device.id,
        deviceName: device.deviceName,
        platform: device.platform,
        success: false,
        syncedDataCount: 0,
        duration,
        startTime,
        endTime,
        errors: [error instanceof Error ? error.message : '未知错误']
      }
    }
  }

  /**
   * 判断设备是否需要同步
   */
  private shouldSyncDevice(device: DeviceConnection): boolean {
    // 如果从未同步过，需要同步
    if (!device.lastSyncAt) {
      return true
    }

    // 检查是否到了同步时间
    const now = new Date()
    const nextSyncTime = addMinutes(device.lastSyncAt, device.syncInterval)
    
    return isAfter(now, nextSyncTime)
  }

  /**
   * 汇总同步结果
   */
  private summarizeSyncResults(results: DeviceSyncResult[]): SyncSummary {
    return {
      totalCount: results.length,
      successCount: results.filter(r => r.success && !r.skipped).length,
      errorCount: results.filter(r => !r.success).length,
      skippedCount: results.filter(r => r.skipped).length,
      syncedDataCount: results.reduce((sum, r) => sum + (r.syncedDataCount || 0), 0)
    }
  }

  /**
   * 获取同步统计信息
   */
  async getSyncStats(): Promise<SyncStats> {
    const now = new Date()
    const twentyFourHoursAgo = subMinutes(now, 24 * 60)

    const stats = await prisma.deviceConnection.groupBy({
      by: ['syncStatus'],
      where: {
        isActive: true
      },
      _count: {
        id: true
      }
    })

    const recentSyncs = await prisma.deviceConnection.findMany({
      where: {
        lastSyncAt: {
          gte: twentyFourHoursAgo
        }
      },
      select: {
        id: true,
        lastSyncAt: true
      }
    })

    const total = stats.reduce((sum, stat) => sum + stat._count.id, 0)
    const successCount = stats.find(s => s.syncStatus === 'SUCCESS')?._count.id || 0
    const failedCount = stats.find(s => s.syncStatus === 'FAILED')?._count.id || 0
    const pendingCount = stats.find(s => s.syncStatus === 'PENDING')?._count.id || 0
    const syncingCount = stats.find(s => s.syncStatus === 'SYNCING')?._count.id || 0

    return {
      total,
      active: total,
      success: successCount,
      failed: failedCount,
      pending: pendingCount,
      syncing: syncingCount,
      recentlySynced: recentSyncs.length,
      lastSyncTime: recentSyncs.length > 0 
        ? recentSyncs.reduce((latest, current) => 
            current.lastSyncAt && latest.lastSyncAt && 
            isAfter(current.lastSyncAt, latest.lastSyncAt) 
              ? current 
              : latest
          ).lastSyncAt
        : null
    }
  }

  /**
   * 清理长时间未同步的设备
   */
  async cleanupStaleDevices(): Promise<CleanupResult> {
    const threeDaysAgo = subMinutes(new Date(), 24 * 60 * 3)
    
    const staleDevices = await prisma.deviceConnection.findMany({
      where: {
        isActive: true,
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: threeDaysAgo } }
        ]
      }
    })

    let disabledCount = 0
    const errors: string[] = []

    for (const device of staleDevices) {
      try {
        await prisma.deviceConnection.update({
          where: { id: device.id },
          data: {
            isActive: false,
            isAutoSync: false,
            syncStatus: 'DISABLED'
          }
        })
        disabledCount++
      } catch (error) {
        errors.push(`禁用设备 ${device.deviceName} 失败: ${error}`)
      }
    }

    return {
      totalStale: staleDevices.length,
      disabledCount,
      errors
    }
  }

  /**
   * 手动触发设备同步
   */
  async triggerDeviceSync(deviceId: string): Promise<DeviceSyncResult> {
    const device = await prisma.deviceConnection.findFirst({
      where: {
        id: deviceId,
        isActive: true
      },
      include: {
        member: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!device) {
      throw new Error('设备未找到或未激活')
    }

    return this.syncSingleDevice(device)
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): ServiceStatus {
    return {
      isRunning: this.isRunning,
      hasActiveSync: this.syncInterval !== null,
      nextSyncTime: this.syncInterval ? new Date(Date.now() + 30 * 60 * 1000) : null
    }
  }
}

// 类型定义
export interface SyncAllResult {
  success: boolean
  totalCount: number
  successCount: number
  errorCount: number
  syncedDataCount: number
  duration: number
  startTime: Date
  endTime: Date
  results: DeviceSyncResult[]
  errors?: string[]
}

export interface DeviceSyncResult {
  deviceId: string
  deviceName: string
  platform: string
  success: boolean
  skipped?: boolean
  reason?: string
  syncedDataCount: number
  duration: number
  startTime: Date
  endTime: Date
  errors?: string[]
}

interface SyncSummary {
  totalCount: number
  successCount: number
  errorCount: number
  skippedCount: number
  syncedDataCount: number
}

export interface SyncStats {
  total: number
  active: number
  success: number
  failed: number
  pending: number
  syncing: number
  recentlySynced: number
  lastSyncTime: Date | null
}

export interface CleanupResult {
  totalStale: number
  disabledCount: number
  errors: string[]
}

export interface ServiceStatus {
  isRunning: boolean
  hasActiveSync: boolean
  nextSyncTime: Date | null
}

// 导出单例实例
export const deviceSyncService = DeviceSyncService.getInstance()

// 导出工具函数
export async function initializeDeviceSync(): Promise<void> {
  // 在应用启动时初始化设备同步服务
  const syncService = DeviceSyncService.getInstance()
  
  // 检查环境变量是否启用后台同步
  const enableBackgroundSync = process.env.ENABLE_DEVICE_SYNC === 'true'
  
  if (enableBackgroundSync) {
    const syncInterval = parseInt(process.env.DEVICE_SYNC_INTERVAL || '30')
    syncService.startBackgroundSync(syncInterval)
  } else {
    console.log('设备后台同步已禁用')
  }
}
