'use client'

import React, { useState } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Apple, 
  Heart,
  Plus,
  Menu,
  X,
  Home,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentMember?: string
  familyMembers?: Array<{
    id: string
    name: string
    avatar?: string
    role: string
  }>
}

export function DashboardLayout({ 
  children, 
  currentMember,
  familyMembers = [] 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const navigation = [
    { id: 'overview', name: '概览', icon: Home },
    { id: 'health', name: '健康数据', icon: Activity },
    { id: 'nutrition', name: '营养分析', icon: Apple },
    { id: 'family', name: '家庭成员', icon: Users },
    { id: 'score', name: '健康评分', icon: Heart },
    { id: 'settings', name: '设置', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 - 桌面端 */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <LayoutDashboard className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              Health Butler
            </span>
          </div>
          
          <div className="mt-8 flex-grow flex flex-col">
            {/* 导航菜单 */}
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group w-full flex items-center px-2 py-2 text-sm font-medium rounded-l-lg transition-colors'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                )
              })}
            </nav>

            {/* 家庭成员切换 */}
            {familyMembers.length > 0 && (
              <div className="px-2 pb-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  家庭成员
                </h3>
                <div className="space-y-1">
                  {familyMembers.map((member) => (
                    <button
                      key={member.id}
                      className={cn(
                        currentMember === member.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors'
                      )}
                    >
                      <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-gray-600">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      {member.name}
                    </button>
                  ))}
                  <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <Plus className="h-4 w-4 mr-3" />
                    添加成员
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 移动端侧边栏 */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <LayoutDashboard className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  Health Butler
                </span>
              </div>
              
              <nav className="mt-8 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id)
                        setSidebarOpen(false)
                      }}
                      className={cn(
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group w-full flex items-center px-2 py-2 text-sm font-medium rounded-l-lg transition-colors'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* 移动端菜单按钮 */}
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* 页面标题 */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {navigation.find(item => item.id === activeTab)?.name || '概览'}
                  {currentMember && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      - {familyMembers.find(m => m.id === currentMember)?.name}
                    </span>
                  )}
                </h1>
              </div>

              {/* 右侧操作区 */}
              <div className="flex items-center space-x-4">
                <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
