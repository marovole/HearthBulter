"use client";

import React, { useState, useEffect } from "react";
import { Bell, Filter, Search, Settings, Trash2, Check, X } from "lucide-react";
import { NotificationList } from "./notification-list";
import { NotificationFilters } from "./notification-filters";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  memberId: string;
  className?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  defaultPageSize?: number;
}

export function NotificationCenter({
  memberId,
  className = "",
  showFilters = true,
  showSearch = true,
  showSettings = true,
  defaultPageSize = 20,
}: NotificationCenterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    type: "",
    priority: "",
    status: "",
    dateRange: "",
    search: "",
  });

  const {
    notifications,
    unreadCount,
    totalCount,
    loading,
    error,
    refresh,
    markAllAsRead,
    deleteAll,
    updateFilters,
    loadMore,
    hasMore,
  } = useNotifications({
    memberId,
    autoRefresh: true,
    refreshInterval: 30000,
    pageSize: defaultPageSize,
  });

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateFilters({
      ...selectedFilters,
      search: query,
    });
  };

  // 处理过滤器变更
  const handleFilterChange = (filters: any) => {
    setSelectedFilters(filters);
    updateFilters(filters);
  };

  // 处理全部标记已读
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(memberId);
      await refresh();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // 处理清空所有通知
  const handleClearAll = async () => {
    if (window.confirm("确定要清空所有通知吗？此操作不可恢复。")) {
      try {
        await deleteAll(memberId);
        await refresh();
      } catch (error) {
        console.error("Failed to clear all notifications:", error);
      }
    }
  };

  // 获取活跃过滤器数量
  const getActiveFiltersCount = () => {
    return Object.values(selectedFilters).filter((value) => value && value !== "").length;
  };

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white shadow-sm", className)}>
      {/* 头部 */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-500" />
            <h1 className="text-xl font-semibold text-gray-900">通知中心</h1>

            {/* 未读数量徽章 */}
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-sm text-red-600">
                {unreadCount} 条未读
              </span>
            )}

            {/* 总数量 */}
            <span className="text-sm text-gray-500">共 {totalCount} 条通知</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* 全部标记已读 */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-1 rounded-md px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                <Check className="h-4 w-4" />
                <span>全部已读</span>
              </button>
            )}

            {/* 清空所有 */}
            {totalCount > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center space-x-1 rounded-md px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                <span>清空</span>
              </button>
            )}

            {/* 设置 */}
            {showSettings && (
              <button
                onClick={() => (window.location.href = "/notifications/settings")}
                className="flex items-center space-x-1 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <Settings className="h-4 w-4" />
                <span>设置</span>
              </button>
            )}
          </div>
        </div>

        {/* 搜索和过滤器 */}
        {(showSearch || showFilters) && (
          <div className="flex items-center space-x-3">
            {/* 搜索框 */}
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索通知内容..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* 过滤器按钮 */}
            {showFilters && (
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={cn(
                  "flex items-center space-x-2 rounded-md px-4 py-2 transition-colors",
                  showFiltersPanel
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Filter className="h-4 w-4" />
                <span>筛选</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 过滤器面板 */}
      {showFilters && showFiltersPanel && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <NotificationFilters filters={selectedFilters} onFiltersChange={handleFilterChange} />
        </div>
      )}

      {/* 通知列表 */}
      <div className="min-h-[400px]">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <X className="mb-3 h-12 w-12 text-red-500" />
            <h3 className="mb-1 text-lg font-medium text-gray-900">加载失败</h3>
            <p className="mb-4 text-sm text-gray-500">{error}</p>
            <button
              onClick={refresh}
              className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              重新加载
            </button>
          </div>
        ) : notifications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="mb-3 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-medium text-gray-900">暂无通知</h3>
            <p className="text-sm text-gray-500">
              {getActiveFiltersCount() > 0 ? "没有符合筛选条件的通知" : "您还没有收到任何通知"}
            </p>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={() =>
                  handleFilterChange({
                    type: "",
                    priority: "",
                    status: "",
                    dateRange: "",
                    search: "",
                  })
                }
                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                清除筛选条件
              </button>
            )}
          </div>
        ) : (
          <NotificationList
            notifications={notifications}
            loading={loading}
            onRefresh={refresh}
            onLoadMore={loadMore}
            hasMore={hasMore}
            showLoadMore={true}
          />
        )}
      </div>

      {/* 底部统计 */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              显示 {Math.min(notifications.length, defaultPageSize)} / {totalCount} 条通知
            </span>
            <span>最后更新: {new Date().toLocaleTimeString("zh-CN")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
