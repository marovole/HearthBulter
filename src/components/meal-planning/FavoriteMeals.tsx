"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Grid,
  Heart,
  List,
  Search,
  SortAsc,
  SortDesc,
  Users,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

type FavoriteMeal = {
  id: string;
  recipeId: string;
  name: string;
  description?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  servings?: number | null;
  cookingTime?: number | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | null;
  mealType: MealType;
  date: Date;
  tags?: string[];
  image?: string | null;
};

type FavoriteMealsProps = {
  memberId?: string;
  onMealSelect?: (meal: FavoriteMeal) => void;
  onRemoveFavorite?: (mealId: string) => void;
  onQuickAdd?: (recipeId: string, mealType: MealType) => void;
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

const DIFFICULTY_LABELS: Record<
  NonNullable<FavoriteMeal["difficulty"]>,
  string
> = {
  EASY: "简单",
  MEDIUM: "中等",
  HARD: "困难",
};

const DIFFICULTY_COLORS: Record<
  NonNullable<FavoriteMeal["difficulty"]>,
  string
> = {
  EASY: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HARD: "bg-red-100 text-red-800",
};

export function FavoriteMeals({
  memberId,
  onMealSelect,
  onRemoveFavorite,
  onQuickAdd,
}: FavoriteMealsProps) {
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "calories" | "cookingTime">(
    "date",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [quickAddMealType, setQuickAddMealType] = useState<MealType>("DINNER");

  useEffect(() => {
    loadFavorites();
  }, [memberId, sortBy, sortOrder]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const apiSortBy = sortBy === "date" ? "favoritedAt" : "name";
      const memberParam = memberId ? `memberId=${memberId}&` : "";
      const response = await fetch(
        `/api/recipes/favorites?${memberParam}page=1&limit=50&sortBy=${apiSortBy}&sortOrder=${sortOrder}`,
      );
      if (!response.ok) {
        throw new Error("加载收藏列表失败");
      }
      const data = (await response.json()) as {
        favorites: Array<{
          id: string;
          recipeId: string;
          favoritedAt: string;
          recipe?: {
            id: string;
            name: string;
            description?: string | null;
            servings?: number | null;
            prepTime?: number | null;
            cookTime?: number | null;
            difficulty?: string | null;
            tags?: string[];
            imageUrl?: string | null;
          };
        }>;
      };

      const normalized: FavoriteMeal[] = data.favorites.flatMap((favorite) => {
        if (!favorite.recipe) return [];
        const difficulty =
          favorite.recipe.difficulty === "EASY" ||
          favorite.recipe.difficulty === "MEDIUM" ||
          favorite.recipe.difficulty === "HARD"
            ? favorite.recipe.difficulty
            : null;

        const meal: FavoriteMeal = {
          id: favorite.id,
          recipeId: favorite.recipeId,
          name: favorite.recipe.name,
          description: favorite.recipe.description ?? null,
          calories: null,
          protein: null,
          carbs: null,
          fat: null,
          servings: favorite.recipe.servings ?? null,
          cookingTime:
            favorite.recipe.cookTime ?? favorite.recipe.prepTime ?? null,
          difficulty,
          mealType: "DINNER",
          date: new Date(favorite.favoritedAt),
          tags: favorite.recipe.tags,
          image: favorite.recipe.imageUrl ?? null,
        };

        return [meal];
      });

      setFavorites(normalized);
    } catch (error) {
      toast.error("加载收藏列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (meal: FavoriteMeal) => {
    try {
      const memberParam = memberId ? `?memberId=${memberId}` : "";
      const response = await fetch(
        `/api/recipes/${meal.recipeId}/favorite${memberParam}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("取消收藏失败");
      }

      setFavorites((prev) => prev.filter((fav) => fav.id !== meal.id));
      onRemoveFavorite?.(meal.id);
      toast.success("已取消收藏");
    } catch (error) {
      toast.error("取消收藏失败");
    }
  };

  const filteredAndSorted = favorites
    .filter((meal) => {
      if (
        searchTerm &&
        !meal.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (filterType !== "all" && meal.mealType !== filterType) {
        return false;
      }
      if (filterDifficulty !== "all" && meal.difficulty !== filterDifficulty) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortBy) {
      case "date":
        aValue = a.date.getTime();
        bValue = b.date.getTime();
        break;
      case "calories":
        aValue = a.calories ?? 0;
        bValue = b.calories ?? 0;
        break;
      case "cookingTime":
        aValue = a.cookingTime ?? 0;
        bValue = b.cookingTime ?? 0;
        break;
      default:
        return 0;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

  const toggleSort = (field: "date" | "calories" | "cookingTime") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const formatMetric = (value: number | null | undefined, unit: string) =>
    value === null || value === undefined ? "--" : `${value}${unit}`;

  const handleQuickAdd = (meal: FavoriteMeal) => {
    if (!onQuickAdd) {
      toast.error("暂未选择食谱计划");
      return;
    }

    onQuickAdd(meal.recipeId, quickAddMealType);
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredAndSorted.map((meal) => (
        <Card
          key={meal.id}
          className="hover:shadow-lg transition-shadow cursor-pointer"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-1">
                  {meal.name}
                </CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {meal.description || "暂无描述"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(meal);
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* 图片 */}
            {meal.image && (
              <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={meal.image}
                  alt={meal.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 标签 */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </Badge>
              {meal.difficulty && (
                <Badge
                  className={`text-xs ${DIFFICULTY_COLORS[meal.difficulty]}`}
                >
                  {DIFFICULTY_LABELS[meal.difficulty]}
                </Badge>
              )}
              {meal.cookingTime && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {meal.cookingTime}分钟
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">热量</span>
                <span className="font-medium">
                  {formatMetric(meal.calories, " kcal")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">蛋白质</span>
                <span className="font-medium">
                  {formatMetric(meal.protein, "g")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">碳水</span>
                <span className="font-medium">
                  {formatMetric(meal.carbs, "g")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">脂肪</span>
                <span className="font-medium">
                  {formatMetric(meal.fat, "g")}
                </span>
              </div>
            </div>

            {/* 其他信息 */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {meal.servings ?? "-"}人份
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(meal.date, "MM/dd", { locale: zhCN })}
              </div>
            </div>

            {/* 标签 */}
            {meal.tags && meal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {meal.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {meal.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{meal.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={quickAddMealType}
                  onChange={(event) =>
                    setQuickAddMealType(event.target.value as MealType)
                  }
                  className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-xs"
                >
                  {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdd(meal)}
                  disabled={!onQuickAdd}
                >
                  加入计划
                </Button>
              </div>
              <Button onClick={() => onMealSelect?.(meal)} className="w-full">
                查看详情
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-3">
      {filteredAndSorted.map((meal) => (
        <Card key={meal.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* 图片 */}
              {meal.image && (
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* 主要信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">
                      {meal.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {meal.description || "暂无描述"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFavorite(meal)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span>{formatMetric(meal.calories, " kcal")}</span>
                  <span>蛋白质 {formatMetric(meal.protein, "g")}</span>
                  <span>碳水 {formatMetric(meal.carbs, "g")}</span>
                  <span>脂肪 {formatMetric(meal.fat, "g")}</span>
                  {meal.cookingTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meal.cookingTime}分钟
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {meal.servings ?? "-"}人份
                  </span>
                </div>
              </div>

              {/* 右侧信息 */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {MEAL_TYPE_LABELS[meal.mealType]}
                  </Badge>
                  {meal.difficulty && (
                    <Badge
                      className={`text-xs ${DIFFICULTY_COLORS[meal.difficulty]}`}
                    >
                      {DIFFICULTY_LABELS[meal.difficulty]}
                    </Badge>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickAdd(meal)}
                  disabled={!onQuickAdd}
                >
                  加入计划
                </Button>
                <Button size="sm" onClick={() => onMealSelect?.(meal)}>
                  查看详情
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载收藏列表...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          我的收藏 ({favorites.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 搜索和筛选 */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索收藏的食谱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? (
                <List className="h-4 w-4" />
              ) : (
                <Grid className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 筛选选项 */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">全部餐型</option>
              <option value="BREAKFAST">早餐</option>
              <option value="LUNCH">午餐</option>
              <option value="DINNER">晚餐</option>
              <option value="SNACK">加餐</option>
            </select>

            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-1 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">全部难度</option>
              <option value="EASY">简单</option>
              <option value="MEDIUM">中等</option>
              <option value="HARD">困难</option>
            </select>

            <select
              value={quickAddMealType}
              onChange={(e) => setQuickAddMealType(e.target.value as MealType)}
              className="px-3 py-1 border border-gray-200 rounded-md text-sm"
            >
              {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  默认加入：{label}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("date")}
              className="flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              日期
              {sortBy === "date" &&
                (sortOrder === "asc" ? (
                  <SortAsc className="h-3 w-3" />
                ) : (
                  <SortDesc className="h-3 w-3" />
                ))}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("calories")}
              className="flex items-center gap-1"
            >
              热量
              {sortBy === "calories" &&
                (sortOrder === "asc" ? (
                  <SortAsc className="h-3 w-3" />
                ) : (
                  <SortDesc className="h-3 w-3" />
                ))}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort("cookingTime")}
              className="flex items-center gap-1"
            >
              <Clock className="h-3 w-3" />
              时间
              {sortBy === "cookingTime" &&
                (sortOrder === "asc" ? (
                  <SortAsc className="h-3 w-3" />
                ) : (
                  <SortDesc className="h-3 w-3" />
                ))}
            </Button>
          </div>
        </div>

        {/* 收藏列表 */}
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType !== "all" || filterDifficulty !== "all"
                ? "没有找到匹配的收藏"
                : "还没有收藏任何食谱"}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== "all" || filterDifficulty !== "all"
                ? "尝试调整搜索条件或筛选器"
                : "在食谱详情页面点击收藏按钮来添加收藏"}
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600">
              显示 {filteredAndSorted.length} / {favorites.length} 个收藏
            </div>

            {viewMode === "grid" ? renderGridView() : renderListView()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
