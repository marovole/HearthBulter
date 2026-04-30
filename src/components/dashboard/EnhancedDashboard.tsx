"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexReady } from "@/components/providers/ConvexClientProvider";
import { useAuth, useUser } from "@clerk/nextjs";
import { DashboardLayout } from "./DashboardLayout";
import { OverviewCards } from "./OverviewCards";
import { TrendsSection } from "./TrendsSection";
import { InsightsPanel } from "./InsightsPanel";
import { FamilyMembersCard } from "./FamilyMembersCard";
import { HealthScoreDisplay } from "./HealthScoreDisplay";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { EmptyFamilyState } from "./EmptyFamilyState";
import {
  DashboardHealthScoreCardLazy,
  HealthMetricsChartLazy,
  NutritionAnalysisChartLazy,
  NutritionTrendChartLazy,
  WeightTrendChartLazy,
} from "@/components/charts/lazy-registry";

interface EnhancedDashboardProps {
  userEmail: string;
  initialMemberId?: string;
}

export function EnhancedDashboard(props: EnhancedDashboardProps) {
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

  return <EnhancedDashboardContent {...props} />;
}

function EnhancedDashboardContent({
  userEmail: _userEmail,
  initialMemberId,
}: EnhancedDashboardProps) {
  const { userId } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const families = useQuery(api.families.list, userId ? { clerkId: userId } : "skip");
  const ensureDefaultFamily = useMutation(api.families.ensureDefaultFamily);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId || null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [hasTriggeredInit, setHasTriggeredInit] = useState(false);
  const userEmail = user?.primaryEmailAddress?.emailAddress || _userEmail;
  const userName = user?.fullName || user?.firstName || undefined;

  // 获取主家庭 ID
  const primaryFamilyId = useMemo(() => {
    if (!families || families.length === 0) return undefined;
    return families[0]?._id;
  }, [families]);

  // 处理成员列表转换
  const familyMembers = useMemo(() => {
    if (!families) return [];
    return families
      .flatMap((f) => f.members)
      .map((m) => ({
        id: m._id,
        name: m.name,
        avatar: m.avatar || undefined,
        role: m.role.toLowerCase() as any,
        healthScore: 0,
        lastActive: new Date(m.updatedAt),
      }));
  }, [families]);

  // 成员刷新回调 - 添加成员后 Convex 实时订阅会自动更新
  const handleMemberAdded = () => {
    // Convex useQuery 会自动响应数据变化，无需手动刷新
  };

  // 自动选择第一个成员
  useEffect(() => {
    if (!selectedMemberId && familyMembers.length > 0) {
      const firstMember = familyMembers[0];
      if (firstMember) {
        setSelectedMemberId(firstMember.id);
      }
    }
  }, [familyMembers, selectedMemberId]);

  const loading = families === undefined;
  const error = null;
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

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  // 缓存当前选中的成员
  const currentMember = useMemo(() => {
    return familyMembers.find((m) => m.id === selectedMemberId);
  }, [familyMembers, selectedMemberId]);

  const renderDashboardContent = () => {
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

    if (error) {
      return (
        <div className="flex h-64 flex-col items-center justify-center">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
            <h3 className="mb-2 text-lg font-medium text-red-900">加载失败</h3>
            <p className="mb-4 text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    if (!selectedMemberId) {
      return (
        <div className="py-12 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-900">选择家庭成员</h3>
          <p className="text-gray-600">请从左侧选择一个家庭成员开始查看健康数据</p>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <OverviewCards memberId={selectedMemberId} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <WeightTrendChartLazy memberId={selectedMemberId} />
              <DashboardHealthScoreCardLazy memberId={selectedMemberId} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <NutritionAnalysisChartLazy memberId={selectedMemberId} />
              <TrendsSection memberId={selectedMemberId} />
            </div>
            <QuickActionsPanel memberId={selectedMemberId} />
          </div>
        );

      case "health":
        return (
          <div className="space-y-6">
            <WeightTrendChartLazy memberId={selectedMemberId} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <HealthMetricsChartLazy memberId={selectedMemberId} />
              <TrendsSection memberId={selectedMemberId} />
            </div>
          </div>
        );

      case "nutrition":
        return (
          <div className="space-y-6">
            <NutritionAnalysisChartLazy memberId={selectedMemberId} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <NutritionTrendChartLazy memberId={selectedMemberId} />
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold">营养建议</h3>
                <p className="text-gray-600">基于您的健康数据，我们建议...</p>
              </div>
            </div>
          </div>
        );

      case "family":
        return (
          <div className="space-y-6">
            <FamilyMembersCard
              members={familyMembers}
              currentMemberId={selectedMemberId}
              onMemberSelect={handleMemberChange}
              familyId={primaryFamilyId}
              onMemberAdded={handleMemberAdded}
            />
          </div>
        );

      case "score":
        return (
          <div className="space-y-6">
            <DashboardHealthScoreCardLazy memberId={selectedMemberId} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <HealthScoreDisplay memberId={selectedMemberId} />
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-semibold">健康评分趋势</h3>
                <p className="text-gray-600">评分变化图表将在这里显示</p>
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">仪表盘设置</h3>
              <p className="text-gray-600">个性化您的仪表盘显示偏好</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <OverviewCards memberId={selectedMemberId} />
            <InsightsPanel memberId={selectedMemberId} />
          </div>
        );
    }
  };

  return (
    <DashboardLayout currentMember={selectedMemberId || undefined} familyMembers={familyMembers}>
      <div className="space-y-6">
        {/* 成员信息头部 */}
        {!loading && selectedMemberId && currentMember && (
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-lg font-semibold text-blue-600">
                    {currentMember.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{currentMember.name}</h2>
                  <p className="text-sm text-gray-500">
                    {currentMember.role === "admin" ? "管理员" : "家庭成员"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">健康评分</p>
                  <p className="text-2xl font-bold text-green-600">
                    {currentMember.healthScore || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 动态内容区域 */}
        {renderDashboardContent()}
      </div>
    </DashboardLayout>
  );
}
