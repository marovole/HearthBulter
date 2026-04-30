"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Users,
  ChefHat,
  AlertTriangle,
  Heart,
  Share2,
  Printer,
  Edit,
  ArrowLeftRight,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MacroNutrientChartLazy } from "@/components/charts/lazy-registry";
import { IngredientSubstitutes } from "./IngredientSubstitutes";
import { EnhancedIngredientSubstitutes } from "./EnhancedIngredientSubstitutes";
import { AllergyAlert } from "./AllergyAlert";
import { AllergenIdentifier } from "./AllergenIdentifier";
import { UserAllergyWarning } from "./UserAllergyWarning";
import { CookingSteps } from "./CookingSteps";
import { MealAcceptance } from "./MealAcceptance";
import { toast } from "@/lib/toast";

interface MealIngredient {
  id: string;
  amount: number;
  food: {
    id: string;
    name: string;
    unit?: string;
    category?: string;
    allergens?: string[];
  };
}

interface CookingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  duration?: number;
  temperature?: string;
  tips?: string[];
  image?: string;
}

interface Meal {
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
  cookingTime?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  servings?: number;
  cookingSteps?: CookingStep[];
  tags?: string[];
}

interface RecipeDetailModalProps {
  meal: Meal;
  isOpen: boolean;
  onClose: () => void;
  onReplace?: () => void;
  onToggleFavorite?: () => void;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

const DIFFICULTY_LABELS = {
  EASY: "简单",
  MEDIUM: "中等",
  HARD: "困难",
};

const DIFFICULTY_COLORS = {
  EASY: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HARD: "bg-red-100 text-red-800",
};

function formatAmount(amount: number, unit?: string): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}${unit || "kg"}`;
  }
  return `${amount.toFixed(0)}${unit || "g"}`;
}

function formatCookingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

export function RecipeDetailModal({
  meal,
  isOpen,
  onClose,
  onReplace,
  onToggleFavorite,
}: RecipeDetailModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<MealIngredient | null>(null);
  const [showSubstitutes, setShowSubstitutes] = useState(false);
  const [isFavorite, setIsFavorite] = useState(meal.isFavorite || false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (isOpen && meal.id) {
      loadFavoriteStatus();
    }
  }, [isOpen, meal.id]);

  const loadFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/meal-plans/meals/${meal.id}/favorite`);
      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.isFavorite);
      }
    } catch (error) {
      console.error("获取收藏状态失败:", error);
    }
  };

  const handleToggleFavorite = async () => {
    if (favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const response = await fetch(`/api/meal-plans/meals/${meal.id}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      });

      if (!response.ok) {
        throw new Error("操作失败");
      }

      const data = await response.json();
      setIsFavorite(data.isFavorite);
      onToggleFavorite?.();
      toast.success(data.message);
    } catch (error) {
      toast.error("操作失败，请重试");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: `${MEAL_TYPE_LABELS[meal.mealType]} - ${format(new Date(meal.date), "M月d日", { locale: zhCN })}`,
        text: `热量: ${meal.calories.toFixed(0)}kcal | 蛋白质: ${meal.protein.toFixed(1)}g`,
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // 降级到复制链接
        await navigator.clipboard.writeText(window.location.href);
        toast.success("链接已复制到剪贴板");
      }
    } catch (error) {
      console.error("分享失败:", error);
      toast.error("分享失败");
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleIngredientClick = (ingredient: MealIngredient) => {
    setSelectedIngredient(ingredient);
    setShowSubstitutes(true);
  };

  const totalWeight = meal.ingredients.reduce((sum, ing) => sum + ing.amount, 0);

  const allergyIngredients = meal.ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.food.name,
    allergens: ingredient.food.allergens ?? [],
  }));

  const acceptanceIngredients = meal.ingredients.map((ingredient) => ({
    id: ingredient.id,
    amount: ingredient.amount,
    food: {
      id: ingredient.food.id,
      name: ingredient.food.name,
      unit: ingredient.food.unit ?? "g",
    },
  }));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="text-2xl">
                  {meal.mealType === "BREAKFAST" && "🍳"}
                  {meal.mealType === "LUNCH" && "🍱"}
                  {meal.mealType === "DINNER" && "🍽️"}
                  {meal.mealType === "SNACK" && "🍎"}
                </div>
                <div>
                  <div className="font-bold">
                    {MEAL_TYPE_LABELS[meal.mealType]} -{" "}
                    {format(new Date(meal.date), "M月d日", { locale: zhCN })}
                  </div>
                  <div className="text-sm font-normal text-gray-500">
                    {format(new Date(meal.date), "yyyy年M月d日 EEEE", {
                      locale: zhCN,
                    })}
                  </div>
                </div>
              </DialogTitle>

              <Button variant="ghost" size="sm" onClick={onToggleFavorite} className="mr-2">
                <Heart
                  className={`h-5 w-5 ${meal.isFavorite ? "fill-current text-red-500" : "text-gray-400"}`}
                />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* 基本信息标签 */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </Badge>

              {meal.difficulty && (
                <Badge className={DIFFICULTY_COLORS[meal.difficulty]}>
                  <ChefHat className="mr-1 h-3 w-3" />
                  {DIFFICULTY_LABELS[meal.difficulty]}
                </Badge>
              )}

              {meal.cookingTime && (
                <Badge variant="outline">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatCookingTime(meal.cookingTime)}
                </Badge>
              )}

              {meal.servings && (
                <Badge variant="outline">
                  <Users className="mr-1 h-3 w-3" />
                  {meal.servings}人份
                </Badge>
              )}

              <Badge variant="outline">总重: {formatAmount(totalWeight)}</Badge>
            </div>

            {/* 过敏原分析 */}
            {/* 用户过敏警告 - 优先显示 */}
            <UserAllergyWarning
              ingredients={allergyIngredients}
              userAllergies={[]} // 这里可以从用户设置中获取过敏信息
              userId={meal.id}
              onDismiss={() => toast.info("已忽略过敏警告")}
              onEmergencyContact={() => toast.warning("正在联系紧急联系人...")}
              showEmergencyInfo={true}
              enableNotifications={true}
            />

            {/* 过敏原标识 */}
            <AllergenIdentifier
              ingredients={allergyIngredients}
              userAllergens={[]} // 这里可以从用户设置中获取过敏原
              showDetails={false}
              onAllergenClick={(allergen) => {
                toast.info(`查看含有 ${allergen} 的食材`);
              }}
            />

            {/* 营养成分概览 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">营养成分</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {meal.calories.toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600">千卡 (kcal)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {meal.protein.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">蛋白质 (g)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {meal.carbs.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">碳水化合物 (g)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {meal.fat.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">脂肪 (g)</div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>热量密度</span>
                      <span className="font-medium">
                        {((meal.calories / totalWeight) * 100).toFixed(1)} kcal/100g
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>蛋白质占比</span>
                      <span className="font-medium">
                        {(((meal.protein * 4) / meal.calories) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>碳水占比</span>
                      <span className="font-medium">
                        {(((meal.carbs * 4) / meal.calories) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>脂肪占比</span>
                      <span className="font-medium">
                        {(((meal.fat * 9) / meal.calories) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 营养图表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">营养分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <MacroNutrientChartLazy
                    calories={meal.calories}
                    protein={meal.protein}
                    carbs={meal.carbs}
                    fat={meal.fat}
                    goalType="BALANCED"
                  />
                </CardContent>
              </Card>
            </div>

            {/* 食谱接受确认 */}
            <MealAcceptance
              mealId={meal.id}
              planId={meal.date.toISOString()} // 临时使用日期作为计划ID
              originalServings={meal.servings || 1}
              originalIngredients={acceptanceIngredients}
              originalNutrition={{
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
              }}
              onAccept={(customizations) => {
                toast.success("食谱已接受");
                onToggleFavorite?.();
              }}
              onReject={(reason) => {
                toast.success(`已拒绝食谱: ${reason}`);
              }}
              onCustomize={(customizations) => {
                toast.info("已添加自定义修改");
              }}
              onPortionAdjust={(servings, ingredients, nutrition) => {
                toast.info(`份量已调整为 ${servings} 人份`);
                // 这里可以更新meal数据或调用API
              }}
            />

            {/* 食材列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📝 食材清单 ({meal.ingredients.length}种)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {meal.ingredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                      onClick={() => handleIngredientClick(ingredient)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{ingredient.food.name}</div>
                        {ingredient.food.category && (
                          <div className="text-sm text-gray-500">{ingredient.food.category}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatAmount(ingredient.amount, ingredient.food.unit)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {((ingredient.amount / totalWeight) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-sm text-gray-600">💡 点击食材可查看替代选项</div>
              </CardContent>
            </Card>

            {/* 制作步骤 */}
            {meal.cookingSteps && meal.cookingSteps.length > 0 && (
              <CookingSteps
                steps={meal.cookingSteps}
                cookingTime={meal.cookingTime}
                difficulty={meal.difficulty}
                servings={meal.servings}
                onStepComplete={(stepId) => {
                  toast.success("步骤完成");
                }}
                onReset={() => {
                  toast.info("已重置烹饪进度");
                }}
              />
            )}

            {/* 标签 */}
            {meal.tags && meal.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {meal.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
              <Printer className="mr-2 h-4 w-4" />
              打印
            </Button>

            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              分享
            </Button>

            <Button
              variant={isFavorite ? "default" : "outline"}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className={isFavorite ? "bg-red-500 text-white hover:bg-red-600" : ""}
            >
              <Heart className={`mr-2 h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              {favoriteLoading ? "处理中..." : isFavorite ? "已收藏" : "收藏"}
            </Button>

            <Button variant="outline" onClick={onReplace}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              替换
            </Button>

            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 食材替代弹窗 */}
      {selectedIngredient && (
        <EnhancedIngredientSubstitutes
          ingredient={selectedIngredient}
          mealId={meal.id}
          isOpen={showSubstitutes}
          onClose={() => {
            setShowSubstitutes(false);
            setSelectedIngredient(null);
          }}
          onReplace={(newIngredient) => {
            // 处理食材替换逻辑
            toast.success(`已将 ${selectedIngredient.food.name} 替换为 ${newIngredient.food.name}`);
            setShowSubstitutes(false);
            setSelectedIngredient(null);
            // 这里可以刷新餐食数据或调用回调
            onReplace?.();
          }}
        />
      )}
    </>
  );
}
