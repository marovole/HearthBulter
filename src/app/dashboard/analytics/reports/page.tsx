"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReportType } from "@prisma/client";

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [filterType, setFilterType] = useState<ReportType | "ALL">("ALL");

  // 加载报告列表
  const loadReports = async () => {
    if (!selectedMember) return;

    setLoading(true);
    try {
      let url = `/api/analytics/reports?memberId=${selectedMember}`;
      if (filterType !== "ALL") {
        url += `&reportType=${filterType}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setReports(data.data.reports);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // 分享报告
  const handleShare = async (reportId: string) => {
    try {
      const response = await fetch("/api/analytics/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, expiryDays: 7 }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`分享链接已生成：\n${data.data.shareUrl}\n\n链接将在${data.data.expiryDays}天后过期`);
      }
    } catch (error) {
      console.error("Failed to generate share link:", error);
      alert("生成分享链接失败");
    }
  };

  useEffect(() => {
    if (selectedMember) {
      loadReports();
    }
  }, [selectedMember, filterType]);

  const reportTypeLabels = {
    WEEKLY: "周报",
    MONTHLY: "月报",
    QUARTERLY: "季报",
    CUSTOM: "自定义",
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return null;

    let color = "gray";
    let label = "-";

    if (score >= 90) {
      color = "green";
      label = "优秀";
    } else if (score >= 75) {
      color = "blue";
      label = "良好";
    } else if (score >= 60) {
      color = "yellow";
      label = "一般";
    } else {
      color = "red";
      label = "较差";
    }

    return (
      <span
        className={`inline-block rounded-full px-2 py-1 text-xs font-semibold bg-${color}-100 text-${color}-700`}
      >
        {score.toFixed(0)}分 · {label}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">报告中心</h1>
          <p className="text-gray-600">查看和管理健康分析报告</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/analytics/generate")}
          className="rounded-lg bg-purple-600 px-6 py-3 text-white transition-colors hover:bg-purple-700"
        >
          + 生成新报告
        </button>
      </div>

      {/* 筛选器 */}
      <div className="mb-6 flex gap-4 rounded-lg bg-white p-4 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">选择成员</label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">请选择...</option>
            {/* 这里应该从API加载家庭成员列表 */}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">报告类型</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="rounded-md border border-gray-300 px-3 py-2"
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
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
          <p className="text-blue-700">请先选择一个家庭成员查看报告</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="mb-4 text-gray-600">暂无报告记录</p>
          <button
            onClick={() => router.push("/dashboard/analytics/generate")}
            className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            生成第一份报告
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    {reportTypeLabels[report.reportType as ReportType]}
                  </span>
                  {getScoreBadge(report.overallScore)}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{report.title}</h3>
                <p className="mb-4 text-sm text-gray-600">{report.summary || "暂无摘要"}</p>
                <div className="mb-4 text-xs text-gray-500">
                  {new Date(report.startDate).toLocaleDateString("zh-CN")} 至{" "}
                  {new Date(report.endDate).toLocaleDateString("zh-CN")}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/analytics/reports/${report.id}`)}
                    className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-700"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => handleShare(report.id)}
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
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
