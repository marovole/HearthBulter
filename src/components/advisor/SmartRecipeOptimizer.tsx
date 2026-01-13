// @ts-nocheck
// @ts-nocheck
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertTriangle, Lightbulb, ChefHat } from "lucide-react";
import { AIThinkingIndicator } from "@/components/ui/loading-indicator";
import {
  FeedbackButtons,
  FeedbackData,
} from "@/components/ui/feedback-buttons";

interface RecipeData {
  id: string;
  name: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface OptimizationResult {
  analysis: {
    nutrition_score: number;
    gap_analysis: {
      calories_gap: number;
      protein_gap: number;
      carbs_gap: number;
      fat_gap: number;
      micronutrient_gaps: string[];
    };
    strengths: string[];
    weaknesses: string[];
  };
  optimizations: {
    ingredient_substitutions: Array<{
      original_ingredient: string;
      substitute_ingredient: string;
      reason: string;
      nutritional_impact: {
        similar_nutrients: string[];
        improved_aspects: string[];
        potential_drawbacks: string[];
      };
      availability_score: number;
      cost_difference: "cheaper" | "similar" | "expensive";
    }>;
    portion_adjustments: Array<{
      ingredient: string;
      current_amount: number;
      recommended_amount: number;
      unit: string;
      reason: string;
      nutritional_impact: string;
    }>;
    cooking_method_suggestions: string[];
    seasonal_alternatives: Array<{
      original: string;
      seasonal_alternative: string;
      season: string;
      nutritional_comparison: string;
      reason: string;
    }>;
  };
  improved_recipe: {
    name: string;
    ingredients: Array<{
      name: string;
      amount: number;
      unit: string;
      nutritional_value?: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }>;
    instructions: string[];
    nutrition_facts: {
      serving_size: string;
      calories: number;
      macronutrients: {
        protein: { amount: number; unit: string; daily_value?: number };
        carbohydrates: { amount: number; unit: string; daily_value?: number };
        fat: { amount: number; unit: string; daily_value?: number };
        fiber: { amount: number; unit: string; daily_value?: number };
        sugar: { amount: number; unit: string; daily_value?: number };
      };
      micronutrients: Array<{
        name: string;
        amount: number;
        unit: string;
        daily_value?: number;
      }>;
    };
  };
}

interface SmartRecipeOptimizerProps {
  recipe: RecipeData;
  memberId: string;
  targetNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onOptimizationComplete?: (result: OptimizationResult) => void;
}

export function SmartRecipeOptimizer({
  recipe,
  memberId,
  targetNutrition,
  onOptimizationComplete,
}: SmartRecipeOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] =
    useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [adviceId, setAdviceId] = useState<string | null>(null);

  const startOptimization = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/optimize-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId: recipe.id,
          memberId,
          targetNutrition: targetNutrition || {
            calories: 600,
            protein: 30,
            carbs: 50,
            fat: 20,
          },
          preferences: {
            dietary_restrictions: [],
            allergies: [],
            preferred_cuisines: ["chinese"],
            budget_level: "medium",
            cooking_skill: "intermediate",
          },
          season: "autumn", // 可以根据当前日期动态确定
          optimizationLevel: "moderate",
        }),
      });

      if (!response.ok) {
        throw new Error("食谱优化请求失败");
      }

      const data = await response.json();
      setOptimizationResult(data.optimization);
      setAdviceId(data.adviceId || data.optimizationId);
      onOptimizationComplete?.(data.optimization);
    } catch (err) {
      setError(err instanceof Error ? err.message : "优化失败，请稍后重试");
    } finally {
      setIsOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
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
          adviceId,
          feedbackType: "advice",
          liked: feedback.type === "positive",
          disliked: feedback.type === "negative",
          rating:
            feedback.type === "positive"
              ? 5
              : feedback.type === "negative"
                ? 2
                : 3,
          comments: feedback.comment,
          categories: ["helpfulness", "accuracy"],
        }),
      });

      if (!response.ok) {
        console.warn("Feedback submission failed");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  // 如果正在优化，显示加载动画
  if (isOptimizing) {
    return (
      <Card>
        <CardContent className="p-8">
          <AIThinkingIndicator
            size="lg"
            message="AI正在优化您的食谱..."
            className="w-full max-w-2xl mx-auto"
          />
          <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
            <p>• 分析食谱营养成分</p>
            <p>• 评估健康影响</p>
            <p>• 推荐食材替代方案</p>
            <p>• 优化烹饪方法和份量</p>
            <p className="text-xs mt-2">预计需要15-45秒，请耐心等待</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!optimizationResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ChefHat className="w-5 h-5 mr-2" />
            AI食谱优化
          </CardTitle>
          <CardDescription>
            基于您的健康目标和营养需求，智能优化食谱
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 当前食谱信息 */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">当前食谱：{recipe.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">热量：</span>
                {recipe.nutrition.calories} kcal
              </div>
              <div>
                <span className="text-muted-foreground">蛋白质：</span>
                {recipe.nutrition.protein}g
              </div>
              <div>
                <span className="text-muted-foreground">碳水：</span>
                {recipe.nutrition.carbs}g
              </div>
              <div>
                <span className="text-muted-foreground">脂肪：</span>
                {recipe.nutrition.fat}g
              </div>
            </div>
          </div>

          <Button
            onClick={startOptimization}
            disabled={isOptimizing}
            className="w-full"
          >
            开始AI食谱优化
          </Button>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>• 分析食谱营养均衡度</p>
            <p>• 推荐食材替代方案</p>
            <p>• 优化份量和烹饪方法</p>
            <p>• 考虑季节性和个人偏好</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <ChefHat className="w-5 h-5 mr-2" />
            食谱优化结果
          </span>
          <Badge variant="outline">
            {getScoreIcon(optimizationResult.analysis.nutrition_score)}
            营养评分: {optimizationResult.analysis.nutrition_score.toFixed(1)}
          </Badge>
        </CardTitle>
        <CardDescription>AI已完成食谱分析和优化建议</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">分析结果</TabsTrigger>
            <TabsTrigger value="substitutions">食材替代</TabsTrigger>
            <TabsTrigger value="adjustments">份量调整</TabsTrigger>
            <TabsTrigger value="improved">优化食谱</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4">
            {/* 营养评分 */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <div
                className={`text-3xl font-bold ${getScoreColor(optimizationResult.analysis.nutrition_score)}`}
              >
                {optimizationResult.analysis.nutrition_score.toFixed(1)}
              </div>
              <Progress
                value={optimizationResult.analysis.nutrition_score}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                营养均衡评分 (0-100)
              </p>
            </div>

            {/* 营养差距分析 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm font-medium mb-1">热量差距</div>
                <div
                  className={`text-lg font-bold ${
                    optimizationResult.analysis.gap_analysis.calories_gap > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {optimizationResult.analysis.gap_analysis.calories_gap > 0
                    ? "+"
                    : ""}
                  {optimizationResult.analysis.gap_analysis.calories_gap} kcal
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-sm font-medium mb-1">蛋白质差距</div>
                <div
                  className={`text-lg font-bold ${
                    optimizationResult.analysis.gap_analysis.protein_gap < 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {optimizationResult.analysis.gap_analysis.protein_gap}g
                </div>
              </div>
            </div>

            {/* 优势和劣势 */}
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-green-700 mb-2">✅ 优势</h4>
                <ul className="space-y-1">
                  {optimizationResult.analysis.strengths.map(
                    (strength, index) => (
                      <li key={index} className="text-sm text-green-600">
                        • {strength}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-orange-700 mb-2">
                  ⚠️ 需要改进
                </h4>
                <ul className="space-y-1">
                  {optimizationResult.analysis.weaknesses.map(
                    (weakness, index) => (
                      <li key={index} className="text-sm text-orange-600">
                        • {weakness}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="substitutions" className="space-y-4">
            {optimizationResult.optimizations.ingredient_substitutions.length >
            0 ? (
              <div className="space-y-3">
                {optimizationResult.optimizations.ingredient_substitutions.map(
                  (sub, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">
                              {sub.original_ingredient}
                            </span>
                            <span className="text-muted-foreground mx-2">
                              →
                            </span>
                            <span className="font-medium text-green-600">
                              {sub.substitute_ingredient}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {sub.cost_difference === "cheaper"
                              ? "💰更便宜"
                              : sub.cost_difference === "expensive"
                                ? "💎更贵"
                                : "⚖️价格相似"}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {sub.reason}
                        </p>

                        <div className="text-xs space-y-1">
                          <div>
                            <span className="font-medium">营养相似性：</span>
                            {sub.nutritional_impact.similar_nutrients.join(
                              "、",
                            )}
                          </div>
                          <div>
                            <span className="font-medium">改善方面：</span>
                            {sub.nutritional_impact.improved_aspects.join("、")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无食材替代建议</p>
                <p className="text-sm">当前食谱食材搭配已经很合理</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            {optimizationResult.optimizations.portion_adjustments.length >
              0 && (
              <div className="space-y-3">
                {optimizationResult.optimizations.portion_adjustments.map(
                  (adj, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{adj.ingredient}</span>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {adj.current_amount}
                              {adj.unit} → {adj.recommended_amount}
                              {adj.unit}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {adj.recommended_amount > adj.current_amount
                                ? "增加"
                                : "减少"}
                              {Math.abs(
                                adj.recommended_amount - adj.current_amount,
                              )}
                              {adj.unit}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {adj.reason}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {adj.nutritional_impact}
                        </p>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            )}

            {optimizationResult.optimizations.cooking_method_suggestions
              .length > 0 && (
              <div>
                <h4 className="font-medium mb-2">烹饪方法建议</h4>
                <ul className="space-y-1">
                  {optimizationResult.optimizations.cooking_method_suggestions.map(
                    (suggestion, index) => (
                      <li key={index} className="text-sm text-blue-600">
                        • {suggestion}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="improved" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{optimizationResult.improved_recipe.name}</CardTitle>
                <CardDescription>AI优化后的食谱版本</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 食材列表 */}
                <div>
                  <h4 className="font-medium mb-2">食材清单</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {optimizationResult.improved_recipe.ingredients.map(
                      (ingredient, index) => (
                        <div
                          key={index}
                          className="flex justify-between p-2 bg-muted rounded"
                        >
                          <span>{ingredient.name}</span>
                          <span className="font-medium">
                            {ingredient.amount} {ingredient.unit}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* 营养信息 */}
                <div>
                  <h4 className="font-medium mb-2">营养信息</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      热量:{" "}
                      {
                        optimizationResult.improved_recipe.nutrition_facts
                          .calories
                      }{" "}
                      kcal
                    </div>
                    <div>
                      蛋白质:{" "}
                      {
                        optimizationResult.improved_recipe.nutrition_facts
                          .macronutrients.protein.amount
                      }
                      g
                    </div>
                    <div>
                      碳水:{" "}
                      {
                        optimizationResult.improved_recipe.nutrition_facts
                          .macronutrients.carbohydrates.amount
                      }
                      g
                    </div>
                    <div>
                      脂肪:{" "}
                      {
                        optimizationResult.improved_recipe.nutrition_facts
                          .macronutrients.fat.amount
                      }
                      g
                    </div>
                  </div>
                </div>

                {/* 制作步骤 */}
                {optimizationResult.improved_recipe.instructions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">制作步骤</h4>
                    <ol className="space-y-1">
                      {optimizationResult.improved_recipe.instructions.map(
                        (step, index) => (
                          <li key={index} className="text-sm">
                            {index + 1}. {step}
                          </li>
                        ),
                      )}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 反馈区域 */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                这个食谱优化对您有帮助吗？您的反馈将帮助我们改进AI推荐质量。
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

        {/* 重新优化按钮 */}
        <div className="flex justify-center mt-6">
          <Button
            onClick={() => {
              setOptimizationResult(null);
              setAdviceId(null);
            }}
            variant="outline"
          >
            重新优化
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
