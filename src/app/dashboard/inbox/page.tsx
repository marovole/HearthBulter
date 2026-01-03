'use client';

// Force dynamic rendering to prevent prerender errors with React Context
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ButlerInbox } from '@/components/butler/ButlerInbox';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

/**
 * Butler Inbox Page Component
 *
 * 管家收件箱页面 - 统一的任务管理入口
 * 显示今日焦点任务、普通任务、每日复盘等功能
 *
 * Route: /dashboard/inbox
 */
export default function ButlerInboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取用户的家庭成员信息和家庭ID
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    const fetchMemberInfo = async () => {
      try {
        setLoading(true);

        // 获取用户的家庭成员信息
        const memberResponse = await fetch('/api/members/my');
        if (!memberResponse.ok) {
          throw new Error('Failed to fetch member info');
        }

        const memberData = await memberResponse.json();

        if (memberData.success && memberData.data) {
          setMemberId(memberData.data.id);
          setFamilyId(memberData.data.familyId);
        }
      } catch (error) {
        console.error('Error fetching member info:', error);
        // 如果获取失败，可以显示错误或重定向
      } finally {
        setLoading(false);
      }
    };

    fetchMemberInfo();
  }, [session, status]);

  // 重定向未认证用户到登录页面
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // 显示加载状态
  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className='min-h-[60vh] flex items-center justify-center'>
          <div className='flex flex-col items-center gap-4'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary' />
            <p className='text-sm text-muted-foreground'>正在加载收件箱...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 需要 memberId 和 familyId 才能加载收件箱
  if (!memberId || !familyId) {
    return (
      <DashboardLayout>
        <div className='min-h-[60vh] flex items-center justify-center'>
          <div className='text-center space-y-4'>
            <div className='text-6xl'>📭</div>
            <h2 className='text-2xl font-bold'>无法加载收件箱</h2>
            <p className='text-muted-foreground'>请先创建家庭并添加成员</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ButlerInbox memberId={memberId} familyId={familyId} />
    </DashboardLayout>
  );
}
