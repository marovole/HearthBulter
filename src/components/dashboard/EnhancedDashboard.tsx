'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { OverviewCards } from './OverviewCards';
import { TrendsSection } from './TrendsSection';
import { InsightsPanel } from './InsightsPanel';
import { HealthMetricsChart } from './HealthMetricsChart';
import { FamilyMembersCard } from './FamilyMembersCard';
import { NutritionTrendChart } from './NutritionTrendChart';
import { HealthScoreDisplay } from './HealthScoreDisplay';
import { QuickActionsPanel } from './QuickActionsPanel';
import { WeightTrendChart } from './WeightTrendChart';
import { NutritionAnalysisChart } from './NutritionAnalysisChart';
import { HealthScoreCard } from './HealthScoreCard';

interface EnhancedDashboardProps {
  userId: string
  initialMemberId?: string
}

interface FamilyMember {
  id: string
  name: string
  avatar?: string
  role: string
  email?: string
  healthScore?: number
  lastActive?: Date
}

export function EnhancedDashboard({ userId, initialMemberId }: EnhancedDashboardProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId || null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // 模拟获取家庭成员数据
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        // 这里应该调用实际的API
        const mockMembers: FamilyMember[] = [
          {
            id: '1',
            name: '张三',
            role: 'admin',
            email: 'zhangsan@example.com',
            healthScore: 85,
            lastActive: new Date(),
          },
          {
            id: '2',
            name: '李四',
            role: 'member',
            email: 'lisi@example.com',
            healthScore: 78,
            lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          {
            id: '3',
            name: '王五',
            role: 'member',
            email: 'wangwu@example.com',
            healthScore: 92,
            lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ];
        
        setFamilyMembers(mockMembers);
        
        // 如果没有选中的成员，默认选择第一个
        if (!selectedMemberId && mockMembers.length > 0) {
          setSelectedMemberId(mockMembers[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch family members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [selectedMemberId]);

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!selectedMemberId) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">选择家庭成员</h3>
          <p className="text-gray-600">请从左侧选择一个家庭成员开始查看健康数据</p>
        </div>
      );
    }

    const currentMember = familyMembers.find(m => m.id === selectedMemberId);

    switch (activeTab) {
    case 'overview':
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
      
    case 'health':
      return (
        <div className="space-y-6">
          <WeightTrendChart memberId={selectedMemberId} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthMetricsChart memberId={selectedMemberId} />
            <TrendsSection memberId={selectedMemberId} />
          </div>
        </div>
      );
      
    case 'nutrition':
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
      
    case 'family':
      return (
        <div className="space-y-6">
          <FamilyMembersCard 
            members={familyMembers}
            currentMemberId={selectedMemberId}
            onMemberSelect={handleMemberChange}
          />
        </div>
      );
      
    case 'score':
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
      
    case 'settings':
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
        {!loading && selectedMemberId && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-blue-600">
                    {familyMembers.find(m => m.id === selectedMemberId)?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {familyMembers.find(m => m.id === selectedMemberId)?.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {familyMembers.find(m => m.id === selectedMemberId)?.role === 'admin' ? '管理员' : '家庭成员'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">健康评分</p>
                  <p className="text-2xl font-bold text-green-600">
                    {familyMembers.find(m => m.id === selectedMemberId)?.healthScore || 0}
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
