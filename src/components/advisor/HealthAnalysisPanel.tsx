"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIThinkingIndicator } from "@/components/ui/loading-indicator";
import {
  FeedbackButtons,
  FeedbackData,
} from "@/components/ui/feedback-buttons";

interface HealthAnalysisResult {
  overall_score: number;
  risk_level: "low" | "medium" | "high";
  key_findings: string[];
  risk_assessment: {
    level: string;
    concerns: string[];
    urgent_actions: string[];
  };
  nutritional_recommendations: {
    macro_distribution: {
      carbs_percent: number;
      protein_percent: number;
      fat_percent: number;
    };
    daily_calories: number;
    micronutrients: string[];
  };
  lifestyle_modifications: string[];
  follow_up_suggestions: string[];
}

interface HealthAnalysisPanelProps {
  memberId: string;
  onAnalysisComplete?: (result: HealthAnalysisResult) => void;
}

export function HealthAnalysisPanel({
  memberId,
  onAnalysisComplete,
}: HealthAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<HealthAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adviceId, setAdviceId] = useState<string | null>(null);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/analyze-health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          includeRecommendations: true,
        }),
      });

      if (!response.ok) {
        throw new Error("分析请求失败");
      }

      const data = await response.json();
      setAnalysisResult(data.analysis);
      setAdviceId(data.adviceId);
      onAnalysisComplete?.(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "low":
        return "default";
      case "medium":
        return "secondary";
      case "high":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low":
        return <TrendingDown className="w-4 h-4" />;
      case "medium":
        return <Minus className="w-4 h-4" />;
      case "high":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // 处理反馈
  const handleFeedback = async (feedback: FeedbackData) => {
    if (!adviceId) return;

    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...feedback,
          adviceId,
        }),
      });

      if (!response.ok) {
        console.warn("Feedback submission failed");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  // 如果正在分析，显示全屏加载动画
  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="p-8">
          <AIThinkingIndicator
            size="lg"
            message="AI正在深度分析您的健康数据..."
            className="w-full max-w-2xl mx-auto"
          />
          <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
            <p>• 分析您的体检指标和健康记录</p>
            <p>• 评估健康风险和营养状况</p>
            <p>• 生成个性化健康建议</p>
            <p className="text-xs mt-2">预计需要10-30秒，请耐心等待</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI健康分析</CardTitle>
          <CardDescription>
            基于体检数据和健康记录，获得个性化的健康洞察和营养建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={startAnalysis}
            disabled={isAnalyzing}
            className="w-full"
          >
            开始AI健康分析
          </Button>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>• 分析过程需要10-30秒</p>
            <p>• 基于您的体检数据和饮食记录</p>
            <p>• 提供个性化健康建议和营养指导</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总体健康评分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            健康综合评分
            <Badge variant={getRiskBadgeVariant(analysisResult.risk_level)}>
              {getRiskIcon(analysisResult.risk_level)}
              {analysisResult.risk_level === "low"
                ? "低风险"
                : analysisResult.risk_level === "medium"
                  ? "中等风险"
                  : "高风险"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {analysisResult.overall_score}
            </div>
            <Progress value={analysisResult.overall_score} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              满分100分，
              {analysisResult.overall_score >= 80
                ? "健康状况良好"
                : analysisResult.overall_score >= 60
                  ? "健康状况一般"
                  : "需要关注健康状况"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 关键发现 */}
      <Card>
        <CardHeader>
          <CardTitle>关键健康发现</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysisResult.key_findings.map((finding, index) => (
              <li key={index} className="flex items-start">
                <AlertCircle className="w-4 h-4 mt-0.5 mr-2 text-blue-500" />
                <span className="text-sm">{finding}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 营养推荐 */}
      <Card>
        <CardHeader>
          <CardTitle>营养素分配建议</CardTitle>
          <CardDescription>
            每日推荐热量：
            {analysisResult.nutritional_recommendations.daily_calories} kcal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {
                  analysisResult.nutritional_recommendations.macro_distribution
                    .carbs_percent
                }
                %
              </div>
              <div className="text-sm text-muted-foreground">碳水化合物</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  analysisResult.nutritional_recommendations.macro_distribution
                    .protein_percent
                }
                %
              </div>
              <div className="text-sm text-muted-foreground">蛋白质</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {
                  analysisResult.nutritional_recommendations.macro_distribution
                    .fat_percent
                }
                %
              </div>
              <div className="text-sm text-muted-foreground">脂肪</div>
            </div>
          </div>

          {analysisResult.nutritional_recommendations.micronutrients.length >
            0 && (
            <div>
              <h4 className="font-medium mb-2">重点关注微量营养素：</h4>
              <div className="flex flex-wrap gap-2">
                {analysisResult.nutritional_recommendations.micronutrients.map(
                  (nutrient, index) => (
                    <Badge key={index} variant="outline">
                      {nutrient}
                    </Badge>
                  ),
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 生活方式建议 */}
      <Card>
        <CardHeader>
          <CardTitle>生活方式建议</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysisResult.lifestyle_modifications.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 风险提醒 */}
      {analysisResult.risk_assessment.urgent_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">
              ⚠️ 需要立即关注的健康风险
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="space-y-1 mt-2">
                  {analysisResult.risk_assessment.urgent_actions.map(
                    (action, index) => (
                      <li key={index}>• {action}</li>
                    ),
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 反馈区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              这份健康分析对您有帮助吗？您的反馈将帮助我们改进AI分析质量。
            </p>
            <FeedbackButtons
              adviceId={adviceId || undefined}
              onFeedback={handleFeedback}
              variant="detailed"
              className="justify-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* 重新分析按钮 */}
      <div className="flex justify-center">
        <Button onClick={() => setAnalysisResult(null)} variant="outline">
          重新分析
        </Button>
      </div>
    </div>
  );
}
