'use client'


import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ReportType } from '@prisma/client';

export default function ReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [filterType, setFilterType] = useState<ReportType | 'ALL'>('ALL');

  // 加载报告列表
  const loadReports = async () => {
    if (!selectedMember) return;

    setLoading(true);
    try {
      let url = `/api/analytics/reports?memberId=${selectedMember}`;
      if (filterType !== 'ALL') {
        url += `&reportType=${filterType}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setReports(data.data.reports);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // 分享报告
  const handleShare = async (reportId: string) => {
    try {
      const response = await fetch('/api/analytics/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, expiryDays: 7 }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`分享链接已生成：\n${data.data.shareUrl}\n\n链接将在${data.data.expiryDays}天后过期`);
      }
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('生成分享链接失败');
    }
  };

  // 删除报告
  const handleDelete = async (reportId: string) => {
    if (!confirm('确定要删除这份报告吗？')) return;

    try {
      const response = await fetch(`/api/analytics/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 重新加载列表
        await loadReports();
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('删除报告失败');
    }
  };

  useEffect(() => {
    if (selectedMember) {
      loadReports();
    }
  }, [selectedMember, filterType]);

  const reportTypeLabels = {
    WEEKLY: '周报',
    MONTHLY: '月报',
    QUARTERLY: '季报',
    CUSTOM: '自定义',
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return null;

    let color = 'gray';
    let label = '-';

    if (score >= 90) {
      color = 'green';
      label = '优秀';
    } else if (score >= 75) {
      color = 'blue';
      label = '良好';
    } else if (score >= 60) {
      color = 'yellow';
      label = '一般';
    } else {
      color = 'red';
      label = '较差';
    }

    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-700`}>
        {score.toFixed(0)}分 · {label}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">报告中心</h1>
          <p className="text-gray-600">查看和管理健康分析报告</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/analytics/generate')}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          + 生成新报告
        </button>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择成员
          </label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">请选择...</option>
            {/* 这里应该从API加载家庭成员列表 */}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            报告类型
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="ALL">全部</option>
            <option value="WEEKLY">周报</option>
            <option value="MONTHLY">月报</option>
            <option value="QUARTERLY">季报</option>
            <option value="CUSTOM">自定义</option>
          </select>
        </div>
      </div>

      {/* 报告列表 */}
      {!selectedMember ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-700">请先选择一个家庭成员查看报告</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">暂无报告记录</p>
          <button
            onClick={() => router.push('/dashboard/analytics/generate')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            生成第一份报告
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    {reportTypeLabels[report.reportType as ReportType]}
                  </span>
                  {getScoreBadge(report.overallScore)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {report.summary || '暂无摘要'}
                </p>
                <div className="text-xs text-gray-500 mb-4">
                  {new Date(report.startDate).toLocaleDateString('zh-CN')} 至{' '}
                  {new Date(report.endDate).toLocaleDateString('zh-CN')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/analytics/reports/${report.id}`)}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => handleShare(report.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    分享
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

