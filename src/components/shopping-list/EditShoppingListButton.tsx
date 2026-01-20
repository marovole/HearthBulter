"use client";

import { useState } from "react";
import type { ShoppingList } from "./types";

interface EditShoppingListButtonProps {
  shoppingList: ShoppingList;
  onListUpdated: (updatedList: ShoppingList) => void;
}

export function EditShoppingListButton({
  shoppingList,
  onListUpdated,
}: EditShoppingListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(shoppingList.name);
  const [budget, setBudget] = useState(shoppingList.budget?.toString() || "");
  const [error, setError] = useState("");

  const handleOpen = () => {
    setIsOpen(true);
    setError("");
    setName(shoppingList.name);
    setBudget(shoppingList.budget?.toString() || "");
  };

  const handleClose = () => {
    setIsOpen(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError("");

      const requestBody: any = {};

      // 只有当名称发生变化时才更新
      if (name.trim() !== shoppingList.name) {
        requestBody.name = name.trim() || "";
      }

      // 处理预算更新
      if (budget !== shoppingList.budget?.toString()) {
        if (budget.trim() === "") {
          requestBody.budget = null;
        } else {
          const budgetValue = parseFloat(budget);
          if (isNaN(budgetValue) || budgetValue < 0) {
            setError("请输入有效的预算金额");
            return;
          }
          requestBody.budget = budgetValue;
        }
      }

      // 如果没有任何变化，直接关闭
      if (Object.keys(requestBody).length === 0) {
        handleClose();
        return;
      }

      const response = await fetch(`/api/shopping-lists/${shoppingList.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "更新购物清单失败");
      }

      const data = await response.json();
      onListUpdated(data.shoppingList);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新购物清单失败");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
      >
        编辑
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">编辑购物清单</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 清单名称 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">清单名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入清单名称"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 预算设置 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">预算（可选）</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="输入预算金额，留空表示无预算限制"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
