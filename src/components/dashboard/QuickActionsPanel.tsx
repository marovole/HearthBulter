'use client'

import React, { useState } from 'react'
import { 
  Plus, 
  Utensils, 
  ShoppingCart, 
  Activity,
  Heart,
  Calendar,
  Bell,
  Smartphone,
  FileText,
  Camera,
  Scale,
  Dumbbell,
  Moon,
  Apple,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  category: 'data' | 'nutrition' | 'health' | 'device' | 'notification'
  href?: string
  onClick?: () => void
  badge?: number
}

interface QuickActionsPanelProps {
  memberId: string
}

export function QuickActionsPanel({ memberId }: QuickActionsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const quickActions: QuickAction[] = [
    // 数据录入类
    {
      id: 'weight',
      title: '记录体重',
      description: '快速记录今日体重数据',
      icon: Scale,
      color: 'bg-blue-500',
      category: 'data',
      onClick: () => console.log('记录体重')
    },
    {
      id: 'blood-pressure',
      title: '测量血压',
      description: '记录血压和心率数据',
      icon: Heart,
      color: 'bg-red-500',
      category: 'data',
      onClick: () => console.log('测量血压')
    },
    {
      id: 'exercise',
      title: '运动记录',
      description: '记录今日运动情况',
      icon: Dumbbell,
      color: 'bg-green-500',
      category: 'data',
      onClick: () => console.log('运动记录')
    },
    {
      id: 'sleep',
      title: '睡眠记录',
      description: '记录昨晚睡眠质量',
      icon: Moon,
      color: 'bg-purple-500',
      category: 'data',
      onClick: () => console.log('睡眠记录')
    },
    // 营养类
    {
      id: 'meal-log',
      title: '饮食记录',
      description: '记录今日饮食情况',
      icon: Utensils,
      color: 'bg-orange-500',
      category: 'nutrition',
      onClick: () => console.log('饮食记录')
    },
    {
      id: 'meal-photo',
      title: '拍照识别',
      description: '拍照识别食物营养',
      icon: Camera,
      color: 'bg-pink-500',
      category: 'nutrition',
      onClick: () => console.log('拍照识别')
    },
    {
      id: 'recipe-suggest',
      title: '食谱推荐',
      description: '获取个性化食谱建议',
      icon: Apple,
      color: 'bg-green-600',
      category: 'nutrition',
      onClick: () => console.log('食谱推荐')
    },
    {
      id: 'shopping-list',
      title: '购物清单',
      description: '生成健康购物清单',
      icon: ShoppingCart,
      color: 'bg-yellow-500',
      category: 'nutrition',
      onClick: () => console.log('购物清单')
    },
    // 健康管理类
    {
      id: 'health-report',
      title: '健康报告',
      description: '查看健康分析报告',
      icon: FileText,
      color: 'bg-indigo-500',
      category: 'health',
      onClick: () => console.log('健康报告')
    },
    {
      id: 'trend-analysis',
      title: '趋势分析',
      description: '查看健康数据趋势',
      icon: TrendingUp,
      color: 'bg-cyan-500',
      category: 'health',
      onClick: () => console.log('趋势分析')
    },
    {
      id: 'appointment',
      title: '预约体检',
      description: '预约健康体检服务',
      icon: Calendar,
      color: 'bg-blue-600',
      category: 'health',
      onClick: () => console.log('预约体检')
    },
    // 设备同步类
    {
      id: 'device-sync',
      title: '设备同步',
      description: '同步智能设备数据',
      icon: Smartphone,
      color: 'bg-gray-600',
      category: 'device',
      onClick: () => console.log('设备同步'),
      badge: 2
    },
    // 通知类
    {
      id: 'notifications',
      title: '消息中心',
      description: '查看健康提醒和通知',
      icon: Bell,
      color: 'bg-red-600',
      category: 'notification',
      onClick: () => console.log('消息中心'),
      badge: 5
    }
  ]

  const categories = [
    { id: 'all', name: '全部', icon: Plus, color: 'bg-gray-500' },
    { id: 'data', name: '数据录入', icon: Activity, color: 'bg-blue-500' },
    { id: 'nutrition', name: '营养饮食', icon: Utensils, color: 'bg-orange-500' },
    { id: 'health', name: '健康管理', icon: Heart, color: 'bg-red-500' },
    { id: 'device', name: '设备同步', icon: Smartphone, color: 'bg-gray-600' },
    { id: 'notification', name: '通知提醒', icon: Bell, color: 'bg-red-600' }
  ]

  const filteredActions = selectedCategory === 'all' 
    ? quickActions 
    : quickActions.filter(action => action.category === selectedCategory)

  const recentActions = [
    { id: 'weight-1', title: '记录体重', time: '10分钟前', icon: Scale },
    { id: 'meal-1', title: '记录午餐', time: '2小时前', icon: Utensils },
    { id: 'exercise-1', title: '完成晨跑', time: '今天早上', icon: Dumbbell },
  ]

  const upcomingReminders = [
    { id: 'reminder-1', title: '测量血压', time: '14:00', icon: Heart },
    { id: 'reminder-2', title: '记录晚餐', time: '18:30', icon: Utensils },
    { id: 'reminder-3', title: '睡前记录', time: '22:00', icon: Moon },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">快速操作</h3>
            <p className="text-sm text-gray-500">常用功能快速访问</p>
          </div>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700">
          查看全部
        </button>
      </div>

      {/* 分类选择器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
              } border`}
            >
              <Icon className="h-4 w-4" />
              <span>{category.name}</span>
            </button>
          )
        })}
      </div>

      {/* 快速操作网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {filteredActions.slice(0, 8).map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className="group relative p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
            >
              {action.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {action.badge}
                </span>
              )}
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">{action.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2">{action.description}</p>
            </button>
          )
        })}
      </div>

      {/* 最近操作和提醒 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 最近操作 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            最近操作
          </h4>
          <div className="space-y-2">
            {recentActions.map((action) => {
              const Icon = action.icon
              return (
                <div key={action.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{action.title}</p>
                    <p className="text-xs text-gray-500">{action.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 即将到来的提醒 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            即将到来的提醒
          </h4>
          <div className="space-y-2">
            {upcomingReminders.map((reminder) => {
              const Icon = reminder.icon
              return (
                <div key={reminder.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{reminder.title}</p>
                    <p className="text-xs text-gray-500">{reminder.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 健康提示 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">健康小贴士</h4>
            <p className="text-sm text-blue-700 mt-1">
              定期记录健康数据有助于更好地了解身体状况。建议每天固定时间测量体重和血压，
              每餐后记录饮食情况，保持数据的连续性和准确性。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
