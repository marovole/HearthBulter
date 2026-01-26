"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexReady } from "@/components/providers/ConvexClientProvider";
import { useAuth, useUser } from "@clerk/nextjs";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { HealthDataForm } from "@/components/health/HealthDataForm";
import { HealthDataList } from "@/components/health/HealthDataList";
import { QuickEntryButtons } from "./QuickEntryButtons";
import { DeviceDataSync } from "./DeviceDataSync";
import { Plus, History, Activity, Download, Smartphone, TrendingUp } from "lucide-react";
import { EmptyFamilyState } from "@/components/dashboard/EmptyFamilyState";

interface HealthDataDashboardProps {
  userEmail: string;
  initialMemberId?: string;
}

export function HealthDataDashboard(props: HealthDataDashboardProps) {
  const { isReady, isLoading } = useConvexReady();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">{isLoading ? "正在连接服务器..." : "正在初始化..."}</p>
        </div>
      </div>
    );
  }

  return <HealthDataDashboardContent {...props} />;
}

function HealthDataDashboardContent({
  userEmail: _userEmail,
  initialMemberId,
}: HealthDataDashboardProps) {
  const { userId } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const families = useQuery(api.families.list, userId ? { clerkId: userId } : "skip");
  const ensureDefaultFamily = useMutation(api.families.ensureDefaultFamily);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId || null);
  const [activeView, setActiveView] = useState<"overview" | "add" | "history" | "sync">("overview");
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [hasTriggeredInit, setHasTriggeredInit] = useState(false);
  const userEmail = user?.primaryEmailAddress?.emailAddress || _userEmail;
  const userName = user?.fullName || user?.firstName || undefined;

  // Convert family members
  const familyMembers = useMemo(() => {
    if (!families) return [];
    return families
      .flatMap((f) => f.members)
      .map((m) => ({
        id: m._id,
        name: m.name,
        avatar: m.avatar || undefined,
        role: m.role.toLowerCase(),
        healthScore: 0,
        lastActive: new Date(m.updatedAt),
      }));
  }, [families]);

  // Auto select first member
  useEffect(() => {
    if (!selectedMemberId && familyMembers.length > 0) {
      const firstMember = familyMembers[0];
      if (firstMember) {
        setSelectedMemberId(firstMember.id);
      }
    }
  }, [familyMembers, selectedMemberId]);

  const loading = families === undefined;
  const isEmptyState = !loading && families && familyMembers.length === 0;
  const canAutoInit = Boolean(isUserLoaded && userId && userEmail);

  useEffect(() => {
    if (!canAutoInit || !isEmptyState || hasTriggeredInit) {
      return;
    }

    setHasTriggeredInit(true);
    setIsInitializing(true);
    setInitError(null);

    void ensureDefaultFamily({ clerkId: userId!, email: userEmail, name: userName })
      .catch((initErr) => {
        setInitError(initErr instanceof Error ? initErr.message : "初始化失败");
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [
    canAutoInit,
    ensureDefaultFamily,
    hasTriggeredInit,
    isEmptyState,
    userEmail,
    userId,
    userName,
  ]);

  const handleDataAdded = () => {
    setActiveView("overview");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-64 flex-col items-center justify-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">正在加载家庭数据...</p>
        </div>
      );
    }

    if (isInitializing) {
      return (
        <div className="flex h-64 flex-col items-center justify-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600"></div>
          <p className="mb-2 font-medium text-gray-900">正在初始化您的健康档案...</p>
          <p className="text-sm text-gray-600">这只需要几秒钟</p>
        </div>
      );
    }

    if (isEmptyState) {
      return (
        <EmptyFamilyState
          onCreate={() =>
            ensureDefaultFamily({ clerkId: userId!, email: userEmail, name: userName }).catch(
              (initErr) => {
                setInitError(initErr instanceof Error ? initErr.message : "初始化失败");
              }
            )
          }
          isCreating={isInitializing}
          disabled={!canAutoInit}
          disabledReason={!canAutoInit ? "请先完成登录并确认邮箱信息后再创建家庭。" : undefined}
          error={initError}
        />
      );
    }

    if (!selectedMemberId) {
      return (
        <div className="py-12 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-900">选择家庭成员</h3>
          <p className="text-gray-600">请从左侧选择一个家庭成员开始管理健康数据</p>
        </div>
      );
    }

    switch (activeView) {
      case "add":
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">录入健康数据</h2>
              <HealthDataForm
                memberId={selectedMemberId}
                onSuccess={handleDataAdded}
                onCancel={() => setActiveView("overview")}
              />
            </div>
          </div>
        );

      case "history":
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">历史数据</h2>
                <button className="flex items-center space-x-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100">
                  <Download className="h-4 w-4" />
                  <span>导出数据</span>
                </button>
              </div>
              <HealthDataList
                memberId={selectedMemberId}
                onDelete={(id) => console.log("删除数据:", id)}
              />
            </div>
          </div>
        );

      case "sync":
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">设备数据同步</h2>
              <DeviceDataSync memberId={selectedMemberId} />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <QuickEntryButtons
              memberId={selectedMemberId}
              onDataAdded={() => setActiveView("overview")}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">今日记录</h3>
                    <p className="text-2xl font-semibold text-gray-900">3</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center">
                  <div className="rounded-lg bg-green-100 p-3">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">连续打卡</h3>
                    <p className="text-2xl font-semibold text-gray-900">7天</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <Smartphone className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">设备状态</h3>
                    <p className="text-2xl font-semibold text-gray-900">已连接</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">最近数据</h2>
                <button
                  onClick={() => setActiveView("history")}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  查看全部
                </button>
              </div>
              <HealthDataList
                memberId={selectedMemberId}
                onDelete={(id) => console.log("删除数据:", id)}
              />
            </div>
          </div>
        );
    }
  };

  const quickActions = [
    {
      id: "add",
      name: "录入数据",
      icon: Plus,
      onClick: () => setActiveView("add"),
    },
    {
      id: "history",
      name: "历史记录",
      icon: History,
      onClick: () => setActiveView("history"),
    },
    {
      id: "sync",
      name: "设备同步",
      icon: Smartphone,
      onClick: () => setActiveView("sync"),
    },
  ];

  const currentMember = useMemo(
    () => familyMembers.find((m) => m.id === selectedMemberId),
    [familyMembers, selectedMemberId]
  );

  return (
    <DashboardLayout currentMember={selectedMemberId || undefined} familyMembers={familyMembers}>
      <div className="space-y-6">
        {!loading && selectedMemberId && (
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-lg font-semibold text-blue-600">
                    {currentMember?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{currentMember?.name}</h2>
                  <p className="text-sm text-gray-500">健康数据管理</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        activeView === action.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {renderContent()}
      </div>
    </DashboardLayout>
  );
}
