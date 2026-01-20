"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertCircle, CheckCircle, Download, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIThinkingIndicator } from "@/components/ui/loading-indicator";
import { FeedbackButtons, FeedbackData } from "@/components/ui/feedback-buttons";

interface HealthReport {
  id: string;
  title: string;
  summary: string;
  htmlContent?: string | null;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    priority: "high" | "medium" | "low";
    data?: any;
  }>;
  insights: string[];
  recommendations: string[];
  charts: Array<{
    id: string;
    type: "line" | "bar" | "pie" | "area";
    title: string;
    data: any;
    config?: {
      xAxis?: string;
      yAxis?: string;
      colors?: string[];
    };
  }>;
  generatedAt: Date;
  status: "generating" | "completed" | "failed";
  shareToken?: string;
}

interface HealthReportViewerProps {
  memberId: string;
  onReportGenerated?: (report: HealthReport) => void;
}

export function HealthReportViewer({ memberId, onReportGenerated }: HealthReportViewerProps) {
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState<"weekly" | "monthly" | "quarterly">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdviceId, setCurrentAdviceId] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // 加载报告历史
  useEffect(() => {
    loadReports();
  }, [memberId]);

  const loadReports = async () => {
    try {
      const response = await fetch(`/api/ai/generate-report?memberId=${memberId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const startDate = new Date();
      const endDate = new Date();

      // 根据报告类型设置日期范围
      switch (reportType) {
      case "weekly":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "monthly":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarterly":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      }

      const response = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          reportType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          includeAIInsights: true,
        }),
      });

      if (!response.ok) {
        throw new Error("报告生成失败");
      }

      const data = await response.json();
      const newReport: HealthReport = data.report;

      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
      setCurrentAdviceId(data.adviceId || null);
      onReportGenerated?.(newReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "报告生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (report: HealthReport, format: "html" | "pdf" = "html") => {
    if (format === "html" && report.htmlContent) {
      const blob = new Blob([report.htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    if (!reportRef.current) {
      alert("未找到可导出的报告内容");
      return;
    }

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imageData = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        alert("无法打开打印窗口");
        return;
      }

      printWindow.document.write(
        `<!doctype html><html><head><title>${report.title}</title></head><body style="margin:0"><img src="${imageData}" style="width:100%" /></body></html>`
      );
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    } catch (error) {
      console.error("PDF导出失败:", error);
      alert("PDF导出失败，请稍后重试");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
    case "high":
      return "text-red-600";
    case "medium":
      return "text-yellow-600";
    case "low":
      return "text-green-600";
    default:
      return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "generating":
      return <AIThinkingIndicator size="sm" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <FileText className="h-4 w-4" />;
    }
  };

  const renderChartPreview = (chart: HealthReport["charts"][number]) => {
    const data = Array.isArray(chart.data) ? chart.data : [];
    const xKey = chart.config?.xAxis ?? "name";
    const yKey = chart.config?.yAxis ?? "value";
    const colors = chart.config?.colors ?? ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

    if (data.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center rounded bg-muted">
          <span className="text-sm text-muted-foreground">暂无图表数据</span>
        </div>
      );
    }

    switch (chart.type) {
    case "line":
      return (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke={colors[0]} />
          </LineChart>
        </ResponsiveContainer>
      );
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    case "area":
      return (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    case "pie":
      return (
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Tooltip />
            <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={60}>
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    default:
      return (
        <div className="flex h-32 items-center justify-center rounded bg-muted">
          <span className="text-sm text-muted-foreground">图表类型不支持</span>
        </div>
      );
    }
  };

  // 处理反馈
  const handleFeedback = async (feedback: FeedbackData) => {
    if (!currentAdviceId) return;

    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adviceId: currentAdviceId,
          feedbackType: "advice",
          liked: feedback.type === "positive",
          disliked: feedback.type === "negative",
          rating: feedback.type === "positive" ? 5 : feedback.type === "negative" ? 2 : 3,
          comments: feedback.comment,
          categories: ["helpfulness", "accuracy", "completeness"],
        }),
      });

      if (!response.ok) {
        console.warn("Feedback submission failed");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <AIThinkingIndicator
            size="lg"
            message="正在加载健康报告..."
            className="mx-auto w-full max-w-2xl"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 报告生成器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            生成健康报告
          </CardTitle>
          <CardDescription>根据您的健康数据生成个性化报告</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center space-x-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">报告类型</label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">周报</SelectItem>
                  <SelectItem value="monthly">月报</SelectItem>
                  <SelectItem value="quarterly">季报</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <AIThinkingIndicator size="sm" />
                    生成中...
                  </>
                ) : (
                  "生成报告"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="border-destructive/50 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 报告历史 */}
      <Card>
        <CardHeader>
          <CardTitle>报告历史</CardTitle>
          <CardDescription>查看之前生成的健康报告</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>暂无报告历史</p>
              <p className="text-sm">生成第一个健康报告开始</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedReport?.id === report.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setSelectedReport(report);
                    // 这里可能需要从报告数据中获取adviceId，或者暂时使用report.id作为fallback
                    setCurrentAdviceId((report as any).adviceId || report.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(report.status)}
                      <div>
                        <h3 className="font-medium">{report.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          生成时间：
                          {new Date(report.generatedAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {report.status === "completed" ? "已完成" : "生成中"}
                      </Badge>
                      {report.shareToken && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              `${window.location.origin}/share/report/${report.shareToken}`
                            );
                            alert("分享链接已复制到剪贴板");
                          }}
                        >
                          分享
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 报告详情 */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedReport.title}</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportReport(selectedReport, "html")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出HTML
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportReport(selectedReport, "pdf")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出PDF
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              生成时间：
              {new Date(selectedReport.generatedAt).toLocaleString("zh-CN")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div ref={reportRef} className="space-y-4">
              <Tabs defaultValue="summary">
                <TabsList>
                  <TabsTrigger value="summary">报告摘要</TabsTrigger>
                  <TabsTrigger value="insights">AI洞察</TabsTrigger>
                  <TabsTrigger value="recommendations">建议行动</TabsTrigger>
                  <TabsTrigger value="details">详细内容</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="mb-2 font-medium">报告概述</h3>
                    <p className="text-sm">{selectedReport.summary}</p>
                  </div>

                  {selectedReport.charts.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {selectedReport.charts.slice(0, 2).map((chart) => (
                        <Card key={chart.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{chart.title}</CardTitle>
                          </CardHeader>
                          <CardContent>{renderChartPreview(chart)}</CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  {selectedReport.insights.length > 0 ? (
                    <div className="space-y-3">
                      {selectedReport.insights.map((insight, index) => (
                        <Alert key={index}>
                          <Activity className="h-4 w-4" />
                          <AlertDescription>{insight}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>暂无AI洞察</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-4">
                  {selectedReport.recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {selectedReport.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start">
                          <CheckCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                          <p className="text-sm">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>暂无具体建议</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  {selectedReport.sections.map((section) => (
                    <Card key={section.id}>
                      <CardHeader>
                        <CardTitle
                          className={`flex items-center text-lg ${
                            section.priority === "high"
                              ? "text-red-600"
                              : section.priority === "medium"
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {section.title}
                          <Badge variant="outline" className="ml-2">
                            {section.priority === "high"
                              ? "重要"
                              : section.priority === "medium"
                                ? "一般"
                                : "参考"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{section.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 反馈区域 */}
      {selectedReport && selectedReport.status === "completed" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                这份健康报告对您有帮助吗？您的反馈将帮助我们改进AI分析质量。
              </p>
              <FeedbackButtons
                adviceId={currentAdviceId || undefined}
                onFeedback={handleFeedback}
                variant="detailed"
                className="justify-center"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
