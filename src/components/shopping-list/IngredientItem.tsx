'use client';

import { useState } from 'react';

interface Food {
  id: string;
  name: string;
  category: string;
  image?: string;
  description?: string;
}

interface IngredientItemProps {
  id: string;
  food: Food;
  amount: number;
  category: string;
  purchased: boolean;
  estimatedPrice: number | null;
  onToggle: (itemId: string, purchased: boolean) => void;
  onAmountChange?: (itemId: string, newAmount: number) => void;
  showEcommerce?: boolean;
  onEcommerceClick?: (foodId: string) => void;
}

export function IngredientItem({
  id,
  food,
  amount,
  category,
  purchased,
  estimatedPrice,
  onToggle,
  onAmountChange,
  showEcommerce = false,
  onEcommerceClick,
}: IngredientItemProps) {
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState(amount.toString());

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}kg`;
    }
    return `${amount.toFixed(0)}g`;
  };

  const handleAmountSubmit = () => {
    const newAmount = parseFloat(tempAmount);
    if (!isNaN(newAmount) && newAmount > 0 && onAmountChange) {
      onAmountChange(id, newAmount);
      setIsEditingAmount(false);
    }
  };

  const handleAmountCancel = () => {
    setTempAmount(amount.toString());
    setIsEditingAmount(false);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
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
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      VEGETABLES: 'bg-green-100 text-green-800',
      FRUITS: 'bg-orange-100 text-orange-800',
      GRAINS: 'bg-yellow-100 text-yellow-800',
      PROTEIN: 'bg-red-100 text-red-800',
      SEAFOOD: 'bg-blue-100 text-blue-800',
      DAIRY: 'bg-purple-100 text-purple-800',
      OILS: 'bg-amber-100 text-amber-800',
      SNACKS: 'bg-pink-100 text-pink-800',
      BEVERAGES: 'bg-cyan-100 text-cyan-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
        purchased
          ? 'bg-gray-50 border-gray-200 opacity-75'
          : 'bg-white border-gray-300 hover:border-blue-300'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(id, !purchased)}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
          purchased
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-gray-300 hover:border-blue-500'
        }`}
      >
        {purchased && (
          <svg
            className='w-3 h-3 text-white mx-auto'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        )}
      </button>

      {/* Food Image */}
      <div className='flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg overflow-hidden'>
        {food.image ? (
          <img
            src={food.image}
            alt={food.name}
            className='w-full h-full object-cover'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center text-gray-400'>
            🛒
          </div>
        )}
      </div>

      {/* Food Info */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center space-x-2 mb-1'>
          <h3
            className={`font-medium truncate ${
              purchased ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}
          >
            {food.name}
          </h3>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(category)}`}
          >
            {getCategoryLabel(category)}
          </span>
        </div>

        {food.description && (
          <p className='text-sm text-gray-500 mb-1'>{food.description}</p>
        )}

        <div className='flex items-center space-x-4 text-sm'>
          {/* Amount */}
          <div className='flex items-center space-x-1'>
            {isEditingAmount && onAmountChange ? (
              <div className='flex items-center space-x-1'>
                <input
                  type='number'
                  value={tempAmount}
                  onChange={(e) => setTempAmount(e.target.value)}
                  className='w-16 px-1 py-0.5 text-xs border border-gray-300 rounded'
                  step='10'
                  min='1'
                />
                <span className='text-gray-500'>g</span>
                <button
                  onClick={handleAmountSubmit}
                  className='text-green-600 hover:text-green-800'
                >
                  ✓
                </button>
                <button
                  onClick={handleAmountCancel}
                  className='text-red-600 hover:text-red-800'
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAmountChange && setIsEditingAmount(true)}
                className={`flex items-center space-x-1 ${
                  onAmountChange ? 'hover:text-blue-600 cursor-pointer' : ''
                }`}
              >
                <span className={purchased ? 'text-gray-400' : 'text-gray-700'}>
                  {formatAmount(amount)}
                </span>
                {onAmountChange && (
                  <svg
                    className='w-3 h-3 text-gray-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path d='M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z' />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Estimated Price */}
          {estimatedPrice !== null && (
            <span className='text-gray-500'>¥{estimatedPrice.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className='flex items-center space-x-2'>
        {showEcommerce && onEcommerceClick && !purchased && (
          <button
            onClick={() => onEcommerceClick(food.id)}
            className='px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
          >
            购买
          </button>
        )}
      </div>
    </div>
  );
}
