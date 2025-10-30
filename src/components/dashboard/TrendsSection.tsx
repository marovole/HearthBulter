'use client'

import { useState, useEffect } from 'react'
import { WeightTrendChart } from './WeightTrendChart'
import { MacroPieChart } from './MacroPieChart'

interface TrendsSectionProps {
  memberId: string
}

export function TrendsSection({ memberId }: TrendsSectionProps) {
  const [days, setDays] = useState(30)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  return (
    <div className="space-y-6">
      {/* 时间范围选择器 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">数据趋势</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">趋势周期：</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value={7}>7天</option>
                <option value={30}>30天</option>
                <option value={90}>90天</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">营养周期：</span>
              <select
                value={period}
                onChange={(e) =>
                  setPeriod(
                    e.target.value as 'daily' | 'weekly' | 'monthly'
                  )
                }
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
            </div>
          </div>
        </div>

        {/* 体重趋势图 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">体重趋势</h4>
          <WeightTrendChart memberId={memberId} days={days} />
        </div>

        {/* 营养分析图 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">营养分析</h4>
          <NutritionChart memberId={memberId} period={period} />
        </div>
      </div>
    </div>
  )
}

function NutritionChart({
  memberId,
  period,
}: {
  memberId: string
  period: 'daily' | 'weekly' | 'monthly'
}) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [memberId, period])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/dashboard/nutrition-analysis?memberId=${memberId}&period=${period}`
      )
      if (!response.ok) {
        throw new Error('加载营养数据失败')
      }
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      console.error('加载营养数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>暂无营养数据</p>
      </div>
    )
  }

  return (
    <MacroPieChart
      target={
        data.targetCarbs && data.targetProtein && data.targetFat
          ? {
              carbs: data.targetCarbs,
              protein: data.targetProtein,
              fat: data.targetFat,
            }
          : undefined
      }
      actual={
        data.actualCarbs && data.actualProtein && data.actualFat
          ? {
              carbs: data.actualCarbs,
              protein: data.actualProtein,
              fat: data.actualFat,
            }
          : undefined
      }
    />
  )
}

// 添加 useEffect import
import { useEffect } from 'react'

