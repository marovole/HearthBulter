'use client';

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Activity,
  Heart,
  Weight,
} from 'lucide-react';

interface DeviceDataSyncProps {
  memberId: string
}

interface ConnectedDevice {
  id: string
  name: string
  type: 'watch' | 'scale' | 'band' | 'phone'
  status: 'connected' | 'disconnected' | 'syncing'
  lastSync?: Date
  batteryLevel?: number
  brand: string
}

interface SyncData {
  id: string
  deviceId: string
  type: 'weight' | 'heartRate' | 'steps' | 'sleep' | 'bloodPressure'
  value: number | string
  unit: string
  timestamp: Date
  status: 'pending' | 'approved' | 'rejected'
}

export function DeviceDataSync({ memberId }: DeviceDataSyncProps) {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [syncData, setSyncData] = useState<SyncData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedData, setSelectedData] = useState<string[]>([]);

  // 模拟设备数据
  useEffect(() => {
    const mockDevices: ConnectedDevice[] = [
      {
        id: '1',
        name: 'Apple Watch Series 8',
        type: 'watch',
        status: 'connected',
        lastSync: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
        batteryLevel: 85,
        brand: 'Apple',
      },
      {
        id: '2',
        name: '小米体脂秤 2',
        type: 'scale',
        status: 'connected',
        lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
        batteryLevel: 60,
        brand: '小米',
      },
      {
        id: '3',
        name: '华为手环 6',
        type: 'band',
        status: 'disconnected',
        brand: '华为',
      },
    ];
    
    const mockSyncData: SyncData[] = [
      {
        id: '1',
        deviceId: '1',
        type: 'heartRate',
        value: 72,
        unit: 'bpm',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        status: 'pending',
      },
      {
        id: '2',
        deviceId: '2',
        type: 'weight',
        value: 75.2,
        unit: 'kg',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        status: 'pending',
      },
      {
        id: '3',
        deviceId: '1',
        type: 'steps',
        value: 8432,
        unit: '步',
        timestamp: new Date(),
        status: 'pending',
      },
    ];
    
    setDevices(mockDevices);
    setSyncData(mockSyncData);
  }, [memberId]);

  const handleSync = async (deviceId: string) => {
    setSyncing(true);
    try {
      // 更新设备状态为同步中
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, status: 'syncing' as const }
          : device
      ));

      // 模拟同步过程
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 更新设备状态和最后同步时间
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { 
            ...device, 
            status: 'connected' as const, 
            lastSync: new Date(), 
          }
          : device
      ));

      // 模拟新的同步数据
      const newData: SyncData[] = [
        {
          id: Date.now().toString(),
          deviceId,
          type: 'heartRate',
          value: Math.floor(Math.random() * 40) + 60,
          unit: 'bpm',
          timestamp: new Date(),
          status: 'pending',
        },
      ];
      
      setSyncData(prev => [...newData, ...prev]);

    } catch (error) {
      console.error('同步失败:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    const connectedDevices = devices.filter(d => d.status === 'connected');
    for (const device of connectedDevices) {
      await handleSync(device.id);
    }
  };

  const handleDataAction = async (dataId: string, action: 'approve' | 'reject') => {
    try {
      // 调用API处理数据
      const response = await fetch(`/api/members/${memberId}/health-data/sync/${dataId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setSyncData(prev => prev.map(data => 
          data.id === dataId 
            ? { ...data, status: action === 'approve' ? 'approved' : 'rejected' }
            : data
        ));
      }
    } catch (error) {
      console.error('处理数据失败:', error);
    }
  };

  const getDeviceIcon = (type: ConnectedDevice['type']) => {
    switch (type) {
    case 'watch':
      return <Smartphone className="h-5 w-5" />;
    case 'scale':
      return <Weight className="h-5 w-5" />;
    case 'band':
      return <Activity className="h-5 w-5" />;
    default:
      return <Smartphone className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: ConnectedDevice['status']) => {
    switch (status) {
    case 'connected':
      return <Wifi className="h-4 w-4 text-green-500" />;
    case 'disconnected':
      return <WifiOff className="h-4 w-4 text-red-500" />;
    case 'syncing':
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDataIcon = (type: SyncData['type']) => {
    switch (type) {
    case 'heartRate':
      return <Heart className="h-4 w-4 text-red-500" />;
    case 'weight':
      return <Weight className="h-4 w-4 text-blue-500" />;
    default:
      return <Activity className="h-4 w-4 text-green-500" />;
    }
  };

  const pendingData = syncData.filter(d => d.status === 'pending');

  return (
    <div className="space-y-6">
      {/* 设备列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">已连接设备</h3>
          <button
            onClick={handleSyncAll}
            disabled={syncing || devices.filter(d => d.status === 'connected').length === 0}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>全部同步</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div key={device.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getDeviceIcon(device.type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{device.name}</h4>
                    <p className="text-sm text-gray-500">{device.brand}</p>
                  </div>
                </div>
                {getStatusIcon(device.status)}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">状态</span>
                  <span className={`font-medium ${
                    device.status === 'connected' ? 'text-green-600' :
                      device.status === 'disconnected' ? 'text-red-600' :
                        'text-blue-600'
                  }`}>
                    {device.status === 'connected' ? '已连接' :
                      device.status === 'disconnected' ? '未连接' :
                        '同步中'}
                  </span>
                </div>
                
                {device.batteryLevel && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">电量</span>
                    <span className={`font-medium ${
                      device.batteryLevel > 50 ? 'text-green-600' :
                        device.batteryLevel > 20 ? 'text-yellow-600' :
                          'text-red-600'
                    }`}>
                      {device.batteryLevel}%
                    </span>
                  </div>
                )}
                
                {device.lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">最后同步</span>
                    <span className="font-medium text-gray-900">
                      {Math.floor((Date.now() - device.lastSync.getTime()) / (1000 * 60))}分钟前
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleSync(device.id)}
                disabled={device.status !== 'connected' || syncing}
                className="mt-3 w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>立即同步</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 待处理数据 */}
      {pendingData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">待处理数据 ({pendingData.length})</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedData(pendingData.map(d => d.id))}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                全选
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setSelectedData([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                清空
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {pendingData.map((data) => (
              <div key={data.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedData.includes(data.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedData(prev => [...prev, data.id]);
                        } else {
                          setSelectedData(prev => prev.filter(id => id !== data.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    
                    <div className="flex items-center space-x-3">
                      {getDataIcon(data.type)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {data.value} {data.unit}
                        </p>
                        <p className="text-sm text-gray-500">
                          {devices.find(d => d.id === data.deviceId)?.name} • 
                          {Math.floor((Date.now() - data.timestamp.getTime()) / (1000 * 60))}分钟前
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDataAction(data.id, 'approve')}
                      className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>接受</span>
                    </button>
                    <button
                      onClick={() => handleDataAction(data.id, 'reject')}
                      className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>拒绝</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {selectedData.length > 0 && (
            <div className="mt-4 flex items-center justify-center space-x-4">
              <button
                onClick={() => {
                  selectedData.forEach(id => handleDataAction(id, 'approve'));
                  setSelectedData([]);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                批量接受 ({selectedData.length})
              </button>
              <button
                onClick={() => {
                  selectedData.forEach(id => handleDataAction(id, 'reject'));
                  setSelectedData([]);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                批量拒绝
              </button>
            </div>
          )}
        </div>
      )}
      
      {pendingData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>暂无待处理的同步数据</p>
        </div>
      )}
    </div>
  );
}
