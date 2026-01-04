"use client";

import { useState } from "react";
import { MealType } from "@prisma/client";
import { FoodSearchDialog } from "./FoodSearchDialog";

interface Food {
  id: string;
  name: string;
  amount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealCheckInProps {
  memberId: string;
  onSubmit: (data: {
    mealType: MealType;
    foods: Array<{ foodId: string; amount: number }>;
    notes?: string;
  }) => Promise<void>;
}

export function MealCheckIn({ memberId, onSubmit }: MealCheckInProps) {
  const [mealType, setMealType] = useState<MealType>(MealType.BREAKFAST);
  const [selectedFoods, setSelectedFoods] = useState<Food[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  const mealTypes = [
    { value: MealType.BREAKFAST, label: "早餐", icon: "🌅" },
    { value: MealType.LUNCH, label: "午餐", icon: "🌞" },
    { value: MealType.DINNER, label: "晚餐", icon: "🌙" },
    { value: MealType.SNACK, label: "加餐", icon: "🍎" },
  ];

  const handleAddFood = (food: Food) => {
    setSelectedFoods([...selectedFoods, food]);
    setShowFoodSearch(false);
  };

  const handleUpdateAmount = (index: number, amount: number) => {
    const updated = [...selectedFoods];
    updated[index].amount = amount;
    setSelectedFoods(updated);
  };

  const handleRemoveFood = (index: number) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index));
  };

  const calculateTotalNutrition = () => {
    return selectedFoods.reduce(
      (total, food) => {
        const ratio = food.amount / 100;
        return {
          calories: total.calories + food.calories * ratio,
          protein: total.protein + food.protein * ratio,
          carbs: total.carbs + food.carbs * ratio,
          fat: total.fat + food.fat * ratio,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  };

  const handleSubmit = async () => {
    if (selectedFoods.length === 0) {
      alert("请至少添加一种食物");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        mealType,
        foods: selectedFoods.map((food) => ({
          foodId: food.id,
          amount: food.amount,
        })),
        notes: notes || undefined,
      });

      // 重置表单
      setSelectedFoods([]);
      setNotes("");
      alert("打卡成功！");
    } catch (error) {
      alert("打卡失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalNutrition = calculateTotalNutrition();

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* 餐食类型选择 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">选择餐食类型</h3>
        <div className="grid grid-cols-4 gap-2">
          {mealTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setMealType(type.value)}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${
                  mealType === type.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }
              `}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-sm font-medium">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 已选食物列表 */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">已添加食物</h3>
          <button
            onClick={() => setShowFoodSearch(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            + 添加食物
          </button>
        </div>

        {selectedFoods.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            还没有添加食物，点击上方按钮添加
          </div>
        ) : (
          <div className="space-y-2">
            {selectedFoods.map((food, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{food.name}</div>
                  <div className="text-sm text-gray-500">
                    {Math.round((food.calories * food.amount) / 100)} kcal
                  </div>
                </div>
                <input
                  type="number"
                  value={food.amount}
                  onChange={(e) =>
                    handleUpdateAmount(index, Number(e.target.value))
                  }
                  className="w-20 px-2 py-1 border rounded text-center"
                  min="1"
                />
                <span className="text-sm text-gray-500">g</span>
                <button
                  onClick={() => handleRemoveFood(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 营养摘要 */}
      {selectedFoods.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-3">营养摘要</h4>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(totalNutrition.calories)}
              </div>
              <div className="text-sm text-gray-600">热量 (kcal)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(totalNutrition.protein)}
              </div>
              <div className="text-sm text-gray-600">蛋白质 (g)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round(totalNutrition.carbs)}
              </div>
              <div className="text-sm text-gray-600">碳水 (g)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(totalNutrition.fat)}
              </div>
              <div className="text-sm text-gray-600">脂肪 (g)</div>
            </div>
          </div>
        </div>
      )}

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium mb-2">备注（可选）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          rows={3}
          placeholder="记录今天吃饭的感受..."
        />
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || selectedFoods.length === 0}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "提交中..." : "完成打卡"}
      </button>

      {/* 食物搜索对话框 */}
      <FoodSearchDialog
        isOpen={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        onSelectFood={handleAddFood}
        memberId={memberId}
      />
    </div>
  );
}
