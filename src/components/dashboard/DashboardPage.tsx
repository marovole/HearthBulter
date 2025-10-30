'use client'

import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { TrendsSection } from '@/components/dashboard/TrendsSection'
import { InsightsPanel } from '@/components/dashboard/InsightsPanel'

interface HealthDashboardPageProps {
  memberId: string
}

export function HealthDashboardPage({ memberId }: HealthDashboardPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              健康追踪仪表盘
            </h1>
            <p className="text-gray-600">
              查看您的健康数据趋势、营养分析和目标进度
            </p>
          </div>

          {/* 概览卡片 */}
          <div className="mb-6">
            <OverviewCards memberId={memberId} />
          </div>

          {/* 趋势图表 */}
          <div className="mb-6">
            <TrendsSection memberId={memberId} />
          </div>

          {/* 洞察面板 */}
          <div>
            <InsightsPanel memberId={memberId} />
          </div>
        </div>
      </div>
    </div>
  )
}

