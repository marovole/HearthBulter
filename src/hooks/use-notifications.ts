'use client';

import { useState, useEffect, useCallback } from 'react';

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

interface NotificationMetadata {
  [key: string]: unknown;
}

interface NotificationTemplateData {
  [key: string]: string | number | boolean;
}

interface BulkNotificationRequest {
  memberId: string;
  type: string;
  title?: string;
  content?: string;
  priority?: string;
  channels?: string[];
  metadata?: NotificationMetadata;
  actionUrl?: string;
  actionText?: string;
  templateData?: NotificationTemplateData;
  dedupKey?: string;
  batchId?: string;
}

interface NotificationFilters {
  type?: string;
  priority?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

interface NotificationStats {
  summary: {
    total: number;
    successRate: number;
    failureRate: number;
    pendingRate: number;
    topTypes: Array<{ type: string; count: number; percentage: number }>;
  };
  unreadCount: number;
  dailyStats: Array<{
    date: string;
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }>;
  channelStats: Record<
    string,
    {
      total: number;
      sent: number;
      failed: number;
      successRate: number;
    }
  >;
}

interface UseNotificationsOptions {
  memberId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  pageSize?: number;
  initialFilters?: {
    type?: string;
    priority?: string;
    status?: string;
    dateRange?: string;
    search?: string;
  };
}

export function useNotifications(options: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState(options.initialFilters || {});

  const {
    memberId,
    autoRefresh = false,
    refreshInterval = 30000,
    pageSize = 20,
  } = options;

  // 获取通知列表
  const fetchNotifications = useCallback(
    async (
      memberId: string,
      options: {
        type?: string;
        status?: string;
        priority?: string;
        search?: string;
        dateRange?: string;
        limit?: number;
        offset?: number;
        includeRead?: boolean;
      } = {},
    ) => {
      try {
        setError(null);

        const params = new URLSearchParams({
          memberId,
          ...Object.fromEntries(
            Object.entries(options).filter(
              ([_, value]) => value !== undefined && value !== '',
            ),
          ),
        });

        const response = await fetch(`/api/notifications?${params}`);
        const data = await response.json();

        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.error || 'Failed to fetch notifications');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch notifications';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 获取通知统计
  const fetchStats = useCallback(
    async (memberId: string, days: number = 30) => {
      try {
        setError(null);

        const response = await fetch(
          `/api/notifications/stats?memberId=${memberId}&days=${days}`,
        );
        const data = await response.json();

        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.error || 'Failed to fetch stats');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch stats';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 创建通知
  const createNotification = useCallback(
    async (data: {
      memberId: string;
      type: string;
      title?: string;
      content?: string;
      priority?: string;
      channels?: string[];
      metadata?: NotificationMetadata;
      actionUrl?: string;
      actionText?: string;
      templateData?: NotificationTemplateData;
      dedupKey?: string;
      batchId?: string;
    }) => {
      try {
        setError(null);

        const response = await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          // 刷新通知列表
          await loadNotifications();
          return result.data;
        } else {
          throw new Error(result.error || 'Failed to create notification');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create notification';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 标记为已读
  const markAsRead = useCallback(
    async (notificationId: string, memberId: string) => {
      try {
        setError(null);

        const response = await fetch('/api/notifications/read', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId,
            memberId,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to mark as read');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to mark as read';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 标记全部为已读
  const markAllAsRead = useCallback(async (memberId: string) => {
    try {
      setError(null);

      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          markAll: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark all as read');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to mark all as read';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 删除通知
  const deleteNotification = useCallback(
    async (notificationId: string, memberId: string) => {
      try {
        setError(null);

        const response = await fetch(
          `/api/notifications/${notificationId}?memberId=${memberId}`,
          {
            method: 'DELETE',
          },
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete notification');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete notification';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 批量标记已读
  const batchMarkRead = useCallback(
    async (notificationIds: string[], memberId: string) => {
      try {
        setError(null);

        const response = await fetch('/api/notifications/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'markRead',
            data: {
              notificationIds,
              memberId,
            },
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to batch mark as read');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to batch mark as read';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 批量删除
  const batchDelete = useCallback(
    async (notificationIds: string[], memberId: string) => {
      try {
        setError(null);

        const response = await fetch('/api/notifications/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'delete',
            data: {
              notificationIds,
              memberId,
            },
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to batch delete');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to batch delete';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 批量创建通知
  const createBulkNotifications = useCallback(
    async (notifications: BulkNotificationRequest[]) => {
      try {
        setError(null);

        const response = await fetch('/api/notifications/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'create',
            data: {
              notifications,
            },
          }),
        });

        const result = await response.json();

        if (result.success) {
          // 刷新通知列表
          await loadNotifications();
          return result.data;
        } else {
          throw new Error(
            result.error || 'Failed to create bulk notifications',
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create bulk notifications';
        setError(errorMessage);
        throw err;
      }
    },
    [],
  );

  // 清空所有通知
  const deleteAll = useCallback(async (memberId: string) => {
    try {
      setError(null);

      const response = await fetch('/api/notifications/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'delete',
          data: {
            memberId,
            deleteAll: true,
          },
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete all notifications');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to delete all notifications';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 更新过滤器
  const updateFilters = useCallback((newFilters: NotificationFilters) => {
    setFilters(newFilters);
    setCurrentPage(0);
    setNotifications([]);
  }, []);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (!memberId || loading || !hasMore) return;

    try {
      setLoading(true);
      const nextPage = currentPage + 1;
      const offset = nextPage * pageSize;

      const result = await fetchNotifications(memberId, {
        ...filters,
        limit: pageSize,
        offset,
        includeRead: true,
      });

      if (result.notifications) {
        setNotifications((prev) => [...prev, ...result.notifications]);
        setCurrentPage(nextPage);
        setHasMore(result.notifications.length === pageSize);
      }
    } catch (err) {
      console.error('Failed to load more notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [
    memberId,
    currentPage,
    filters,
    pageSize,
    hasMore,
    loading,
    fetchNotifications,
  ]);

  // 加载通知列表
  const loadNotifications = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchNotifications(memberId, {
        ...filters,
        includeRead: true,
        limit: pageSize,
        offset: 0,
      });

      setNotifications(result.notifications || []);
      setTotalCount(result.total || 0);
      setHasMore((result.notifications || []).length === pageSize);
      setCurrentPage(0);

      // 获取未读数量
      const statsData = await fetchStats(memberId, 7);
      setUnreadCount(statsData.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [memberId, filters, pageSize, fetchNotifications, fetchStats]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      setError(null);

      const statsData = await fetchStats(memberId, 30);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, [memberId, fetchStats]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await Promise.all([loadNotifications(), loadStats()]);
  }, [loadNotifications, loadStats]);

  // 初始化加载
  useEffect(() => {
    if (memberId) {
      refresh();
    }
  }, [memberId, refresh]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !memberId) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, memberId, refresh]);

  return {
    // 数据
    notifications,
    stats,
    unreadCount,
    totalCount,
    loading,
    error,
    hasMore,
    filters,

    // 方法
    fetchNotifications,
    fetchStats,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    batchMarkRead,
    batchDelete,
    createBulkNotifications,
    deleteAll,
    loadNotifications,
    loadStats,
    refresh,
    updateFilters,
    loadMore,

    // 工具方法
    clearError: () => setError(null),
  };
}
