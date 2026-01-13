// @ts-nocheck
"use client";

import { useState } from "react";
import {
  format,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { MealCard } from "./MealCard";
import { RecipeDetailModal } from "./RecipeDetailModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Heart,
  Eye,
} from "lucide-react";
import { toast } from "@/lib/toast";

type ViewMode = "day" | "week" | "month";

interface Meal {
  id: string;
  date: Date;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Array<{
    id: string;
    amount: number;
    food: {
      id: string;
      name: string;
    };
  }>;
  isFavorite?: boolean;
  hasAllergens?: boolean;
  allergens?: string[];
}

interface MealCalendarViewProps {
  meals: Meal[];
  viewMode: ViewMode;
  currentDate: Date;
  onMealUpdate?: () => void;
}

const MEAL_TYPE_LABELS = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

const MEAL_TYPE_COLORS = {
  BREAKFAST: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LUNCH: "bg-blue-100 text-blue-800 border-blue-200",
  DINNER: "bg-purple-100 text-purple-800 border-purple-200",
  SNACK: "bg-green-100 text-green-800 border-green-200",
};

const MEAL_TYPE_ICONS = {
  BREAKFAST: "🍳",
  LUNCH: "🍱",
  DINNER: "🍽️",
  SNACK: "🍎",
};

export function MealCalendarView({
  meals,
  viewMode,
  currentDate,
  onMealUpdate,
}: MealCalendarViewProps) {
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 按日期组织餐食
  const getMealsForDate = (date: Date) => {
    return meals.filter((meal) => isSameDay(new Date(meal.date), date));
  };

  // 处理餐食点击
  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowDetailModal(true);
  };

  // 处理餐食替换
  const handleReplaceMeal = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meal-plans/meals/${mealId}/replace`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("替换餐食失败");
      }

      toast.success("餐食替换成功");
      onMealUpdate?.();
    } catch (error) {
      console.error("替换餐食失败:", error);
      toast.error("替换餐食失败，请重试");
    }
  };

  // 处理收藏切换
  const handleToggleFavorite = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meal-plans/meals/${mealId}/favorite`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("操作失败");
      }

      toast.success("收藏状态已更新");
      onMealUpdate?.();
    } catch (error) {
      console.error("更新收藏状态失败:", error);
      toast.error("操作失败，请重试");
    }
  };

  // 日视图渲染
  const renderDayView = () => {
    const dayMeals = getMealsForDate(currentDate);
    const groupedMeals = dayMeals.reduce(
      (acc, meal) => {
        const key = meal.mealType as keyof typeof MEAL_TYPE_LABELS;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key]!.push(meal);
        return acc;
      },
      {} as Partial<Record<keyof typeof MEAL_TYPE_LABELS, Meal[]>>,
    );

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {format(currentDate, "yyyy年M月d日 EEEE", { locale: zhCN })}
          </h2>
          <p className="text-gray-600">
            共 {dayMeals.length} 餐，总计{" "}
            {dayMeals.reduce((sum, meal) => sum + meal.calories, 0).toFixed(0)}{" "}
            kcal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(MEAL_TYPE_LABELS).map(([mealType, label]) => {
            const mealsForType =
              groupedMeals[mealType as keyof typeof MEAL_TYPE_LABELS] || [];

            return (
              <Card key={mealType} className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">
                      {
                        MEAL_TYPE_ICONS[
                          mealType as keyof typeof MEAL_TYPE_ICONS
                        ]
                      }
                    </span>
                    {label}
                    <Badge
                      variant="outline"
                      className={
                        MEAL_TYPE_COLORS[
                          mealType as keyof typeof MEAL_TYPE_COLORS
                        ]
                      }
                    >
                      {mealsForType.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mealsForType.length > 0 ? (
                    mealsForType.map((meal) => (
                      <div
                        key={meal.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleMealClick(meal)}
                      >
                        <MealCard
                          meal={{
                            id: meal.id,
                            date: meal.date.toISOString(),
                            mealType: meal.mealType,
                            calories: meal.calories,
                            protein: meal.protein,
                            carbs: meal.carbs,
                            fat: meal.fat,
                            ingredients: meal.ingredients,
                          }}
                          onReplace={() => handleReplaceMeal(meal.id)}
                        />
                        {meal.hasAllergens && (
                          <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>含过敏原: {meal.allergens?.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🍽️</div>
                      <p>暂无{label}安排</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => toast.info("添加餐食功能开发中")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        添加{label}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // 周视图渲染
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            第{Math.ceil(currentDate.getDate() / 7)}周
          </h2>
          <p className="text-gray-600">
            {format(weekStart, "M月d日", { locale: zhCN })} -{" "}
            {format(addDays(weekStart, 6), "M月d日", { locale: zhCN })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayMeals = getMealsForDate(day);
            const isToday = isSameDay(day, new Date());
            const dayName = format(day, "EEEE", { locale: zhCN });
            const dayNumber = format(day, "d");

            return (
              <Card
                key={day.toISOString()}
                className={`h-fit ${isToday ? "ring-2 ring-blue-500" : ""}`}
              >
                <CardHeader className="pb-3 text-center">
                  <CardTitle className="text-sm">
                    <div className="font-bold text-lg">{dayNumber}</div>
                    <div className="text-gray-600 text-xs">{dayName}</div>
                    {isToday && (
                      <Badge variant="default" className="mt-1 text-xs">
                        今天
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayMeals.length > 0 ? (
                    dayMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="cursor-pointer hover:shadow-sm transition-shadow p-2 border rounded-lg"
                        onClick={() => handleMealClick(meal)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${MEAL_TYPE_COLORS[meal.mealType]}`}
                          >
                            {MEAL_TYPE_ICONS[meal.mealType]}{" "}
                            {MEAL_TYPE_LABELS[meal.mealType]}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {meal.isFavorite && (
                              <Heart className="h-3 w-3 text-red-500 fill-current" />
                            )}
                            {meal.hasAllergens && (
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>🔥 {meal.calories.toFixed(0)} kcal</div>
                          <div>
                            🥩 {meal.protein.toFixed(1)}g | 🍚{" "}
                            {meal.carbs.toFixed(1)}g
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {meal.ingredients
                            .slice(0, 2)
                            .map((ing) => ing.food.name)
                            .join(", ")}
                          {meal.ingredients.length > 2 && "..."}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <div className="text-2xl mb-1">🍽️</div>
                      <p className="text-xs">无餐食</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // 月视图渲染
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);
    const calendarDays: (Date | null)[] = [
      ...Array(startDayOfWeek).fill(null),
      ...monthDays,
    ];

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {format(currentDate, "yyyy年M月", { locale: zhCN })}
          </h2>
          <p className="text-gray-600">共 {monthDays.length} 天</p>
        </div>

        <Card>
          <CardContent className="p-4">
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return (
                    <div key={`empty-${index}`} className="aspect-square" />
                  );
                }

                const dayMeals = getMealsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square border rounded-lg p-2 cursor-pointer transition-colors ${
                      isToday
                        ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                        : isCurrentMonth
                          ? "bg-white border-gray-200 hover:bg-gray-50"
                          : "bg-gray-50 border-gray-100 text-gray-400"
                    }`}
                    onClick={() => {
                      if (dayMeals.length > 0) {
                        setSelectedMeal(dayMeals[0] as Meal);
                        setShowDetailModal(true);
                      }
                    }}
                  >
                    <div className="text-xs font-medium mb-1">
                      {format(day, "d")}
                    </div>

                    {dayMeals.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-center">
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0"
                          >
                            {dayMeals.length}餐
                          </Badge>
                        </div>
                        <div className="text-xs text-center text-gray-600">
                          🔥{" "}
                          {dayMeals
                            .reduce((sum, meal) => sum + meal.calories, 0)
                            .toFixed(0)}
                        </div>
                        <div className="flex justify-center gap-1">
                          {dayMeals.slice(0, 3).map((meal, i) => (
                            <span key={i} className="text-xs">
                              {MEAL_TYPE_ICONS[meal.mealType]}
                            </span>
                          ))}
                          {dayMeals.length > 3 && (
                            <span className="text-xs text-gray-400">...</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </div>

      {/* 食谱详情弹窗 */}
      {selectedMeal && (
        <RecipeDetailModal
          meal={selectedMeal}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedMeal(null);
          }}
          onReplace={() => {
            handleReplaceMeal(selectedMeal.id);
            setShowDetailModal(false);
          }}
          onToggleFavorite={() => {
            handleToggleFavorite(selectedMeal.id);
          }}
        />
      )}
    </>
  );
}
