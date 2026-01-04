'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OcrResult } from '@/components/reports/OcrResult';
import { CorrectionForm } from '@/components/reports/CorrectionForm';
import type { MedicalReport, MedicalIndicator } from '@prisma/client';

interface ReportWithIndicators extends MedicalReport {
  indicators: MedicalIndicator[];
}

interface ReportDetailPageProps {
  params: Promise<{
    id: string;
    memberId: string;
    reportId: string;
  }>;
}

export default function ReportDetailPage({
  params: paramsPromise,
}: ReportDetailPageProps) {
  const router = useRouter();
  const [params, setParams] = useState<{
    id: string;
    memberId: string;
    reportId: string;
  } | null>(null);
  const [report, setReport] = useState<ReportWithIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string>('成员');
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  useEffect(() => {
    paramsPromise.then(setParams);
  }, [paramsPromise]);

  useEffect(() => {
    if (params) {
      fetchReport();
      fetchMemberName();
    }
  }, [params]);

  const fetchMemberName = async () => {
    if (!params) return;

    try {
      const response = await fetch(
        `/api/families/${params.id}/members/${params.memberId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMemberName(data.member?.name || '成员');
      }
    } catch (err) {
      // 忽略错误，使用默认值
    }
  };

  const fetchReport = async () => {
    if (!params) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/members/${params.memberId}/reports/${params.reportId}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '获取报告失败');
      }

      const data = await response.json();
      setReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!params || !confirm('确定要删除这份报告吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/members/${params.memberId}/reports/${params.reportId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除失败');
      }

      // 导航回列表页
      router.push(
        `/dashboard/families/${params.id}/members/${params.memberId}/reports`,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleCompare = () => {
    if (!params) return;
    router.push(
      `/dashboard/families/${params.id}/members/${params.memberId}/reports/${params.reportId}/compare`,
    );
  };

  const handleCorrectionSuccess = () => {
    setShowCorrectionForm(false);
    fetchReport(); // 刷新数据
  };

  if (loading && !report) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4' />
          <div className='text-gray-600'>加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !report || !params) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
          <div className='px-4 py-6 sm:px-0'>
            <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
              <p className='text-red-800'>{error || '报告不存在'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
        <div className='px-4 py-6 sm:px-0'>
          {/* 面包屑导航 */}
          <nav className='mb-6'>
            <div className='flex items-center space-x-2 text-sm text-gray-600'>
              <Link
                href={`/dashboard/families/${params.id}`}
                className='hover:text-gray-900'
              >
                家庭
              </Link>
              <span>/</span>
              <Link
                href={`/dashboard/families/${params.id}/members/${params.memberId}`}
                className='hover:text-gray-900'
              >
                {memberName}
              </Link>
              <span>/</span>
              <Link
                href={`/dashboard/families/${params.id}/members/${params.memberId}/reports`}
                className='hover:text-gray-900'
              >
                体检报告
              </Link>
              <span>/</span>
              <span className='text-gray-900'>详情</span>
            </div>
          </nav>

          {/* 标题和操作 */}
          <div className='mb-6 flex items-center justify-between'>
            <h1 className='text-2xl font-bold text-gray-900'>报告详情</h1>
            <div className='flex gap-2'>
              {report.ocrStatus === 'COMPLETED' &&
                report.indicators.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowCorrectionForm(!showCorrectionForm)}
                      className='px-4 py-2 text-blue-700 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 transition-colors'
                    >
                      {showCorrectionForm ? '取消修正' : '手动修正'}
                    </button>
                    <button
                      onClick={handleCompare}
                      className='px-4 py-2 text-green-700 bg-green-50 rounded-lg font-medium hover:bg-green-100 transition-colors'
                    >
                      历史对比
                    </button>
                  </>
                )}
              <button
                onClick={handleDelete}
                className='px-4 py-2 text-red-700 bg-red-50 rounded-lg font-medium hover:bg-red-100 transition-colors'
              >
                删除
              </button>
            </div>
          </div>

          {/* OCR结果 */}
          <div className='mb-6'>
            <OcrResult reportId={params.reportId} memberId={params.memberId} />
          </div>

          {/* 手动修正表单 */}
          {showCorrectionForm && report.ocrStatus === 'COMPLETED' && (
            <div className='mb-6'>
              <div className='bg-white border rounded-lg p-6'>
                <h2 className='text-xl font-bold text-gray-900 mb-4'>
                  手动修正指标
                </h2>
                <CorrectionForm
                  reportId={params.reportId}
                  memberId={params.memberId}
                  indicators={report.indicators}
                  onSuccess={handleCorrectionSuccess}
                  onCancel={() => setShowCorrectionForm(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
