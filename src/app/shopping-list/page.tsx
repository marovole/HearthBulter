'use client';

import { useState, useEffect } from 'react';
import { ShoppingListCard } from '@/components/shopping-list/ShoppingListCard';
import { CreateShoppingListButton } from '@/components/shopping-list/CreateShoppingListButton';

interface ShoppingList {
  id: string;
  planId: string;
  name: string;
  budget: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  items: {
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
  }[];
  createdAt: string;
  plan: {
    id: string;
    member: {
      id: string;
      name: string;
    };
  };
}

export default function ShoppingListPage() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'in_progress' | 'completed'
  >('all');

  useEffect(() => {
    fetchShoppingLists();
  }, [filter]);

  const fetchShoppingLists = async () => {
    try {
      setLoading(true);
      const url =
        filter === 'all'
          ? '/api/shopping-lists'
          : `/api/shopping-lists?status=${filter.toUpperCase()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('获取购物清单失败');
      }

      const data = await response.json();
      setShoppingLists(data.shoppingLists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleListCreated = (newList: ShoppingList) => {
    setShoppingLists((prev) => [newList, ...prev]);
  };

  const handleListDeleted = (listId: string) => {
    setShoppingLists((prev) => prev.filter((list) => list.id !== listId));
  };

  const handleListUpdated = (updatedList: ShoppingList) => {
    setShoppingLists((prev) =>
      prev.map((list) => (list.id === updatedList.id ? updatedList : list)),
    );
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-gray-600'>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
          <p className='text-red-800'>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <h1 className='text-2xl font-bold text-gray-900'>购物清单</h1>
            <CreateShoppingListButton onListCreated={handleListCreated} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
        <div className='flex items-center space-x-4'>
          <span className='text-sm text-gray-700'>筛选状态:</span>
          <div className='flex space-x-2'>
            {[
              { value: 'all', label: '全部' },
              { value: 'pending', label: '待采购' },
              { value: 'in_progress', label: '采购中' },
              { value: 'completed', label: '已完成' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {shoppingLists.length === 0 ? (
          <div className='text-center py-12'>
            <div className='text-gray-500 text-lg mb-4'>暂无购物清单</div>
            <p className='text-gray-400 mb-6'>
              从食谱计划创建您的第一个购物清单
            </p>
            <CreateShoppingListButton onListCreated={handleListCreated} />
          </div>
        ) : (
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {shoppingLists.map((list) => (
              <ShoppingListCard
                key={list.id}
                shoppingList={list}
                onDeleted={handleListDeleted}
                onUpdated={handleListUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
