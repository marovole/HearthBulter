'use client';

import { useState, useEffect } from 'react';

interface PriceData {
  platform: string;
  platformName: string;
  price: number;
  originalPrice?: number;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
  unit: string;
  url?: string;
  rating?: number;
  salesCount?: number;
  lastUpdated: string;
}

interface PriceComparisonProps {
  foodId: string;
  foodName: string;
  amount: number;
  onClose: () => void;
}

export function PriceComparison({
  foodId,
  foodName,
  amount,
  onClose,
}: PriceComparisonProps) {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'sales'>('price');

  useEffect(() => {
    fetchPriceComparison();
  }, [foodId, amount]);

  const fetchPriceComparison = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/ecommerce/compare?foodId=${foodId}&amount=${amount}`,
      );
      if (!response.ok) {
        throw new Error('获取价格比较失败');
      }

      const data = await response.json();
      setPriceData(data.prices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取价格比较失败');
    } finally {
      setLoading(false);
    }
  };

  const getSortedData = () => {
    const sorted = [...priceData];
    switch (sortBy) {
      case 'price':
        return sorted.sort((a, b) => a.price - b.price);
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'sales':
        return sorted.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
      default:
        return sorted;
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'IN_STOCK':
        return '有货';
      case 'OUT_OF_STOCK':
        return '缺货';
      case 'LOW_STOCK':
        return '库存紧张';
      default:
        return '未知';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'IN_STOCK':
        return 'text-green-600 bg-green-50';
      case 'OUT_OF_STOCK':
        return 'text-red-600 bg-red-50';
      case 'LOW_STOCK':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const calculateSavings = (currentPrice: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= currentPrice) return null;
    const savings = originalPrice - currentPrice;
    const percentage = (savings / originalPrice) * 100;
    return { amount: savings, percentage };
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
    return `${Math.floor(diffInMinutes / 1440)}天前`;
  };

  const sortedData = getSortedData();
  const lowestPrice = sortedData.length > 0 ? sortedData[0].price : null;
  const highestPrice =
    sortedData.length > 0 ? sortedData[sortedData.length - 1].price : null;

  if (loading) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-white rounded-lg p-8 max-w-md w-full'>
          <div className='text-center'>
            <div className='text-gray-600'>加载价格比较中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>价格比较</h2>
            <p className='text-sm text-gray-500 mt-1'>
              {foodName} •{' '}
              {amount >= 1000
                ? `${(amount / 1000).toFixed(1)}kg`
                : `${amount}g`}
            </p>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 text-2xl'
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        {lowestPrice && highestPrice && (
          <div className='p-4 bg-blue-50 border-b'>
            <div className='flex items-center justify-between text-sm'>
              <div className='text-blue-800'>
                最低价:{' '}
                <span className='font-bold'>¥{lowestPrice.toFixed(2)}</span>
              </div>
              <div className='text-blue-800'>
                最高价:{' '}
                <span className='font-bold'>¥{highestPrice.toFixed(2)}</span>
              </div>
              <div className='text-blue-800'>
                差价:{' '}
                <span className='font-bold'>
                  ¥{(highestPrice - lowestPrice).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sort Options */}
        <div className='p-4 border-b bg-gray-50'>
          <div className='flex items-center space-x-4'>
            <span className='text-sm text-gray-700'>排序方式:</span>
            <div className='flex space-x-2'>
              {[
                { value: 'price', label: '价格' },
                { value: 'rating', label: '评分' },
                { value: 'sales', label: '销量' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as any)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    sortBy === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto'>
          {error ? (
            <div className='p-6'>
              <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
                <p className='text-red-800'>{error}</p>
                <button
                  onClick={fetchPriceComparison}
                  className='mt-2 text-red-600 hover:text-red-800 text-sm'
                >
                  重试
                </button>
              </div>
            </div>
          ) : sortedData.length === 0 ? (
            <div className='p-6 text-center'>
              <div className='text-gray-500 mb-4'>暂无价格数据</div>
              <p className='text-gray-400 text-sm'>
                该商品暂时无法获取价格比较信息
              </p>
            </div>
          ) : (
            <div className='divide-y divide-gray-200'>
              {sortedData.map((item, index) => {
                const savings = calculateSavings(
                  item.price,
                  item.originalPrice,
                );
                const isLowestPrice = item.price === lowestPrice;

                return (
                  <div
                    key={`${item.platform}-${index}`}
                    className={`p-4 ${isLowestPrice ? 'bg-green-50' : ''}`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-4'>
                        {/* Platform Info */}
                        <div className='flex items-center space-x-3'>
                          <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600'>
                            {item.platformName.charAt(0)}
                          </div>
                          <div>
                            <div className='flex items-center space-x-2'>
                              <h3 className='font-medium text-gray-900'>
                                {item.platformName}
                              </h3>
                              {isLowestPrice && (
                                <span className='px-2 py-0.5 text-xs bg-green-600 text-white rounded-full'>
                                  最低价
                                </span>
                              )}
                            </div>
                            <div className='text-sm text-gray-500'>
                              {item.unit} • {formatTimeAgo(item.lastUpdated)}
                            </div>
                          </div>
                        </div>

                        {/* Rating and Sales */}
                        <div className='text-sm text-gray-600'>
                          {item.rating && (
                            <div className='flex items-center space-x-1'>
                              <span>⭐</span>
                              <span>{item.rating.toFixed(1)}</span>
                            </div>
                          )}
                          {item.salesCount && <div>月销 {item.salesCount}</div>}
                        </div>
                      </div>

                      {/* Price and Availability */}
                      <div className='text-right'>
                        <div className='flex items-center space-x-2 mb-1'>
                          {savings ? (
                            <div>
                              <div className='text-red-600 font-bold text-lg'>
                                ¥{item.price.toFixed(2)}
                              </div>
                              <div className='text-gray-400 line-through text-sm'>
                                ¥{item.originalPrice!.toFixed(2)}
                              </div>
                              <div className='text-red-600 text-xs'>
                                省¥{savings.amount.toFixed(2)} (
                                {savings.percentage.toFixed(0)}%)
                              </div>
                            </div>
                          ) : (
                            <div className='text-gray-900 font-bold text-lg'>
                              ¥{item.price.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getAvailabilityColor(item.availability)}`}
                        >
                          {getAvailabilityText(item.availability)}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    {item.url && item.availability !== 'OUT_OF_STOCK' && (
                      <div className='mt-3 pt-3 border-t border-gray-100'>
                        <a
                          href={item.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium'
                        >
                          <span>前往购买</span>
                          <svg
                            className='w-4 h-4'
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path
                              fillRule='evenodd'
                              d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
                              clipRule='evenodd'
                            />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
