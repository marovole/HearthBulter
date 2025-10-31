'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Minus, AlertTriangle } from 'lucide-react'

interface InventoryItem {
  id: string
  quantity: number
  unit: string
  food: {
    id: string
    name: string
    nameEn?: string
    category: string
  }
  status: string
  expiryDate?: string
  daysToExpiry?: number
}

interface UseInventoryItemProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  memberId: string
  onSuccess?: () => void
}

const usageTypes = [
  { value: 'COOKING', label: '烹饪' },
  { value: 'MEAL_LOG', label: '餐食记录' },
  { value: 'MANUAL', label: '手动使用' },
  { value: 'RECIPE', label: '食谱制作' },
  { value: 'SHARING', label: '分享' },
  { value: 'OTHER', label: '其他' }
]

export function UseInventoryItem({ 
  isOpen, 
  onClose, 
  item, 
  memberId, 
  onSuccess 
}: UseInventoryItemProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    usedQuantity: '',
    usageType: 'MANUAL',
    notes: '',
    recipeName: ''
  })

  React.useEffect(() => {
    if (isOpen && item) {
      setFormData({
        usedQuantity: '',
        usageType: 'MANUAL',
        notes: '',
        recipeName: ''
      })
    }
  }, [isOpen, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!item) return

    const usedQuantity = parseFloat(formData.usedQuantity)
    if (!usedQuantity || usedQuantity <= 0) {
      alert('请输入有效的使用数量')
      return
    }

    if (usedQuantity > item.quantity) {
      alert(`使用数量不能超过库存数量 (${item.quantity} ${item.unit})`)
      return
    }

    setLoading(true)

    try {
      const payload = {
        inventoryItemId: item.id,
        memberId,
        usedQuantity,
        usageType: formData.usageType,
        notes: formData.notes || undefined,
        recipeName: formData.usageType === 'COOKING' || formData.usageType === 'RECIPE' 
          ? formData.recipeName || undefined 
          : undefined
      }

      const response = await fetch('/api/inventory/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        onSuccess?.()
        onClose()
      } else {
        alert(result.error || '使用失败')
      }
    } catch (error) {
      console.error('使用库存失败:', error)
      alert('使用失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getExpiryWarning = () => {
    if (!item?.expiryDate) return null

    const daysToExpiry = item.daysToExpiry || 0
    if (daysToExpiry < 0) {
      return {
        type: 'error' as const,
        message: `该物品已过期 ${Math.abs(daysToExpiry)} 天，使用前请确认安全性`
      }
    } else if (daysToExpiry <= 3) {
      return {
        type: 'warning' as const,
        message: `该物品即将在 ${daysToExpiry} 天后过期，建议优先使用`
      }
    }
    return null
  }

  const expiryWarning = getExpiryWarning()

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Minus className="h-5 w-5" />
            <span>使用库存</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 物品信息 */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-medium text-lg">
                  {item.food.name}
                  {item.food.nameEn && (
                    <span className="text-gray-500 text-sm ml-2">
                      ({item.food.nameEn})
                    </span>
                  )}
                </h3>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>当前库存：{item.quantity} {item.unit}</span>
                  <Badge variant="outline">{item.food.category}</Badge>
                </div>

                {item.expiryDate && (
                  <div className="text-sm text-gray-500">
                    保质期：{new Date(item.expiryDate).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 过期警告 */}
          {expiryWarning && (
            <Alert className={expiryWarning.type === 'error' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className={expiryWarning.type === 'error' ? 'text-red-800' : 'text-yellow-800'}>
                {expiryWarning.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 使用信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="usedQuantity">使用数量 *</Label>
              <div className="flex space-x-2">
                <Input
                  id="usedQuantity"
                  type="number"
                  step="0.01"
                  min="0"
                  max={item.quantity}
                  placeholder={`最大 ${item.quantity} ${item.unit}`}
                  value={formData.usedQuantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, usedQuantity: e.target.value }))}
                  required
                />
                <div className="flex items-center px-3 bg-gray-100 rounded-md text-sm">
                  {item.unit}
                </div>
              </div>
              
              {/* 快速选择按钮 */}
              <div className="flex space-x-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    usedQuantity: (item.quantity / 2).toString() 
                  }))}
                >
                  一半
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    usedQuantity: item.quantity.toString() 
                  }))}
                >
                  全部
                </Button>
              </div>
            </div>

            <div>
              <Label>使用类型</Label>
              <Select 
                value={formData.usageType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, usageType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {usageTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.usageType === 'COOKING' || formData.usageType === 'RECIPE') && (
              <div>
                <Label htmlFor="recipeName">食谱名称</Label>
                <Input
                  id="recipeName"
                  placeholder="请输入食谱名称"
                  value={formData.recipeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipeName: e.target.value }))}
                />
              </div>
            )}

            <div>
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="添加使用备注..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* 剩余库存预览 */}
          {formData.usedQuantity && parseFloat(formData.usedQuantity) > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">使用后剩余：</span>
                  <span className="font-bold">
                    {Math.max(0, item.quantity - parseFloat(formData.usedQuantity))} {item.unit}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.usedQuantity || parseFloat(formData.usedQuantity) <= 0}
            >
              {loading ? '使用中...' : '确认使用'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
