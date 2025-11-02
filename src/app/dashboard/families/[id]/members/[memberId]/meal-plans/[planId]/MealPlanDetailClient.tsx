'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WeeklyPlan } from '@/components/meal-planning/WeeklyPlan';
import { NutritionSummary } from '@/components/meal-planning/NutritionSummary';
import { SwapIngredient } from '@/components/meal-planning/SwapIngredient';
import type { MealPlan, Meal, MealIngredient } from '@prisma/client';

interface MealPlanWithMeals extends MealPlan {
  meals: (Meal & {
    ingredients: (MealIngredient & {
      food: {
        id: string
        name: string
      }
    })[]
  })[]
}

interface MealPlanDetailClientProps {
  mealPlan: MealPlanWithMeals
  memberName: string
  familyId: string
  memberId: string
}

export function MealPlanDetailClient({
  mealPlan: initialMealPlan,
  memberName,
  familyId,
  memberId,
}: MealPlanDetailClientProps) {
  const router = useRouter();
  const [mealPlan, setMealPlan] = useState(initialMealPlan);
  const [swapMealId, setSwapMealId] = useState<string | null>(null);

  const handleReplaceMeal = (mealId: string) => {
    setSwapMealId(mealId);
  };

  const handleReplaceSuccess = async () => {
    setSwapMealId(null);
    
    // 刷新数据
    try {
      const response = await fetch(`/api/members/${memberId}/meal-plans`);
      if (response.ok) {
        const data = await response.json();
        const updatedPlan = data.mealPlans.find(
          (p: MealPlanWithMeals) => p.id === mealPlan.id
        );
        if (updatedPlan) {
          setMealPlan(updatedPlan);
        }
      }
    } catch (err) {
      console.error('刷新数据失败:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个食谱计划吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/meal-plans/${mealPlan.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 导航回列表页
      router.push(
        `/dashboard/families/${familyId}/members/${memberId}/meal-plans`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleGenerateShoppingList = async () => {
    try {
      const response = await fetch(
        `/api/meal-plans/${mealPlan.id}/shopping-list`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('生成购物清单失败');
      }

      const data = await response.json();
      // 导航到购物清单页面
      router.push(
        `/dashboard/families/${familyId}/members/${memberId}/shopping-lists/${data.shoppingList.id}`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '生成失败');
    }
  };

  const selectedMeal = swapMealId
    ? mealPlan.meals.find((m) => m.id === swapMealId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 面包屑导航 */}
          <nav className="mb-6" aria-label="面包屑导航">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              <li>
                <Link
                  href={`/dashboard/families/${familyId}`}
                  className="hover:text-gray-900 transition-colors"
                >
                  家庭
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/dashboard/families/${familyId}/members/${memberId}`}
                  className="hover:text-gray-900 transition-colors"
                >
                  {memberName}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/dashboard/families/${familyId}/members/${memberId}/meal-plans`}
                  className="hover:text-gray-900 transition-colors"
                >
                  食谱规划
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">
                <span className="text-gray-900">详情</span>
              </li>
            </ol>
          </nav>

          {/* 标题和操作 */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">食谱计划详情</h1>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-700 bg-red-50 rounded-lg font-medium hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="删除食谱计划"
              >
                删除
              </button>
            </div>
          </div>

          {/* 营养统计 */}
          <div className="mb-6">
            <NutritionSummary planId={mealPlan.id} />
          </div>

          {/* 7天食谱 */}
          <div className="mb-6">
            <WeeklyPlan
              mealPlan={mealPlan}
              onReplaceMeal={handleReplaceMeal}
              onGenerateShoppingList={handleGenerateShoppingList}
            />
          </div>

          {/* 替换餐食弹窗 */}
          {selectedMeal && (
            <SwapIngredient
              planId={mealPlan.id}
              meal={{
                id: selectedMeal.id,
                date: selectedMeal.date.toISOString(),
                mealType: selectedMeal.mealType,
                calories: selectedMeal.calories,
                protein: selectedMeal.protein,
                carbs: selectedMeal.carbs,
                fat: selectedMeal.fat,
                ingredients: selectedMeal.ingredients.map((ing) => ({
                  id: ing.id,
                  amount: ing.amount,
                  food: {
                    id: ing.food.id,
                    name: ing.food.name,
                  },
                })),
              }}
              isOpen={!!swapMealId}
              onClose={() => setSwapMealId(null)}
              onSuccess={handleReplaceSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}

