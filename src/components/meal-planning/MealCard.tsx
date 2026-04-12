"use client";

import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MealIngredient {
  id: string;
  amount: number;
  food: {
    id: string;
    name: string;
  };
}

interface Meal {
  id: string;
  date: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: MealIngredient[];
}

interface MealCardProps {
  meal: Meal;
  onReplace?: () => void;
  showDate?: boolean;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  BREAKFAST: "bg-yellow-100 text-yellow-800",
  LUNCH: "bg-blue-100 text-blue-800",
  DINNER: "bg-purple-100 text-purple-800",
  SNACK: "bg-green-100 text-green-800",
};

function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}kg`;
  }
  return `${amount.toFixed(0)}g`;
}

export function MealCard({ meal, onReplace, showDate = false }: MealCardProps) {
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const MAX_INGREDIENTS_DISPLAY = 5;
  const hasMoreIngredients = meal.ingredients.length > MAX_INGREDIENTS_DISPLAY;
  const displayedIngredients = showAllIngredients
    ? meal.ingredients
    : meal.ingredients.slice(0, MAX_INGREDIENTS_DISPLAY);

  // 计算营养成分百分比 (假设每餐目标为 500 kcal)
  const targetCalories = 500;
  const caloriesPercentage = Math.min((meal.calories / targetCalories) * 100, 100);

  return (
    <div className="active:scale-98 rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:shadow-lg">
      {/* 餐食图片占位符 */}
      <div className="mb-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="text-center">
          <div className="mb-1 text-4xl">
            {meal.mealType === "BREAKFAST" && "🍳"}
            {meal.mealType === "LUNCH" && "🍱"}
            {meal.mealType === "DINNER" && "🍽️"}
            {meal.mealType === "SNACK" && "🍎"}
          </div>
          <p className="text-xs text-gray-500">图片即将推出</p>
        </div>
      </div>

      {/* 头部：餐次类型和日期 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-1 text-sm font-medium ${MEAL_TYPE_COLORS[meal.mealType]}`}
          >
            {MEAL_TYPE_LABELS[meal.mealType]}
          </span>
          {showDate && (
            <span className="text-xs text-gray-600">
              {format(new Date(meal.date), "M月d日", { locale: zhCN })}
            </span>
          )}
        </div>
        {onReplace && (
          <button
            onClick={onReplace}
            className="rounded px-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label={`替换${MEAL_TYPE_LABELS[meal.mealType]}`}
          >
            替换
          </button>
        )}
      </div>

      {/* 食材列表 */}
      <div className="mb-3">
        <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700">
          <span>📝</span>
          <span>食材</span>
          {meal.ingredients.length > 0 && (
            <span className="text-xs text-gray-500">({meal.ingredients.length})</span>
          )}
        </h4>
        <div className="max-h-32 space-y-1 overflow-y-auto">
          {meal.ingredients.length > 0 ? (
            <>
              {displayedIngredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="flex items-center justify-between py-1 text-sm text-gray-600"
                >
                  <span className="flex-1 truncate">{ingredient.food.name}</span>
                  <span className="ml-2 whitespace-nowrap text-gray-500">
                    {formatAmount(ingredient.amount)}
                  </span>
                </div>
              ))}
              {hasMoreIngredients && (
                <button
                  onClick={() => setShowAllIngredients(!showAllIngredients)}
                  className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-800 focus:underline focus:outline-none"
                >
                  {showAllIngredients
                    ? "收起 ▲"
                    : `显示更多 (${meal.ingredients.length - MAX_INGREDIENTS_DISPLAY}) ▼`}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm italic text-gray-400">暂无食材信息</p>
          )}
        </div>
      </div>

      {/* 营养成分 - 带可视化 */}
      <div className="border-t border-gray-200 pt-3">
        <h5 className="mb-2 text-xs font-medium text-gray-600">营养成分</h5>

        {/* 热量进度条 */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-600">🔥 热量</span>
            <span className="font-semibold text-gray-900">{meal.calories.toFixed(0)} kcal</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-300"
              style={{ width: `${caloriesPercentage}%` }}
            />
          </div>
        </div>

        {/* 宏量营养素 */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="mb-1 text-gray-500">🥩 蛋白质</div>
            <div className="font-semibold text-gray-900">{meal.protein.toFixed(1)}</div>
            <div className="text-gray-400">g</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-gray-500">🍚 碳水</div>
            <div className="font-semibold text-gray-900">{meal.carbs.toFixed(1)}</div>
            <div className="text-gray-400">g</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-gray-500">🥑 脂肪</div>
            <div className="font-semibold text-gray-900">{meal.fat.toFixed(1)}</div>
            <div className="text-gray-400">g</div>
          </div>
        </div>
      </div>
    </div>
  );
}
