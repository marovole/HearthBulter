'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { MedicalReport, MedicalIndicator } from '@prisma/client';

interface ReportListProps {
  memberId: string;
  familyId?: string;
  onReportSelect?: (reportId: string) => void;
}

interface ReportWithIndicators extends MedicalReport {
  indicators: MedicalIndicator[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
  FAILED: '失败',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export function ReportList({
  memberId,
  familyId,
  onReportSelect,
}: ReportListProps) {
  const router = useRouter();
  const [reports, setReports] = useState<ReportWithIndicators[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all'); // all, completed, failed, processing

  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = new URL(
        `/api/members/${memberId}/reports`,
        window.location.origin,
      );
      if (filter !== 'all') {
        url.searchParams.set('status', filter.toUpperCase());
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '加载失败');
        setLoading(false);
        return;
      }

      setReports(data.data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [memberId, filter]);

  const handleReportClick = (reportId: string) => {
    if (onReportSelect) {
      onReportSelect(reportId);
    } else {
      // 如果没有提供onReportSelect，使用默认路径
      const path = familyId
        ? `/dashboard/families/${familyId}/members/${memberId}/reports/${reportId}`
        : `/dashboard/families/${memberId}/reports/${reportId}`;
      router.push(path);
    }
  };

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('确定要删除这份报告吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/members/${memberId}/reports/${reportId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || '删除失败');
        return;
      }

      // 重新加载列表
      fetchReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4' />
          <p className='text-sm text-gray-600'>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-4 bg-red-50 border border-red-200 rounded-md'>
        <p className='text-sm text-red-800'>{error}</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 筛选器 */}
      <div className='flex items-center space-x-2'>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          已完成
        </button>
        <button
          onClick={() => setFilter('processing')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'processing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          处理中
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'failed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          失败
        </button>
      </div>

      {/* 报告列表 */}
      {reports.length === 0 ? (
        <div className='p-8 text-center text-gray-500'>
          <p>暂无报告</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {reports.map((report) => {
            const abnormalCount = report.indicators.filter(
              (ind) => ind.isAbnormal,
            ).length;

            return (
              <div
                key={report.id}
                onClick={() => handleReportClick(report.id)}
                className='bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-3 mb-2'>
                      <h3 className='font-medium text-gray-900'>
                        {report.fileName}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          STATUS_COLORS[report.ocrStatus]
                        }`}
                      >
                        {STATUS_LABELS[report.ocrStatus]}
                      </span>
                    </div>

                    <div className='flex items-center space-x-4 text-sm text-gray-600'>
                      {report.reportDate && (
                        <span>
                          报告日期:{' '}
                          {new Date(report.reportDate).toLocaleDateString(
                            'zh-CN',
                          )}
                        </span>
                      )}
                      {report.institution && (
                        <span>机构: {report.institution}</span>
                      )}
                      {report.ocrStatus === 'COMPLETED' && (
                        <span>
                          识别到 {report.indicators.length} 项指标
                          {abnormalCount > 0 && (
                            <span className='text-red-600 ml-1'>
                              （{abnormalCount} 项异常）
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className='mt-2 text-xs text-gray-500'>
                      上传时间:{' '}
                      {new Date(report.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <button
                      onClick={(e) => handleDelete(report.id, e)}
                      className='p-2 text-gray-400 hover:text-red-600 transition-colors'
                      title='删除报告'
                    >
                      <svg
                        className='h-5 w-5'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                        />
                      </svg>
                    </button>
                    <svg
                      className='h-5 w-5 text-gray-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 5l7 7-7 7'
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
