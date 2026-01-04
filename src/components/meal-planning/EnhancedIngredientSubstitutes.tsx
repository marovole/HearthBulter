"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  AlertTriangle,
  Check,
  X,
  Info,
  Leaf,
  Heart,
  Scale,
  TrendingUp,
  Filter,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface Food {
  id: string;
  name: string;
  unit?: string;
  category?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  allergens?: string[];
}

interface MealIngredient {
  id: string;
  amount: number;
  food: Food;
}

interface EnhancedIngredientSubstitutesProps {
  ingredient: MealIngredient;
  mealId: string;
  isOpen: boolean;
  onClose: () => void;
  onReplace?: (newIngredient: MealIngredient) => void;
}

interface SubstituteOption {
  food: Food;
  similarityScore: number;
  nutritionMatch: number;
  allergenWarning: boolean;
  reason: string;
  recommendedAmount: number;
}

const SUBSTITUTE_CATEGORIES = {
  肉类: ["鸡肉", "猪肉", "牛肉", "羊肉", "鱼肉", "虾", "蟹"],
  蔬菜: ["白菜", "菠菜", "西兰花", "胡萝卜", "土豆", "番茄", "黄瓜"],
  水果: ["苹果", "香蕉", "橙子", "草莓", "葡萄", "西瓜"],
  谷物: ["大米", "面条", "面包", "燕麦", "玉米", "小米"],
  乳制品: ["牛奶", "酸奶", "奶酪", "黄油"],
  豆制品: ["豆腐", "豆浆", "豆皮", "腐竹"],
  调料: ["盐", "糖", "酱油", "醋", "料酒", "生抽"],
};

export function EnhancedIngredientSubstitutes({
  ingredient,
  mealId,
  isOpen,
  onClose,
  onReplace,
}: EnhancedIngredientSubstitutesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [substitutes, setSubstitutes] = useState<SubstituteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubstitute, setSelectedSubstitute] =
    useState<SubstituteOption | null>(null);
  const [customAmount, setCustomAmount] = useState(
    ingredient.amount.toString(),
  );
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showAllergenOnly, setShowAllergenOnly] = useState(false);

  useEffect(() => {
    if (isOpen && ingredient) {
      searchSubstitutes();
    }
  }, [isOpen, ingredient]);

  const searchSubstitutes = async () => {
    setLoading(true);
    try {
      // 模拟API调用 - 实际应该调用后端
      const mockSubstitutes = await generateMockSubstitutes(ingredient.food);
      setSubstitutes(mockSubstitutes);
    } catch (error) {
      toast.error("获取替代食材失败");
    } finally {
      setLoading(false);
    }
  };

  const generateMockSubstitutes = async (
    originalFood: Food,
  ): Promise<SubstituteOption[]> => {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    const allFoods = generateMockFoods(originalFood.category || "");
    const substitutes: SubstituteOption[] = [];

    for (const food of allFoods) {
      if (food.id === originalFood.id) continue;

      const similarity = calculateSimilarity(originalFood, food);
      const nutritionMatch = calculateNutritionMatch(originalFood, food);
      const allergenWarning = hasAllergenConflict(originalFood, food);

      if (similarity > 0.3 || nutritionMatch > 0.4) {
        substitutes.push({
          food,
          similarityScore: similarity,
          nutritionMatch: nutritionMatch,
          allergenWarning,
          reason: generateReason(
            originalFood,
            food,
            similarity,
            nutritionMatch,
          ),
          recommendedAmount: calculateRecommendedAmount(originalFood, food),
        });
      }
    }

    return substitutes
      .sort((a, b) => {
        // 优先推荐无过敏原且相似度高的
        if (a.allergenWarning !== b.allergenWarning) {
          return a.allergenWarning ? 1 : -1;
        }
        return (
          b.similarityScore +
          b.nutritionMatch -
          (a.similarityScore + a.nutritionMatch)
        );
      })
      .slice(0, 8);
  };

  const generateMockFoods = (category: string): Food[] => {
    const mockFoods: Food[] = [];

    Object.entries(SUBSTITUTE_CATEGORIES).forEach(([cat, foods]) => {
      foods.forEach((foodName) => {
        mockFoods.push({
          id: `food-${foodName}`,
          name: foodName,
          category: cat,
          unit: "g",
          calories: Math.floor(Math.random() * 200) + 50,
          protein: Math.random() * 20,
          carbs: Math.random() * 30,
          fat: Math.random() * 15,
          fiber: Math.random() * 10,
          sodium: Math.random() * 500,
          allergens:
            foodName.includes("虾") || foodName.includes("蟹")
              ? ["海鲜"]
              : foodName.includes("奶") || foodName.includes("酪")
                ? ["乳制品"]
                : [],
        });
      });
    });

    return mockFoods;
  };

  const calculateSimilarity = (food1: Food, food2: Food): number => {
    if (food1.category === food2.category) return 0.8;
    if (food1.category?.includes("肉") && food2.category?.includes("肉"))
      return 0.7;
    if (food1.category?.includes("蔬菜") && food2.category?.includes("蔬菜"))
      return 0.6;
    return 0.3;
  };

  const calculateNutritionMatch = (food1: Food, food2: Food): number => {
    if (!food1.calories || !food2.calories) return 0.5;

    const calorieDiff =
      Math.abs(food1.calories - food2.calories) / food1.calories;
    const proteinDiff = Math.abs((food1.protein || 0) - (food2.protein || 0));
    const fatDiff = Math.abs((food1.fat || 0) - (food2.fat || 0));

    return Math.max(0, 1 - (calorieDiff + proteinDiff / 20 + fatDiff / 15) / 3);
  };

  const hasAllergenConflict = (food1: Food, food2: Food): boolean => {
    const allergens1 = food1.allergens || [];
    const allergens2 = food2.allergens || [];
    return allergens2.some((allergen) => !allergens1.includes(allergen));
  };

  const generateReason = (
    original: Food,
    substitute: Food,
    similarity: number,
    nutritionMatch: number,
  ): string => {
    const reasons = [];

    if (similarity > 0.7) reasons.push("同类食材");
    if (nutritionMatch > 0.7) reasons.push("营养相似");
    if (
      substitute.calories &&
      original.calories &&
      substitute.calories < original.calories
    ) {
      reasons.push("低卡路里");
    }
    if (
      substitute.protein &&
      original.protein &&
      substitute.protein > original.protein
    ) {
      reasons.push("高蛋白");
    }
    if (substitute.fiber && substitute.fiber > 5) {
      reasons.push("高纤维");
    }

    return reasons.length > 0 ? reasons.join("、") : "可替代食材";
  };

  const calculateRecommendedAmount = (
    original: Food,
    substitute: Food,
  ): number => {
    if (!original.calories || !substitute.calories) return original.amount;
    return Math.round(
      (original.calories / substitute.calories) * original.amount,
    );
  };

  const handleReplace = async () => {
    if (!selectedSubstitute) {
      toast.error("请选择替代食材");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/meal-plans/meals/${mealId}/ingredients/${ingredient.id}/replace`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newFoodId: selectedSubstitute.food.id,
            newAmount:
              parseFloat(customAmount) || selectedSubstitute.recommendedAmount,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("替换失败");
      }

      const result = await response.json();

      onReplace?.({
        id: ingredient.id,
        amount:
          parseFloat(customAmount) || selectedSubstitute.recommendedAmount,
        food: selectedSubstitute.food,
      });

      toast.success(
        `已将 ${ingredient.food.name} 替换为 ${selectedSubstitute.food.name}`,
      );
      onClose();
    } catch (error) {
      toast.error("替换失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubstitutes = substitutes.filter((sub) => {
    if (searchTerm && !sub.food.name.includes(searchTerm)) return false;
    if (filterCategory && sub.food.category !== filterCategory) return false;
    if (showAllergenOnly && !sub.allergenWarning) return false;
    return true;
  });

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number): string => {
    if (score >= 0.8) return "bg-green-100 text-green-800";
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              替换食材: {ingredient.food.name}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 原食材信息 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">当前食材</h4>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{ingredient.food.name}</div>
                <div className="text-sm text-gray-600">
                  {ingredient.amount}g • {ingredient.food.category}
                </div>
              </div>
              <div className="text-right text-sm">
                <div>{ingredient.food.calories || 0} kcal</div>
                <div className="text-gray-600">
                  蛋白质 {ingredient.food.protein?.toFixed(1) || 0}g
                </div>
              </div>
            </div>
          </div>

          {/* 搜索和筛选 */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索替代食材..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAllergenOnly(!showAllergenOnly)}
                className={
                  showAllergenOnly ? "bg-orange-50 border-orange-200" : ""
                }
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                过敏警告
              </Button>
            </div>

            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterCategory === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("")}
              >
                <Filter className="h-3 w-3 mr-1" />
                全部
              </Button>
              {Object.keys(SUBSTITUTE_CATEGORIES).map((category) => (
                <Button
                  key={category}
                  variant={filterCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* 替代选项列表 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <div className="text-gray-600 mt-2">搜索替代食材...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {filteredSubstitutes.map((substitute, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedSubstitute?.food.id === substitute.food.id
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  } ${substitute.allergenWarning ? "border-orange-200" : "border-gray-200"}`}
                  onClick={() => setSelectedSubstitute(substitute)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {substitute.food.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {substitute.food.category} • 推荐份量{" "}
                        {substitute.recommendedAmount}g
                      </div>
                    </div>
                    {substitute.allergenWarning && (
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={getScoreBadge(substitute.similarityScore)}
                    >
                      相似度 {(substitute.similarityScore * 100).toFixed(0)}%
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getScoreBadge(substitute.nutritionMatch)}
                    >
                      营养匹配 {(substitute.nutritionMatch * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-700 mb-2">
                    {substitute.reason}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div>{substitute.food.calories || 0} kcal</div>
                    <div>
                      蛋白质 {substitute.food.protein?.toFixed(1) || 0}g
                    </div>
                    <div>脂肪 {substitute.food.fat?.toFixed(1) || 0}g</div>
                  </div>

                  {substitute.allergenWarning && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        可能含有过敏原: {substitute.food.allergens?.join("、")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 自定义份量 */}
          {selectedSubstitute && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                自定义份量 (克)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={selectedSubstitute.recommendedAmount.toString()}
                  min="1"
                  max="2000"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    setCustomAmount(
                      selectedSubstitute.recommendedAmount.toString(),
                    )
                  }
                >
                  使用推荐
                </Button>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={handleReplace}
              disabled={!selectedSubstitute || loading}
              className="flex-1"
            >
              {loading ? "替换中..." : "确认替换"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
