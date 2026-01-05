"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  Clock,
  DollarSign,
  Users,
  Heart,
  Eye,
  ChefHat,
} from "lucide-react";

interface Recipe {
  id: string;
  name: string;
  description?: string;
  totalTime: number;
  estimatedCost: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  difficulty: string;
  cuisine: string;
  category: string;
  averageRating: number;
  ratingCount: number;
  viewCount: number;
}

interface Recommendation {
  recipeId: string;
  score: number;
  reasons: string[];
  explanation: string;
  metadata: {
    inventoryMatch: number;
    priceMatch: number;
    nutritionMatch: number;
    preferenceMatch: number;
    seasonalMatch: number;
  };
  recipe: Recipe;
}

interface RecommendationContext {
  memberId: string;
  mealType?: string;
  servings: number;
  maxCookTime: number;
  budgetLimit: number;
  dietaryRestrictions: string[];
  excludedIngredients: string[];
  preferredCuisines: string[];
  season?: string;
}

export default function RecipeRecommendationDemo() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<RecommendationContext>({
    memberId: "demo-user",
    servings: 2,
    maxCookTime: 60,
    budgetLimit: 50,
    dietaryRestrictions: [],
    excludedIngredients: [],
    preferredCuisines: [],
  });

  const mealTypes = ["早餐", "午餐", "晚餐", "加餐"];
  const seasons = ["春", "夏", "秋", "冬"];
  const cuisines = [
    "中式",
    "川菜",
    "粤菜",
    "湘菜",
    "日式",
    "韩式",
    "意式",
    "法式",
  ];
  const difficulties = ["EASY", "MEDIUM", "HARD"];

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        memberId: context.memberId,
        servings: context.servings.toString(),
        maxCookTime: context.maxCookTime.toString(),
        budgetLimit: context.budgetLimit.toString(),
        limit: "10",
      });

      if (context.mealType) params.append("mealType", context.mealType);
      if (context.season) params.append("season", context.season);
      if (context.preferredCuisines.length > 0) {
        params.append("preferredCuisines", context.preferredCuisines.join(","));
      }

      const response = await fetch(`/api/recommendations?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.data.recommendations);
      }
    } catch (error) {
      console.error("获取推荐失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const recordInteraction = async (
    type: string,
    recipeId: string,
    data: any = {},
  ) => {
    try {
      await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          data: {
            recipeId,
            memberId: context.memberId,
            ...data,
          },
        }),
      });
    } catch (error) {
      console.error("记录交互失败:", error);
    }
  };

  const handleRating = async (recipeId: string, rating: number) => {
    await recordInteraction("rating", recipeId, {
      rating,
      isRecommended: rating >= 4,
    });
    getRecommendations(); // 重新获取推荐
  };

  const handleFavorite = async (recipeId: string) => {
    await recordInteraction("favorite", recipeId, { folderName: "演示收藏夹" });
  };

  const handleView = async (recipeId: string) => {
    await recordInteraction("view", recipeId, {
      viewDuration: 30,
      isCompleted: false,
    });
  };

  useEffect(() => {
    getRecommendations();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HARD":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "简单";
      case "MEDIUM":
        return "中等";
      case "HARD":
        return "困难";
      default:
        return "未知";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">智能食谱推荐系统演示</h1>
        <p className="text-muted-foreground">
          基于多策略融合的个性化食谱推荐引擎
        </p>
      </div>

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recommendations">推荐结果</TabsTrigger>
          <TabsTrigger value="settings">推荐设置</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">为您推荐的食谱</h2>
            <Button onClick={getRecommendations} disabled={loading}>
              {loading ? "获取中..." : "刷新推荐"}
            </Button>
          </div>

          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <ChefHat className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {loading ? "正在获取推荐..." : "暂无推荐结果"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => (
                <Card
                  key={rec.recipeId}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {rec.recipe.name}
                      </CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {Math.round(rec.score)}分
                      </Badge>
                    </div>
                    <CardDescription>{rec.explanation}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {rec.reasons.map((reason, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {reason}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{rec.recipe.totalTime}分钟</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>¥{rec.recipe.estimatedCost}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{context.servings}人份</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge
                          className={getDifficultyColor(rec.recipe.difficulty)}
                        >
                          {getDifficultyText(rec.recipe.difficulty)}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>库存匹配</span>
                        <span>
                          {Math.round(rec.metadata.inventoryMatch * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${rec.metadata.inventoryMatch * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>营养信息</span>
                        <span>{rec.recipe.calories}卡路里</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div>
                          <div className="font-medium">蛋白质</div>
                          <div>{rec.recipe.protein}g</div>
                        </div>
                        <div>
                          <div className="font-medium">碳水</div>
                          <div>{rec.recipe.carbs}g</div>
                        </div>
                        <div>
                          <div className="font-medium">脂肪</div>
                          <div>{rec.recipe.fat}g</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(rec.recipeId)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFavorite(rec.recipeId)}
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        收藏
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">评分</div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Button
                            key={star}
                            size="sm"
                            variant="ghost"
                            className="p-1 h-8"
                            onClick={() => handleRating(rec.recipeId, star)}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                star <= (rec.recipe.averageRating || 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>推荐设置</CardTitle>
              <CardDescription>
                调整您的偏好设置以获得更精准的推荐
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">餐次类型</label>
                  <Select
                    value={context.mealType || ""}
                    onValueChange={(value) =>
                      setContext((prev) => ({
                        ...prev,
                        mealType: value || undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择餐次" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">不限</SelectItem>
                      {mealTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">季节</label>
                  <Select
                    value={context.season || ""}
                    onValueChange={(value) =>
                      setContext((prev) => ({
                        ...prev,
                        season: value || undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择季节" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">不限</SelectItem>
                      {seasons.map((season) => (
                        <SelectItem key={season} value={season}>
                          {season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  用餐人数: {context.servings}人
                </label>
                <Slider
                  value={[context.servings]}
                  onValueChange={(value) =>
                    setContext((prev) => ({ ...prev, servings: value[0] }))
                  }
                  max={8}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  最大烹饪时间: {context.maxCookTime}分钟
                </label>
                <Slider
                  value={[context.maxCookTime]}
                  onValueChange={(value) =>
                    setContext((prev) => ({ ...prev, maxCookTime: value[0] }))
                  }
                  max={180}
                  min={10}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  预算限制: ¥{context.budgetLimit}
                </label>
                <Slider
                  value={[context.budgetLimit]}
                  onValueChange={(value) =>
                    setContext((prev) => ({ ...prev, budgetLimit: value[0] }))
                  }
                  max={200}
                  min={10}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">偏好菜系</label>
                <div className="grid grid-cols-4 gap-2">
                  {cuisines.map((cuisine) => (
                    <Button
                      key={cuisine}
                      variant={
                        context.preferredCuisines.includes(cuisine)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setContext((prev) => ({
                          ...prev,
                          preferredCuisines: prev.preferredCuisines.includes(
                            cuisine,
                          )
                            ? prev.preferredCuisines.filter(
                                (c) => c !== cuisine,
                              )
                            : [...prev.preferredCuisines, cuisine],
                        }));
                      }}
                    >
                      {cuisine}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={getRecommendations} className="w-full">
                应用设置并获取推荐
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
