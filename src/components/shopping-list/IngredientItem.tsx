"use client";

import { useState } from "react";

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
      VEGETABLES: "蔬菜",
      FRUITS: "水果",
      GRAINS: "谷物",
      PROTEIN: "肉蛋奶",
      SEAFOOD: "海鲜",
      DAIRY: "乳制品",
      OILS: "油脂",
      SNACKS: "零食",
      BEVERAGES: "饮料",
      OTHER: "其他",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      VEGETABLES: "bg-green-100 text-green-800",
      FRUITS: "bg-orange-100 text-orange-800",
      GRAINS: "bg-yellow-100 text-yellow-800",
      PROTEIN: "bg-red-100 text-red-800",
      SEAFOOD: "bg-blue-100 text-blue-800",
      DAIRY: "bg-purple-100 text-purple-800",
      OILS: "bg-amber-100 text-amber-800",
      SNACKS: "bg-pink-100 text-pink-800",
      BEVERAGES: "bg-cyan-100 text-cyan-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div
      className={`flex items-center space-x-3 rounded-lg border p-3 transition-all ${
        purchased
          ? "border-gray-200 bg-gray-50 opacity-75"
          : "border-gray-300 bg-white hover:border-blue-300"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(id, !purchased)}
        className={`h-5 w-5 flex-shrink-0 rounded border-2 transition-colors ${
          purchased
            ? "border-blue-600 bg-blue-600"
            : "border-gray-300 bg-white hover:border-blue-500"
        }`}
      >
        {purchased && (
          <svg className="mx-auto h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Food Image */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {food.image ? (
          <img src={food.image} alt={food.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">🛒</div>
        )}
      </div>

      {/* Food Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center space-x-2">
          <h3
            className={`truncate font-medium ${
              purchased ? "text-gray-500 line-through" : "text-gray-900"
            }`}
          >
            {food.name}
          </h3>
          <span className={`rounded-full px-2 py-0.5 text-xs ${getCategoryColor(category)}`}>
            {getCategoryLabel(category)}
          </span>
        </div>

        {food.description && <p className="mb-1 text-sm text-gray-500">{food.description}</p>}

        <div className="flex items-center space-x-4 text-sm">
          {/* Amount */}
          <div className="flex items-center space-x-1">
            {isEditingAmount && onAmountChange ? (
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  value={tempAmount}
                  onChange={(e) => setTempAmount(e.target.value)}
                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-xs"
                  step="10"
                  min="1"
                />
                <span className="text-gray-500">g</span>
                <button
                  onClick={handleAmountSubmit}
                  className="text-green-600 hover:text-green-800"
                >
                  ✓
                </button>
                <button onClick={handleAmountCancel} className="text-red-600 hover:text-red-800">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAmountChange && setIsEditingAmount(true)}
                className={`flex items-center space-x-1 ${
                  onAmountChange ? "cursor-pointer hover:text-blue-600" : ""
                }`}
              >
                <span className={purchased ? "text-gray-400" : "text-gray-700"}>
                  {formatAmount(amount)}
                </span>
                {onAmountChange && (
                  <svg className="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Estimated Price */}
          {estimatedPrice !== null && (
            <span className="text-gray-500">¥{estimatedPrice.toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {showEcommerce && onEcommerceClick && !purchased && (
          <button
            onClick={() => onEcommerceClick(food.id)}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
          >
            购买
          </button>
        )}
      </div>
    </div>
  );
}
