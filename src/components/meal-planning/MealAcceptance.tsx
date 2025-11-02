'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit3,
  MessageSquare,
  AlertTriangle,
  ChefHat,
  Calendar
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { PortionAdjuster } from './PortionAdjuster'

interface MealAcceptanceProps {
  mealId: string
  planId: string
  isAccepted?: boolean
  acceptanceDate?: Date
  rejectionReason?: string
  customizations?: MealCustomization[]
  originalServings?: number
  originalIngredients?: Array<{
    id: string
    amount: number
    food: {
      id: string
      name: string
      unit?: string
    }
  }>
  originalNutrition?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  onAccept?: (customizations?: MealCustomization[]) => void
  onReject?: (reason: string) => void
  onCustomize?: (customizations: MealCustomization[]) => void
  onPortionAdjust?: (servings: number, ingredients: any[], nutrition: any) => void
}

interface MealCustomization {
  id: string
  type: 'INGREDIENT_REPLACE' | 'PORTION_ADJUST' | 'COOKING_METHOD' | 'TIME_ADJUST'
  description: string
  originalValue: string
  newValue: string
  createdAt: Date
}

const REJECTION_REASONS = [
  '食材过敏或不适合',
  '烹饪时间太长',
  '难度太高',
  '不符合饮食偏好',
  '营养不均衡',
  '其他原因'
]

export function MealAcceptance({
  mealId,
  planId,
  isAccepted = false,
  acceptanceDate,
  rejectionReason,
  customizations = [],
  originalServings = 1,
  originalIngredients = [],
  originalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 },
  onAccept,
  onReject,
  onCustomize,
  onPortionAdjust
}: MealAcceptanceProps) {
  const [status, setStatus] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CUSTOMIZED'>(
    isAccepted ? 'ACCEPTED' : 'PENDING'
  )
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [showCustomizePanel, setShowCustomizePanel] = useState(false)
  const [showPortionAdjuster, setShowPortionAdjuster] = useState(false)
  const [customizationsList, setCustomizationsList] = useState<MealCustomization[]>(customizations)

  useEffect(() => {
    if (customizations.length > 0) {
      setStatus('CUSTOMIZED')
    }
  }, [customizations])

  const handleAccept = () => {
    setStatus('ACCEPTED')
    onAccept?.(customizationsList)
    toast.success('食谱已接受')
  }

  const handleReject = () => {
    if (!rejectReason && !customReason) {
      toast.error('请选择或输入拒绝原因')
      return
    }

    const reason = rejectReason || customReason
    setStatus('REJECTED')
    onReject?.(reason)
    setShowRejectForm(false)
    toast.success('已拒绝此食谱')
  }

  const handleCustomize = (customization: MealCustomization) => {
    const updated = [...customizationsList, customization]
    setCustomizationsList(updated)
    onCustomize?.(updated)
    toast.success('已添加自定义修改')
  }

  const handlePortionAdjust = (servings: number, ingredients: any[], nutrition: any) => {
    const customization: MealCustomization = {
      id: Date.now().toString(),
      type: 'PORTION_ADJUST',
      description: `份量调整为 ${servings} 人份`,
      originalValue: `${originalServings} 人份`,
      newValue: `${servings} 人份`,
      createdAt: new Date()
    }
    
    handleCustomize(customization)
    onPortionAdjust?.(servings, ingredients, nutrition)
    setShowPortionAdjuster(false)
    setShowCustomizePanel(false)
  }

  const removeCustomization = (id: string) => {
    const updated = customizationsList.filter(c => c.id !== id)
    setCustomizationsList(updated)
    onCustomize?.(updated)
    toast.info('已移除自定义修改')
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'ACCEPTED':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          text: '已接受',
          color: 'bg-green-100 text-green-800 border-green-200',
          description: acceptanceDate 
            ? `于 ${acceptanceDate.toLocaleDateString()} 接受` 
            : '已接受此食谱'
        }
      case 'REJECTED':
        return {
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          text: '已拒绝',
          color: 'bg-red-100 text-red-800 border-red-200',
          description: rejectionReason || '已拒绝此食谱'
        }
      case 'CUSTOMIZED':
        return {
          icon: <Edit3 className="h-5 w-5 text-blue-600" />,
          text: '已自定义',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: `已进行 ${customizationsList.length} 项自定义修改`
        }
      default:
        return {
          icon: <Clock className="h-5 w-5 text-yellow-600" />,
          text: '待处理',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: '请决定是否接受此食谱'
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            食谱确认
          </div>
          <Badge variant="outline" className={statusDisplay.color}>
            {statusDisplay.icon}
            <span className="ml-2">{statusDisplay.text}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 状态描述 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {statusDisplay.description}
          </AlertDescription>
        </Alert>

        {/* 自定义修改列表 */}
        {customizationsList.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              自定义修改 ({customizationsList.length})
            </h4>
            <div className="space-y-2">
              {customizationsList.map((customization) => (
                <div key={customization.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">
                      {customization.description}
                    </div>
                    <div className="text-sm text-blue-700">
                      {customization.originalValue} → {customization.newValue}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomization(customization.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {status === 'PENDING' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleAccept}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              接受食谱
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowCustomizePanel(true)}
              className="flex-1"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              自定义修改
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowRejectForm(true)}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              拒绝食谱
            </Button>
          </div>
        )}

        {/* 拒绝表单 */}
        {showRejectForm && (
          <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
            <h4 className="font-medium text-red-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              请选择拒绝原因
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REJECTION_REASONS.map((reason) => (
                <label key={reason} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={rejectReason === reason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="text-sm text-red-800">{reason}</span>
                </label>
              ))}
            </div>
            
            <textarea
              placeholder="请详细说明原因（可选）"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full p-3 border border-red-200 rounded-lg text-sm"
              rows={3}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                className="flex-1"
              >
                确认拒绝
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectReason('')
                  setCustomReason('')
                }}
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 自定义面板 */}
        {showCustomizePanel && (
          <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="font-medium text-blue-900 flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              自定义修改
            </h4>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => {
                  // 这里可以打开食材替换对话框
                  setShowCustomizePanel(false)
                }}
                className="w-full justify-start"
              >
                替换食材
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowPortionAdjuster(true)
                  setShowCustomizePanel(false)
                }}
                className="w-full justify-start"
              >
                调整份量
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // 这里可以打开烹饪方法调整对话框
                  setShowCustomizePanel(false)
                }}
                className="w-full justify-start"
              >
                修改烹饪方法
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // 这里可以打开时间调整对话框
                  setShowCustomizePanel(false)
                }}
                className="w-full justify-start"
              >
                调整烹饪时间
              </Button>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowCustomizePanel(false)}
            >
              关闭
            </Button>
          </div>
        )}

        {/* 已接受/拒绝后的额外操作 */}
        {(status === 'ACCEPTED' || status === 'REJECTED') && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStatus('PENDING')}
            >
              <Clock className="h-4 w-4 mr-2" />
              重新考虑
            </Button>
            
            {status === 'ACCEPTED' && (
              <Button
                variant="outline"
                onClick={() => setShowCustomizePanel(true)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                添加修改
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    {/* 份量调整弹窗 */}
    {showPortionAdjuster && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">调整份量</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPortionAdjuster(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <PortionAdjuster
              mealId={mealId}
              originalServings={originalServings}
              originalIngredients={originalIngredients}
              originalNutrition={originalNutrition}
              onAdjust={handlePortionAdjust}
            />
          </div>
        </div>
      </div>
    )}
    </>
  )
}
