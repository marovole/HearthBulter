'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, DollarSign, Users, Heart, Eye, ChefHat, RefreshCw } from 'lucide-react';

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

interface RecipeRecommendationListProps {
  recommendations: Recommendation[];
  loading?: boolean;
  onRefresh?: () => void;
  onViewRecipe?: (recipeId: string) => void;
  onRateRecipe?: (recipeId: string, rating: number) => void;
  onFavoriteRecipe?: (recipeId: string) => void;
  onGetSimilar?: (recipeId: string) => void;
  showActions?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
}

export default function RecipeRecommendationList({
  recommendations,
  loading = false,
  onRefresh,
  onViewRecipe,
  onRateRecipe,
  onFavoriteRecipe,
  onGetSimilar,
  showActions = true,
  showMetadata = true,
  compact = false
}: RecipeRecommendationListProps) {
  const [ratingStates, setRatingStates] = useState<Record<string, number>>({});

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return '简单';
      case 'MEDIUM': return '中等';
      case 'HARD': return '困难';
      default: return '未知';
    }
  };

  const handleRating = (recipeId: string, rating: number) => {
    setRatingStates(prev => ({ ...prev, [recipeId]: rating }));
    onRateRecipe?.(recipeId, rating);
  };

  const renderMetadataBars = (metadata: Recommendation['metadata']) => {
    const metrics = [
      { key: 'inventoryMatch', label: '库存匹配', color: 'bg-blue-600' },
      { key: 'priceMatch', label: '价格匹配', color: 'bg-green-600' },
      { key: 'nutritionMatch', label: '营养匹配', color: 'bg-purple-600' },
      { key: 'preferenceMatch', label: '偏好匹配', color: 'bg-orange-600' },
      { key: 'seasonalMatch', label: '季节匹配', color: 'bg-pink-600' }
    ];

    return (
      <div className="space-y-2">
        {metrics.map(metric => {
          const value = metadata[metric.key as keyof typeof metadata];
          return (
            <div key={metric.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{metric.label}</span>
                <span>{Math.round(value * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`${metric.color} h-1.5 rounded-full transition-all duration-300`} 
                  style={{ width: `${value * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderNutritionInfo = (recipe: Recipe) => {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>营养信息</span>
          <span>{recipe.calories}卡路里</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-medium">蛋白质</div>
            <div>{recipe.protein}g</div>
          </div>
          <div>
            <div className="font-medium">碳水</div>
            <div>{recipe.carbs}g</div>
          </div>
          <div>
            <div className="font-medium">脂肪</div>
            <div>{recipe.fat}g</div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecipeCard = (rec: Recommendation) => {
    if (compact) {
      return (
        <Card key={rec.recipeId} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm flex-1 mr-2">{rec.recipe.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {Math.round(rec.score)}分
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {rec.reasons.slice(0, 2).map((reason, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{rec.recipe.totalTime}分钟</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>¥{rec.recipe.estimatedCost}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{rec.recipe.averageRating.toFixed(1)}</span>
              </div>
            </div>

            {showActions && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewRecipe?.(rec.recipeId)}>
                  查看
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onFavoriteRecipe?.(rec.recipeId)}>
                  <Heart className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onGetSimilar?.(rec.recipeId)}>
                  相似
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={rec.recipeId} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{rec.recipe.name}</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {Math.round(rec.score)}分
            </Badge>
          </div>
          <CardDescription>{rec.explanation}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {rec.reasons.map((reason, index) => (
              <Badge key={index} variant="outline" className="text-xs">
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
              <span>{rec.recipe.servings || 2}人份</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={getDifficultyColor(rec.recipe.difficulty)}>
                {getDifficultyText(rec.recipe.difficulty)}
              </Badge>
            </div>
          </div>

          {showMetadata && renderMetadataBars(rec.metadata)}
          {renderNutritionInfo(rec.recipe)}

          {showActions && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onViewRecipe?.(rec.recipeId)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  查看
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onFavoriteRecipe?.(rec.recipeId)}
                >
                  <Heart className="h-4 w-4 mr-1" />
                  收藏
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onGetSimilar?.(rec.recipeId)}
                >
                  相似推荐
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
                          star <= (ratingStates[rec.recipeId] || rec.recipe.averageRating || 0) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">推荐食谱</h2>
          <Button disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            获取中...
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">推荐食谱</h2>
          {onRefresh && (
            <Button onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新推荐
            </Button>
          )}
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">暂无推荐结果</p>
              <p className="text-sm text-muted-foreground">请调整您的偏好设置后重试</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">
          为您推荐 {recommendations.length} 道食谱
        </h2>
        {onRefresh && (
          <Button onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新推荐
          </Button>
        )}
      </div>

      <div className={`grid gap-4 ${compact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {recommendations.map(renderRecipeCard)}
      </div>
    </div>
  );
}
