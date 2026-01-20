"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { EditShoppingListButton } from "./EditShoppingListButton";
import type { ShoppingList } from "./types";

interface ShoppingListCardProps {
  shoppingList: ShoppingList;
  onDeleted: (listId: string) => void;
  onUpdated: (updatedList: ShoppingList) => void;
}

export function ShoppingListCard({ shoppingList, onDeleted, onUpdated }: ShoppingListCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("确定要删除这个购物清单吗？")) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/shopping-lists/${shoppingList.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      onDeleted(shoppingList.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
    case "COMPLETED":
      return "已完成";
    case "IN_PROGRESS":
      return "采购中";
    default:
      return "待采购";
    }
  };

  const purchasedCount = shoppingList.items.filter((item) => item.purchased).length;
  const totalItems = shoppingList.items.length;
  const progress = totalItems > 0 ? (purchasedCount / totalItems) * 100 : 0;

  return (
    <div className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <Link
            href={`/shopping-list/${shoppingList.id}`}
            className="text-lg font-semibold text-gray-900 transition-colors hover:text-blue-600"
          >
            {shoppingList.name || `${shoppingList.plan.member.name} 的购物清单`}
          </Link>
          <p className="mt-1 text-sm text-gray-500">
            创建于{" "}
            {formatDistanceToNow(new Date(shoppingList.createdAt), {
              addSuffix: true,
              locale: zhCN,
            })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(shoppingList.status)}`}
          >
            {getStatusText(shoppingList.status)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-600">采购进度</span>
          <span className="text-sm font-medium text-gray-900">
            {purchasedCount} / {totalItems}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Budget Info */}
      {(shoppingList.budget !== null || shoppingList.estimatedCost !== null) && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">预算信息</span>
            <div className="text-right">
              {shoppingList.budget !== null && (
                <div className="font-medium text-gray-900">
                  预算: ¥{shoppingList.budget.toFixed(2)}
                </div>
              )}
              {shoppingList.estimatedCost !== null && (
                <div className="text-gray-600">估算: ¥{shoppingList.estimatedCost.toFixed(2)}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories Preview */}
      <div className="mb-4">
        <div className="mb-2 text-sm text-gray-600">商品分类</div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(
            shoppingList.items.reduce(
              (acc, item) => {
                const category = item.category;
                acc[category] = (acc[category] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            )
          ).map(([category, count]) => (
            <span
              key={category}
              className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
            >
              {category} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center space-x-4">
          <Link
            href={`/shopping-list/${shoppingList.id}`}
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            查看详情
          </Link>
          <EditShoppingListButton shoppingList={shoppingList} onListUpdated={onUpdated} />
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-sm font-medium text-red-600 transition-colors hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "删除中..." : "删除"}
        </button>
      </div>
    </div>
  );
}
