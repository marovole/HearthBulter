'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Code,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  FileText,
  BarChart3,
  Shield,
  Zap,
  TrendingUp
} from 'lucide-react';
import { CodeReviewInput, CodeReviewResult, CodeReviewIssue, codeReviewService } from '@/lib/services/code-review-service';
import { cn } from '@/lib/utils';

interface CodeReviewPanelProps {
  review: CodeReviewInput;
  autoReview?: boolean;
  onReviewComplete?: (result: CodeReviewResult) => void;
  onFileApproved?: (filePath: string) => void;
  onFileRejected?: (reason: string) => void;
  className?: string;
}

export function CodeReviewPanel({
  review,
  autoReview = true,
  onReviewComplete,
  onFileApproved,
  onFileRejected,
  className,
}: CodeReviewPanelProps) {
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (autoReview && review.content) {
      performReview();
    }
  }, [review, autoReview]);

  const performReview = async () => {
    setIsReviewing(true);
    try {
      const result = await codeReviewService.reviewCode(review);
      setReviewResult(result);
      onReviewComplete?.(result);
    } catch (error) {
      console.error('Code review failed:', error);
      // 这里可以显示错误状态
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApprove = () => {
    if (reviewResult?.approved) {
      onFileApproved?.(review.filePath);
    }
  };

  const handleReject = (reason: string) => {
    onFileRejected?.(reason);
  };

  const getRiskColor = (riskLevel: CodeReviewResult['riskLevel']) => {
    switch (riskLevel) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: CodeReviewIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getIssueTypeLabel = (type: CodeReviewIssue['type']) => {
    const labels = {
      complexity: '复杂度',
      security: '安全',
      typescript: 'TypeScript',
      style: '代码风格',
      performance: '性能',
      maintainability: '可维护性',
    };
    return labels[type] || type;
  };

  const getFileTypeLabel = (fileType: CodeReviewInput['fileType']) => {
    const labels = {
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      react: 'React组件',
      config: '配置文件',
      other: '其他',
    };
    return labels[fileType] || fileType;
  };

  if (isReviewing) {
    return (
      <Card className={cn('border-amber-200 bg-amber-50', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
            <span className="text-amber-800">正在审查代码...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reviewResult) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Button onClick={performReview} variant="outline">
            <Code className="w-4 h-4 mr-2" />
            开始代码审查
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(getRiskColor(reviewResult.riskLevel), className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5" />
            <span>代码审查结果</span>
            <Badge variant={reviewResult.approved ? 'default' : 'destructive'}>
              {reviewResult.approved ? '通过' : '需要改进'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Eye className="w-4 h-4 mr-1" />
            {showDetails ? '收起' : '详情'}
          </Button>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>{review.filePath} ({getFileTypeLabel(review.fileType)})</span>
          <span>审查时间: {reviewResult.metadata.reviewTimestamp.toLocaleString('zh-CN')} | 处理: {reviewResult.metadata.processingTime}ms</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 风险等级概览 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">风险等级:</span>
            <Badge className={cn('capitalize', getRiskColor(reviewResult.riskLevel))}>
              {reviewResult.riskLevel === 'critical' ? '严重' :
               reviewResult.riskLevel === 'high' ? '高' :
               reviewResult.riskLevel === 'medium' ? '中' : '低'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            发现 {reviewResult.issues.length} 个问题
          </div>
        </CardContent>

        {/* 代码指标 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white/50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xs text-muted-foreground">复杂度</div>
            <div className="font-medium">{reviewResult.metrics.complexity}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <FileText className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-xs text-muted-foreground">代码行数</div>
            <div className="font-medium">{reviewResult.metrics.linesOfCode}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-xs text-muted-foreground">安全评分</div>
            <div className="font-medium">{reviewResult.metrics.securityScore}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xs text-muted-foreground">可维护性</div>
            <div className="font-medium">{reviewResult.metrics.maintainabilityIndex}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Zap className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground">重复行</div>
            <div className="font-medium">{reviewResult.metrics.duplicateLines}</div>
          </div>
        </div>

        {/* 问题摘要 */}
        {reviewResult.issues.length > 0 && (
          <Alert className={reviewResult.approved ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  {reviewResult.approved ? '发现可改进的问题' : '发现需要解决的问题'}
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  {reviewResult.issues.slice(0, 3).map((issue, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      {getSeverityIcon(issue.severity)}
                      <span>{issue.description}</span>
                    </li>
                  ))}
                  {reviewResult.issues.length > 3 && (
                    <li className="text-muted-foreground">
                      ... 还有 {reviewResult.issues.length - 3} 个问题
                    </li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 详细问题列表 */}
        {showDetails && reviewResult.issues.length > 0 && (
          <div className="space-y-3">
            <Separator />
            <h4 className="font-medium">详细问题列表</h4>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {reviewResult.issues.map((issue, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-white/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(issue.severity)}
                        <span className="font-medium">{getIssueTypeLabel(issue.type)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {issue.severity === 'critical' ? '严重' :
                         issue.severity === 'high' ? '高' :
                         issue.severity === 'medium' ? '中' : '低'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {issue.description}
                    </p>
                    {issue.location && (
                      <div className="text-xs text-muted-foreground mb-2">
                        位置: 第 {issue.location.line} 行
                      </div>
                    )}
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700">{issue.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 建议列表 */}
        {reviewResult.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center">
              <Lightbulb className="w-4 h-4 mr-2 text-blue-500" />
              改进建议
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {reviewResult.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-2 pt-4">
          {reviewResult.approved ? (
            <Button onClick={handleApprove} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              确认通过
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleApprove}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                强制通过
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject('代码审查未通过')}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                拒绝提交
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 快速审查组件
interface QuickCodeReviewProps {
  content: string;
  filePath: string;
  fileType?: CodeReviewInput['fileType'];
  onResult?: (approved: boolean, issues: CodeReviewIssue[]) => void;
  className?: string;
}

export function QuickCodeReview({
  content,
  filePath,
  fileType = 'typescript',
  onResult,
  className,
}: QuickCodeReviewProps) {
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (content) {
      performQuickReview();
    }
  }, [content]);

  const performQuickReview = async () => {
    setIsLoading(true);
    try {
      const review: CodeReviewInput = {
        content,
        filePath,
        fileType,
      };

      const reviewResult = await codeReviewService.reviewCode(review);
      setResult(reviewResult);
      onResult?.(reviewResult.approved, reviewResult.issues);
    } catch (error) {
      console.error('Quick code review failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center space-x-2 text-sm text-muted-foreground', className)}>
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>审查中...</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {result.approved ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-orange-500" />
      )}
      <span className="text-sm">
        {result.approved ? '审查通过' : `${result.issues.length} 个问题`}
      </span>
    </div>
  );
}
