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
import {
  Star,
  Clock,
  DollarSign,
  Users,
  Heart,
  Eye,
  ChefHat,
  RefreshCw,
} from 'lucide-react';
import { RecipeCard } from './RecipeCard';

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
  favoriteCount: number;
  tags: string[];
  imageUrl?: string;
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

interface RecommendedRecipesProps {
  memberId: string;
  mealType?: string;
  servings?: number;
  maxCookTime?: number;
  budgetLimit?: number;
  dietaryRestrictions?: string[];
  excludedIngredients?: string[];
  preferredCuisines?: string[];
  season?: string;
  limit?: number;
}

export function RecommendedRecipes({
  memberId,
  mealType,
  servings,
  maxCookTime,
  budgetLimit,
  dietaryRestrictions,
  excludedIngredients,
  preferredCuisines,
  season,
  limit = 10,
}: RecommendedRecipesProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async (excludeRecipeIds: string[] = []) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        memberId,
        ...(mealType && { mealType }),
        ...(servings && { servings: servings.toString() }),
        ...(maxCookTime && { maxCookTime: maxCookTime.toString() }),
        ...(budgetLimit && { budgetLimit: budgetLimit.toString() }),
        ...(dietaryRestrictions?.length && {
          dietaryRestrictions: dietaryRestrictions.join(','),
        }),
        ...(excludedIngredients?.length && {
          excludedIngredients: excludedIngredients.join(','),
        }),
        ...(preferredCuisines?.length && {
          preferredCuisines: preferredCuisines.join(','),
        }),
        ...(season && { season }),
        limit: limit.toString(),
      });

      if (excludeRecipeIds.length > 0) {
        params.set('excludeRecipeIds', excludeRecipeIds.join(','));
      }

      const response = await fetch(`/api/recommendations/recipes?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load recommendations');
      }

      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const excludeRecipeIds = recommendations.map((r) => r.recipeId);
    await loadRecommendations(excludeRecipeIds);
  };

  useEffect(() => {
    loadRecommendations();
  }, [
    memberId,
    mealType,
    servings,
    maxCookTime,
    budgetLimit,
    dietaryRestrictions?.join(','),
    excludedIngredients?.join(','),
    preferredCuisines?.join(','),
    season,
    limit,
  ]);

  if (loading && !recommendations.length) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>正在为您推荐食谱...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className='p-6'>
        <div className='text-center'>
          <p className='text-red-600 mb-4'>{error}</p>
          <Button onClick={() => loadRecommendations()} variant='outline'>
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className='p-6'>
        <div className='text-center'>
          <ChefHat className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <p className='text-muted-foreground mb-4'>
            暂无符合条件的食谱推荐，请调整筛选条件或稍后查看。
          </p>
          <Button onClick={() => loadRecommendations()} variant='outline'>
            刷新推荐
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>为您推荐</h2>
          <p className='text-muted-foreground'>
            基于您的偏好和历史行为精心挑选
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant='outline'
          size='sm'
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
          />
          换一批
        </Button>
      </div>

      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {recommendations.map((recommendation) => (
          <RecipeCard
            key={recommendation.recipeId}
            recipe={recommendation.recipe}
            recommendation={recommendation}
            memberId={memberId}
          />
        ))}
      </div>

      {recommendations.length >= limit && (
        <div className='text-center'>
          <Button variant='outline' onClick={() => loadRecommendations()}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}
