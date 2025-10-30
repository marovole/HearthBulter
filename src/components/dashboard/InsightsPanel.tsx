'use client'

import { useState, useEffect } from 'react'

interface InsightsPanelProps {
  memberId: string
}

interface HealthScore {
  recommendations: string[]
  details: {
    bmi: number | null
    bmiCategory: string | null
    nutritionAdherenceRate: number
    activityFrequency: number
    dataCompletenessRate: number
  }
}

export function InsightsPanel({ memberId }: InsightsPanelProps) {
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [weightTrend, setWeightTrend] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [memberId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [scoreResponse, trendResponse] = await Promise.all([
        fetch(`/api/dashboard/health-score?memberId=${memberId}`),
        fetch(`/api/dashboard/weight-trend?memberId=${memberId}&days=30`),
      ])

      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json()
        setHealthScore(scoreData.data)
      }

      if (trendResponse.ok) {
        const trendData = await trendResponse.json()
        setWeightTrend(trendData.data)
      }
    } catch (err) {
      console.error('加载洞察数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  const insights: string[] = []

  // 从健康评分获取建议
  if (healthScore?.recommendations) {
    insights.push(...healthScore.recommendations)
  }

  // 从体重趋势获取洞察
  if (weightTrend) {
    if (weightTrend.anomalies && weightTrend.anomalies.length > 0) {
      const highSeverityAnomalies = weightTrend.anomalies.filter(
        (a: any) => a.severity === 'high'
      )
      if (highSeverityAnomalies.length > 0) {
        insights.push(
          `检测到${highSeverityAnomalies.length}个体重异常波动，建议关注数据准确性`
        )
      }
    }

    if (weightTrend.changePercent > 5) {
      insights.push(
        `过去30天体重${weightTrend.change >= 0 ? '增加' : '减少'}了${Math.abs(weightTrend.changePercent).toFixed(1)}%，${weightTrend.change >= 0 ? '注意控制饮食' : '继续保持'}`
      )
    }
  }

  // 数据完整性建议
  if (healthScore) {
    if (healthScore.details.dataCompletenessRate < 50) {
      insights.push(
        `数据完整性较低（${Math.round(healthScore.details.dataCompletenessRate)}%），建议完善健康数据记录`
      )
    }

    if (healthScore.details.activityFrequency < 15) {
      insights.push(
        `过去30天仅记录${healthScore.details.activityFrequency}天，建议每天记录健康数据以获取更准确的洞察`
      )
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">健康洞察</h3>

      {insights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">暂无洞察提示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
            >
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 数据统计 */}
      {healthScore && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">数据统计</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">运动频率</div>
              <div className="font-semibold text-gray-900">
                {healthScore.details.activityFrequency}/30 天
              </div>
            </div>
            <div>
              <div className="text-gray-600">数据完整性</div>
              <div className="font-semibold text-gray-900">
                {Math.round(healthScore.details.dataCompletenessRate)}%
              </div>
            </div>
            {healthScore.details.bmi && (
              <div>
                <div className="text-gray-600">BMI</div>
                <div className="font-semibold text-gray-900">
                  {healthScore.details.bmi.toFixed(1)}
                </div>
              </div>
            )}
            {healthScore.details.nutritionAdherenceRate > 0 && (
              <div>
                <div className="text-gray-600">营养达标率</div>
                <div className="font-semibold text-gray-900">
                  {healthScore.details.nutritionAdherenceRate}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

