'use client';

import { CheckboxItem } from './CheckboxItem';
import type { FoodCategory } from '@prisma/client';

interface ShoppingItem {
  id: string
  foodId: string
  amount: number
  category: string
  purchased: boolean
  estimatedPrice: number | null
  food: {
    id: string
    name: string
    category: string
  }
}

interface CategoryListProps {
  items: ShoppingItem[]
  onItemToggle: (itemId: string, purchased: boolean) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  VEGETABLES: '蔬菜',
  FRUITS: '水果',
  GRAINS: '谷物',
  PROTEIN: '肉蛋奶',
  SEAFOOD: '海鲜',
  DAIRY: '乳制品',
  OILS: '油脂',
  SNACKS: '零食',
  BEVERAGES: '饮料',
  OTHER: '其他',
};

export function CategoryList({ items, onItemToggle }: CategoryListProps) {
  // 按分类分组
  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, ShoppingItem[]>
  );

  // 获取分类顺序（优先显示易腐食材）
  const categoryOrder = [
    'VEGETABLES',
    'FRUITS',
    'SEAFOOD',
    'PROTEIN',
    'DAIRY',
    'GRAINS',
    'OILS',
    'SNACKS',
    'BEVERAGES',
    'OTHER',
  ];

  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
        const categoryItems = groupedItems[category] || [];

        if (categoryItems.length === 0) {
          return null;
        }

        const purchasedCount = categoryItems.filter((item) => item.purchased)
          .length;
        const totalCount = categoryItems.length;

        return (
          <div key={category} className="border border-gray-200 rounded-lg">
            {/* 分类标题 */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <span className="text-sm text-gray-600">
                  {purchasedCount} / {totalCount}
                </span>
              </div>
            </div>

            {/* 分类内容 */}
            <div className="divide-y divide-gray-200">
              {categoryItems.map((item) => (
                <CheckboxItem
                  key={item.id}
                  item={item}
                  onToggle={(purchased) =>
                    onItemToggle(item.id, purchased)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

