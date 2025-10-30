'use client'

import { useState, useEffect } from 'react'
import { HealthScoreGauge } from './HealthScoreGauge'
import { GoalProgressBar } from './GoalProgressBar'

interface OverviewData {
  overview: {
    weightTrend: {
      currentWeight: number | null
      change: number
      changePercent: number
      targetWeight: number | null
    }
    nutritionSummary: {
      targetCalories: number | null
      actualCalories: number | null
      adherenceRate: number
    }
    goalProgress: Array<{
      goalId: string
      goalType: string
      currentProgress: number
      targetWeight: number | null
      currentWeight: number | null
      startWeight: number | null
      onTrack: boolean
      weeksRemaining: number | null
    }>
  }
  healthScore: {
    totalScore: number
    breakdown: {
      bmiScore: number
      nutritionScore: number
      activityScore: number
      dataCompletenessScore: number
    }
    details: {
      bmi: number | null
      bmiCategory: string | null
      nutritionAdherenceRate: number
      activityFrequency: number
      dataCompletenessRate: number
    }
    recommendations: string[]
  }
}

interface OverviewCardsProps {
  memberId: string
}

export function OverviewCards({ memberId }: OverviewCardsProps) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [memberId])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/dashboard/overview?memberId=${memberId}`
      )
      if (!response.ok) {
        throw new Error('加载概览数据失败')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error || '加载失败'}</p>
      </div>
    )
  }

  const { overview, healthScore } = data

  return (
    <div className="space-y-4">
      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">当前体重</div>
          <div className="text-2xl font-bold text-gray-900">
            {overview.weightTrend.currentWeight
              ? `${overview.weightTrend.currentWeight.toFixed(1)} kg`
              : '--'}
          </div>
          {overview.weightTrend.targetWeight && (
            <div className="text-xs text-gray-500 mt-1">
              目标: {overview.weightTrend.targetWeight.toFixed(1)} kg
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">体重变化</div>
          <div
            className={`text-2xl font-bold ${
              overview.weightTrend.change >= 0
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {overview.weightTrend.change >= 0 ? '+' : ''}
            {overview.weightTrend.change.toFixed(1)} kg
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {overview.weightTrend.changePercent >= 0 ? '+' : ''}
            {overview.weightTrend.changePercent.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">营养达标率</div>
          <div className="text-2xl font-bold text-gray-900">
            {overview.nutritionSummary.adherenceRate.toFixed(0)}%
          </div>
          {overview.nutritionSummary.targetCalories && (
            <div className="text-xs text-gray-500 mt-1">
              目标: {overview.nutritionSummary.targetCalories} kcal
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">健康评分</div>
          <div className="text-2xl font-bold text-gray-900">
            {healthScore.totalScore} 分
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {healthScore.details.bmiCategory &&
              `BMI: ${healthScore.details.bmiCategory === 'normal' ? '正常' : '需关注'}`}
          </div>
        </div>
      </div>

      {/* 健康评分仪表盘和目标进度 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">健康评分</h3>
          <HealthScoreGauge
            score={healthScore.totalScore}
            breakdown={healthScore.breakdown}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">目标进度</h3>
          {overview.goalProgress.length > 0 ? (
            <div className="space-y-3">
              {overview.goalProgress.map((goal) => (
                <GoalProgressBar
                  key={goal.goalId}
                  goalType={goal.goalType}
                  currentProgress={goal.currentProgress}
                  targetWeight={goal.targetWeight}
                  currentWeight={goal.currentWeight}
                  startWeight={goal.startWeight}
                  onTrack={goal.onTrack}
                  weeksRemaining={goal.weeksRemaining}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">暂无活跃目标</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

