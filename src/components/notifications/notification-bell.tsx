"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Settings, X } from "lucide-react";
import { NotificationList } from "./notification-list";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  memberId: string;
  className?: string;
  showSettings?: boolean;
  maxDropdownItems?: number;
}

export function NotificationBell({
  memberId,
  className = "",
  showSettings = true,
  maxDropdownItems = 5,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { unreadCount, notifications, markAllAsRead, refresh } = useNotifications({
    memberId,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // 计算下拉框位置
  const updatePosition = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
  };

  // 处理点击外部
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !bellRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updatePosition();
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("scroll", handleScroll);
      window.addEventListener("resize", updatePosition);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // 处理铃铛点击
  const handleBellClick = () => {
    setIsOpen(!isOpen);
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

  // 获取最近的通知
  const recentNotifications = notifications.slice(0, maxDropdownItems);

  return (
    <>
      {/* 通知铃铛 */}
      <button
        ref={bellRef}
        onClick={handleBellClick}
        className={cn(
          "relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900",
          className
        )}
        title="通知中心"
      >
        <Bell className="h-5 w-5" />

        {/* 未读数量徽章 */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉通知列表 */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-lg"
          style={{
            top: `${position.top}px`,
            right: `${position.right}px`,
            maxHeight: "80vh",
            overflow: "hidden",
          }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">通知</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                  {unreadCount} 条未读
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                  title="全部标记已读"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 通知列表 */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">暂无通知</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <NotificationDropdownItem
                    key={notification.id}
                    notification={notification}
                    onRefresh={refresh}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 底部 */}
          {(notifications.length > 0 || showSettings) && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              {notifications.length > maxDropdownItems && (
                <button
                  onClick={() => {
                    window.location.href = "/notifications";
                    setIsOpen(false);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  查看全部 {notifications.length} 条通知
                </button>
              )}

              {showSettings && (
                <button
                  onClick={() => {
                    window.location.href = "/notifications/settings";
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <Settings className="h-3 w-3" />
                  <span>设置</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// 通知下拉项组件
interface NotificationDropdownItemProps {
  notification: any;
  onRefresh: () => void;
  onClose: () => void;
}

function NotificationDropdownItem({
  notification,
  onRefresh,
  onClose,
}: NotificationDropdownItemProps) {
  const isUnread = !notification.readAt;

  const handleClick = async () => {
    if (isUnread) {
      try {
        await fetch("/api/notifications/read", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notificationId: notification.id,
            memberId: notification.memberId,
          }),
        });
        await onRefresh();
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    if (notification.actionUrl) {
      window.open(notification.actionUrl, "_blank");
    }

    onClose();
  };

  return (
    <div
      className={cn(
        "cursor-pointer px-4 py-3 transition-colors hover:bg-gray-50",
        isUnread && "bg-blue-50/30"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <span className="mt-0.5 text-lg">{notification.typeIcon || "📄"}</span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <h4
              className={cn(
                "truncate text-sm",
                isUnread ? "font-semibold text-gray-900" : "text-gray-700"
              )}
            >
              {notification.title}
            </h4>

            {isUnread && <div className="ml-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
          </div>

          <p className="mb-1 line-clamp-2 text-sm text-gray-600">
            {notification.formattedContent || notification.content}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {notification.formattedTime || notification.createdAt}
            </span>

            {notification.actionUrl && (
              <span className="text-xs text-blue-600 hover:text-blue-700">查看详情 →</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
