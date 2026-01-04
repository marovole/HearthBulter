'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Scale,
} from 'lucide-react';

interface SubstituteFood {
  id: string;
  name: string;
  category: string;
  tags: string[];
}

interface Substitution {
  id: string;
  substitutionType: string;
  reason: string;
  nutritionDelta: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  costDelta: number;
  tasteSimilarity: number;
  conditions: string[];
  substituteFood: SubstituteFood;
}

interface SubstituteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalIngredientId: string;
  originalIngredientName: string;
}

export function SubstituteModal({
  open,
  onOpenChange,
  originalIngredientId,
  originalIngredientName,
}: SubstituteModalProps) {
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && originalIngredientId) {
      loadSubstitutions();
    }
  }, [open, originalIngredientId]);

  const loadSubstitutions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/recipes/substitute?originalIngredientId=${originalIngredientId}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load substitutions');
      }

      setSubstitutions(data.substitutions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSubstitutionTypeColor = (type: string) => {
    switch (type) {
      case 'ALLERGY':
        return 'bg-red-100 text-red-800';
      case 'STOCK_OUT':
        return 'bg-orange-100 text-orange-800';
      case 'BUDGET':
        return 'bg-green-100 text-green-800';
      case 'PREFERENCE':
        return 'bg-blue-100 text-blue-800';
      case 'NUTRITION':
        return 'bg-purple-100 text-purple-800';
      case 'SEASONAL':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubstitutionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      ALLERGY: '过敏替换',
      STOCK_OUT: '缺货替换',
      BUDGET: '预算替换',
      PREFERENCE: '偏好替换',
      NUTRITION: '营养替换',
      SEASONAL: '季节替换',
    };
    return labels[type] || type;
  };

  const formatNutritionDelta = (delta: { [key: string]: number }) => {
    const parts = [];
    if (delta.calories)
      parts.push(`${delta.calories > 0 ? '+' : ''}${delta.calories}kcal`);
    if (delta.protein)
      parts.push(`${delta.protein > 0 ? '+' : ''}${delta.protein}g蛋白质`);
    if (delta.carbs)
      parts.push(`${delta.carbs > 0 ? '+' : ''}${delta.carbs}g碳水`);
    if (delta.fat) parts.push(`${delta.fat > 0 ? '+' : ''}${delta.fat}g脂肪`);
    return parts.length > 0 ? parts.join(', ') : '营养成分无变化';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>食材替换建议</DialogTitle>
          <DialogDescription>
            为 <strong>{originalIngredientName}</strong> 推荐以下替代食材
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {loading && (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
              <span className='ml-2'>正在加载替换建议...</span>
            </div>
          )}

          {error && (
            <div className='text-center py-8'>
              <AlertTriangle className='h-8 w-8 text-red-600 mx-auto mb-2' />
              <p className='text-red-600'>{error}</p>
            </div>
          )}

          {!loading && !error && substitutions.length === 0 && (
            <div className='text-center py-8'>
              <CheckCircle className='h-8 w-8 text-green-600 mx-auto mb-2' />
              <p className='text-muted-foreground'>
                该食材无需替换或暂无替代建议
              </p>
            </div>
          )}

          {substitutions.map((sub) => (
            <Card key={sub.id} className='hover:shadow-md transition-shadow'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='text-lg font-medium'>
                      {originalIngredientName}
                    </div>
                    <ArrowRight className='h-4 w-4 text-muted-foreground' />
                    <div className='text-lg font-medium text-primary'>
                      {sub.substituteFood.name}
                    </div>
                  </div>
                  <Badge
                    className={getSubstitutionTypeColor(sub.substitutionType)}
                  >
                    {getSubstitutionTypeLabel(sub.substitutionType)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className='space-y-3'>
                {sub.reason && (
                  <div>
                    <h4 className='text-sm font-medium mb-1'>替换原因</h4>
                    <p className='text-sm text-muted-foreground'>
                      {sub.reason}
                    </p>
                  </div>
                )}

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='flex items-center gap-2'>
                    <Scale className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <div className='text-sm font-medium'>口味相似度</div>
                      <div className='text-sm text-muted-foreground'>
                        {(sub.tasteSimilarity * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <DollarSign className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <div className='text-sm font-medium'>成本变化</div>
                      <div
                        className={`text-sm ${sub.costDelta > 0 ? 'text-red-600' : sub.costDelta < 0 ? 'text-green-600' : 'text-muted-foreground'}`}
                      >
                        {sub.costDelta > 0 ? '+' : ''}¥
                        {sub.costDelta.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className='text-sm font-medium mb-1'>营养变化</div>
                    <div className='text-xs text-muted-foreground'>
                      {formatNutritionDelta(sub.nutritionDelta || {})}
                    </div>
                  </div>
                </div>

                {sub.conditions && sub.conditions.length > 0 && (
                  <div>
                    <h4 className='text-sm font-medium mb-2'>适用条件</h4>
                    <div className='flex flex-wrap gap-1'>
                      {sub.conditions.map((condition, index) => (
                        <Badge
                          key={index}
                          variant='outline'
                          className='text-xs'
                        >
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className='flex gap-2 pt-2'>
                  <Button size='sm' className='flex-1'>
                    使用此替换
                  </Button>
                  <Button variant='outline' size='sm'>
                    查看详情
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='flex justify-end pt-4 border-t'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
