"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MealCalendarView } from "@/components/meal-planning/MealCalendarView";
import { MealListView } from "@/components/meal-planning/MealListView";
import { NutritionSummary } from "@/components/meal-planning/NutritionSummary";
import { FavoriteMeals } from "@/components/meal-planning/FavoriteMeals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  List,
  Clock,
  Utensils,
  TrendingUp,
  Heart,
  Download,
  Plus,
  Settings,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { ProfileIncompleteAlert } from "@/components/meal-planning/ProfileIncompleteAlert";

type ViewMode = "day" | "week" | "month" | "list";

type MealIngredient = {
  id: string;
  amount: number;
  food: {
    id: string;
    name: string;
  };
};

type Meal = {
  id: string;
  date: Date;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: MealIngredient[];
  isFavorite?: boolean;
  hasAllergens?: boolean;
  allergens?: string[];
};

type MealPlan = {
  id: string;
  startDate: Date;
  endDate: Date;
  goalType: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: Meal[];
};

type MealPlanApi = Omit<MealPlan, "startDate" | "endDate" | "meals"> & {
  startDate: string;
  endDate: string;
  meals: Array<Omit<Meal, "date"> & { date: string }>;
};

export default function MealPlanningPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("plan");
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const normalizeMealPlan = (plan: MealPlanApi | null): MealPlan | null => {
    if (!plan) return null;

    return {
      ...plan,
      startDate: new Date(plan.startDate),
      endDate: new Date(plan.endDate),
      meals: plan.meals.map((meal) => ({
        ...meal,
        date: new Date(meal.date),
      })),
    };
  };

  // Calculate Date Range
  const dateRange = useMemo(() => {
    const startDate =
      viewMode === "day"
        ? currentDate
        : viewMode === "week"
          ? startOfWeek(currentDate, { weekStartsOn: 1 })
          : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const endDate =
      viewMode === "day"
        ? currentDate
        : viewMode === "week"
          ? addDays(startDate, 6)
          : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return {
      start: startDate.getTime(),
      end: endDate.getTime(),
    };
  }, [currentDate, viewMode]);

  const loadMealPlan = async () => {
    try {
      setLoadingPlan(true);
      const response = await fetch(
        `/api/meal-plans?startDate=${new Date(
          dateRange.start
        ).toISOString()}&endDate=${new Date(dateRange.end).toISOString()}`
      );

      if (!response.ok) {
        throw new Error("获取食谱计划失败");
      }

      const data = await response.json();
      const planPayload = "plan" in data ? data.plan : data;
      setMealPlan(normalizeMealPlan(planPayload));
    } catch (error) {
      console.error("获取食谱计划失败:", error);
      setMealPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/auth/signin");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    loadMealPlan();
  }, [isLoaded, isSignedIn, dateRange.start, dateRange.end]);

  const handleNavigateDate = (direction: "prev" | "next") => {
    const newDate =
      direction === "prev"
        ? viewMode === "week"
          ? subWeeks(currentDate, 1)
          : viewMode === "month"
            ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
            : addDays(currentDate, -1)
        : viewMode === "week"
          ? addWeeks(currentDate, 1)
          : viewMode === "month"
            ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            : addDays(currentDate, 1);

    setCurrentDate(newDate);
  };

  const handleGenerateNewPlan = async () => {
    setProfileError(null);

    try {
      const response = await fetch("/api/meal-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: currentDate.toISOString(),
          days: viewMode === "day" ? 1 : viewMode === "week" ? 7 : 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 处理资料不完整错误 - 显示引导提示
        if (data.code === "MEMBER_PROFILE_INCOMPLETE") {
          setProfileError(data.error);
          toast.error(data.error);
          return;
        }

        // 处理成员未找到错误
        if (data.code === "MEMBER_NOT_FOUND") {
          setProfileError("请先创建家庭成员后再生成食谱计划");
          toast.error("未找到关联的成员");
          return;
        }

        toast.error(data.error || "生成食谱计划失败");
        return;
      }

      await loadMealPlan();
      toast.success("食谱计划生成成功！");
    } catch (error) {
      console.error("生成食谱计划失败:", error);
      toast.error("网络错误，请检查网络连接后重试");
    }
  };

  const handleQuickAdd = async (recipeId: string, mealType: Meal["mealType"]) => {
    if (!mealPlan) return;

    try {
      const response = await fetch(`/api/meal-plans/${mealPlan.id}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          mealType,
          date: currentDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("添加餐次失败");
      }

      await loadMealPlan();
      toast.success("已加入食谱计划");
    } catch (error) {
      console.error("添加餐次失败:", error);
      toast.error("添加餐次失败，请重试");
    }
  };

  const handleExportPlan = () => {
    if (!mealPlan) return;
    const exportData = {
      plan: mealPlan,
      exportDate: new Date().toISOString(),
      viewMode,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meal-plan-${format(currentDate, "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("食谱计划已导出");
  };

  const loading = !isLoaded || loadingPlan;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">加载食谱计划中...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Utensils className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">食谱规划</h1>
                <p className="text-sm text-gray-500">个性化健康食谱管理</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPlan} disabled={!mealPlan}>
                <Download className="mr-2 h-4 w-4" />
                导出
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/meal-planning/settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                设置
              </Button>
              <Button onClick={handleGenerateNewPlan}>
                <Plus className="mr-2 h-4 w-4" />
                生成新计划
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              食谱计划
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              营养分析
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              收藏管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleNavigateDate("prev")}>
                      ←
                    </Button>
                    <div className="min-w-48 text-center">
                      <h2 className="text-lg font-semibold">
                        {viewMode === "day" &&
                          format(currentDate, "yyyy年M月d日", { locale: zhCN })}
                        {viewMode === "week" &&
                          `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy年M月d日", { locale: zhCN })} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "M月d日", { locale: zhCN })}`}
                        {viewMode === "month" && format(currentDate, "yyyy年M月", { locale: zhCN })}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {viewMode === "day" && "日视图"}
                        {viewMode === "week" && "周视图"}
                        {viewMode === "month" && "月视图"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleNavigateDate("next")}>
                      →
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === "day" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("day")}
                    >
                      <Clock className="mr-2 h-4 w-4" />日
                    </Button>
                    <Button
                      variant={viewMode === "week" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("week")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />周
                    </Button>
                    <Button
                      variant={viewMode === "month" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("month")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />月
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="mr-2 h-4 w-4" />
                      列表
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {mealPlan ? (
                  <>
                    {viewMode === "list" ? (
                      <MealListView meals={mealPlan.meals} />
                    ) : (
                      <MealCalendarView
                        meals={mealPlan.meals}
                        viewMode={viewMode}
                        currentDate={currentDate}
                        onMealUpdate={() => {}}
                      />
                    )}
                  </>
                ) : (
                  <div className="space-y-4 py-12">
                    {/* 资料不完整提示 */}
                    {profileError && (
                      <div className="mx-auto max-w-md">
                        <ProfileIncompleteAlert
                          message={profileError}
                          onDismiss={() => setProfileError(null)}
                        />
                      </div>
                    )}

                    <div className="text-center">
                      <Utensils className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                      <h3 className="mb-2 text-lg font-medium text-gray-900">暂无食谱计划</h3>
                      <p className="mb-6 text-gray-500">
                        点击&quot;生成新计划&quot;开始您的个性化食谱规划
                      </p>
                      <Button onClick={handleGenerateNewPlan}>
                        <Plus className="mr-2 h-4 w-4" />
                        生成新计划
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-6">
            {mealPlan ? (
              <NutritionSummary planId={mealPlan.id} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">暂无营养数据</h3>
                  <p className="text-gray-500">请先生成食谱计划</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <FavoriteMeals onQuickAdd={handleQuickAdd} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
