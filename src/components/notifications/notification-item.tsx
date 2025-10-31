'use client';

import React from 'react';
import { Check, X, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: {
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
  };
  selected?: boolean;
  onSelect?: () => void;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function NotificationItem({
  notification,
  selected = false,
  onSelect,
  onMarkAsRead,
  onDelete,
  showActions = true,
}: NotificationItemProps) {
  const isUnread = !notification.readAt;
  const isFailed = notification.status === 'FAILED';
  const isPending = notification.status === 'PENDING' || notification.status === 'SENDING';

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const getPriorityBadge = () => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-yellow-100 text-yellow-600',
      URGENT: 'bg-red-100 text-red-600',
    };

    const labels = {
      LOW: '低',
      MEDIUM: '中',
      HIGH: '高',
      URGENT: '紧急',
    };

    return (
      <span
        className={cn(
          'px-2 py-0.5 text-xs font-medium rounded',
          colors[notification.priority as keyof typeof colors] || colors.MEDIUM
        )}
      >
        {labels[notification.priority as keyof typeof labels] || '中'}
      </span>
    );
  };

  const getStatusIcon = () => {
    if (isFailed) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (isPending) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (isUnread) {
      return <div className="h-2 w-2 bg-blue-500 rounded-full" />;
    }
    return null;
  };

  return (
    <div
      className={cn(
        'px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group',
        isUnread && 'bg-blue-50/30',
        selected && 'bg-blue-50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        {/* 选择框 */}
        <div className="pt-1">
          <div
            className={cn(
              'h-4 w-4 border rounded transition-colors',
              selected
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 group-hover:border-gray-400'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
          >
            {selected && (
              <Check className="h-3 w-3 text-white" />
            )}
          </div>
        </div>

        {/* 通知图标 */}
        <div className="pt-1">
          <span className="text-xl">{notification.typeIcon || '📄'}</span>
        </div>

        {/* 通知内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* 标题和状态 */}
              <div className="flex items-center space-x-2 mb-1">
                <h3
                  className={cn(
                    'text-sm font-medium truncate',
                    isUnread ? 'text-gray-900 font-semibold' : 'text-gray-700'
                  )}
                >
                  {notification.title}
                </h3>
                {getPriorityBadge()}
                {getStatusIcon()}
              </div>

              {/* 内容 */}
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {notification.formattedContent || notification.content}
              </p>

              {/* 元信息 */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{notification.typeName || notification.type}</span>
                <span>{notification.formattedTime || notification.createdAt}</span>
                {isFailed && (
                  <span className="text-red-500">发送失败</span>
                )}
                {isPending && (
                  <span className="text-yellow-500">发送中</span>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            {showActions && (
              <div className="flex items-center space-x-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {isUnread && onMarkAsRead && (
                  <button
                    onClick={handleMarkAsRead}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="标记已读"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                
                {notification.actionUrl && (
                  <button
                    onClick={handleActionClick}
                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                    title="查看详情"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          {notification.actionUrl && notification.actionText && (
            <div className="mt-3">
              <button
                onClick={handleActionClick}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  'bg-blue-100 text-blue-700 hover:bg-blue-200'
                )}
              >
                {notification.actionText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
