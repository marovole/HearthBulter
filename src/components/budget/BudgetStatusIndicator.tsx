'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangleIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  DollarSignIcon,
  RefreshCwIcon
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { BudgetStatus as BudgetStatusType, FoodCategory } from '@prisma/client'

interface BudgetStatus {
  budget: any
  usedAmount: number
  remainingAmount: number
  usagePercentage: number
  categoryUsage: {
    [key in FoodCategory]?: {
      budget: number
      used: number
      remaining: number
      percentage: number
    }
  }
  dailyAverage: number
  daysRemaining: number
  projectedSpend: number
  alerts: string[]
}

interface BudgetStatusIndicatorProps {
  memberId: string
  budgetId?: string
  compact?: boolean
  showDetails?: boolean
  onBudgetClick?: (budget: BudgetStatus) => void
}

export function BudgetStatusIndicator({ 
  memberId, 
  budgetId, 
  compact = false, 
  showDetails = false,
  onBudgetClick 
}: BudgetStatusIndicatorProps) {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBudgetStatus = async () => {
    try {
      const url = budgetId 
        ? `/api/budget/current?budgetId=${budgetId}`
        : `/api/budget/current?memberId=${memberId}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取预算状态失败')
      }
      
      const data = await response.json()
      setBudgetStatus(data)
    } catch (err) {
      console.error('获取预算状态失败:', err)
      setBudgetStatus(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBudgetStatus()
  }, [memberId, budgetId])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchBudgetStatus()
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600'
    if (percentage >= 80) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <Badge variant="destructive">已超支</Badge>
    }
    if (percentage >= 80) {
      return <Badge variant="secondary">即将用完</Badge>
    }
    return <Badge variant="default">正常</Badge>
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!budgetStatus) {
    return (
      <Alert>
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          没有找到活跃的预算
        </AlertDescription>
      </Alert>
    )
  }

  const { budget, usedAmount, remainingAmount, usagePercentage, daysRemaining, alerts } = budgetStatus

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{budget.name}</span>
              {getStatusBadge(usagePercentage)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">预算使用</span>
              <span className={getUsageColor(usagePercentage)}>
                {formatCurrency(usedAmount)} / {formatCurrency(budget.totalAmount)}
              </span>
            </div>
            <Progress 
              value={Math.min(usagePercentage, 100)} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{usagePercentage.toFixed(1)}% 已使用</span>
              <span>剩余 {daysRemaining} 天</span>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangleIcon className="h-4 w-4" />
                <span>{alerts[0]}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{budget.name}</h3>
            <p className="text-sm text-muted-foreground">
              剩余 {daysRemaining} 天 · {formatDistanceToNow(new Date(budget.endDate), { 
                addSuffix: true, 
                locale: zhCN 
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(usagePercentage)}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(budget.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">总预算</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getUsageColor(usagePercentage)}`}>
              {formatCurrency(usedAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              已使用 {usagePercentage.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${remainingAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(remainingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">剩余预算</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span>预算使用进度</span>
            <span className={getUsageColor(usagePercentage)}>
              {usagePercentage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(usagePercentage, 100)} 
            className="h-3"
          />
          {usagePercentage > 100 && (
            <p className="text-xs text-red-600">
              已超支 {formatCurrency(usedAmount - budget.totalAmount)}
            </p>
          )}
        </div>

        {showDetails && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <TrendingUpIcon className="h-4 w-4" />
                日均支出
              </span>
              <span className="font-medium">
                {formatCurrency(budgetStatus.dailyAverage)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <TrendingDownIcon className="h-4 w-4" />
                预计总支出
              </span>
              <span className={`font-medium ${budgetStatus.projectedSpend > budget.totalAmount ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(budgetStatus.projectedSpend)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>预计节省/超支</span>
              <span className={`font-medium ${budgetStatus.projectedSpend > budget.totalAmount ? 'text-red-600' : 'text-green-600'}`}>
                {budgetStatus.projectedSpend > budget.totalAmount ? '+' : ''}
                {formatCurrency(budgetStatus.projectedSpend - budget.totalAmount)}
              </span>
            </div>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="border-t pt-4">
            <Alert variant={alerts.some(alert => alert.includes('超支')) ? 'destructive' : 'default'}>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                {alerts.slice(0, 2).map((alert, index) => (
                  <div key={index}>{alert}</div>
                ))}
                {alerts.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    还有 {alerts.length - 2} 条提醒...
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {onBudgetClick && (
          <div className="border-t pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => onBudgetClick(budgetStatus)}
            >
              查看详情
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
