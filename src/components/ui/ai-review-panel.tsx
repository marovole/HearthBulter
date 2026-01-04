'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Eye,
  RefreshCw,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import {
  AIContentReview,
  ReviewResult,
  ReviewIssue,
  aiReviewService,
  fixAIContent,
} from '@/lib/services/ai-review-service';
import { cn } from '@/lib/utils';

interface AIReviewPanelProps {
  review: AIContentReview;
  autoReview?: boolean;
  onReviewComplete?: (result: ReviewResult) => void;
  onContentApproved?: (content: string) => void;
  onContentRejected?: (reason: string) => void;
  className?: string;
}

export function AIReviewPanel({
  review,
  autoReview = true,
  onReviewComplete,
  onContentApproved,
  onContentRejected,
  className,
}: AIReviewPanelProps) {
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [fixedContent, setFixedContent] = useState('');
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    if (autoReview && review.content) {
      performReview();
    }
  }, [review, autoReview]);

  const performReview = async () => {
    setIsReviewing(true);
    try {
      const result = await aiReviewService.reviewContent(review);
      setReviewResult(result);
      onReviewComplete?.(result);
    } catch (error) {
      console.error('Review failed:', error);
      // 这里可以显示错误状态
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApprove = () => {
    if (reviewResult?.approved) {
      onContentApproved?.(review.content);
    }
  };

  const handleReject = (reason: string) => {
    onContentRejected?.(reason);
  };

  const handleFixIssues = async () => {
    if (!reviewResult) return;

    setIsFixing(true);
    try {
      const fixed = await fixAIContent(review.content, reviewResult.issues);
      setFixedContent(fixed);
      setShowFixDialog(true);
    } catch (error) {
      console.error('Failed to fix content:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const handleApplyFix = () => {
    if (fixedContent) {
      onContentApproved?.(fixedContent);
      setShowFixDialog(false);
    }
  };

  const getRiskColor = (riskLevel: ReviewResult['riskLevel']) => {
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

  const getSeverityIcon = (severity: ReviewIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className='w-4 h-4 text-red-500' />;
      case 'high':
        return <AlertTriangle className='w-4 h-4 text-orange-500' />;
      case 'medium':
        return <AlertCircle className='w-4 h-4 text-yellow-500' />;
      case 'low':
        return <CheckCircle className='w-4 h-4 text-green-500' />;
    }
  };

  const getIssueTypeLabel = (type: ReviewIssue['type']) => {
    const labels = {
      medical_claim: '医疗声明',
      extreme_advice: '极端建议',
      incomplete_info: '信息不全',
      contradictory: '矛盾信息',
      sensitive_topic: '敏感话题',
      uncertainty: '不确定性',
      commercial_bias: '商业偏见',
    };
    return labels[type] || type;
  };

  if (isReviewing) {
    return (
      <Card className={cn('border-amber-200 bg-amber-50', className)}>
        <CardContent className='flex items-center justify-center py-8'>
          <div className='flex items-center space-x-3'>
            <RefreshCw className='w-5 h-5 animate-spin text-amber-600' />
            <span className='text-amber-800'>正在审核AI内容...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reviewResult) {
    return (
      <Card className={className}>
        <CardContent className='flex items-center justify-center py-8'>
          <Button onClick={performReview} variant='outline'>
            <Shield className='w-4 h-4 mr-2' />
            开始内容审核
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(getRiskColor(reviewResult.riskLevel), className)}>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Shield className='w-5 h-5' />
              <span>AI内容审核结果</span>
              <Badge
                variant={reviewResult.approved ? 'default' : 'destructive'}
              >
                {reviewResult.approved ? '通过' : '需要审核'}
              </Badge>
            </div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowDetails(!showDetails)}
            >
              <Eye className='w-4 h-4 mr-1' />
              {showDetails ? '收起' : '详情'}
            </Button>
          </CardTitle>
          <CardDescription>
            审核时间:{' '}
            {reviewResult.metadata.reviewTimestamp.toLocaleString('zh-CN')} |
            处理时间: {reviewResult.metadata.processingTime}ms
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-4'>
          {/* 风险等级概览 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <span className='text-sm font-medium'>风险等级:</span>
              <Badge
                className={cn(
                  'capitalize',
                  getRiskColor(reviewResult.riskLevel),
                )}
              >
                {reviewResult.riskLevel === 'critical'
                  ? '严重'
                  : reviewResult.riskLevel === 'high'
                    ? '高'
                    : reviewResult.riskLevel === 'medium'
                      ? '中'
                      : '低'}
              </Badge>
            </div>
            <div className='text-sm text-muted-foreground'>
              发现 {reviewResult.issues.length} 个问题
            </div>
          </div>

          {/* 问题摘要 */}
          {reviewResult.issues.length > 0 && (
            <Alert
              className={
                reviewResult.approved
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-red-200 bg-red-50'
              }
            >
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <div className='space-y-2'>
                  <p className='font-medium'>
                    {reviewResult.approved
                      ? '发现可改进的问题'
                      : '发现需要解决的问题'}
                  </p>
                  <ul className='text-sm space-y-1 ml-4'>
                    {reviewResult.issues.slice(0, 3).map((issue, index) => (
                      <li key={index} className='flex items-start space-x-2'>
                        {getSeverityIcon(issue.severity)}
                        <span>{issue.description}</span>
                      </li>
                    ))}
                    {reviewResult.issues.length > 3 && (
                      <li className='text-muted-foreground'>
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
            <div className='space-y-3'>
              <Separator />
              <h4 className='font-medium'>详细问题列表</h4>
              <ScrollArea className='max-h-60'>
                <div className='space-y-2'>
                  {reviewResult.issues.map((issue, index) => (
                    <div
                      key={index}
                      className='p-3 border rounded-lg bg-white/50'
                    >
                      <div className='flex items-start justify-between mb-2'>
                        <div className='flex items-center space-x-2'>
                          {getSeverityIcon(issue.severity)}
                          <span className='font-medium'>
                            {getIssueTypeLabel(issue.type)}
                          </span>
                        </div>
                        <Badge variant='outline' className='text-xs'>
                          {issue.severity === 'critical'
                            ? '严重'
                            : issue.severity === 'high'
                              ? '高'
                              : issue.severity === 'medium'
                                ? '中'
                                : '低'}
                        </Badge>
                      </div>
                      <p className='text-sm text-muted-foreground mb-2'>
                        {issue.description}
                      </p>
                      <div className='flex items-start space-x-2'>
                        <Lightbulb className='w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0' />
                        <p className='text-sm text-blue-700'>
                          {issue.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* 建议列表 */}
          {reviewResult.suggestions.length > 0 && (
            <div className='space-y-2'>
              <h4 className='font-medium flex items-center'>
                <Lightbulb className='w-4 h-4 mr-2 text-blue-500' />
                改进建议
              </h4>
              <ul className='text-sm space-y-1 text-muted-foreground'>
                {reviewResult.suggestions.map((suggestion, index) => (
                  <li key={index} className='flex items-start space-x-2'>
                    <span className='text-blue-500'>•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 操作按钮 */}
          <div className='flex space-x-2 pt-4'>
            {reviewResult.approved ? (
              <>
                <Button onClick={handleApprove} className='flex-1'>
                  <CheckCircle className='w-4 h-4 mr-2' />
                  确认发布
                </Button>
                {reviewResult.issues.length > 0 && (
                  <Button
                    variant='outline'
                    onClick={handleFixIssues}
                    disabled={isFixing}
                  >
                    <Edit className='w-4 h-4 mr-2' />
                    {isFixing ? '修复中...' : '自动修复'}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant='outline'
                  onClick={handleFixIssues}
                  disabled={isFixing}
                  className='flex-1'
                >
                  <Edit className='w-4 h-4 mr-2' />
                  {isFixing ? '修复中...' : '尝试修复'}
                </Button>
                <Button
                  variant='destructive'
                  onClick={() => handleReject('审核未通过')}
                  className='flex-1'
                >
                  <XCircle className='w-4 h-4 mr-2' />
                  拒绝发布
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 修复内容对话框 */}
      <Dialog open={showFixDialog} onOpenChange={setShowFixDialog}>
        <DialogContent className='max-w-4xl max-h-[80vh]'>
          <DialogHeader>
            <DialogTitle>自动修复内容</DialogTitle>
            <DialogDescription>
              AI已尝试自动修复发现的问题，请检查修复结果
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-2 gap-4 h-96'>
            <div className='space-y-2'>
              <h4 className='font-medium text-sm'>原始内容</h4>
              <ScrollArea className='h-full'>
                <div className='text-sm p-3 border rounded bg-muted/50 whitespace-pre-wrap'>
                  {review.content}
                </div>
              </ScrollArea>
            </div>

            <div className='space-y-2'>
              <h4 className='font-medium text-sm'>修复后内容</h4>
              <ScrollArea className='h-full'>
                <Textarea
                  value={fixedContent}
                  onChange={(e) => setFixedContent(e.target.value)}
                  className='h-full resize-none'
                  placeholder='修复后的内容...'
                />
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowFixDialog(false)}>
              取消
            </Button>
            <Button onClick={handleApplyFix}>应用修复</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 快速审核组件
interface QuickAIReviewProps {
  content: string;
  contentType?: AIContentReview['contentType'];
  userId: string;
  onResult?: (approved: boolean, issues: ReviewIssue[]) => void;
  className?: string;
}

export function QuickAIReview({
  content,
  contentType = 'general_response',
  userId,
  onResult,
  className,
}: QuickAIReviewProps) {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (content) {
      performQuickReview();
    }
  }, [content]);

  const performQuickReview = async () => {
    setIsLoading(true);
    try {
      const review: AIContentReview = {
        content,
        contentType,
        userId,
      };

      const reviewResult = await aiReviewService.reviewContent(review);
      setResult(reviewResult);
      onResult?.(reviewResult.approved, reviewResult.issues);
    } catch (error) {
      console.error('Quick review failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center space-x-2 text-sm text-muted-foreground',
          className,
        )}
      >
        <RefreshCw className='w-3 h-3 animate-spin' />
        <span>审核中...</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {result.approved ? (
        <CheckCircle className='w-4 h-4 text-green-500' />
      ) : (
        <AlertTriangle className='w-4 h-4 text-orange-500' />
      )}
      <span className='text-sm'>
        {result.approved ? '审核通过' : `${result.issues.length} 个问题`}
      </span>
    </div>
  );
}
