// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  AlertTriangle,
  Check,
  X,
  Info,
  Leaf,
  Heart,
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
  isOrganic?: boolean;
  isCommonAllergen?: boolean;
  tags?: string[];
}

interface MealIngredient {
  id: string;
  amount: number;
  food: Food;
}

interface SubstituteOption {
  food: Food;
  similarity: number; // 0-100, 相似度评分
  nutritionMatch: number; // 0-100, 营养匹配度
  reasons: string[]; // 替换理由
  warnings?: string[]; // 注意事项
}

interface IngredientSubstitutesProps {
  ingredient: MealIngredient;
  isOpen: boolean;
  onClose: () => void;
  onSubstitute: (newIngredient: MealIngredient) => void;
}

const CATEGORIES = {
  PROTEIN: "蛋白质",
  VEGETABLE: "蔬菜",
  FRUIT: "水果",
  GRAIN: "谷物",
  DAIRY: "乳制品",
  NUTS: "坚果",
  SPICE: "调味料",
  OIL: "油脂",
};

const SUBSTITUTION_RULES = {
  // 蛋白质类替换规则
  CHICKEN: ["豆腐", "鸡肉", "鱼肉", "蛋白粉", "扁豆"],
  BEEF: ["鸡肉", "猪肉", "豆腐", "蘑菇", "扁豆"],
  PORK: ["鸡肉", "牛肉", "豆腐", "蘑菇"],
  FISH: ["鸡肉", "豆腐", "虾", "扇贝"],
  TOFU: ["鸡肉", "鱼肉", "蛋白粉", "扁豆", "蘑菇"],

  // 蔬菜类替换规则
  BROCCOLI: ["菜花", "芦笋", "菠菜", "豆芽"],
  SPINACH: ["小白菜", "油菜", "生菜", "芝麻菜"],
  TOMATO: ["圣女果", "彩椒", "茄子", "西葫芦"],
  CARROT: ["南瓜", "红薯", "白萝卜", "甜菜根"],

  // 碳水化合物替换规则
  RICE: ["藜麦", "燕麦", "糙米", "小米", "土豆"],
  PASTA: ["荞麦面", "红薯粉", "魔芋面", "全麦意面"],
  BREAD: ["全麦面包", "燕麦面包", "玉米饼", "土豆饼"],

  // 乳制品替换规则
  MILK: ["豆浆", "杏仁奶", "燕麦奶", "椰奶"],
  CHEESE: ["营养酵母", "豆腐奶酪", "坚果奶酪"],
  YOGURT: ["椰奶酸奶", "豆浆酸奶", "杏仁酸奶"],
};

function calculateSimilarity(original: Food, substitute: Food): number {
  let score = 0;

  // 类别匹配 (40%)
  if (original.category === substitute.category) {
    score += 40;
  } else if (isSimilarCategory(original.category, substitute.category)) {
    score += 20;
  }

  // 营养相似度 (40%)
  if (original.calories && substitute.calories) {
    const calorieDiff =
      Math.abs(original.calories - substitute.calories) / original.calories;
    score += Math.max(0, 40 - calorieDiff * 100);
  }

  // 通用性 (20%)
  if (!substitute.isCommonAllergen) {
    score += 10;
  }
  if (substitute.tags?.includes("common")) {
    score += 10;
  }

  return Math.min(100, Math.round(score));
}

function isSimilarCategory(cat1?: string, cat2?: string): boolean {
  const proteinGroups = ["PROTEIN", "DAIRY", "NUTS"];
  const vegetableGroups = ["VEGETABLE", "FRUIT"];
  const grainGroups = ["GRAIN"];

  return (
    (proteinGroups.includes(cat1 || "") &&
      proteinGroups.includes(cat2 || "")) ||
    (vegetableGroups.includes(cat1 || "") &&
      vegetableGroups.includes(cat2 || "")) ||
    (grainGroups.includes(cat1 || "") && grainGroups.includes(cat2 || ""))
  );
}

function calculateNutritionMatch(original: Food, substitute: Food): number {
  if (!original.calories || !substitute.calories) return 50;

  const proteinMatch =
    original.protein && substitute.protein
      ? 100 -
        (Math.abs(original.protein - substitute.protein) / original.protein) *
          100
      : 50;

  const carbMatch =
    original.carbs && substitute.carbs
      ? 100 -
        (Math.abs(original.carbs - substitute.carbs) / original.carbs) * 100
      : 50;

  const fatMatch =
    original.fat && substitute.fat
      ? 100 - (Math.abs(original.fat - substitute.fat) / original.fat) * 100
      : 50;

  return Math.round((proteinMatch + carbMatch + fatMatch) / 3);
}

export function IngredientSubstitutes({
  ingredient,
  isOpen,
  onClose,
  onSubstitute,
}: IngredientSubstitutesProps) {
  const [substitutes, setSubstitutes] = useState<SubstituteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubstitute, setSelectedSubstitute] =
    useState<SubstituteOption | null>(null);

  useEffect(() => {
    if (isOpen && ingredient) {
      fetchSubstitutes();
    }
  }, [isOpen, ingredient]);

  const fetchSubstitutes = async () => {
    setLoading(true);
    try {
      // 这里应该调用实际的API
      // 现在使用模拟数据
      const mockSubstitutes = await generateMockSubstitutes(ingredient);
      setSubstitutes(mockSubstitutes);
    } catch (error) {
      console.error("获取替代食材失败:", error);
      toast.error("获取替代食材失败");
    } finally {
      setLoading(false);
    }
  };

  const generateMockSubstitutes = async (
    original: MealIngredient,
  ): Promise<SubstituteOption[]> => {
    // 模拟API延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    const baseSubstitutes =
      SUBSTITUTION_RULES[
        original.food.name.toUpperCase() as keyof typeof SUBSTITUTION_RULES
      ] || [];

    const mockFoods: Food[] = baseSubstitutes.map((name, index) => ({
      id: `sub-${index}`,
      name,
      unit: original.food.unit,
      category: original.food.category,
      calories: original.food.calories
        ? original.food.calories + (Math.random() - 0.5) * 100
        : undefined,
      protein: original.food.protein
        ? original.food.protein + (Math.random() - 0.5) * 10
        : undefined,
      carbs: original.food.carbs
        ? original.food.carbs + (Math.random() - 0.5) * 20
        : undefined,
      fat: original.food.fat
        ? original.food.fat + (Math.random() - 0.5) * 5
        : undefined,
      isOrganic: Math.random() > 0.7,
      isCommonAllergen: ["坚果", "牛奶", "大豆"].some((allergen) =>
        name.includes(allergen),
      ),
      tags: Math.random() > 0.5 ? ["common", "healthy"] : ["organic"],
    }));

    return mockFoods
      .map((food) => ({
        food,
        similarity: calculateSimilarity(original.food, food),
        nutritionMatch: calculateNutritionMatch(original.food, food),
        reasons: generateSubstitutionReasons(original.food, food),
        warnings: food.isCommonAllergen ? ["含常见过敏原"] : undefined,
      }))
      .sort((a, b) => b.similarity - a.similarity);
  };

  const generateSubstitutionReasons = (
    original: Food,
    substitute: Food,
  ): string[] => {
    const reasons = [];

    if (original.category === substitute.category) {
      reasons.push("同类食材，口感相似");
    }

    if (substitute.isOrganic) {
      reasons.push("有机食材，更健康");
    }

    if (
      substitute.calories &&
      original.calories &&
      substitute.calories < original.calories
    ) {
      reasons.push("热量更低，有助于减重");
    }

    if (
      substitute.protein &&
      original.protein &&
      substitute.protein > original.protein
    ) {
      reasons.push("蛋白质含量更高");
    }

    reasons.push("营养搭配均衡");

    return reasons.slice(0, 3);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const filteredSubstitutes = substitutes.filter(
    (substitute) =>
      substitute.food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      substitute.food.category
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const handleSelectSubstitute = (substitute: SubstituteOption) => {
    setSelectedSubstitute(substitute);
  };

  const handleConfirmSubstitute = () => {
    if (!selectedSubstitute) return;

    const newIngredient: MealIngredient = {
      id: `new-${Date.now()}`,
      amount: ingredient.amount, // 保持相同用量
      food: selectedSubstitute.food,
    };

    onSubstitute(newIngredient);
    onClose();
    toast.success(
      `已将 ${ingredient.food.name} 替换为 ${selectedSubstitute.food.name}`,
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            替换食材: {ingredient.food.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 原食材信息 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {ingredient.food.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {ingredient.food.category &&
                    CATEGORIES[
                      ingredient.food.category as keyof typeof CATEGORIES
                    ]}{" "}
                  • 用量: {ingredient.amount}
                  {ingredient.food.unit || "g"}
                </p>
              </div>
              <div className="text-right text-sm text-gray-600">
                {ingredient.food.calories && (
                  <div>🔥 {ingredient.food.calories} kcal</div>
                )}
                {ingredient.food.protein && (
                  <div>🥩 {ingredient.food.protein}g</div>
                )}
              </div>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索替代食材..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 替代选项列表 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">搜索替代食材中...</p>
            </div>
          ) : filteredSubstitutes.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSubstitutes.map((substitute, index) => (
                <div
                  key={substitute.food.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedSubstitute?.food.id === substitute.food.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleSelectSubstitute(substitute)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {substitute.food.name}
                        </h4>
                        {substitute.food.isOrganic && (
                          <Badge variant="secondary" className="text-xs">
                            <Leaf className="h-3 w-3 mr-1" />
                            有机
                          </Badge>
                        )}
                        {substitute.food.isCommonAllergen && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            过敏原
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>相似度: {substitute.similarity}%</span>
                        <span>营养匹配: {substitute.nutritionMatch}%</span>
                        {substitute.food.category && (
                          <span>
                            {
                              CATEGORIES[
                                substitute.food
                                  .category as keyof typeof CATEGORIES
                              ]
                            }
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {substitute.reasons.map((reason, i) => (
                          <div
                            key={i}
                            className="text-xs text-green-600 flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            {reason}
                          </div>
                        ))}
                        {substitute.warnings?.map((warning, i) => (
                          <div
                            key={i}
                            className="text-xs text-amber-600 flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-600">
                        {substitute.food.calories && (
                          <div>🔥 {substitute.food.calories} kcal</div>
                        )}
                        {substitute.food.protein && (
                          <div>🥩 {substitute.food.protein}g</div>
                        )}
                        {substitute.food.carbs && (
                          <div>🍚 {substitute.food.carbs}g</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? "未找到匹配的替代食材" : "暂无替代食材"}
              </p>
            </div>
          )}

          {/* 选择提示 */}
          {selectedSubstitute && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Info className="h-4 w-4" />
                <span className="text-sm">
                  已选择: {selectedSubstitute.food.name} (相似度:{" "}
                  {selectedSubstitute.similarity}%)
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleConfirmSubstitute}
            disabled={!selectedSubstitute}
          >
            确认替换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
