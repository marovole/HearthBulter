'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { HealthDataForm } from '@/components/health/HealthDataForm';
import { useRouter } from 'next/navigation';

interface AddHealthDataPageProps {
  userId: string;
}

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  email?: string;
  healthScore?: number;
  lastActive?: Date;
}

export function AddHealthDataPage({ userId }: AddHealthDataPageProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const handleDataAdded = () => {
    // 数据添加成功后返回健康数据主页
    router.push('/health-data');
  };

  const handleCancel = () => {
    router.push('/health-data');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      currentMember={selectedMemberId || undefined}
      familyMembers={familyMembers}
    >
      <div className='max-w-4xl mx-auto'>
        {!selectedMemberId ? (
          <div className='text-center py-12'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              选择家庭成员
            </h3>
            <p className='text-gray-600'>
              请从左侧选择一个家庭成员开始录入健康数据
            </p>
          </div>
        ) : (
          <div className='space-y-6'>
            {/* 页面标题 */}
            <div className='bg-white p-6 rounded-lg shadow'>
              <div className='flex items-center space-x-4 mb-6'>
                <div className='h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center'>
                  <span className='text-lg font-semibold text-blue-600'>
                    {familyMembers
                      .find((m) => m.id === selectedMemberId)
                      ?.name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className='text-2xl font-bold text-gray-900'>
                    录入健康数据
                  </h1>
                  <p className='text-gray-500'>
                    为{' '}
                    {familyMembers.find((m) => m.id === selectedMemberId)?.name}{' '}
                    录入健康指标
                  </p>
                </div>
              </div>

              <HealthDataForm
                memberId={selectedMemberId}
                onSuccess={handleDataAdded}
                onCancel={handleCancel}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
