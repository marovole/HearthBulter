'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationFiltersProps {
  filters: {
    type: string;
    status: string;
    includeRead: boolean;
  };
  onFiltersChange: (filters: NotificationFiltersProps['filters']) => void;
}

const NOTIFICATION_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'CHECK_IN_REMINDER', label: '打卡提醒' },
  { value: 'TASK_NOTIFICATION', label: '任务通知' },
  { value: 'EXPIRY_ALERT', label: '过期提醒' },
  { value: 'BUDGET_WARNING', label: '预算预警' },
  { value: 'HEALTH_ALERT', label: '健康异常' },
  { value: 'GOAL_ACHIEVEMENT', label: '目标达成' },
  { value: 'FAMILY_ACTIVITY', label: '家庭活动' },
  { value: 'SYSTEM_ANNOUNCEMENT', label: '系统公告' },
  { value: 'MARKETING', label: '营销通知' },
  { value: 'OTHER', label: '其他' },
];

const NOTIFICATION_STATUSES = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待发送' },
  { value: 'SENDING', label: '发送中' },
  { value: 'SENT', label: '已发送' },
  { value: 'FAILED', label: '发送失败' },
  { value: 'CANCELLED', label: '已取消' },
];

export function NotificationFilters({
  filters,
  onFiltersChange,
}: NotificationFiltersProps) {
  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: '',
      status: '',
      includeRead: true,
    });
  };

  const hasActiveFilters = filters.type || filters.status || !filters.includeRead;

  return (
    <div className="space-y-4">
      {/* 过滤器标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">通知过滤</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
            <span>清除过滤</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 通知类型 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            通知类型
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              filters.type
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-300 bg-white'
            )}
          >
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* 通知状态 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            通知状态
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              filters.status
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-300 bg-white'
            )}
          >
            {NOTIFICATION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* 包含已读 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            显示选项
          </label>
          <div className="flex items-center space-x-2 h-9">
            <input
              type="checkbox"
              id="includeRead"
              checked={filters.includeRead}
              onChange={(e) => handleFilterChange('includeRead', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="includeRead"
              className="text-sm text-gray-700 cursor-pointer"
            >
              包含已读通知
            </label>
          </div>
        </div>
      </div>

      {/* 快速过滤按钮 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange('type', 'CHECK_IN_REMINDER')}
          className={cn(
            'px-3 py-1 text-xs rounded-full transition-colors',
            filters.type === 'CHECK_IN_REMINDER'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          )}
        >
          打卡提醒
        </button>
        
        <button
          onClick={() => handleFilterChange('type', 'HEALTH_ALERT')}
          className={cn(
            'px-3 py-1 text-xs rounded-full transition-colors',
            filters.type === 'HEALTH_ALERT'
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          )}
        >
          健康异常
        </button>
        
        <button
          onClick={() => handleFilterChange('type', 'GOAL_ACHIEVEMENT')}
          className={cn(
            'px-3 py-1 text-xs rounded-full transition-colors',
            filters.type === 'GOAL_ACHIEVEMENT'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          )}
        >
          目标达成
        </button>
        
        <button
          onClick={() => handleFilterChange('status', 'FAILED')}
          className={cn(
            'px-3 py-1 text-xs rounded-full transition-colors',
            filters.status === 'FAILED'
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          )}
        >
          发送失败
        </button>
        
        <button
          onClick={() => handleFilterChange('includeRead', false)}
          className={cn(
            'px-3 py-1 text-xs rounded-full transition-colors',
            !filters.includeRead
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          )}
        >
          仅未读
        </button>
      </div>

      {/* 过滤结果提示 */}
      {hasActiveFilters && (
        <div className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded">
          <span>已应用过滤条件</span>
          {filters.type && (
            <span className="ml-2">
              类型: {NOTIFICATION_TYPES.find(t => t.value === filters.type)?.label}
            </span>
          )}
          {filters.status && (
            <span className="ml-2">
              状态: {NOTIFICATION_STATUSES.find(s => s.value === filters.status)?.label}
            </span>
          )}
          {!filters.includeRead && (
            <span className="ml-2">仅显示未读</span>
          )}
        </div>
      )}
    </div>
  );
}
