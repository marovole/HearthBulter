"use client";

import { useState, useEffect } from "react";
import { Clock, Star, Edit, Trash2, Plus } from "lucide-react";

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
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  foods: TemplateFood[];
  totalCalories: number;
  usageCount: number;
  isRecommended: boolean;
  createdAt: string;
}

interface QuickTemplatesProps {
  memberId: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  onSelectTemplate: (template: Template) => void;
  onEditTemplate?: (template: Template) => void;
  onCreateTemplate?: () => void;
}

export function QuickTemplates({
  memberId,
  mealType,
  onSelectTemplate,
  onEditTemplate,
  onCreateTemplate,
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
      console.error("加载模板失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("确定要删除这个模板吗？")) return;

    try {
      const response = await fetch(`/api/tracking/templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== templateId));
      }
    } catch (error) {
      console.error("删除模板失败:", error);
    }
  };

  const getMealTypeLabel = (type: string) => {
    const labels = {
      BREAKFAST: "早餐",
      LUNCH: "午餐",
      DINNER: "晚餐",
      SNACK: "加餐",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const displayTemplates = showAll
    ? templates
    : templates.filter((t) => t.isRecommended).slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">快速模板</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border p-4">
              <div className="mb-2 h-4 w-1/3 rounded bg-gray-200"></div>
              <div className="mb-3 h-3 w-1/2 rounded bg-gray-200"></div>
              <div className="space-y-2">
                <div className="h-3 rounded bg-gray-200"></div>
                <div className="h-3 w-3/4 rounded bg-gray-200"></div>
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
          <span className="text-sm text-gray-500">({getMealTypeLabel(mealType)})</span>
        </div>

        <div className="flex items-center space-x-2">
          {onCreateTemplate && (
            <button
              onClick={onCreateTemplate}
              className="flex items-center space-x-1 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>新建模板</span>
            </button>
          )}

          {templates.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAll ? "收起" : `查看全部 (${templates.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Templates List */}
      {displayTemplates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
          <Clock className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="mb-2 text-gray-500">暂无{getMealTypeLabel(mealType)}模板</p>
          {onCreateTemplate && (
            <button
              onClick={onCreateTemplate}
              className="text-sm text-blue-600 hover:text-blue-700"
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
              className="rounded-lg border p-4 transition-shadow hover:shadow-md"
            >
              {/* Template Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    {template.isRecommended && (
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
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
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="删除模板"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Food List */}
              <div className="mb-3 space-y-2">
                {template.foods.slice(0, 3).map((food, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {food.name} × {food.amount}g
                    </span>
                    <span className="text-gray-500">{food.calories} kcal</span>
                  </div>
                ))}
                {template.foods.length > 3 && (
                  <div className="text-sm text-gray-500">
                    还有 {template.foods.length - 3} 种食物...
                  </div>
                )}
              </div>

              {/* Nutrition Summary */}
              <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
                <div className="rounded bg-gray-50 p-2 text-center">
                  <p className="text-gray-500">热量</p>
                  <p className="font-medium text-orange-600">
                    {template.foods.reduce((sum, food) => sum + food.calories, 0)} kcal
                  </p>
                </div>
                <div className="rounded bg-gray-50 p-2 text-center">
                  <p className="text-gray-500">蛋白质</p>
                  <p className="font-medium text-blue-600">
                    {template.foods.reduce((sum, food) => sum + food.protein, 0).toFixed(1)}g
                  </p>
                </div>
                <div className="rounded bg-gray-50 p-2 text-center">
                  <p className="text-gray-500">碳水</p>
                  <p className="font-medium text-green-600">
                    {template.foods.reduce((sum, food) => sum + food.carbs, 0).toFixed(1)}g
                  </p>
                </div>
                <div className="rounded bg-gray-50 p-2 text-center">
                  <p className="text-gray-500">脂肪</p>
                  <p className="font-medium text-yellow-600">
                    {template.foods.reduce((sum, food) => sum + food.fat, 0).toFixed(1)}g
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectTemplate(template)}
                className="w-full rounded bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
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
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showAll ? "收起模板" : `查看全部 ${templates.length} 个模板`}
          </button>
        </div>
      )}
    </div>
  );
}
