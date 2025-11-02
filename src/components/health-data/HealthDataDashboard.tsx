'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { HealthDataForm } from '@/components/health/HealthDataForm'
import { HealthDataList } from '@/components/health/HealthDataList'
import { QuickEntryButtons } from './QuickEntryButtons'
import { DeviceDataSync } from './DeviceDataSync'
import { 
  Plus, 
  History, 
  Activity, 
  Download,
  Smartphone,
  TrendingUp
} from 'lucide-react'

interface HealthDataDashboardProps {
  userId: string
  initialMemberId?: string
}

interface FamilyMember {
  id: string
  name: string
  avatar?: string
  role: string
  email?: string
  healthScore?: number
  lastActive?: Date
}

export function HealthDataDashboard({ userId, initialMemberId }: HealthDataDashboardProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId || null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [activeView, setActiveView] = useState<'overview' | 'add' | 'history' | 'sync'>('overview')
  const [loading, setLoading] = useState(true)

  // 获取家庭成员数据
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        // 这里应该调用实际的API
        const mockMembers: FamilyMember[] = [
          {
            id: '1',
            name: '张三',
            role: 'admin',
            email: 'zhangsan@example.com',
            healthScore: 85,
            lastActive: new Date()
          },
          {
            id: '2',
            name: '李四',
            role: 'member',
            email: 'lisi@example.com',
            healthScore: 78,
            lastActive: new Date()
          }
        ]
        
        setFamilyMembers(mockMembers)
        if (!selectedMemberId && mockMembers.length > 0) {
          setSelectedMemberId(mockMembers[0].id)
        }
      } catch (error) {
        console.error('获取家庭成员失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFamilyMembers()
  }, [selectedMemberId])

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId)
  }

  const handleDataAdded = () => {
    // 数据添加成功后的处理
    setActiveView('overview')
  }

  const renderContent = () => {
    if (!selectedMemberId) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">选择家庭成员</h3>
          <p className="text-gray-600">请从左侧选择一个家庭成员开始管理健康数据</p>
        </div>
      )
    }

    const currentMember = familyMembers.find(m => m.id === selectedMemberId)

    switch (activeView) {
      case 'add':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">录入健康数据</h2>
              <HealthDataForm 
                memberId={selectedMemberId}
                onSuccess={handleDataAdded}
                onCancel={() => setActiveView('overview')}
              />
            </div>
          </div>
        )
      
      case 'history':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">历史数据</h2>
                <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                  <Download className="h-4 w-4" />
                  <span>导出数据</span>
                </button>
              </div>
              <HealthDataList 
                memberId={selectedMemberId}
                onDelete={(id) => console.log('删除数据:', id)}
              />
            </div>
          </div>
        )
      
      case 'sync':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">设备数据同步</h2>
              <DeviceDataSync memberId={selectedMemberId} />
            </div>
          </div>
        )
      
      default:
        return (
          <div className="space-y-6">
            {/* 快速操作按钮 */}
            <QuickEntryButtons 
              memberId={selectedMemberId}
              onDataAdded={() => setActiveView('overview')}
            />
            
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">今日记录</h3>
                    <p className="text-2xl font-semibold text-gray-900">3</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">连续打卡</h3>
                    <p className="text-2xl font-semibold text-gray-900">7天</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Smartphone className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">设备状态</h3>
                    <p className="text-2xl font-semibold text-gray-900">已连接</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 最近数据 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">最近数据</h2>
                <button 
                  onClick={() => setActiveView('history')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  查看全部
                </button>
              </div>
              <HealthDataList 
                memberId={selectedMemberId}
                onDelete={(id) => console.log('删除数据:', id)}
              />
            </div>
          </div>
        )
    }
  }

  const quickActions = [
    {
      id: 'add',
      name: '录入数据',
      icon: Plus,
      onClick: () => setActiveView('add')
    },
    {
      id: 'history',
      name: '历史记录',
      icon: History,
      onClick: () => setActiveView('history')
    },
    {
      id: 'sync',
      name: '设备同步',
      icon: Smartphone,
      onClick: () => setActiveView('sync')
    }
  ]

  return (
    <DashboardLayout
      currentMember={selectedMemberId || undefined}
      familyMembers={familyMembers}
    >
      <div className="space-y-6">
        {/* 成员信息头部 */}
        {!loading && selectedMemberId && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-blue-600">
                    {familyMembers.find(m => m.id === selectedMemberId)?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {familyMembers.find(m => m.id === selectedMemberId)?.name}
                  </h2>
                  <p className="text-sm text-gray-500">健康数据管理</p>
                </div>
              </div>
              
              {/* 快速操作按钮 */}
              <div className="flex items-center space-x-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeView === action.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 动态内容区域 */}
        {renderContent()}
      </div>
    </DashboardLayout>
  )
}
