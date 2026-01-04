'use client';

import { useState } from 'react';

interface ShoppingListItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  price?: number;
  productId?: string;
}

interface ShoppingList {
  id: string;
  planId: string;
  budget: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  items: ShoppingListItem[];
  createdAt: string;
  plan: {
    id: string;
    member: {
      id: string;
      name: string;
    };
  };
}

interface MealPlan {
  id: string;
  name: string;
  member: {
    id: string;
    name: string;
  };
  startDate: string;
  endDate: string;
}

interface CreateShoppingListButtonProps {
  onListCreated: (newList: ShoppingList) => void;
}

export function CreateShoppingListButton({
  onListCreated,
}: CreateShoppingListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [listName, setListName] = useState('');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');

  const fetchMealPlans = async () => {
    try {
      const response = await fetch('/api/meal-plans');
      if (!response.ok) {
        throw new Error('获取食谱计划失败');
      }
      const data = await response.json();
      setMealPlans(data.mealPlans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取食谱计划失败');
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError('');
    setSelectedPlanId('');
    setListName('');
    setBudget('');
    fetchMealPlans();
  };

  const handleClose = () => {
    setIsOpen(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlanId) {
      setError('请选择一个食谱计划');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const requestBody: any = {};
      if (listName.trim()) {
        requestBody.name = listName.trim();
      }
      if (budget) {
        const budgetValue = parseFloat(budget);
        if (isNaN(budgetValue) || budgetValue < 0) {
          setError('请输入有效的预算金额');
          return;
        }
        requestBody.budget = budgetValue;
      }

      const response = await fetch(
        `/api/meal-plans/${selectedPlanId}/shopping-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建购物清单失败');
      }

      const data = await response.json();
      onListCreated(data.shoppingList);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建购物清单失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
      >
        创建购物清单
      </button>
    );
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 w-full max-w-md'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold text-gray-900'>创建购物清单</h2>
          <button
            onClick={handleClose}
            className='text-gray-400 hover:text-gray-600'
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* 清单名称 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              清单名称（可选）
            </label>
            <input
              type='text'
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder='例如：本周采购清单'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
          </div>

          {/* 食谱计划选择 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              选择食谱计划
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              required
            >
              <option value=''>请选择食谱计划</option>
              {mealPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.member?.name || '未知'} -{' '}
                  {new Date(plan.startDate).toLocaleDateString('zh-CN')} 至{' '}
                  {new Date(plan.endDate).toLocaleDateString('zh-CN')}
                </option>
              ))}
            </select>
          </div>

          {/* 预算设置 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              预算（可选）
            </label>
            <input
              type='number'
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder='输入预算金额'
              step='0.01'
              min='0'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
              <p className='text-red-800 text-sm'>{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className='flex space-x-3 pt-4'>
            <button
              type='button'
              onClick={handleClose}
              className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium'
            >
              取消
            </button>
            <button
              type='submit'
              disabled={isLoading}
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
