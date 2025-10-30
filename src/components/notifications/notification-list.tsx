'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Filter, Settings, Trash2, RefreshCw } from 'lucide-react';
import { NotificationItem } from './notification-item';
import { NotificationFilters } from './notification-filters';
import { NotificationSettings } from './notification-settings';
import { useNotifications } from '@/hooks/use-notifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: string;
  status: string;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  actionText?: string;
  formattedTime?: string;
  typeIcon?: string;
  typeName?: string;
  priorityColor?: string;
  formattedContent?: string;
}

interface NotificationListProps {
  memberId: string;
  className?: string;
  showSettings?: boolean;
  maxItems?: number;
}

export function NotificationList({
  memberId,
  className = '',
  showSettings = true,
  maxItems,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    includeRead: true,
  });

  const {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    batchMarkRead,
    batchDelete,
  } = useNotifications();

  // 加载通知列表
  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchNotifications(memberId, {
        ...filters,
        limit: maxItems,
      });
      
      setNotifications(result.notifications);
      
      // 获取未读数量
      const unreadResponse = await fetch(`/api/notifications/stats?memberId=${memberId}`);
      const statsData = await unreadResponse.json();
      setUnreadCount(statsData.data?.unreadCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (memberId) {
      loadNotifications();
    }
  }, [memberId, filters, maxItems]);

  // 标记单个通知为已读
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId, memberId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // 标记所有通知为已读
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(memberId);
      setNotifications(prev =>
        prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // 删除单个通知
  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId, memberId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const deleted = notifications.find(n => n.id === notificationId);
      if (deleted && !deleted.readAt) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // 批量操作
  const handleBatchMarkRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await batchMarkRead(selectedNotifications, memberId);
      setNotifications(prev =>
        prev.map(n =>
          selectedNotifications.includes(n.id)
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
      setSelectedNotifications([]);
      loadNotifications(); // 重新加载以更新未读数量
    } catch (err) {
      console.error('Failed to batch mark as read:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await batchDelete(selectedNotifications, memberId);
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
      loadNotifications(); // 重新加载以更新未读数量
    } catch (err) {
      console.error('Failed to batch delete:', err);
    }
  };

  // 切换选择状态
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">加载通知中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <X className="h-6 w-6 text-red-400" />
          <span className="ml-2 text-red-500">{error}</span>
          <button
            onClick={loadNotifications}
            className="ml-4 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* 头部 */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              通知中心
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                {unreadCount} 条未读
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 批量操作 */}
            {selectedNotifications.length > 0 && (
              <div className="flex items-center space-x-2 mr-4">
                <span className="text-sm text-gray-500">
                  已选择 {selectedNotifications.length} 项
                </span>
                <button
                  onClick={handleBatchMarkRead}
                  className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="标记已读"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {/* 全选 */}
            {notifications.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title={selectedNotifications.length === notifications.length ? '取消全选' : '全选'}
              >
                <div className={`h-4 w-4 border rounded ${
                  selectedNotifications.length === notifications.length
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedNotifications.length === notifications.length && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </button>
            )}
            
            {/* 过滤器 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded ${
                showFilters
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="过滤"
            >
              <Filter className="h-4 w-4" />
            </button>
            
            {/* 全部标记已读 */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                全部已读
              </button>
            )}
            
            {/* 设置 */}
            {showSettings && (
              <button
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className={`p-2 rounded ${
                  showSettingsPanel
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="设置"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            
            {/* 刷新 */}
            <button
              onClick={loadNotifications}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 过滤器 */}
      {showFilters && (
        <div className="border-b px-6 py-4 bg-gray-50">
          <NotificationFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      )}

      {/* 设置面板 */}
      {showSettingsPanel && (
        <div className="border-b px-6 py-4 bg-blue-50">
          <NotificationSettings
            memberId={memberId}
            onClose={() => setShowSettingsPanel(false)}
          />
        </div>
      )}

      {/* 通知列表 */}
      <div className="divide-y">
        {notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无通知</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              selected={selectedNotifications.includes(notification.id)}
              onSelect={() => toggleSelection(notification.id)}
              onMarkAsRead={() => handleMarkAsRead(notification.id)}
              onDelete={() => handleDelete(notification.id)}
            />
          ))
        )}
      </div>

      {/* 底部操作 */}
      {notifications.length > 0 && !maxItems && (
        <div className="border-t px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>显示 {notifications.length} 条通知</span>
            <button
              onClick={() => window.location.href = '/notifications/history'}
              className="text-blue-600 hover:text-blue-700"
            >
              查看全部
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
