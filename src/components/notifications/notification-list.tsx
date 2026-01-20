"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, X, Filter, Settings, Trash2, RefreshCw } from "lucide-react";
import { NotificationItem } from "./notification-item";
import { NotificationFilters } from "./notification-filters";
import { NotificationSettings } from "./notification-settings";
import { useNotifications } from "@/hooks/use-notifications";

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
  notifications: Notification[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  showLoadMore?: boolean;
  className?: string;
  showActions?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function NotificationList({
  notifications,
  loading = false,
  error = null,
  onRefresh,
  onLoadMore,
  hasMore = false,
  showLoadMore = false,
  className = "",
  showActions = true,
  selectable = false,
  onSelectionChange,
}: NotificationListProps) {
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // 切换选择状态
  const toggleSelection = (notificationId: string) => {
    const newSelection = selectedNotifications.includes(notificationId)
      ? selectedNotifications.filter((id) => id !== notificationId)
      : [...selectedNotifications, notificationId];

    setSelectedNotifications(newSelection);
    onSelectionChange?.(newSelection);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const newSelection =
      selectedNotifications.length === notifications.length ? [] : notifications.map((n) => n.id);

    setSelectedNotifications(newSelection);
    onSelectionChange?.(newSelection);
  };

  if (loading && notifications.length === 0) {
    return (
      <div className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">加载通知中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-center py-12">
          <X className="h-6 w-6 text-red-400" />
          <span className="ml-2 text-red-500">{error}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="ml-4 rounded bg-blue-50 px-3 py-1 text-sm text-blue-600 hover:bg-blue-100"
            >
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 批量操作栏 */}
      {selectable && selectedNotifications.length > 0 && (
        <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm text-blue-700">已选择 {selectedNotifications.length} 项</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                // 批量标记已读逻辑
                setSelectedNotifications([]);
                onSelectionChange?.([]);
              }}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              标记已读
            </button>
            <button
              onClick={() => {
                // 批量删除逻辑
                setSelectedNotifications([]);
                onSelectionChange?.([]);
              }}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 通知列表 */}
      <div className="divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">暂无通知</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              selected={selectedNotifications.includes(notification.id)}
              onSelect={selectable ? () => toggleSelection(notification.id) : undefined}
              showActions={showActions}
            />
          ))
        )}
      </div>

      {/* 加载更多 */}
      {showLoadMore && hasMore && (
        <div className="border-t border-gray-100 px-6 py-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}

      {/* 全选控制 */}
      {selectable && notifications.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <div
              className={`h-4 w-4 rounded border ${
                selectedNotifications.length === notifications.length
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-300"
              }`}
            >
              {selectedNotifications.length === notifications.length && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>
            <span>
              {selectedNotifications.length === notifications.length ? "取消全选" : "全选"}
            </span>
          </button>

          <span className="text-sm text-gray-500">{notifications.length} 条通知</span>
        </div>
      )}
    </div>
  );
}
