'use client';

import { useState, useEffect } from 'react';
import { CategoryList } from './CategoryList';
import { BudgetTracker } from './BudgetTracker';

// 打印样式（仅在打印时应用）
const PRINT_STYLES = `
  @media print {
    @page {
      margin: 2cm;
    }
    
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    
    .no-print {
      display: none !important;
    }
    
    .print-break {
      page-break-before: always;
    }
    
    .shopping-list-print {
      font-family: Arial, sans-serif;
    }
    
    .shopping-list-print h2 {
      font-size: 24px;
      margin-bottom: 20px;
    }
    
    .shopping-list-print .category-section {
      margin-bottom: 20px;
    }
    
    .shopping-list-print .category-title {
      font-size: 18px;
      font-weight: bold;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
      margin-bottom: 10px;
    }
    
    .shopping-list-print .item {
      display: flex;
      padding: 5px 0;
      border-bottom: 1px solid #ddd;
    }
    
    .shopping-list-print .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #000;
      margin-right: 10px;
      flex-shrink: 0;
    }
    
    .shopping-list-print .item-name {
      flex: 1;
    }
    
    .shopping-list-print .item-amount {
      margin-left: auto;
      font-weight: bold;
    }
  }
`;

interface ShoppingItem {
  id: string;
  foodId: string;
  amount: number;
  category: string;
  purchased: boolean;
  estimatedPrice: number | null;
  food: {
    id: string;
    name: string;
    category: string;
  };
}

interface ShoppingList {
  id: string;
  planId: string;
  budget: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  items: ShoppingItem[];
  createdAt: string;
}

interface ShoppingListViewProps {
  shoppingListId: string;
  planId?: string;
}

export function ShoppingListView({
  shoppingListId,
  planId,
}: ShoppingListViewProps) {
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchShoppingList();
  }, [shoppingListId]);

  // 注入打印样式
  useEffect(() => {
    const styleId = 'shopping-list-print-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = PRINT_STYLES;
      document.head.appendChild(styleElement);
    }
  }, []);

  const fetchShoppingList = async () => {
    try {
      setLoading(true);
      const url = planId
        ? `/api/shopping-lists?planId=${planId}`
        : '/api/shopping-lists';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('获取购物清单失败');
      }

      const data = await response.json();
      const list = data.shoppingLists.find(
        (l: ShoppingList) => l.id === shoppingListId,
      );

      if (!list) {
        throw new Error('购物清单不存在');
      }

      setShoppingList(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = async (itemId: string, purchased: boolean) => {
    try {
      const response = await fetch(
        `/api/shopping-lists/${shoppingListId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purchased }),
        },
      );

      if (!response.ok) {
        throw new Error('更新失败');
      }

      // 重新获取清单
      await fetchShoppingList();
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    }
  };

  const handleComplete = async (actualCost?: number) => {
    try {
      const response = await fetch(
        `/api/shopping-lists/${shoppingListId}/complete`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ actualCost }),
        },
      );

      if (!response.ok) {
        throw new Error('完成采购失败');
      }

      await fetchShoppingList();
    } catch (err) {
      alert(err instanceof Error ? err.message : '完成失败');
    }
  };

  // 打印功能
  const handlePrint = () => {
    window.print();
  };

  // 生成文本格式的购物清单
  const generateShoppingListText = () => {
    if (!shoppingList) return '';

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

    let text = '📋 购物清单\n';
    text += `生成日期: ${new Date(shoppingList.createdAt).toLocaleDateString('zh-CN')}\n`;

    if (shoppingList.budget || shoppingList.estimatedCost) {
      text += '\n💰 预算信息:\n';
      if (shoppingList.budget) {
        text += `  预算: ¥${shoppingList.budget.toFixed(2)}\n`;
      }
      if (shoppingList.estimatedCost) {
        text += `  估算成本: ¥${shoppingList.estimatedCost.toFixed(2)}\n`;
      }
    }

    text += '\n';

    // 按分类分组
    const groupedItems = shoppingList.items.reduce(
      (acc, item) => {
        const category = item.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {} as Record<string, typeof shoppingList.items>,
    );

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

    categoryOrder.forEach((category) => {
      const items = groupedItems[category];
      if (items && items.length > 0) {
        text += `\n【${CATEGORY_LABELS[category] || category}】\n`;
        items.forEach((item) => {
          const checkbox = item.purchased ? '☑' : '☐';
          const amount =
            item.amount >= 1000
              ? `${(item.amount / 1000).toFixed(1)}kg`
              : `${item.amount.toFixed(0)}g`;
          text += `  ${checkbox} ${item.food.name} - ${amount}\n`;
        });
      }
    });

    return text;
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      const text = generateShoppingListText();
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      alert('复制失败，请手动复制');
    }
  };

  // 分享功能（使用Web Share API，如果支持的话）
  const handleShare = async () => {
    const text = generateShoppingListText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: '购物清单',
          text: text,
        });
      } catch (err) {
        // 用户取消分享或分享失败
        if ((err as Error).name !== 'AbortError') {
          console.error('分享失败:', err);
          // 降级到复制功能
          handleCopy();
        }
      }
    } else {
      // 不支持Web Share API，使用复制功能
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-gray-600'>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
        <p className='text-red-800'>{error}</p>
      </div>
    );
  }

  if (!shoppingList) {
    return (
      <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
        <p className='text-gray-600'>购物清单不存在</p>
      </div>
    );
  }

  const purchasedCount = shoppingList.items.filter(
    (item) => item.purchased,
  ).length;
  const totalItems = shoppingList.items.length;
  const progress = totalItems > 0 ? (purchasedCount / totalItems) * 100 : 0;

  return (
    <div className='bg-white rounded-lg shadow-md p-6 shopping-list-print'>
      {/* 标题和状态 */}
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-2xl font-bold text-gray-900'>购物清单</h2>
          <div className='flex items-center gap-3'>
            {/* 打印和分享按钮（仅在屏幕显示） */}
            <div className='flex gap-2 no-print'>
              <button
                onClick={handlePrint}
                className='px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5'
                title='打印购物清单'
              >
                <span>🖨️</span>
                <span>打印</span>
              </button>
              <button
                onClick={handleShare}
                className='px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5'
                title='分享购物清单'
              >
                {copySuccess ? (
                  <>
                    <span>✓</span>
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>分享</span>
                  </>
                )}
              </button>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                shoppingList.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-800'
                  : shoppingList.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {shoppingList.status === 'COMPLETED'
                ? '已完成'
                : shoppingList.status === 'IN_PROGRESS'
                  ? '采购中'
                  : '待采购'}
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm text-gray-600'>采购进度</span>
            <span className='text-sm font-medium text-gray-900'>
              {purchasedCount} / {totalItems}
            </span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className='bg-blue-600 h-2 rounded-full transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 预算追踪 */}
        {shoppingList.budget !== null || shoppingList.estimatedCost !== null ? (
          <BudgetTracker
            budget={shoppingList.budget}
            estimatedCost={shoppingList.estimatedCost}
            actualCost={shoppingList.actualCost}
          />
        ) : null}
      </div>

      {/* 分类列表 */}
      <CategoryList
        items={shoppingList.items}
        onItemToggle={handleItemToggle}
      />

      {/* 操作按钮 */}
      {shoppingList.status !== 'COMPLETED' && (
        <div className='mt-6 flex gap-4 no-print'>
          <button
            onClick={() => handleComplete()}
            disabled={purchasedCount < totalItems}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              purchasedCount < totalItems
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            完成采购
          </button>
        </div>
      )}
    </div>
  );
}
