'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, ChefHat, Clock, DollarSign, Users } from 'lucide-react';

export interface RecommendationSettings {
  memberId: string;
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  servings: number;
  maxCookTime: number;
  budgetLimit: number;
  dietaryRestrictions: string[];
  excludedIngredients: string[];
  preferredCuisines: string[];
  season?: 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
  spiceLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  sweetness?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  saltiness?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  costLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  isLowCarb?: boolean;
  isLowFat?: boolean;
  isHighProtein?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
}

interface RecipeRecommendationSettingsProps {
  settings: RecommendationSettings;
  onSettingsChange: (settings: RecommendationSettings) => void;
  onApplySettings?: () => void;
  loading?: boolean;
  showAdvanced?: boolean;
}

export default function RecipeRecommendationSettings({
  settings,
  onSettingsChange,
  onApplySettings,
  loading = false,
  showAdvanced = false,
}: RecipeRecommendationSettingsProps) {
  const [newRestriction, setNewRestriction] = useState('');
  const [newExcludedIngredient, setNewExcludedIngredient] = useState('');

  const mealTypes = [
    { value: 'BREAKFAST', label: '早餐' },
    { value: 'LUNCH', label: '午餐' },
    { value: 'DINNER', label: '晚餐' },
    { value: 'SNACK', label: '加餐' },
  ];

  const seasons = [
    { value: 'SPRING', label: '春季' },
    { value: 'SUMMER', label: '夏季' },
    { value: 'AUTUMN', label: '秋季' },
    { value: 'WINTER', label: '冬季' },
  ];

  const cuisines = [
    '中式',
    '川菜',
    '粤菜',
    '湘菜',
    '鲁菜',
    '苏菜',
    '浙菜',
    '闽菜',
    '徽菜',
    '日式',
    '韩式',
    '意式',
    '法式',
    '泰式',
    '印度菜',
    '墨西哥菜',
    '地中海菜',
  ];

  const spiceLevels = [
    { value: 'NONE', label: '不辣' },
    { value: 'LOW', label: '微辣' },
    { value: 'MEDIUM', label: '中辣' },
    { value: 'HIGH', label: '重辣' },
    { value: 'EXTREME', label: '极辣' },
  ];

  const sweetnessLevels = [
    { value: 'NONE', label: '不甜' },
    { value: 'LOW', label: '微甜' },
    { value: 'MEDIUM', label: '中等甜' },
    { value: 'HIGH', label: '甜' },
    { value: 'EXTREME', label: '极甜' },
  ];

  const saltinessLevels = [
    { value: 'LOW', label: '清淡' },
    { value: 'MEDIUM', label: '适中' },
    { value: 'HIGH', label: '咸' },
    { value: 'EXTREME', label: '很咸' },
  ];

  const costLevels = [
    { value: 'LOW', label: '经济实惠' },
    { value: 'MEDIUM', label: '中等价位' },
    { value: 'HIGH', label: '高端食材' },
  ];

  const updateSetting = <K extends keyof RecommendationSettings>(
    key: K,
    value: RecommendationSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const toggleArrayItem = <K extends keyof RecommendationSettings>(
    key: K,
    item: string,
  ) => {
    const currentArray = settings[key] as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    updateSetting(key, newArray);
  };

  const addDietaryRestriction = () => {
    if (
      newRestriction.trim() &&
      !settings.dietaryRestrictions.includes(newRestriction.trim())
    ) {
      updateSetting('dietaryRestrictions', [
        ...settings.dietaryRestrictions,
        newRestriction.trim(),
      ]);
      setNewRestriction('');
    }
  };

  const addExcludedIngredient = () => {
    if (
      newExcludedIngredient.trim() &&
      !settings.excludedIngredients.includes(newExcludedIngredient.trim())
    ) {
      updateSetting('excludedIngredients', [
        ...settings.excludedIngredients,
        newExcludedIngredient.trim(),
      ]);
      setNewExcludedIngredient('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <Settings className='h-5 w-5' />
          <CardTitle>推荐设置</CardTitle>
        </div>
        <CardDescription>
          调整您的偏好设置以获得更精准的个性化推荐
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* 基础设置 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium flex items-center gap-2'>
            <ChefHat className='h-4 w-4' />
            基础设置
          </h3>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>餐次类型</Label>
              <Select
                value={settings.mealType || ''}
                onValueChange={(value) =>
                  updateSetting(
                    'mealType',
                    (value as RecommendationSettings['mealType']) || undefined,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择餐次' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>不限</SelectItem>
                  {mealTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>季节</Label>
              <Select
                value={settings.season || ''}
                onValueChange={(value) =>
                  updateSetting(
                    'season',
                    (value as RecommendationSettings['season']) || undefined,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择季节' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>不限</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.value} value={season.value}>
                      {season.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>用餐人数: {settings.servings}人</Label>
            <Slider
              value={[settings.servings]}
              onValueChange={(value) => updateSetting('servings', value[0])}
              max={8}
              min={1}
              step={1}
              className='w-full'
            />
          </div>

          <div className='space-y-2'>
            <Label className='flex items-center gap-2'>
              <Clock className='h-4 w-4' />
              最大烹饪时间: {settings.maxCookTime}分钟
            </Label>
            <Slider
              value={[settings.maxCookTime]}
              onValueChange={(value) => updateSetting('maxCookTime', value[0])}
              max={180}
              min={10}
              step={10}
              className='w-full'
            />
          </div>

          <div className='space-y-2'>
            <Label className='flex items-center gap-2'>
              <DollarSign className='h-4 w-4' />
              预算限制: ¥{settings.budgetLimit}
            </Label>
            <Slider
              value={[settings.budgetLimit]}
              onValueChange={(value) => updateSetting('budgetLimit', value[0])}
              max={200}
              min={10}
              step={10}
              className='w-full'
            />
          </div>
        </div>

        <Separator />

        {/* 口味偏好 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>口味偏好</h3>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>辣度偏好</Label>
              <Select
                value={settings.spiceLevel || 'MEDIUM'}
                onValueChange={(value) =>
                  updateSetting(
                    'spiceLevel',
                    value as RecommendationSettings['spiceLevel'],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {spiceLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>甜度偏好</Label>
              <Select
                value={settings.sweetness || 'MEDIUM'}
                onValueChange={(value) =>
                  updateSetting(
                    'sweetness',
                    value as RecommendationSettings['sweetness'],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sweetnessLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>咸度偏好</Label>
              <Select
                value={settings.saltiness || 'MEDIUM'}
                onValueChange={(value) =>
                  updateSetting(
                    'saltiness',
                    value as RecommendationSettings['saltiness'],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {saltinessLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* 菜系偏好 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>菜系偏好</h3>
          <div className='space-y-2'>
            <Label>选择您喜欢的菜系</Label>
            <div className='grid grid-cols-3 md:grid-cols-4 gap-2'>
              {cuisines.map((cuisine) => (
                <Button
                  key={cuisine}
                  variant={
                    settings.preferredCuisines.includes(cuisine)
                      ? 'default'
                      : 'outline'
                  }
                  size='sm'
                  onClick={() => toggleArrayItem('preferredCuisines', cuisine)}
                  className='justify-start'
                >
                  {cuisine}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* 饮食限制 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>饮食限制</h3>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label>低碳水</Label>
              <Switch
                checked={settings.isLowCarb || false}
                onCheckedChange={(checked) =>
                  updateSetting('isLowCarb', checked)
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <Label>低脂肪</Label>
              <Switch
                checked={settings.isLowFat || false}
                onCheckedChange={(checked) =>
                  updateSetting('isLowFat', checked)
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <Label>高蛋白</Label>
              <Switch
                checked={settings.isHighProtein || false}
                onCheckedChange={(checked) =>
                  updateSetting('isHighProtein', checked)
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <Label>素食</Label>
              <Switch
                checked={settings.isVegetarian || false}
                onCheckedChange={(checked) =>
                  updateSetting('isVegetarian', checked)
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <Label>严格素食</Label>
              <Switch
                checked={settings.isVegan || false}
                onCheckedChange={(checked) => updateSetting('isVegan', checked)}
              />
            </div>

            <div className='flex items-center justify-between'>
              <Label>无麸质</Label>
              <Switch
                checked={settings.isGlutenFree || false}
                onCheckedChange={(checked) =>
                  updateSetting('isGlutenFree', checked)
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <Label>无乳制品</Label>
              <Switch
                checked={settings.isDairyFree || false}
                onCheckedChange={(checked) =>
                  updateSetting('isDairyFree', checked)
                }
              />
            </div>
          </div>
        </div>

        {showAdvanced && (
          <>
            <Separator />

            {/* 高级设置 */}
            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>高级设置</h3>

              <div className='space-y-2'>
                <Label>成本等级</Label>
                <Select
                  value={settings.costLevel || 'MEDIUM'}
                  onValueChange={(value) =>
                    updateSetting(
                      'costLevel',
                      value as RecommendationSettings['costLevel'],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {costLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label>饮食限制</Label>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    value={newRestriction}
                    onChange={(e) => setNewRestriction(e.target.value)}
                    placeholder='添加饮食限制'
                    className='flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm'
                    onKeyPress={(e) =>
                      e.key === 'Enter' && addDietaryRestriction()
                    }
                  />
                  <Button onClick={addDietaryRestriction} size='sm'>
                    添加
                  </Button>
                </div>
                <div className='flex flex-wrap gap-1 mt-2'>
                  {settings.dietaryRestrictions.map((restriction) => (
                    <Badge
                      key={restriction}
                      variant='secondary'
                      className='cursor-pointer'
                    >
                      {restriction}
                      <button
                        onClick={() =>
                          toggleArrayItem('dietaryRestrictions', restriction)
                        }
                        className='ml-1 text-xs'
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <Label>排除食材</Label>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    value={newExcludedIngredient}
                    onChange={(e) => setNewExcludedIngredient(e.target.value)}
                    placeholder='添加要排除的食材'
                    className='flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm'
                    onKeyPress={(e) =>
                      e.key === 'Enter' && addExcludedIngredient()
                    }
                  />
                  <Button onClick={addExcludedIngredient} size='sm'>
                    添加
                  </Button>
                </div>
                <div className='flex flex-wrap gap-1 mt-2'>
                  {settings.excludedIngredients.map((ingredient) => (
                    <Badge
                      key={ingredient}
                      variant='destructive'
                      className='cursor-pointer'
                    >
                      {ingredient}
                      <button
                        onClick={() =>
                          toggleArrayItem('excludedIngredients', ingredient)
                        }
                        className='ml-1 text-xs'
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 应用按钮 */}
        {onApplySettings && (
          <div className='pt-4'>
            <Button
              onClick={onApplySettings}
              className='w-full'
              disabled={loading}
            >
              {loading ? '应用中...' : '应用设置并获取推荐'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
