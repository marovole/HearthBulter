'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { EditShoppingListButton } from './EditShoppingListButton'

interface ShoppingItem {
  id: string
  foodId: string
  amount: number
  category: string
  purchased: boolean
  estimatedPrice: number | null
  food: {
    id: string
    name: string
    category: string
  }
}

interface ShoppingList {
  id: string
  planId: string
  name: string
  budget: number | null
  estimatedCost: number | null
  actualCost: number | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  items: ShoppingItem[]
  createdAt: string
  plan: {
    id: string
    member: {
      id: string
      name: string
    }
  }
}

interface ShoppingListCardProps {
  shoppingList: ShoppingList
  onDeleted: (listId: string) => void
  onUpdated: (updatedList: ShoppingList) => void
}

export function ShoppingListCard({ 
  shoppingList, 
  onDeleted, 
  onUpdated 
}: ShoppingListCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('确定要删除这个购物清单吗？')) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/shopping-lists/${shoppingList.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      onDeleted(shoppingList.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '已完成'
      case 'IN_PROGRESS':
        return '采购中'
      default:
        return '待采购'
    }
  }

  const purchasedCount = shoppingList.items.filter(item => item.purchased).length
  const totalItems = shoppingList.items.length
  const progress = totalItems > 0 ? (purchasedCount / totalItems) * 100 : 0

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Link 
            href={`/shopping-list/${shoppingList.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {shoppingList.name || `${shoppingList.plan.member.name} 的购物清单`}
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            创建于 {formatDistanceToNow(new Date(shoppingList.createdAt), { 
              addSuffix: true, 
              locale: zhCN 
            })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shoppingList.status)}`}>
            {getStatusText(shoppingList.status)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">采购进度</span>
          <span className="text-sm font-medium text-gray-900">
            {purchasedCount} / {totalItems}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Budget Info */}
      {(shoppingList.budget !== null || shoppingList.estimatedCost !== null) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">预算信息</span>
            <div className="text-right">
              {shoppingList.budget !== null && (
                <div className="font-medium text-gray-900">
                  预算: ¥{shoppingList.budget.toFixed(2)}
                </div>
              )}
              {shoppingList.estimatedCost !== null && (
                <div className="text-gray-600">
                  估算: ¥{shoppingList.estimatedCost.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories Preview */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">商品分类</div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(
            shoppingList.items.reduce((acc, item) => {
              const category = item.category
              acc[category] = (acc[category] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          ).map(([category, count]) => (
            <span 
              key={category}
              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {category} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-4">
          <Link 
            href={`/shopping-list/${shoppingList.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            查看详情
          </Link>
          <EditShoppingListButton 
            shoppingList={shoppingList}
            onListUpdated={onUpdated}
          />
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  )
}
