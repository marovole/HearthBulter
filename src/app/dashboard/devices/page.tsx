'use client';

// Force dynamic rendering to prevent prerender errors with React Context
export const dynamic = 'force-dynamic';

/**
 * 设备管理页面
 */

import { Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeviceConnection } from '@/components/features/devices/DeviceConnection';
import { SyncStatus } from '@/components/features/devices/SyncStatus';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function DevicesPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="设备管理"
        description="连接和管理您的可穿戴设备，自动同步健康数据"
        breadcrumbs={[
          { label: '控制台', href: '/dashboard' },
          { label: '设备管理' },
        ]}
      />

      <div className="container mx-auto py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="connection">设备连接</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-[400px]" />}>
              <DeviceOverview />
            </Suspense>
          </TabsContent>

          <TabsContent value="connection" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-[600px]" />}>
              <DeviceManagement />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// 设备概览组件
function DeviceOverview() {
  return (
    <div className="space-y-6">
      <SyncStatus 
        devices={[]} // 这里应该从API获取设备列表
        onSyncDevice={(deviceId) => {
          console.log('同步设备:', deviceId);
        }}
        onSyncAll={() => {
          console.log('同步所有设备');
        }}
      />
    </div>
  );
}

// 设备管理组件
function DeviceManagement() {
  return (
    <div className="space-y-6">
      <DeviceConnection 
        member={{
          id: 'current-member',
          name: '当前用户',
        }}
        onDeviceConnected={(device) => {
          console.log('设备已连接:', device);
        }}
        onDeviceDisconnected={(deviceId) => {
          console.log('设备已断开:', deviceId);
        }}
      />
    </div>
  );
}
