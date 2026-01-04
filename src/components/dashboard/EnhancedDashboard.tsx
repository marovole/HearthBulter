"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { OverviewCards } from "./OverviewCards";
import { TrendsSection } from "./TrendsSection";
import { InsightsPanel } from "./InsightsPanel";
import { HealthMetricsChart } from "./HealthMetricsChart";
import { FamilyMembersCard } from "./FamilyMembersCard";
import { NutritionTrendChart } from "./NutritionTrendChart";
import { HealthScoreDisplay } from "./HealthScoreDisplay";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { WeightTrendChart } from "./WeightTrendChart";
import { NutritionAnalysisChart } from "./NutritionAnalysisChart";
import HealthScoreCard from "./HealthScoreCard";
import type { FamilyMember, RawFamilyMember, RawFamily } from "@/types/family";

interface EnhancedDashboardProps {
  userId: string;
  initialMemberId?: string;
}

export function EnhancedDashboard({
  userId,
  initialMemberId,
}: EnhancedDashboardProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    initialMemberId || null,
  );
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false);

  // 获取真实的家庭成员数据
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 获取用户的家庭列表
        const familiesResponse = await fetch("/api/families");
        if (!familiesResponse.ok) {
          throw new Error("获取家庭列表失败");
        }

        const familiesData = await familiesResponse.json();
        let families: RawFamily[] = familiesData.families || [];

        // 2. 如果没有家庭，自动创建一个默认家庭
        if (families.length === 0) {
          const createFamilyResponse = await fetch("/api/families", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "我的家庭",
              description: "默认家庭",
            }),
          });

          if (!createFamilyResponse.ok) {
            throw new Error("创建默认家庭失败");
          }

          const createFamilyData = await createFamilyResponse.json();
          families = [createFamilyData.family];
        }

        // 3. 使用第一个家庭
        const family = families[0];
        let members: RawFamilyMember[] = family.members || [];

        // 4. 如果家庭没有成员，自动创建一个关联到当前用户的成员
        if (members.length === 0) {
          const createMemberResponse = await fetch(
            `/api/families/${family.id}/members`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "我",
                gender: "OTHER",
                birthDate: new Date().toISOString(),
                role: "ADMIN",
              }),
            },
          );

          if (!createMemberResponse.ok) {
            throw new Error("创建默认成员失败");
          }

          const createMemberData = await createMemberResponse.json();
          members = [createMemberData.member];
        }

        // 5. 转换成员数据格式
        const formattedMembers: FamilyMember[] = members.map(
          (member: RawFamilyMember) => ({
            id: member.id,
            name: member.name,
            avatar: member.avatar || undefined,
            role: member.role.toLowerCase(),
            email: member.user?.email || undefined,
            healthScore: 0, // 默认值，后续可以从健康评分 API 获取
            lastActive: new Date(),
          }),
        );

        setFamilyMembers(formattedMembers);

        // 6. 选择成员：优先选择与当前用户关联的成员，否则选择第一个
        if (!selectedMemberId && formattedMembers.length > 0) {
          // 尝试找到关联到当前用户的成员
          const userMember = members.find(
            (m: RawFamilyMember) => m.userId === userId,
          );
          const memberId = userMember ? userMember.id : formattedMembers[0].id;
          setSelectedMemberId(memberId);
        }
      } catch (error) {
        console.error("获取家庭成员失败:", error);
        setError(error instanceof Error ? error.message : "加载失败，请重试");
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, []); // 只在组件挂载时执行一次

  // 检查选中的成员是否需要初始化
  useEffect(() => {
    const checkInitialization = async () => {
      if (!selectedMemberId) return;

      try {
        const response = await fetch(
          `/api/members/${selectedMemberId}/initialize`,
        );
        if (response.ok) {
          const data = await response.json();
          setNeedsInitialization(data.needsInitialization);

          // 如果需要初始化，自动触发
          if (data.needsInitialization) {
            await autoInitialize();
          }
        }
      } catch (error) {
        console.error("检查初始化状态失败:", error);
      }
    };

    checkInitialization();
  }, [selectedMemberId]);

  // 自动初始化成员数据
  const autoInitialize = async () => {
    if (!selectedMemberId || isInitializing) return;

    setIsInitializing(true);
    try {
      const response = await fetch(
        `/api/members/${selectedMemberId}/initialize`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        setNeedsInitialization(false);
        // 初始化成功后，等待一小段时间让数据同步
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error("自动初始化失败:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // 缓存当前选中的成员，避免重复查找
  const currentMember = useMemo(() => {
    return familyMembers.find((m) => m.id === selectedMemberId);
  }, [familyMembers, selectedMemberId]);

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">正在加载家庭数据...</p>
        </div>
      );
    }

    if (isInitializing) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-900 font-medium mb-2">
            正在初始化您的健康档案...
          </p>
          <p className="text-gray-600 text-sm">这只需要几秒钟</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-900 mb-2">加载失败</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    if (!selectedMemberId) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            选择家庭成员
          </h3>
          <p className="text-gray-600">
            请从左侧选择一个家庭成员开始查看健康数据
          </p>
        </div>
      );
    }

    switch (activeTab) {
    case "overview":
      return (
        <div className="space-y-6">
          <OverviewCards memberId={selectedMemberId} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <WeightTrendChart memberId={selectedMemberId} />
            <HealthScoreCard memberId={selectedMemberId} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NutritionAnalysisChart memberId={selectedMemberId} />
            <TrendsSection memberId={selectedMemberId} />
          </div>
          <QuickActionsPanel memberId={selectedMemberId} />
        </div>
      );

    case "health":
      return (
        <div className="space-y-6">
          <WeightTrendChart memberId={selectedMemberId} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthMetricsChart memberId={selectedMemberId} />
            <TrendsSection memberId={selectedMemberId} />
          </div>
        </div>
      );

    case "nutrition":
      return (
        <div className="space-y-6">
          <NutritionAnalysisChart memberId={selectedMemberId} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NutritionTrendChart memberId={selectedMemberId} />
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">营养建议</h3>
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
          />
        </div>
      );

    case "score":
      return (
        <div className="space-y-6">
          <HealthScoreCard memberId={selectedMemberId} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthScoreDisplay memberId={selectedMemberId} />
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">健康评分趋势</h3>
              <p className="text-gray-600">评分变化图表将在这里显示</p>
            </div>
          </div>
        </div>
      );

    case "settings":
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">仪表盘设置</h3>
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
    <DashboardLayout
      currentMember={selectedMemberId || undefined}
      familyMembers={familyMembers}
    >
      <div className="space-y-6">
        {/* 成员信息头部 */}
        {!loading && selectedMemberId && currentMember && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-blue-600">
                    {currentMember.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentMember.name}
                  </h2>
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
