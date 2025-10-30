'use client'

import { useState, useEffect } from 'react'

interface HealthData {
  id: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  bloodPressureSystolic: number | null
  bloodPressureDiastolic: number | null
  heartRate: number | null
  measuredAt: string
  source: string
  notes: string | null
}

interface HealthDataListProps {
  memberId: string
  onDelete?: (id: string) => void
}

export function HealthDataList({ memberId, onDelete }: HealthDataListProps) {
  const [data, setData] = useState<HealthData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [memberId])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/members/${memberId}/health-data`)
      if (!response.ok) {
        throw new Error('加载数据失败')
      }
      const result = await response.json()
      setData(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条健康数据吗？')) {
      return
    }

    try {
      const response = await fetch(
        `/api/members/${memberId}/health-data/${id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('删除失败')
      }

      // 更新列表
      setData(data.filter((item) => item.id !== id))

      if (onDelete) {
        onDelete(id)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'MANUAL':
        return '手动录入'
      case 'WEARABLE':
        return '可穿戴设备'
      case 'MEDICAL_REPORT':
        return '体检报告'
      default:
        return source
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">暂无健康数据记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div
          key={item.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatDate(item.measuredAt)}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {getSourceLabel(item.source)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                {item.weight !== null && (
                  <div>
                    <span className="text-gray-500">体重:</span>
                    <span className="ml-2 font-medium">{item.weight} kg</span>
                  </div>
                )}
                {item.bodyFat !== null && (
                  <div>
                    <span className="text-gray-500">体脂率:</span>
                    <span className="ml-2 font-medium">{item.bodyFat}%</span>
                  </div>
                )}
                {item.muscleMass !== null && (
                  <div>
                    <span className="text-gray-500">肌肉量:</span>
                    <span className="ml-2 font-medium">
                      {item.muscleMass} kg
                    </span>
                  </div>
                )}
                {item.bloodPressureSystolic !== null &&
                  item.bloodPressureDiastolic !== null && (
                    <div>
                      <span className="text-gray-500">血压:</span>
                      <span className="ml-2 font-medium">
                        {item.bloodPressureSystolic}/
                        {item.bloodPressureDiastolic} mmHg
                      </span>
                    </div>
                  )}
                {item.heartRate !== null && (
                  <div>
                    <span className="text-gray-500">心率:</span>
                    <span className="ml-2 font-medium">{item.heartRate} bpm</span>
                  </div>
                )}
              </div>

              {item.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{item.notes}</p>
                </div>
              )}
            </div>

            {onDelete && (
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                删除
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
