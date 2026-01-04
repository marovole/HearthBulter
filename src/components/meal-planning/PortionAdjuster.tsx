'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Minus,
  Users,
  Calculator,
  Scale,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface PortionAdjusterProps {
  mealId: string;
  originalServings: number;
  originalIngredients: Array<{
    id: string;
    amount: number;
    food: {
      id: string;
      name: string;
      unit?: string;
    };
  }>;
  originalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onAdjust?: (
    newServings: number,
    adjustedIngredients: any[],
    adjustedNutrition: any,
  ) => void;
}

export function PortionAdjuster({
  mealId,
  originalServings,
  originalIngredients,
  originalNutrition,
  onAdjust,
}: PortionAdjusterProps) {
  const [servings, setServings] = useState(originalServings);
  const [customServings, setCustomServings] = useState(
    originalServings.toString(),
  );
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [adjustedIngredients, setAdjustedIngredients] =
    useState(originalIngredients);
  const [adjustedNutrition, setAdjustedNutrition] = useState(originalNutrition);
  const [hasChanges, setHasChanges] = useState(false);

  const scaleFactor = servings / originalServings;

  useEffect(() => {
    const newIngredients = originalIngredients.map((ingredient) => ({
      ...ingredient,
      amount: ingredient.amount * scaleFactor,
    }));

    const newNutrition = {
      calories: originalNutrition.calories * scaleFactor,
      protein: originalNutrition.protein * scaleFactor,
      carbs: originalNutrition.carbs * scaleFactor,
      fat: originalNutrition.fat * scaleFactor,
    };

    setAdjustedIngredients(newIngredients);
    setAdjustedNutrition(newNutrition);
    setHasChanges(servings !== originalServings);
  }, [servings, originalServings, originalIngredients, originalNutrition]);

  const handleQuickAdjust = (newServings: number) => {
    if (newServings < 0.5 || newServings > 20) {
      toast.error('份量必须在0.5到20人份之间');
      return;
    }
    setServings(newServings);
    setCustomServings(newServings.toString());
    setIsCustomMode(false);
  };

  const handleCustomServings = () => {
    const value = parseFloat(customServings);
    if (isNaN(value) || value < 0.5 || value > 20) {
      toast.error('请输入有效的份量数值（0.5-20）');
      return;
    }
    setServings(value);
    setIsCustomMode(false);
  };

  const handleReset = () => {
    setServings(originalServings);
    setCustomServings(originalServings.toString());
    setIsCustomMode(false);
  };

  const handleApplyChanges = () => {
    onAdjust?.(servings, adjustedIngredients, adjustedNutrition);
    toast.success(`份量已调整为 ${servings} 人份`);
  };

  const formatAmount = (amount: number, unit?: string): string => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}${unit || 'kg'}`;
    }
    return `${amount.toFixed(0)}${unit || 'g'}`;
  };

  const getPercentageChange = (original: number, adjusted: number): string => {
    const change = ((adjusted - original) / original) * 100;
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  const getChangeColor = (original: number, adjusted: number): string => {
    const change = ((adjusted - original) / original) * 100;
    if (Math.abs(change) < 1) return 'text-gray-600';
    return change > 0 ? 'text-green-600' : 'text-orange-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Scale className='h-5 w-5' />
          份量调整
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* 当前份量显示 */}
        <div className='flex items-center justify-between p-4 bg-blue-50 rounded-lg'>
          <div className='flex items-center gap-3'>
            <Users className='h-8 w-8 text-blue-600' />
            <div>
              <div className='text-sm text-blue-600 font-medium'>当前份量</div>
              <div className='text-2xl font-bold text-blue-900'>
                {servings} 人份
              </div>
            </div>
          </div>

          {hasChanges && (
            <Badge
              variant='outline'
              className='bg-green-100 text-green-800 border-green-200'
            >
              <Calculator className='h-3 w-3 mr-1' />
              调整中
            </Badge>
          )}
        </div>

        {/* 快速调整按钮 */}
        <div className='space-y-3'>
          <h4 className='font-medium text-gray-900'>快速调整</h4>
          <div className='grid grid-cols-4 gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleQuickAdjust(Math.max(0.5, servings - 0.5))}
              disabled={servings <= 0.5}
            >
              <Minus className='h-4 w-4 mr-1' />
              -0.5
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => handleQuickAdjust(Math.max(0.5, servings - 1))}
              disabled={servings <= 1}
            >
              <Minus className='h-4 w-4 mr-1' />
              -1
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => handleQuickAdjust(servings + 1)}
              disabled={servings >= 20}
            >
              <Plus className='h-4 w-4 mr-1' />
              +1
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => handleQuickAdjust(Math.min(20, servings + 0.5))}
              disabled={servings >= 20}
            >
              <Plus className='h-4 w-4 mr-1' />
              +0.5
            </Button>
          </div>

          {/* 常用份量 */}
          <div className='grid grid-cols-6 gap-2'>
            {[1, 2, 3, 4, 6, 8].map((num) => (
              <Button
                key={num}
                variant={servings === num ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleQuickAdjust(num)}
              >
                {num}人份
              </Button>
            ))}
          </div>
        </div>

        {/* 自定义份量 */}
        <div className='space-y-3'>
          <h4 className='font-medium text-gray-900'>自定义份量</h4>
          <div className='flex gap-2'>
            <Input
              type='number'
              value={customServings}
              onChange={(e) => {
                setCustomServings(e.target.value);
                setIsCustomMode(true);
              }}
              placeholder='输入份量'
              min='0.5'
              max='20'
              step='0.5'
              className='flex-1'
            />
            <Button onClick={handleCustomServings} disabled={!isCustomMode}>
              应用
            </Button>
          </div>
          <div className='text-sm text-gray-500'>
            支持0.5-20人份，可输入小数（如1.5人份）
          </div>
        </div>

        {/* 调整预览 */}
        {hasChanges && (
          <div className='space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50'>
            <h4 className='font-medium text-blue-900'>调整预览</h4>

            {/* 营养变化 */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center'>
                <div className='text-lg font-bold text-orange-600'>
                  {adjustedNutrition.calories.toFixed(0)}
                </div>
                <div className='text-sm text-gray-600'>千卡</div>
                <div
                  className={`text-xs ${getChangeColor(originalNutrition.calories, adjustedNutrition.calories)}`}
                >
                  {getPercentageChange(
                    originalNutrition.calories,
                    adjustedNutrition.calories,
                  )}
                </div>
              </div>

              <div className='text-center'>
                <div className='text-lg font-bold text-blue-600'>
                  {adjustedNutrition.protein.toFixed(1)}
                </div>
                <div className='text-sm text-gray-600'>蛋白质(g)</div>
                <div
                  className={`text-xs ${getChangeColor(originalNutrition.protein, adjustedNutrition.protein)}`}
                >
                  {getPercentageChange(
                    originalNutrition.protein,
                    adjustedNutrition.protein,
                  )}
                </div>
              </div>

              <div className='text-center'>
                <div className='text-lg font-bold text-green-600'>
                  {adjustedNutrition.carbs.toFixed(1)}
                </div>
                <div className='text-sm text-gray-600'>碳水(g)</div>
                <div
                  className={`text-xs ${getChangeColor(originalNutrition.carbs, adjustedNutrition.carbs)}`}
                >
                  {getPercentageChange(
                    originalNutrition.carbs,
                    adjustedNutrition.carbs,
                  )}
                </div>
              </div>

              <div className='text-center'>
                <div className='text-lg font-bold text-purple-600'>
                  {adjustedNutrition.fat.toFixed(1)}
                </div>
                <div className='text-sm text-gray-600'>脂肪(g)</div>
                <div
                  className={`text-xs ${getChangeColor(originalNutrition.fat, adjustedNutrition.fat)}`}
                >
                  {getPercentageChange(
                    originalNutrition.fat,
                    adjustedNutrition.fat,
                  )}
                </div>
              </div>
            </div>

            {/* 食材变化 */}
            <div className='space-y-2'>
              <h5 className='text-sm font-medium text-blue-900'>食材调整</h5>
              <div className='max-h-40 overflow-y-auto space-y-1'>
                {adjustedIngredients.slice(0, 5).map((ingredient) => {
                  const original = originalIngredients.find(
                    (i) => i.id === ingredient.id,
                  );
                  return (
                    <div
                      key={ingredient.id}
                      className='flex justify-between text-sm'
                    >
                      <span className='text-gray-700'>
                        {ingredient.food.name}
                      </span>
                      <div className='text-right'>
                        <span className='font-medium'>
                          {formatAmount(
                            ingredient.amount,
                            ingredient.food.unit,
                          )}
                        </span>
                        <span
                          className={`ml-2 ${getChangeColor(original?.amount || 0, ingredient.amount)}`}
                        >
                          (
                          {getPercentageChange(
                            original?.amount || 0,
                            ingredient.amount,
                          )}
                          )
                        </span>
                      </div>
                    </div>
                  );
                })}
                {adjustedIngredients.length > 5 && (
                  <div className='text-sm text-gray-500 text-center'>
                    还有 {adjustedIngredients.length - 5} 种食材...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 警告信息 */}
        {servings > 10 && (
          <Alert>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              当前份量较大，请确保有足够的烹饪设备和食材。
            </AlertDescription>
          </Alert>
        )}

        {servings < 1 && (
          <Alert>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              小份量调整可能影响烹饪效果，建议按照原食谱比例进行。
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        <div className='flex gap-2'>
          {hasChanges && (
            <Button onClick={handleApplyChanges} className='flex-1'>
              <CheckCircle className='h-4 w-4 mr-2' />
              应用调整
            </Button>
          )}

          <Button
            variant='outline'
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RefreshCw className='h-4 w-4 mr-2' />
            重置
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
