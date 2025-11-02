'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { HealthDataList } from '@/components/health/HealthDataList';
import { DataHistoryTable } from './DataHistoryTable';
import { DataImportExport } from './DataImportExport';
import { Download, Filter, Search, Calendar } from 'lucide-react';

interface HealthDataHistoryPageProps {
  userId: string
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

export function HealthDataHistoryPage({ userId }: HealthDataHistoryPageProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [showExport, setShowExport] = useState(false);

  // 获取家庭成员数据
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
            lastActive: new Date(),
          },
        ];
        
        setFamilyMembers(mockMembers);
        if (mockMembers.length > 0) {
          setSelectedMemberId(mockMembers[0].id);
        }
      } catch (error) {
        console.error('获取家庭成员失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, []);

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleDataDeleted = (id: string) => {
    console.log('删除数据:', id);
    // 这里可以添加刷新逻辑
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      currentMember={selectedMemberId || undefined}
      familyMembers={familyMembers}
    >
      <div className="space-y-6">
        {!selectedMemberId ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">选择家庭成员</h3>
            <p className="text-gray-600">请从左侧选择一个家庭成员查看健康数据历史</p>
          </div>
        ) : (
          <>
            {/* 页面标题和操作 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg font-semibold text-blue-600">
                      {familyMembers.find(m => m.id === selectedMemberId)?.name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">健康数据历史</h1>
                    <p className="text-gray-500">
                      查看 {familyMembers.find(m => m.id === selectedMemberId)?.name} 的历史健康数据
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowExport(!showExport)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4" />
                    <span>导出数据</span>
                  </button>
                </div>
              </div>
              
              {/* 筛选和搜索 */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* 搜索框 */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索健康数据..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* 时间范围选择 */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="week">最近一周</option>
                    <option value="month">最近一月</option>
                    <option value="quarter">最近三月</option>
                    <option value="year">最近一年</option>
                    <option value="all">全部时间</option>
                  </select>
                </div>
              </div>
              
              {/* 数据表格 */}
              <DataHistoryTable 
                memberId={selectedMemberId}
                searchTerm={searchTerm}
                dateRange={dateRange}
                onDataDeleted={handleDataDeleted}
              />
            </div>
            
            {/* 导出面板 */}
            {showExport && (
              <DataImportExport 
                memberId={selectedMemberId}
                onClose={() => setShowExport(false)}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
