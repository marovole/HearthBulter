// @ts-nocheck
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

  const { unreadCount, notifications, markAllAsRead, refresh } =
    useNotifications({
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
          "relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors",
          className,
        )}
        title="通知中心"
      >
        <Bell className="h-5 w-5" />

        {/* 未读数量徽章 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉通知列表 */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-50 w-96 bg-white rounded-lg shadow-lg border border-gray-200"
          style={{
            top: `${position.top}px`,
            right: `${position.right}px`,
            maxHeight: "80vh",
            overflow: "hidden",
          }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-900">通知</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {unreadCount} 条未读
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="全部标记已读"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
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
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
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
        "px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors",
        isUnread && "bg-blue-50/30",
      )}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <span className="text-lg mt-0.5">{notification.typeIcon || "📄"}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4
              className={cn(
                "text-sm truncate",
                isUnread ? "font-semibold text-gray-900" : "text-gray-700",
              )}
            >
              {notification.title}
            </h4>

            {isUnread && (
              <div className="h-2 w-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
            )}
          </div>

          <p className="text-sm text-gray-600 mb-1 line-clamp-2">
            {notification.formattedContent || notification.content}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {notification.formattedTime || notification.createdAt}
            </span>

            {notification.actionUrl && (
              <span className="text-xs text-blue-600 hover:text-blue-700">
                查看详情 →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
