'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  CloudDownload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Clock,
  TrendingUp,
  Wifi,
  WifiOff
} from 'lucide-react'
import type { DeviceConnectionInfo } from '@/types/wearable-devices'
import { SYNC_STATUS_LABELS, PLATFORM_TYPE_LABELS } from '@/types/wearable-devices'

interface SyncStatusProps {
  devices: DeviceConnectionInfo[]
  onSyncDevice?: (deviceId: string) => void
  onSyncAll?: () => void
  className?: string
}

export function SyncStatus({ devices, onSyncDevice, onSyncAll, className }: SyncStatusProps) {
  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [lastGlobalSync, setLastGlobalSync] = useState<Date | null>(null)

  // 获取最新的全局同步时间
  useEffect(() => {
    if (devices.length > 0) {
      const latestSync = devices
        .filter(device => device.lastSyncAt)
        .map(device => new Date(device.lastSyncAt!))
        .sort((a, b) => b.getTime() - a.getTime())[0]
      
      setLastGlobalSync(latestSync || null)
    }
  }, [devices])

  // 计算同步状态统计
  const syncStats = {
    total: devices.length,
    active: devices.filter(device => device.isActive).length,
    success: devices.filter(device => device.syncStatus === 'SUCCESS').length,
    failed: devices.filter(device => device.syncStatus === 'FAILED').length,
    syncing: devices.filter(device => device.syncStatus === 'SYNCING').length
  }

  // 获取同步状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'SYNCING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 格式化时间
  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return '从未'
    const now = new Date()
    const syncTime = typeof date === 'string' ? new Date(date) : date
    const diff = now.getTime() - syncTime.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
    return syncTime.toLocaleDateString('zh-CN')
  }

  // 获取同步进度
  const getSyncProgress = () => {
    if (devices.length === 0) return 100
    const activeDevices = devices.filter(device => device.isActive).length
    const successDevices = devices.filter(device => device.syncStatus === 'SUCCESS').length
    return activeDevices > 0 ? (successDevices / activeDevices) * 100 : 0
  }

  // 获取健康状态
  const getHealthStatus = () => {
    const activeDevices = devices.filter(device => device.isActive)
    if (activeDevices.length === 0) {
      return { status: 'NO_DEVICES', label: '无设备', color: 'text-gray-500' }
    }

    const failedDevices = activeDevices.filter(device => device.syncStatus === 'FAILED')
    const successDevices = activeDevices.filter(device => device.syncStatus === 'SUCCESS')
    const hasRecentSync = activeDevices.some(device => {
      if (!device.lastSyncAt) return false
      const hours = (new Date().getTime() - new Date(device.lastSyncAt).getTime()) / (1000 * 60 * 60)
      return hours < 2
    })

    if (failedDevices.length > 0) {
      return { status: 'ERROR', label: '同步异常', color: 'text-red-600' }
    }

    if (!hasRecentSync && syncStats.active > 0) {
      return { status: 'STALE', label: '数据过期', color: 'text-yellow-600' }
    }

    if (successDevices.length === activeDevices.length && hasRecentSync) {
      return { status: 'HEALTHY', label: '状态良好', color: 'text-green-600' }
    }

    return { status: 'PENDING', label: '待同步', color: 'text-blue-600' }
  }

  const healthStatus = getHealthStatus()
  const syncProgress = getSyncProgress()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              数据同步状态
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={healthStatus.color}>
                {healthStatus.label}
              </Badge>
              {syncStats.syncing > 0 && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  同步中
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            可穿戴设备数据同步概览和管理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 总体状态 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{syncStats.active}</div>
              <div className="text-xs text-muted-foreground">活跃设备</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold">{syncStats.success}</div>
              <div className="text-xs text-muted-foreground">同步正常</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold">{syncStats.failed}</div>
              <div className="text-xs text-muted-foreground">同步失败</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-2xl font-bold">{formatTime(lastGlobalSync)}</div>
              <div className="text-xs text-muted-foreground">最后同步</div>
            </div>
          </div>

          {/* 同步进度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>同步进度</span>
              <span>{Math.round(syncProgress)}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {syncStats.active > 0 
                ? `${syncStats.success} / ${syncStats.active} 设备同步成功`
                : '暂无活跃设备'
              }
            </p>
          </div>

          {/* 设备列表 */}
          {devices.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">设备状态</h4>
              <div className="space-y-2">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      device.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        device.isActive ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {device.isActive ? (
                          <Wifi className="w-4 h-4 text-blue-600" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{device.deviceName}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(device.syncStatus)}`}
                          >
                            {SYNC_STATUS_LABELS[device.syncStatus]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {PLATFORM_TYPE_LABELS[device.platform]} • 
                          {formatTime(device.lastSyncAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {device.lastError && (
                        <AlertCircle className="w-4 h-4 text-red-500" title={device.lastError} />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSyncDevice?.(device.deviceId)}
                        disabled={!device.isActive || isSyncing === device.deviceId || device.syncStatus === 'SYNCING'}
                      >
                        {isSyncing === device.deviceId ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" />同步中</>
                        ) : (
                          <><CloudDownload className="w-3 h-3 mr-1" />同步</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onSyncDevice?.('all')}
              disabled={devices.filter(d => d.isActive).length === 0}
              className="flex-1"
            >
              <CloudDownload className="w-4 h-4 mr-2" />
              同步所有设备
            </Button>
            <Button
              onClick={onSyncAll}
              disabled={devices.length === 0}
              className="flex-1"
            >
              <Activity className="w-4 h-4 mr-2" />
              批量同步
            </Button>
          </div>

          {/* 趋势提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-sm text-blue-800">同步建议</h5>
                <p className="text-xs text-blue-600 mt-1">
                  {healthStatus.status === 'HEALTHY' && '所有设备数据正常，建议保持当前同步频率。'}
                  {healthStatus.status === 'STALE' && '部分设备数据较旧，建议立即同步获取最新数据。'}
                  {healthStatus.status === 'ERROR' && '发现同步异常，请检查设备连接或网络状态。'}
                  {healthStatus.status === 'NO_DEVICES' && '尚未连接任何可穿戴设备，连接设备后即可自动同步健康数据。'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
