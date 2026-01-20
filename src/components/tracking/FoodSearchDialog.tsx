"use client";

import { useState, useEffect } from "react";
import { Search, Clock, TrendingUp } from "lucide-react";

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
  category: string;
}

interface FoodSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFood: (food: Food & { amount: number }) => void;
  memberId: string;
}

export function FoodSearchDialog({
  isOpen,
  onClose,
  onSelectFood,
  memberId,
}: FoodSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [commonFoods, setCommonFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(100);

  useEffect(() => {
    if (isOpen) {
      loadRecentFoods();
      loadCommonFoods();
    }
  }, [isOpen, memberId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchFoods();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadRecentFoods = async () => {
    try {
      const response = await fetch(`/api/tracking/meals/recent?memberId=${memberId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentFoods(data);
      }
    } catch (error) {
      console.error("加载最近食物失败:", error);
    }
  };

  const loadCommonFoods = async () => {
    try {
      const response = await fetch("/api/tracking/meals/common?limit=15");
      if (response.ok) {
        const data = await response.json();
        setCommonFoods(data);
      }
    } catch (error) {
      console.error("加载常用食物失败:", error);
    }
  };

  const searchFoods = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tracking/meals/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("搜索食物失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFood = (food: Food) => {
    onSelectFood({
      ...food,
      amount: selectedAmount,
    });
    onClose();
    setSearchQuery("");
    setSearchResults([]);
  };

  const formatNutrition = (value: number, amount: number) => {
    return ((value * amount) / 100).toFixed(1);
  };

  const displayFoods = searchQuery.trim() ? searchResults : [...recentFoods, ...commonFoods];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="border-b p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">搜索食物</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索食物，如：鸡蛋、鸡胸肉、米饭..."
              className="w-full rounded-lg border py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Amount Selector */}
          <div className="mt-4 flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">份量:</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={selectedAmount}
                onChange={(e) => setSelectedAmount(Number(e.target.value))}
                className="w-32"
              />
              <span className="w-16 text-sm font-medium">{selectedAmount}g</span>
            </div>
          </div>
        </div>

        {/* Food List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-500">搜索中...</p>
            </div>
          ) : displayFoods.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">
                {searchQuery.trim() ? "未找到相关食物" : "暂无最近食用的食物"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Section Headers */}
              {!searchQuery.trim() && recentFoods.length > 0 && (
                <div className="mb-2 flex items-center text-sm font-medium text-gray-600">
                  <Clock className="mr-1 h-4 w-4" />
                  最近食用
                </div>
              )}

              {!searchQuery.trim() && commonFoods.length > 0 && (
                <div className="mb-2 mt-4 flex items-center text-sm font-medium text-gray-600">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  常用食物
                </div>
              )}

              {searchQuery.trim() && displayFoods.length > 0 && (
                <div className="mb-2 text-sm font-medium text-gray-600">
                  搜索结果 ({displayFoods.length})
                </div>
              )}

              {/* Food Items */}
              {displayFoods.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleSelectFood(food)}
                  className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{food.name}</h3>
                      <p className="text-sm text-gray-500">
                        {food.category} • {food.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-blue-600">
                        {formatNutrition(food.calories, selectedAmount)} kcal
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">蛋白质</span>
                      <p className="font-medium">
                        {formatNutrition(food.protein, selectedAmount)}g
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">碳水</span>
                      <p className="font-medium">{formatNutrition(food.carbs, selectedAmount)}g</p>
                    </div>
                    <div>
                      <span className="text-gray-500">脂肪</span>
                      <p className="font-medium">{formatNutrition(food.fat, selectedAmount)}g</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">选择食物后将自动添加到当前餐次</p>
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
