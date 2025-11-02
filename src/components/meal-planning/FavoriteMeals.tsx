'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Heart, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Calendar,
  Clock,
  Users,
  ChefHat,
  X,
  SortAsc,
  SortDesc,
  Star
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { toast } from '@/lib/toast'

interface FavoriteMeal {
  id: string
  name: string
  description?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servings: number
  cookingTime?: number
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  date: Date
  tags?: string[]
  image?: string
}

interface FavoriteMealsProps {
  userId?: string
  onMealSelect?: (meal: FavoriteMeal) => void
  onRemoveFavorite?: (mealId: string) => void
}

const MEAL_TYPE_LABELS = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '加餐',
}

const DIFFICULTY_LABELS = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难',
}

const DIFFICULTY_COLORS = {
  EASY: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HARD: 'bg-red-100 text-red-800',
}

export function FavoriteMeals({ 
  userId, 
  onMealSelect, 
  onRemoveFavorite 
}: FavoriteMealsProps) {
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'date' | 'calories' | 'cookingTime'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setLoading(true)
    try {
      // 模拟API调用 - 实际应该调用后端
      const mockFavorites = generateMockFavorites()
      setFavorites(mockFavorites)
    } catch (error) {
      toast.error('加载收藏列表失败')
    } finally {
      setLoading(false)
    }
  }

  const generateMockFavorites = (): FavoriteMeal[] => {
    return [
      {
        id: '1',
        name: '宫保鸡丁',
        description: '经典川菜，麻辣鲜香',
        calories: 520,
        protein: 32,
        carbs: 45,
        fat: 18,
        servings: 2,
        cookingTime: 30,
        difficulty: 'MEDIUM',
        mealType: 'LUNCH',
        date: new Date('2024-01-15'),
        tags: ['川菜', '鸡肉', '下饭菜'],
        image: '/images/kungpao-chicken.jpg'
      },
      {
        id: '2',
        name: '蒸蛋羹',
        description: '嫩滑爽口，营养丰富',
        calories: 180,
        protein: 12,
        carbs: 8,
        fat: 10,
        servings: 1,
        cookingTime: 15,
        difficulty: 'EASY',
        mealType: 'BREAKFAST',
        date: new Date('2024-01-14'),
        tags: ['家常菜', '鸡蛋', '营养'],
        image: '/images/steamed-egg.jpg'
      },
      {
        id: '3',
        name: '红烧肉',
        description: '肥而不腻，入口即化',
        calories: 680,
        protein: 28,
        carbs: 15,
        fat: 55,
        servings: 3,
        cookingTime: 90,
        difficulty: 'HARD',
        mealType: 'DINNER',
        date: new Date('2024-01-13'),
        tags: ['红烧', '猪肉', '经典'],
        image: '/images/braised-pork.jpg'
      },
      {
        id: '4',
        name: '蔬菜沙拉',
        description: '清爽健康，低卡路里',
        calories: 220,
        protein: 8,
        carbs: 25,
        fat: 12,
        servings: 1,
        cookingTime: 10,
        difficulty: 'EASY',
        mealType: 'LUNCH',
        date: new Date('2024-01-12'),
        tags: ['素食', '减脂', '沙拉'],
        image: '/images/vegetable-salad.jpg'
      }
    ]
  }

  const handleRemoveFavorite = async (mealId: string) => {
    try {
      // 调用API取消收藏
      setFavorites(prev => prev.filter(fav => fav.id !== mealId))
      onRemoveFavorite?.(mealId)
      toast.success('已取消收藏')
    } catch (error) {
      toast.error('取消收藏失败')
    }
  }

  const filteredAndSorted = favorites
    .filter(meal => {
      if (searchTerm && !meal.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (filterType !== 'all' && meal.mealType !== filterType) {
        return false
      }
      if (filterDifficulty !== 'all' && meal.difficulty !== filterDifficulty) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'date':
          aValue = a.date.getTime()
          bValue = b.date.getTime()
          break
        case 'calories':
          aValue = a.calories
          bValue = b.calories
          break
        case 'cookingTime':
          aValue = a.cookingTime || 0
          bValue = b.cookingTime || 0
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

  const toggleSort = (field: 'date' | 'calories' | 'cookingTime') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredAndSorted.map((meal) => (
        <Card key={meal.id} className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-1">{meal.name}</CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {meal.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFavorite(meal.id)
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* 图片 */}
            {meal.image && (
              <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={meal.image} 
                  alt={meal.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 标签 */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </Badge>
              {meal.difficulty && (
                <Badge className={`text-xs ${DIFFICULTY_COLORS[meal.difficulty]}`}>
                  {DIFFICULTY_LABELS[meal.difficulty]}
                </Badge>
              )}
              {meal.cookingTime && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {meal.cookingTime}分钟
                </Badge>
              )}
            </div>

            {/* 营养信息 */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">热量</span>
                <span className="font-medium">{meal.calories} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">蛋白质</span>
                <span className="font-medium">{meal.protein}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">碳水</span>
                <span className="font-medium">{meal.carbs}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">脂肪</span>
                <span className="font-medium">{meal.fat}g</span>
              </div>
            </div>

            {/* 其他信息 */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {meal.servings}人份
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(meal.date, 'MM/dd', { locale: zhCN })}
              </div>
            </div>

            {/* 标签 */}
            {meal.tags && meal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {meal.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {meal.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{meal.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <Button
              onClick={() => onMealSelect?.(meal)}
              className="w-full"
            >
              查看详情
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderListView = () => (
    <div className="space-y-3">
      {filteredAndSorted.map((meal) => (
        <Card key={meal.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* 图片 */}
              {meal.image && (
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={meal.image} 
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* 主要信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{meal.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {meal.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFavorite(meal.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span>{meal.calories} kcal</span>
                  <span>蛋白质 {meal.protein}g</span>
                  <span>碳水 {meal.carbs}g</span>
                  <span>脂肪 {meal.fat}g</span>
                  {meal.cookingTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meal.cookingTime}分钟
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {meal.servings}人份
                  </span>
                </div>
              </div>

              {/* 右侧信息 */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {MEAL_TYPE_LABELS[meal.mealType]}
                  </Badge>
                  {meal.difficulty && (
                    <Badge className={`text-xs ${DIFFICULTY_COLORS[meal.difficulty]}`}>
                      {DIFFICULTY_LABELS[meal.difficulty]}
                    </Badge>
                  )}
                </div>
                
                <Button
                  size="sm"
                  onClick={() => onMealSelect?.(meal)}
                >
                  查看详情
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载收藏列表...</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          我的收藏 ({favorites.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 搜索和筛选 */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索收藏的食谱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>

          {/* 筛选选项 */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">全部餐型</option>
              <option value="BREAKFAST">早餐</option>
              <option value="LUNCH">午餐</option>
              <option value="DINNER">晚餐</option>
              <option value="SNACK">加餐</option>
            </select>

            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-1 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">全部难度</option>
              <option value="EASY">简单</option>
              <option value="MEDIUM">中等</option>
              <option value="HARD">困难</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort('date')}
              className="flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              日期
              {sortBy === 'date' && (
                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort('calories')}
              className="flex items-center gap-1"
            >
              热量
              {sortBy === 'calories' && (
                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSort('cookingTime')}
              className="flex items-center gap-1"
            >
              <Clock className="h-3 w-3" />
              时间
              {sortBy === 'cookingTime' && (
                sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* 收藏列表 */}
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' || filterDifficulty !== 'all' 
                ? '没有找到匹配的收藏' 
                : '还没有收藏任何食谱'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all' || filterDifficulty !== 'all' 
                ? '尝试调整搜索条件或筛选器' 
                : '在食谱详情页面点击收藏按钮来添加收藏'}
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600">
              显示 {filteredAndSorted.length} / {favorites.length} 个收藏
            </div>
            
            {viewMode === 'grid' ? renderGridView() : renderListView()}
          </>
        )}
      </CardContent>
    </Card>
  )
}
