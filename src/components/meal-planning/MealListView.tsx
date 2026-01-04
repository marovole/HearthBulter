'use client';

import { useState } from 'react';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MealCard } from './MealCard';
import { RecipeDetailModal } from './RecipeDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Utensils,
  AlertTriangle,
  Heart,
  Eye,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface Meal {
  id: string;
  date: Date;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
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

interface MealListViewProps {
  meals: Meal[];
}

type SortField = 'date' | 'calories' | 'protein' | 'mealType';
type SortOrder = 'asc' | 'desc';
type FilterMealType = 'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

const MEAL_TYPE_LABELS = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '加餐',
};

const MEAL_TYPE_COLORS = {
  BREAKFAST: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LUNCH: 'bg-blue-100 text-blue-800 border-blue-200',
  DINNER: 'bg-purple-100 text-purple-800 border-purple-200',
  SNACK: 'bg-green-100 text-green-800 border-green-200',
};

export function MealListView({ meals }: MealListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterMealType, setFilterMealType] = useState<FilterMealType>('ALL');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 过滤和排序餐食
  const filteredAndSortedMeals = meals
    .filter((meal) => {
      // 搜索过滤
      const searchMatch =
        searchTerm === '' ||
        meal.ingredients.some((ing) =>
          ing.food.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      // 餐次类型过滤
      const typeMatch =
        filterMealType === 'ALL' || meal.mealType === filterMealType;

      // 收藏过滤
      const favoriteMatch = !showFavoritesOnly || meal.isFavorite;

      return searchMatch && typeMatch && favoriteMatch;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'calories':
          comparison = a.calories - b.calories;
          break;
        case 'protein':
          comparison = a.protein - b.protein;
          break;
        case 'mealType':
          const typeOrder = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
          comparison =
            typeOrder.indexOf(a.mealType) - typeOrder.indexOf(b.mealType);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // 按日期分组
  const groupedMeals = filteredAndSortedMeals.reduce(
    (groups, meal) => {
      const dateKey = format(new Date(meal.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: new Date(meal.date),
          meals: [],
        };
      }
      groups[dateKey].meals.push(meal);
      return groups;
    },
    {} as Record<string, { date: Date; meals: Meal[] }>,
  );

  // 处理餐食点击
  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowDetailModal(true);
  };

  // 处理餐食替换
  const handleReplaceMeal = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meal-plans/meals/${mealId}/replace`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('替换餐食失败');
      }

      toast.success('餐食替换成功');
      // 这里可以触发数据刷新
    } catch (error) {
      console.error('替换餐食失败:', error);
      toast.error('替换餐食失败，请重试');
    }
  };

  // 处理收藏切换
  const handleToggleFavorite = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meal-plans/meals/${mealId}/favorite`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('操作失败');
      }

      toast.success('收藏状态已更新');
      // 这里可以触发数据刷新
    } catch (error) {
      console.error('更新收藏状态失败:', error);
      toast.error('操作失败，请重试');
    }
  };

  // 计算统计信息
  const totalMeals = filteredAndSortedMeals.length;
  const totalCalories = filteredAndSortedMeals.reduce(
    (sum, meal) => sum + meal.calories,
    0,
  );
  const avgCalories = totalMeals > 0 ? totalCalories / totalMeals : 0;
  const favoriteCount = filteredAndSortedMeals.filter(
    (meal) => meal.isFavorite,
  ).length;
  const allergenCount = filteredAndSortedMeals.filter(
    (meal) => meal.hasAllergens,
  ).length;

  return (
    <div className='space-y-6'>
      {/* 搜索和过滤控件 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Utensils className='h-5 w-5' />
            食谱列表
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* 搜索框 */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <Input
              placeholder='搜索食材...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>

          {/* 过滤和排序控件 */}
          <div className='flex flex-wrap items-center gap-4'>
            {/* 餐次类型过滤 */}
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4 text-gray-500' />
              <select
                value={filterMealType}
                onChange={(e) =>
                  setFilterMealType(e.target.value as FilterMealType)
                }
                className='px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='ALL'>全部餐次</option>
                <option value='BREAKFAST'>早餐</option>
                <option value='LUNCH'>午餐</option>
                <option value='DINNER'>晚餐</option>
                <option value='SNACK'>加餐</option>
              </select>
            </div>

            {/* 排序控件 */}
            <div className='flex items-center gap-2'>
              <SortAsc className='h-4 w-4 text-gray-500' />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className='px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='date'>按日期</option>
                <option value='calories'>按热量</option>
                <option value='protein'>按蛋白质</option>
                <option value='mealType'>按餐次</option>
              </select>

              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                }
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className='h-4 w-4' />
                ) : (
                  <SortDesc className='h-4 w-4' />
                )}
              </Button>
            </div>

            {/* 收藏过滤 */}
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size='sm'
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart
                className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`}
              />
              仅收藏
            </Button>
          </div>

          {/* 统计信息 */}
          <div className='flex flex-wrap items-center gap-4 text-sm text-gray-600'>
            <span>共 {totalMeals} 餐</span>
            <span>总计 {totalCalories.toFixed(0)} kcal</span>
            <span>平均 {avgCalories.toFixed(0)} kcal/餐</span>
            {favoriteCount > 0 && (
              <Badge variant='secondary'>
                <Heart className='h-3 w-3 mr-1' />
                {favoriteCount} 个收藏
              </Badge>
            )}
            {allergenCount > 0 && (
              <Badge variant='destructive'>
                <AlertTriangle className='h-3 w-3 mr-1' />
                {allergenCount} 个含过敏原
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 餐食列表 */}
      {Object.entries(groupedMeals).length > 0 ? (
        <div className='space-y-6'>
          {Object.entries(groupedMeals)
            .sort(
              (a, b) =>
                new Date(b[1].date).getTime() - new Date(a[1].date).getTime(),
            )
            .map(([dateKey, group]) => (
              <Card key={dateKey}>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-lg'>
                    <Calendar className='h-5 w-5' />
                    {format(group.date, 'yyyy年M月d日 EEEE', { locale: zhCN })}
                    <Badge variant='outline'>{group.meals.length} 餐</Badge>
                    <Badge variant='secondary'>
                      {group.meals
                        .reduce((sum, meal) => sum + meal.calories, 0)
                        .toFixed(0)}{' '}
                      kcal
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                    {group.meals.map((meal) => (
                      <div
                        key={meal.id}
                        className='cursor-pointer hover:shadow-lg transition-shadow'
                        onClick={() => handleMealClick(meal)}
                      >
                        <div className='relative'>
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

                          {/* 状态标识 */}
                          <div className='absolute top-2 right-2 flex gap-1'>
                            {meal.isFavorite && (
                              <div className='bg-white rounded-full p-1 shadow-sm'>
                                <Heart className='h-4 w-4 text-red-500 fill-current' />
                              </div>
                            )}
                            {meal.hasAllergens && (
                              <div className='bg-white rounded-full p-1 shadow-sm'>
                                <AlertTriangle className='h-4 w-4 text-amber-500' />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className='text-center py-12'>
            <Utensils className='h-16 w-16 text-gray-300 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              {searchTerm || filterMealType !== 'ALL' || showFavoritesOnly
                ? '未找到匹配的食谱'
                : '暂无食谱数据'}
            </h3>
            <p className='text-gray-500'>
              {searchTerm || filterMealType !== 'ALL' || showFavoritesOnly
                ? '尝试调整搜索条件或筛选器'
                : '请先生成食谱计划'}
            </p>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
