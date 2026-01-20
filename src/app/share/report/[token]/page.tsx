"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import DOMPurify from "dompurify";

interface ReportData {
  id: string;
  title: string;
  reportType: string;
  startDate: string;
  endDate: string;
  summary?: string;
  overallScore?: number;
  htmlContent?: string;
  member: {
    name: string;
  };
}

export default function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const response = await fetch(`/api/analytics/share/${resolvedParams.token}`);
        const data = await response.json();

        if (data.success) {
          setReport(data.data);
        } else {
          setError(data.error || "报告不存在或已过期");
        }
      } catch (err) {
        console.error("Failed to load shared report:", err);
        setError("加载报告失败");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [resolvedParams.token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <div className="mb-4 text-4xl">❌</div>
          <h2 className="mb-2 text-xl font-semibold text-red-700">无法访问报告</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部横幅 */}
      <div className="border-b border-gray-200 bg-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 font-bold text-white">
              H
            </div>
            <div>
              <div className="text-sm text-gray-500">健康管家 · 分享报告</div>
              <div className="text-lg font-semibold text-gray-900">
                {report.member.name}的健康报告
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 报告内容 */}
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* 报告元信息 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">{report.title}</h1>
              <p className="mb-4 text-gray-600">
                {formatDate(report.startDate)} 至 {formatDate(report.endDate)}
              </p>
              {report.summary && <p className="text-gray-700">{report.summary}</p>}
            </div>
            {report.overallScore && (
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">
                  {report.overallScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">综合评分</div>
              </div>
            )}
          </div>
        </div>

        {/* HTML 报告内容 */}
        {report.htmlContent && (
          <div className="rounded-lg bg-white shadow-sm">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(report.htmlContent),
              }}
            />
          </div>
        )}

        {/* 底部信息 */}
        <div className="mt-8 text-center">
          <div className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
            <h3 className="mb-2 text-lg font-semibold">想要管理您的健康数据？</h3>
            <p className="mb-4 text-purple-100">
              使用健康管家，轻松记录饮食、运动、睡眠数据，获取专业的健康分析和建议
            </p>
            <button
              onClick={() => (window.location.href = "/auth/signup")}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-purple-600 transition-colors hover:bg-gray-100"
            >
              立即注册
            </button>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <div className="mt-12 border-t border-gray-200 bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>本报告由健康管家系统生成</p>
          <p className="mt-1">此分享链接将在生成后7天内有效</p>
        </div>
      </div>
    </div>
  );
}
