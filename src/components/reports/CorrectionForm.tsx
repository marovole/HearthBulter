'use client'

import { useState, useEffect } from 'react'
import type { MedicalIndicator, IndicatorStatus } from '@prisma/client'

interface CorrectionFormProps {
  reportId: string
  memberId: string
  indicators: MedicalIndicator[]
  onSuccess?: () => void
  onCancel?: () => void
}

const STATUS_OPTIONS: Array<{ value: IndicatorStatus; label: string }> = [
  { value: 'NORMAL', label: '正常' },
  { value: 'LOW', label: '偏低' },
  { value: 'HIGH', label: '偏高' },
  { value: 'CRITICAL', label: '严重异常' },
]

export function CorrectionForm({
  reportId,
  memberId,
  indicators,
  onSuccess,
  onCancel,
}: CorrectionFormProps) {
  const [formData, setFormData] = useState<
    Record<
      string,
      {
        value: number
        unit: string
        referenceRange?: string
        status: IndicatorStatus
      }
    >
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 初始化表单数据
    const initialData: typeof formData = {}
    indicators.forEach((ind) => {
      initialData[ind.id] = {
        value: ind.value,
        unit: ind.unit,
        referenceRange: ind.referenceRange || undefined,
        status: ind.status,
      }
    })
    setFormData(initialData)
  }, [indicators])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 构建更新数据
      const indicatorsUpdate = Object.entries(formData).map(([id, data]) => ({
        id,
        value: data.value,
        unit: data.unit,
        referenceRange: data.referenceRange,
        status: data.status,
      }))

      const response = await fetch(
        `/api/members/${memberId}/reports/${reportId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            indicators: indicatorsUpdate,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '保存失败')
        setLoading(false)
        return
      }

      // 成功
      if (onSuccess) {
        onSuccess()
      } else {
        // 重新加载页面
        window.location.reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setLoading(false)
    }
  }

  const updateIndicator = (
    id: string,
    field: keyof typeof formData[string],
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border rounded-lg divide-y">
        {indicators.map((indicator) => {
          const formValue = formData[indicator.id]
          if (!formValue) return null

          return (
            <div key={indicator.id} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {indicator.name}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      数值
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formValue.value}
                      onChange={(e) =>
                        updateIndicator(
                          indicator.id,
                          'value',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      单位
                    </label>
                    <input
                      type="text"
                      value={formValue.unit}
                      onChange={(e) =>
                        updateIndicator(indicator.id, 'unit', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      参考范围
                    </label>
                    <input
                      type="text"
                      value={formValue.referenceRange || ''}
                      onChange={(e) =>
                        updateIndicator(
                          indicator.id,
                          'referenceRange',
                          e.target.value
                        )
                      }
                      placeholder="如: <5.2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      状态
                    </label>
                    <select
                      value={formValue.status}
                      onChange={(e) =>
                        updateIndicator(
                          indicator.id,
                          'status',
                          e.target.value as IndicatorStatus
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '保存修正'}
        </button>
      </div>
    </form>
  )
}

