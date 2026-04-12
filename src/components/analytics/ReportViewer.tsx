"use client";

import { useState } from "react";
import { ReportType } from "@/types/enums";
import DOMPurify from "isomorphic-dompurify";

interface Report {
  id: string;
  reportType: ReportType;
  startDate: Date | string;
  endDate: Date | string;
  title: string;
  summary?: string;
  overallScore?: number;
  htmlContent?: string;
  createdAt: Date | string;
}

interface ReportViewerProps {
  report: Report;
  onShare?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
}

const reportTypeLabels = {
  WEEKLY: "周报",
  MONTHLY: "月报",
  QUARTERLY: "季报",
  CUSTOM: "自定义报告",
};

export default function ReportViewer({ report, onShare, onDelete }: ReportViewerProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-gray-500";
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      {/* 报告头部 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-sm">
              {reportTypeLabels[report.reportType]}
            </div>
            <h2 className="mb-2 text-2xl font-bold">{report.title}</h2>
            <p className="text-purple-100">
              {formatDate(report.startDate)} 至 {formatDate(report.endDate)}
            </p>
          </div>
          {report.overallScore && (
            <div className="text-center">
              <div className="text-4xl font-bold">{report.overallScore.toFixed(1)}</div>
              <div className="text-sm text-purple-100">综合评分</div>
            </div>
          )}
        </div>
      </div>

      {/* 报告摘要 */}
      {report.summary && (
        <div className="border-b border-gray-200 p-6">
          <p className="text-gray-700">{report.summary}</p>
        </div>
      )}

      {/* 报告内容 */}
      {report.htmlContent && (
        <div
          className="prose max-w-none p-6"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(report.htmlContent),
          }}
        />
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-4">
        <div className="text-sm text-gray-500">生成时间：{formatDate(report.createdAt)}</div>
        <div className="flex gap-2">
          {onShare && (
            <button
              onClick={() => onShare(report.id)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
            >
              分享报告
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm("确定要删除这份报告吗？")) {
                  onDelete(report.id);
                }
              }}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
