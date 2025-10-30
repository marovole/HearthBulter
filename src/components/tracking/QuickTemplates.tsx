'use client';

import { useState, useEffect } from 'react';
import { Clock, Star, Edit, Trash2, Plus } from 'lucide-react';

interface TemplateFood {
  foodId: string;
  name: string;
  amount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Template {
  id: string;
  name: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  foods: TemplateFood[];
  totalCalories: number;
  usageCount: number;
  isRecommended: boolean;
  createdAt: string;
}

interface QuickTemplatesProps {
  memberId: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  onSelectTemplate: (template: Template) => void;
  onEditTemplate?: (template: Template) => void;
  onCreateTemplate?: () => void;
}

export function QuickTemplates({
  memberId,
  mealType,
  onSelectTemplate,
  onEditTemplate,
  onCreateTemplate
}: QuickTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [memberId, mealType]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tracking/templates?memberId=${memberId}&mealType=${mealType}`
      );
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const response = await fetch(`/api/tracking/templates/${templateId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
      }
    } catch (error) {
      console.error('删除模板失败:', error);
    }
  };

  const getMealTypeLabel = (type: string) => {
    const labels = {
      BREAKFAST: '早餐',
      LUNCH: '午餐',
      DINNER: '晚餐',
      SNACK: '加餐'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const displayTemplates = showAll 
    ? templates 
    : templates.filter(t => t.isRecommended).slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">快速模板</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-gray-900">快速模板</h3>
          <span className="text-sm text-gray-500">
            ({getMealTypeLabel(mealType)})
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {onCreateTemplate && (
            <button
              onClick={onCreateTemplate}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>新建模板</span>
            </button>
          )}
          
          {templates.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAll ? '收起' : `查看全部 (${templates.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Templates List */}
      {displayTemplates.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">暂无{getMealTypeLabel(mealType)}模板</p>
          {onCreateTemplate && (
            <button
              onClick={onCreateTemplate}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              创建第一个模板
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayTemplates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Template Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    {template.isRecommended && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span>{template.foods.length} 种食物</span>
                    <span>{template.totalCalories} kcal</span>
                    <span>使用 {template.usageCount} 次</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {onEditTemplate && (
                    <button
                      onClick={() => onEditTemplate(template)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="编辑模板"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="删除模板"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Food List */}
              <div className="space-y-2 mb-3">
                {template.foods.slice(0, 3).map((food, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {food.name} × {food.amount}g
                    </span>
                    <span className="text-gray-500">
                      {food.calories} kcal
                    </span>
                  </div>
                ))}
                {template.foods.length > 3 && (
                  <div className="text-sm text-gray-500">
                    还有 {template.foods.length - 3} 种食物...
                  </div>
                )}
              </div>

              {/* Nutrition Summary */}
              <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">热量</p>
                  <p className="font-medium text-orange-600">
                    {template.foods.reduce((sum, food) => sum + food.calories, 0)} kcal
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">蛋白质</p>
                  <p className="font-medium text-blue-600">
                    {template.foods.reduce((sum, food) => sum + food.protein, 0).toFixed(1)}g
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">碳水</p>
                  <p className="font-medium text-green-600">
                    {template.foods.reduce((sum, food) => sum + food.carbs, 0).toFixed(1)}g
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">脂肪</p>
                  <p className="font-medium text-yellow-600">
                    {template.foods.reduce((sum, food) => sum + food.fat, 0).toFixed(1)}g
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectTemplate(template)}
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              >
                一键添加到餐食
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Show More/Less */}
      {templates.length > 3 && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {showAll ? '收起模板' : `查看全部 ${templates.length} 个模板`}
          </button>
        </div>
      )}
    </div>
  );
}
