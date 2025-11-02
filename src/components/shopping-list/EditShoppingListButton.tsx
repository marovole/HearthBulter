'use client'

import { useState } from 'react'

interface ShoppingList {
  id: string
  name: string
  budget: number | null
}

interface EditShoppingListButtonProps {
  shoppingList: ShoppingList
  onListUpdated: (updatedList: ShoppingList) => void
}

export function EditShoppingListButton({ 
  shoppingList, 
  onListUpdated 
}: EditShoppingListButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(shoppingList.name)
  const [budget, setBudget] = useState(shoppingList.budget?.toString() || '')
  const [error, setError] = useState('')

  const handleOpen = () => {
    setIsOpen(true)
    setError('')
    setName(shoppingList.name)
    setBudget(shoppingList.budget?.toString() || '')
  }

  const handleClose = () => {
    setIsOpen(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)
      setError('')

      const requestBody: any = {}
      
      // 只有当名称发生变化时才更新
      if (name.trim() !== shoppingList.name) {
        requestBody.name = name.trim() || ''
      }
      
      // 处理预算更新
      if (budget !== shoppingList.budget?.toString()) {
        if (budget.trim() === '') {
          requestBody.budget = null
        } else {
          const budgetValue = parseFloat(budget)
          if (isNaN(budgetValue) || budgetValue < 0) {
            setError('请输入有效的预算金额')
            return
          }
          requestBody.budget = budgetValue
        }
      }

      // 如果没有任何变化，直接关闭
      if (Object.keys(requestBody).length === 0) {
        handleClose()
        return
      }

      const response = await fetch(`/api/shopping-lists/${shoppingList.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新购物清单失败')
      }

      const data = await response.json()
      onListUpdated(data.shoppingList)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新购物清单失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
      >
        编辑
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">编辑购物清单</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 清单名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              清单名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入清单名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 预算设置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预算（可选）
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="输入预算金额，留空表示无预算限制"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
