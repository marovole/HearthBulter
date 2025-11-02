'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Smartphone, 
  Watch, 
  Activity, 
  Scale, 
  Heart, 
  CloudDownload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react'
import type { DeviceConnectionInfo, DeviceType, PlatformType } from '@/types/wearable-devices'
import { DEVICE_TYPE_LABELS, PLATFORM_TYPE_LABELS, SYNC_STATUS_LABELS } from '@/types/wearable-devices'

interface DeviceConnectionProps {
  member?: {
    id: string
    name: string
  }
  onDeviceConnected?: (device: DeviceConnectionInfo) => void
  onDeviceDisconnected?: (deviceId: string) => void
  className?: string
}

export function DeviceConnection({ member, onDeviceConnected, onDeviceDisconnected, className }: DeviceConnectionProps) {
  const [devices, setDevices] = useState<DeviceConnectionInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)

  // 获取设备列表
  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    if (!member) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/devices?memberId=${member.id}`)
      const result = await response.json()
      
      if (result.success) {
        setDevices(result.data)
      }
    } catch (error) {
      console.error('获取设备列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 连接Apple Health
  const connectAppleHealth = async () => {
    setIsConnecting('apple-healthkit')
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member?.id,
          platform: 'APPLE_HEALTHKIT',
          deviceType: 'SMARTWATCH'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        onDeviceConnected?.(result.data)
        fetchDevices()
      }
    } catch (error) {
      console.error('连接Apple Health失败:', error)
    } finally {
      setIsConnecting(null)
    }
  }

  // 连接华为Health
  const connectHuaweiHealth = async () => {
    setIsConnecting('huawei-health')
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member?.id,
          platform: 'HUAWEI_HEALTH',
          deviceType: 'FITNESS_BAND'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        onDeviceConnected?.(result.data)
        fetchDevices()
      }
    } catch (error) {
      console.error('连接华为Health失败:', error)
    } finally {
      setIsConnecting(null)
    }
  }

  // 断开设备连接
  const disconnectDevice = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      const result = await response.json()
      
      if (result.success) {
        onDeviceDisconnected?.(deviceId)
        fetchDevices()
      }
    } catch (error) {
      console.error('断开设备连接失败:', error)
    }
  }

  // 手动同步设备
  const syncDevice = async (deviceId: string) => {
    try {
      const response = await fetch('/api/devices/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          memberId: member?.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        fetchDevices()
      }
    } catch (error) {
      console.error('同步设备失败:', error)
    }
  }

  // 获取设备图标
  const getDeviceIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case 'SMARTWATCH':
      case 'FITNESS_BAND':
        return <Watch className="w-5 h-5" />
      case 'SMART_SCALE':
        return <Scale className="w-5 h-5" />
      case 'BLOOD_PRESSURE_MONITOR':
        return <Heart className="w-5 h-5" />
      default:
        return <Smartphone className="w-5 h-5" />
    }
  }

  // 获取同步状态图标
  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'SYNCING':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  // 格式化最后同步时间
  const formatLastSync = (date?: Date) => {
    if (!date) return '从未同步'
    
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 1) return '刚刚同步'
    if (minutes < 60) return `${minutes}分钟前同步`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前同步`
    return new Date(date).toLocaleDateString('zh-CN')
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>加载设备列表...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            设备连接
          </CardTitle>
          <CardDescription>
            连接您的可穿戴设备，自动同步健康数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 可用平台 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">支持的平台</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Smartphone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Apple Health</h4>
                      <p className="text-sm text-muted-foreground">
                        Apple Watch, iPhone健康数据
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={connectAppleHealth}
                      disabled={isConnecting === 'apple-healthkit' || devices.some(d => d.platform === 'APPLE_HEALTHKIT')}
                    >
                      {isConnecting === 'apple-healthkit' ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />连接中</>
                      ) : devices.some(d => d.platform === 'APPLE_HEALTHKIT') ? (
                        <>已连接</>
                      ) : (
                        <>连接</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">华为Health</h4>
                      <p className="text-sm text-muted-foreground">
                        华为手环、手表运动数据
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={connectHuaweiHealth}
                      disabled={isConnecting === 'huawei-health' || devices.some(d => d.platform === 'HUAWEI_HEALTH')}
                    >
                      {isConnecting === 'huawei-health' ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />连接中</>
                      ) : devices.some(d => d.platform === 'HUAWEI_HEALTH') ? (
                        <>已连接</>
                      ) : (
                        <>连接</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* 已连接的设备 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">已连接的设备</h3>
            {devices.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">暂无连接的设备</p>
                <p className="text-sm text-gray-500 mt-2">
                  选择上方支持的平台开始连接
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <Card key={device.id} className={device.isActive ? '' : 'opacity-60'}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {getDeviceIcon(device.deviceType)}
                          </div>
                          <div>
                            <h4 className="font-medium">{device.deviceName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {DEVICE_TYPE_LABELS[device.deviceType]} • {PLATFORM_TYPE_LABELS[device.platform]}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              {getSyncStatusIcon(device.syncStatus)}
                              <span className="text-xs">
                                {SYNC_STATUS_LABELS[device.syncStatus]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                • {formatLastSync(device.lastSyncAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncDevice(device.deviceId)}
                            disabled={device.syncStatus === 'SYNCING'}
                          >
                            <CloudDownload className="w-4 h-4 mr-1" />
                            同步
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => disconnectDevice(device.id)}
                          >
                            <WifiOff className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* 错误信息 */}
                      {device.lastError && (
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {device.lastError}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* 同步进度 */}
                      {device.syncStatus === 'SYNCING' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>同步中...</span>
                            <span>0%</span>
                          </div>
                          <Progress value={0} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
