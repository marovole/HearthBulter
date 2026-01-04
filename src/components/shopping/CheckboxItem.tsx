'use client';

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

interface CheckboxItemProps {
  item: ShoppingItem;
  onToggle: (purchased: boolean) => void;
}

/**
 * 格式化重量显示
 */
function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)} kg`;
  }
  return `${amount} g`;
}

/**
 * 格式化价格显示
 */
function formatPrice(price: number | null): string {
  if (price === null) {
    return '暂无价格';
  }
  return `¥${price.toFixed(2)}`;
}

export function CheckboxItem({ item, onToggle }: CheckboxItemProps) {
  return (
    <div
      className={`px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
        item.purchased ? 'bg-green-50' : ''
      }`}
    >
      <div className='flex items-center flex-1'>
        {/* 复选框 */}
        <input
          type='checkbox'
          checked={item.purchased}
          onChange={(e) => onToggle(e.target.checked)}
          className='w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2'
        />

        {/* 食材信息 */}
        <div className='ml-4 flex-1'>
          <div className='flex items-center gap-2'>
            <span
              className={`font-medium ${
                item.purchased ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {item.food.name}
            </span>
          </div>
          <div className='mt-1 flex items-center gap-4 text-sm text-gray-600'>
            <span>{formatAmount(item.amount)}</span>
            {item.estimatedPrice !== null && (
              <span className='text-gray-500'>
                {formatPrice(item.estimatedPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
