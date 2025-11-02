'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  Clock, 
  Package,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InventoryStatus, StorageLocation } from '@prisma/client';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface InventoryItem {
  id: string
  quantity: number
  unit: string
  purchaseDate: string
  purchasePrice?: number
  purchaseSource?: string
  expiryDate?: string
  daysToExpiry?: number
  storageLocation: StorageLocation
  storageNotes?: string
  status: InventoryStatus
  minStockThreshold?: number
  isLowStock: boolean
  barcode?: string
  brand?: string
  packageInfo?: string
  createdAt: string
  updatedAt: string
  food: {
    id: string
    name: string
    nameEn?: string
    category: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  usageRecords: any[]
  wasteRecords: any[]
}

interface InventoryListProps {
  memberId: string
  onAddItem?: () => void
  onEditItem?: (item: InventoryItem) => void
  onUseItem?: (item: InventoryItem) => void
}

const statusColors = {
  FRESH: 'bg-green-100 text-green-800',
  EXPIRING: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-red-100 text-red-800',
  LOW_STOCK: 'bg-orange-100 text-orange-800',
  OUT_OF_STOCK: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  FRESH: '新鲜',
  EXPIRING: '临期',
  EXPIRED: '已过期',
  LOW_STOCK: '库存不足',
  OUT_OF_STOCK: '缺货',
};

const storageLocationLabels = {
  REFRIGERATOR: '冷藏',
  FREEZER: '冷冻',
  PANTRY: '常温',
  COUNTER: '台面',
  CABINET: '橱柜',
  OTHER: '其他',
};

export function InventoryList({ 
  memberId, 
  onAddItem, 
  onEditItem, 
  onUseItem, 
}: InventoryListProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | ''>('');
  const [locationFilter, setLocationFilter] = useState<StorageLocation | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'status' | 'expiry' | 'name' | 'quantity'>('status');

  useEffect(() => {
    fetchInventoryItems();
  }, [memberId, statusFilter, locationFilter, categoryFilter]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter) params.append('status', statusFilter);
      if (locationFilter) params.append('storageLocation', locationFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/inventory/items?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        let filteredItems = result.data;

        // 客户端搜索
        if (searchTerm) {
          filteredItems = filteredItems.filter((item: InventoryItem) =>
            item.food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.food.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // 排序
        filteredItems.sort((a: InventoryItem, b: InventoryItem) => {
          switch (sortBy) {
          case 'status':
            return a.status.localeCompare(b.status);
          case 'expiry':
            if (!a.expiryDate) return 1;
            if (!b.expiryDate) return -1;
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          case 'name':
            return a.food.name.localeCompare(b.food.name);
          case 'quantity':
            return b.quantity - a.quantity;
          default:
            return 0;
          }
        });

        setItems(filteredItems);
      }
    } catch (error) {
      console.error('获取库存列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExpiryInfo = (item: InventoryItem) => {
    if (!item.expiryDate) return null;

    const daysToExpiry = item.daysToExpiry || 0;
    const expiryDate = new Date(item.expiryDate);

    if (daysToExpiry < 0) {
      return {
        text: `已过期 ${Math.abs(daysToExpiry)} 天`,
        color: 'text-red-600',
        icon: AlertTriangle,
      };
    } else if (daysToExpiry <= 3) {
      return {
        text: `${daysToExpiry} 天后过期`,
        color: 'text-yellow-600',
        icon: Clock,
      };
    } else if (daysToExpiry <= 7) {
      return {
        text: `${daysToExpiry} 天后过期`,
        color: 'text-orange-600',
        icon: Clock,
      };
    } else {
      return {
        text: format(expiryDate, 'yyyy-MM-dd', { locale: zhCN }),
        color: 'text-gray-600',
        icon: null,
      };
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('确定要删除这个库存条目吗？')) return;

    try {
      const response = await fetch(`/api/inventory/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('删除库存条目失败:', error);
    }
  };

  const filteredItems = items;
  const stats = {
    total: filteredItems.length,
    fresh: filteredItems.filter(item => item.status === 'FRESH').length,
    expiring: filteredItems.filter(item => item.status === 'EXPIRING').length,
    expired: filteredItems.filter(item => item.status === 'EXPIRED').length,
    lowStock: filteredItems.filter(item => item.isLowStock).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">总计</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">新鲜</p>
                <p className="text-lg font-semibold text-green-600">{stats.fresh}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">临期</p>
                <p className="text-lg font-semibold text-yellow-600">{stats.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">过期</p>
                <p className="text-lg font-semibold text-red-600">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">库存不足</p>
                <p className="text-lg font-semibold text-orange-600">{stats.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>库存管理</CardTitle>
            <Button onClick={onAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              添加物品
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索食材名称、品牌..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InventoryStatus | '')}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部状态</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={(value) => setLocationFilter(value as StorageLocation | '')}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="存储位置" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部位置</SelectItem>
                {Object.entries(storageLocationLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">按状态</SelectItem>
                <SelectItem value="expiry">按保质期</SelectItem>
                <SelectItem value="name">按名称</SelectItem>
                <SelectItem value="quantity">按数量</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 库存列表 */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const expiryInfo = getExpiryInfo(item);
              
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-lg">
                            {item.food.name}
                            {item.food.nameEn && (
                              <span className="text-gray-500 text-sm ml-2">
                                ({item.food.nameEn})
                              </span>
                            )}
                          </h3>
                          <Badge className={statusColors[item.status]}>
                            {statusLabels[item.status]}
                          </Badge>
                          {item.isLowStock && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              库存不足
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">数量：</span>
                            {item.quantity} {item.unit}
                          </div>
                          
                          <div>
                            <span className="font-medium">存储位置：</span>
                            {storageLocationLabels[item.storageLocation]}
                          </div>

                          <div>
                            <span className="font-medium">分类：</span>
                            {item.food.category}
                          </div>

                          {expiryInfo && (
                            <div className={expiryInfo.color}>
                              <span className="font-medium">保质期：</span>
                              <div className="flex items-center space-x-1">
                                {expiryInfo.icon && <expiryInfo.icon className="h-3 w-3" />}
                                <span>{expiryInfo.text}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {item.brand && (
                          <div className="text-sm text-gray-500 mt-1">
                            品牌：{item.brand}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUseItem?.(item)}
                          disabled={item.quantity <= 0}
                        >
                          使用
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditItem?.(item)}>
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600"
                            >
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>暂无库存物品</p>
                <p className="text-sm">点击"添加物品"开始管理您的库存</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
