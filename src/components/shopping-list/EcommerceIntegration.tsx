'use client';

import { useState, useEffect } from 'react';

interface PlatformProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  platform: string;
  platformUrl?: string;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
  unit: string;
  minOrder: number;
  rating?: number;
  salesCount?: number;
}

interface EcommerceIntegrationProps {
  foodId: string;
  foodName: string;
  amount: number;
  onProductSelect: (product: PlatformProduct) => void;
  onClose: () => void;
}

export function EcommerceIntegration({
  foodId,
  foodName,
  amount,
  onProductSelect,
  onClose,
}: EcommerceIntegrationProps) {
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const platforms = [
    { id: 'all', name: '全部平台' },
    { id: 'dingdong', name: '叮咚买菜' },
    { id: 'hema', name: '盒马鲜生' },
    { id: 'jd', name: '京东到家' },
    { id: 'meituan', name: '美团买菜' },
  ];

  useEffect(() => {
    fetchProducts();
  }, [foodId, selectedPlatform]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const url =
        selectedPlatform === 'all'
          ? `/api/ecommerce/match?foodId=${foodId}&amount=${amount}`
          : `/api/ecommerce/match?foodId=${foodId}&amount=${amount}&platform=${selectedPlatform}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('获取商品信息失败');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品信息失败');
    } finally {
      setLoading(false);
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

  const formatPrice = (price: number, originalPrice?: number) => {
    if (originalPrice && originalPrice > price) {
      return (
        <div className='flex items-center space-x-2'>
          <span className='text-red-600 font-semibold'>
            ¥{price.toFixed(2)}
          </span>
          <span className='text-gray-400 line-through text-sm'>
            ¥{originalPrice.toFixed(2)}
          </span>
        </div>
      );
    }
    return (
      <span className='text-gray-900 font-semibold'>¥{price.toFixed(2)}</span>
    );
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>购买 {foodName}</h2>
            <p className='text-sm text-gray-500 mt-1'>
              需要数量:{' '}
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

        {/* Platform Filter */}
        <div className='p-4 border-b bg-gray-50'>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-gray-700'>平台筛选:</span>
            <div className='flex space-x-2'>
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedPlatform === platform.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-gray-600'>加载商品信息中...</div>
            </div>
          ) : error ? (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
              <p className='text-red-800'>{error}</p>
              <button
                onClick={fetchProducts}
                className='mt-2 text-red-600 hover:text-red-800 text-sm'
              >
                重试
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className='text-center py-12'>
              <div className='text-gray-500 mb-4'>暂无匹配的商品</div>
              <p className='text-gray-400 text-sm'>
                可以尝试其他平台或调整搜索条件
              </p>
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              {products.map((product) => (
                <div
                  key={product.id}
                  className='border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors'
                >
                  <div className='flex space-x-4'>
                    {/* Product Image */}
                    <div className='flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden'>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center text-gray-400'>
                          📦
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between mb-2'>
                        <h3 className='font-medium text-gray-900 truncate'>
                          {product.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getAvailabilityColor(product.availability)}`}
                        >
                          {getAvailabilityText(product.availability)}
                        </span>
                      </div>

                      <div className='space-y-1 text-sm text-gray-600 mb-3'>
                        <div className='flex items-center justify-between'>
                          <span>平台: {product.platform}</span>
                          <span>规格: {product.unit}</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span>
                            起订量: {product.minOrder}
                            {product.unit}
                          </span>
                          {product.rating && (
                            <span className='flex items-center'>
                              ⭐ {product.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price and Actions */}
                      <div className='flex items-center justify-between'>
                        {formatPrice(product.price, product.originalPrice)}
                        <button
                          onClick={() => onProductSelect(product)}
                          disabled={product.availability === 'OUT_OF_STOCK'}
                          className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                            product.availability === 'OUT_OF_STOCK'
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {product.availability === 'OUT_OF_STOCK'
                            ? '缺货'
                            : '选择'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
