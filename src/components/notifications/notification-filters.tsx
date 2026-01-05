"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationFiltersProps {
  filters: {
    type: string;
    priority: string;
    status: string;
    dateRange: string;
    search: string;
  };
  onFiltersChange: (filters: NotificationFiltersProps["filters"]) => void;
}

const NOTIFICATION_TYPES = [
  { value: "", label: "全部类型" },
  { value: "CHECK_IN_REMINDER", label: "打卡提醒" },
  { value: "TASK_NOTIFICATION", label: "任务通知" },
  { value: "EXPIRY_ALERT", label: "过期提醒" },
  { value: "BUDGET_WARNING", label: "预算预警" },
  { value: "HEALTH_ALERT", label: "健康异常" },
  { value: "GOAL_ACHIEVEMENT", label: "目标达成" },
  { value: "FAMILY_ACTIVITY", label: "家庭活动" },
  { value: "SYSTEM_ANNOUNCEMENT", label: "系统公告" },
  { value: "MARKETING", label: "营销通知" },
  { value: "OTHER", label: "其他" },
];

const NOTIFICATION_STATUSES = [
  { value: "", label: "全部状态" },
  { value: "PENDING", label: "待发送" },
  { value: "SENDING", label: "发送中" },
  { value: "SENT", label: "已发送" },
  { value: "FAILED", label: "发送失败" },
  { value: "CANCELLED", label: "已取消" },
];

const NOTIFICATION_PRIORITIES = [
  { value: "", label: "全部优先级" },
  { value: "LOW", label: "低优先级" },
  { value: "MEDIUM", label: "中优先级" },
  { value: "HIGH", label: "高优先级" },
  { value: "URGENT", label: "紧急" },
];

const DATE_RANGES = [
  { value: "", label: "全部时间" },
  { value: "1", label: "今天" },
  { value: "7", label: "最近7天" },
  { value: "30", label: "最近30天" },
  { value: "90", label: "最近3个月" },
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
      type: "",
      priority: "",
      status: "",
      dateRange: "",
      search: "",
    });
  };

  const hasActiveFilters =
    filters.type ||
    filters.priority ||
    filters.status ||
    filters.dateRange ||
    filters.search;

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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 搜索框 */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            搜索通知
          </label>
          <input
            type="text"
            placeholder="搜索标题或内容..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
              filters.search
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-white",
            )}
          />
        </div>

        {/* 通知类型 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            通知类型
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
              filters.type
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-white",
            )}
          >
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* 优先级 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            优先级
          </label>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
              filters.priority
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-white",
            )}
          >
            {NOTIFICATION_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
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
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
              filters.status
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-white",
            )}
          >
            {NOTIFICATION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 第二行过滤器 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 日期范围 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            时间范围
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange("dateRange", e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
              filters.dateRange
                ? "border-blue-300 bg-blue-50"
                : "border-gray-300 bg-white",
            )}
          >
            {DATE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 快速过滤按钮 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange("priority", "URGENT")}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            filters.priority === "URGENT"
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
          )}
        >
          紧急通知
        </button>

        <button
          onClick={() => handleFilterChange("type", "HEALTH_ALERT")}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            filters.type === "HEALTH_ALERT"
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
          )}
        >
          健康异常
        </button>

        <button
          onClick={() => handleFilterChange("type", "GOAL_ACHIEVEMENT")}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            filters.type === "GOAL_ACHIEVEMENT"
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
          )}
        >
          目标达成
        </button>

        <button
          onClick={() => handleFilterChange("status", "FAILED")}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            filters.status === "FAILED"
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
          )}
        >
          发送失败
        </button>

        <button
          onClick={() => handleFilterChange("dateRange", "1")}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            filters.dateRange === "1"
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
          )}
        >
          今天
        </button>

        <button
          onClick={() => handleFilterChange("dateRange", "7")}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            filters.dateRange === "7"
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200",
          )}
        >
          最近7天
        </button>
      </div>

      {/* 过滤结果提示 */}
      {hasActiveFilters && (
        <div className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded">
          <span>已应用过滤条件:</span>
          {filters.search && (
            <span className="ml-2">搜索: "{filters.search}"</span>
          )}
          {filters.type && (
            <span className="ml-2">
              类型:{" "}
              {NOTIFICATION_TYPES.find((t) => t.value === filters.type)?.label}
            </span>
          )}
          {filters.priority && (
            <span className="ml-2">
              优先级:{" "}
              {
                NOTIFICATION_PRIORITIES.find(
                  (p) => p.value === filters.priority,
                )?.label
              }
            </span>
          )}
          {filters.status && (
            <span className="ml-2">
              状态:{" "}
              {
                NOTIFICATION_STATUSES.find((s) => s.value === filters.status)
                  ?.label
              }
            </span>
          )}
          {filters.dateRange && (
            <span className="ml-2">
              时间:{" "}
              {DATE_RANGES.find((d) => d.value === filters.dateRange)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
