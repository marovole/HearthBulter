'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { AIThinkingIndicator } from '@/components/ui/loading-indicator';
import { FeedbackButtons, FeedbackData } from '@/components/ui/feedback-buttons';

interface HealthReport {
  id: string;
  title: string;
  summary: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
    data?: any;
  }>;
  insights: string[];
  recommendations: string[];
  charts: Array<{
    id: string;
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any;
    config?: {
      xAxis?: string;
      yAxis?: string;
      colors?: string[];
    };
  }>;
  generatedAt: Date;
  status: 'generating' | 'completed' | 'failed';
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
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdviceId, setCurrentAdviceId] = useState<string | null>(null);

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
      console.error('Failed to load reports:', err);
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
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarterly':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
      }

      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error('报告生成失败');
      }

      const data = await response.json();
      const newReport: HealthReport = data.report;

      setReports(prev => [newReport, ...prev]);
      setSelectedReport(newReport);
      setCurrentAdviceId(data.adviceId || null);
      onReportGenerated?.(newReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : '报告生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (report: HealthReport, format: 'html' | 'pdf' = 'html') => {
    if (format === 'html' && report.htmlContent) {
      // 创建下载链接
      const blob = new Blob([report.htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // PDF导出（需要在后端实现）
      alert('PDF导出功能正在开发中，请使用HTML导出');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'generating': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // 处理反馈
  const handleFeedback = async (feedback: FeedbackData) => {
    if (!currentAdviceId) return;

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adviceId: currentAdviceId,
          feedbackType: 'advice',
          liked: feedback.type === 'positive',
          disliked: feedback.type === 'negative',
          rating: feedback.type === 'positive' ? 5 : feedback.type === 'negative' ? 2 : 3,
          comments: feedback.comment,
          categories: ['helpfulness', 'accuracy', 'completeness'],
        }),
      });

      if (!response.ok) {
        console.warn('Feedback submission failed');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <AIThinkingIndicator
            size="lg"
            message="正在加载健康报告..."
            className="w-full max-w-2xl mx-auto"
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
            <FileText className="w-5 h-5 mr-2" />
            生成健康报告
          </CardTitle>
          <CardDescription>
            根据您的健康数据生成个性化报告
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">报告类型</label>
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
              <Button
                onClick={generateReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  '生成报告'
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
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
          <CardDescription>
            查看之前生成的健康报告
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无报告历史</p>
              <p className="text-sm">生成第一个健康报告开始</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedReport?.id === report.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
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
                          生成时间：{new Date(report.generatedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{report.status === 'completed' ? '已完成' : '生成中'}</Badge>
                      {report.shareToken && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/share/report/${report.shareToken}`);
                            alert('分享链接已复制到剪贴板');
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
                  onClick={() => exportReport(selectedReport, 'html')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出HTML
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              生成时间：{new Date(selectedReport.generatedAt).toLocaleString('zh-CN')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">报告摘要</TabsTrigger>
                <TabsTrigger value="insights">AI洞察</TabsTrigger>
                <TabsTrigger value="recommendations">建议行动</TabsTrigger>
                <TabsTrigger value="details">详细内容</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">报告概述</h3>
                  <p className="text-sm">{selectedReport.summary}</p>
                </div>

                {/* 图表预览 */}
                {selectedReport.charts.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedReport.charts.slice(0, 2).map((chart) => (
                      <Card key={chart.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{chart.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-32 bg-muted rounded flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">
                              图表预览（开发中）
                            </span>
                          </div>
                        </CardContent>
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
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无AI洞察</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                {selectedReport.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {selectedReport.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无具体建议</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {selectedReport.sections.map((section) => (
                  <Card key={section.id}>
                    <CardHeader>
                      <CardTitle className={`text-lg flex items-center ${
                        section.priority === 'high' ? 'text-red-600' :
                        section.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {section.title}
                        <Badge variant="outline" className="ml-2">
                          {section.priority === 'high' ? '重要' :
                           section.priority === 'medium' ? '一般' : '参考'}
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
          </CardContent>
        </Card>
      )}

      {/* 反馈区域 */}
      {selectedReport && selectedReport.status === 'completed' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
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
