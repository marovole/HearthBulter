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
import {
  Star,
  Clock,
  DollarSign,
  Users,
  Heart,
  Eye,
  ChefHat,
  Info,
} from "lucide-react";
import { RecipeRatingWidget } from "./RecipeRatingWidget";
import { FavoriteButton } from "./FavoriteButton";

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
}

interface RecipeCardProps {
  recipe: Recipe;
  recommendation?: Recommendation;
  memberId: string;
  showRecommendation?: boolean;
}

export function RecipeCard({
  recipe,
  recommendation,
  memberId,
  showRecommendation = true,
}: RecipeCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
    case "easy":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "hard":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
    }
  };

  const getCostLevelColor = (cost: number) => {
    if (cost <= 15) return "bg-green-100 text-green-800";
    if (cost <= 30) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {recipe.imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <FavoriteButton recipeId={recipe.id} memberId={memberId} />
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">
              {recipe.name}
            </CardTitle>
            {recipe.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {recipe.description}
              </CardDescription>
            )}
          </div>
          {!recipe.imageUrl && (
            <FavoriteButton recipeId={recipe.id} memberId={memberId} />
          )}
        </div>

        {recommendation && showRecommendation && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                推荐理由
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {recommendation.reasons.slice(0, 2).map((reason, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{recipe.totalTime}分钟</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className={getCostLevelColor(recipe.estimatedCost)}>
              ¥{recipe.estimatedCost}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{Math.round(recipe.calories)}kcal</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span>
              {recipe.averageRating.toFixed(1)} ({recipe.ratingCount})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          <Badge
            variant="outline"
            className={getDifficultyColor(recipe.difficulty)}
          >
            {recipe.difficulty}
          </Badge>
          {recipe.cuisine && <Badge variant="outline">{recipe.cuisine}</Badge>}
          {recipe.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{recipe.viewCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{recipe.favoriteCount}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            P:{recipe.protein.toFixed(1)}g C:{recipe.carbs.toFixed(1)}g F:
            {recipe.fat.toFixed(1)}g
          </div>
        </div>

        <RecipeRatingWidget
          recipeId={recipe.id}
          memberId={memberId}
          currentRating={recipe.averageRating}
          ratingCount={recipe.ratingCount}
        />

        <div className="flex gap-2 mt-4">
          <Button className="flex-1" size="sm">
            查看详情
          </Button>
          <Button variant="outline" size="sm">
            开始制作
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
