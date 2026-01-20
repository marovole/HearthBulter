"use client";

import { useState } from "react";
import { format, startOfDay, addDays, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MealCard } from "./MealCard";
import type { MealType, MealPlan, Meal, MealIngredient } from "@prisma/client";

interface MealPlanWithMeals extends MealPlan {
  meals: (Meal & {
    ingredients: (MealIngredient & {
      food: {
        id: string;
        name: string;
      };
    })[];
  })[];
}

interface WeeklyPlanProps {
  mealPlan: MealPlanWithMeals;
  onReplaceMeal?: (mealId: string) => void;
  onGenerateShoppingList?: () => void;
}

const MEAL_TYPE_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

type DailyMeals = {
  date: Date;
  meals: (Meal & {
    ingredients: (MealIngredient & {
      food: {
        id: string;
        name: string;
      };
    })[];
  })[];
};

export function WeeklyPlan({ mealPlan, onReplaceMeal, onGenerateShoppingList }: WeeklyPlanProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // 按日期组织餐食
  const dailyMealsMap = new Map<string, DailyMeals>();

  // 生成日期范围
  const startDate = startOfDay(new Date(mealPlan.startDate));
  const endDate = startOfDay(new Date(mealPlan.endDate));
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // 初始化每日餐食
  for (let i = 0; i <= daysDiff; i++) {
    const date = addDays(startDate, i);
    const dateKey = format(date, "yyyy-MM-dd");
    dailyMealsMap.set(dateKey, {
      date,
      meals: [],
    });
  }

  // 分配餐食到对应日期
  mealPlan.meals.forEach((meal) => {
    const dateKey = format(new Date(meal.date), "yyyy-MM-dd");
    const dailyMeals = dailyMealsMap.get(dateKey);
    if (dailyMeals) {
      dailyMeals.meals.push(meal);
    }
  });

  // 按餐次排序每日餐食
  dailyMealsMap.forEach((dailyMeals) => {
    dailyMeals.meals.sort((a, b) => {
      const aIndex = MEAL_TYPE_ORDER.indexOf(a.mealType);
      const bIndex = MEAL_TYPE_ORDER.indexOf(b.mealType);
      return aIndex - bIndex;
    });
  });

  const dailyMeals = Array.from(dailyMealsMap.values());

  const toggleDay = (dateKey: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDays(newExpanded);
  };

  // 计算每日营养汇总
  const calculateDailyNutrition = (meals: DailyMeals["meals"]) => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      {/* 标题和操作按钮 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">7天食谱计划</h2>
          <p className="mt-1 text-sm text-gray-600">
            📅{" "}
            {format(new Date(mealPlan.startDate), "yyyy年M月d日", {
              locale: zhCN,
            })}{" "}
            -{" "}
            {format(new Date(mealPlan.endDate), "M月d日", {
              locale: zhCN,
            })}
          </p>
        </div>
        {onGenerateShoppingList && (
          <button
            onClick={onGenerateShoppingList}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            aria-label="生成购物清单"
          >
            🛒 生成购物清单
          </button>
        )}
      </div>

      {/* 每日食谱 */}
      <div className="space-y-4">
        {dailyMeals.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-md">
            <div className="mb-4 text-6xl">📅</div>
            <p className="mb-2 text-lg font-medium text-gray-600">暂无食谱数据</p>
            <p className="text-sm text-gray-500">请检查食谱计划是否已正确生成</p>
          </div>
        ) : (
          dailyMeals.map((daily) => {
            const dateKey = format(daily.date, "yyyy-MM-dd");
            const isExpanded = expandedDays.has(dateKey);
            const nutrition = calculateDailyNutrition(daily.meals);

            return (
              <div
                key={dateKey}
                className="overflow-hidden rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md"
              >
                {/* 日期头部 */}
                <button
                  onClick={() => toggleDay(dateKey)}
                  className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-expanded={isExpanded}
                  aria-label={`${format(daily.date, "M月d日 EEEE", { locale: zhCN })} 的食谱，${isExpanded ? "点击收起" : "点击展开"}`}
                >
                  <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-lg font-semibold text-gray-900">
                      {format(daily.date, "M月d日 EEEE", { locale: zhCN })}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 sm:gap-4 sm:text-sm">
                      <span className="whitespace-nowrap">
                        🔥 {nutrition.calories.toFixed(0)} kcal
                      </span>
                      <span className="whitespace-nowrap">🥩 {nutrition.protein.toFixed(1)}g</span>
                      <span className="whitespace-nowrap">🍚 {nutrition.carbs.toFixed(1)}g</span>
                      <span className="whitespace-nowrap">🥑 {nutrition.fat.toFixed(1)}g</span>
                    </div>
                  </div>
                  <span
                    className={`transform text-gray-400 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </button>

                {/* 餐食详情 - 添加展开/收起动画 */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                  style={{ overflow: isExpanded ? "visible" : "hidden" }}
                >
                  <div className="bg-white p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {daily.meals.length > 0 ? (
                        daily.meals.map((meal) => (
                          <MealCard
                            key={meal.id}
                            meal={{
                              id: meal.id,
                              date: meal.date.toISOString(),
                              mealType: meal.mealType,
                              calories: meal.calories,
                              protein: meal.protein,
                              carbs: meal.carbs,
                              fat: meal.fat,
                              ingredients: meal.ingredients.map((ing) => ({
                                id: ing.id,
                                amount: ing.amount,
                                food: {
                                  id: ing.food.id,
                                  name: ing.food.name,
                                },
                              })),
                            }}
                            onReplace={onReplaceMeal ? () => onReplaceMeal(meal.id) : undefined}
                          />
                        ))
                      ) : (
                        <div className="col-span-full py-8 text-center">
                          <div className="mb-2 text-4xl">🍽️</div>
                          <p className="text-sm text-gray-500">该日暂无餐食安排</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
