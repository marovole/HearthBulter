'use client'

import { useEffect, useState } from 'react'
import type {
  MedicalReport,
  MedicalIndicator,
  IndicatorStatus,
} from '@prisma/client'

interface OcrResultProps {
  reportId: string
  memberId: string
}

interface ReportData extends MedicalReport {
  indicators: MedicalIndicator[]
}

const STATUS_COLORS: Record<IndicatorStatus, string> = {
  NORMAL: 'bg-green-100 text-green-800 border-green-200',
  LOW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_LABELS: Record<IndicatorStatus, string> = {
  NORMAL: '正常',
  LOW: '偏低',
  HIGH: '偏高',
  CRITICAL: '严重异常',
}

export function OcrResult({ reportId, memberId }: OcrResultProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const fetchReport = async () => {
    try {
      const response = await fetch(
        `/api/members/${memberId}/reports/${reportId}`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '加载报告失败')
        setLoading(false)
        return
      }

      setReport(data.data)

      // 如果OCR还在处理中，继续轮询
      if (data.data.ocrStatus === 'PROCESSING' || data.data.ocrStatus === 'PENDING') {
        setPolling(true)
      } else {
        setPolling(false)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [reportId, memberId])

  // 轮询OCR状态
  useEffect(() => {
    if (!polling) return

    const interval = setInterval(() => {
      fetchReport()
    }, 3000) // 每3秒轮询一次

    return () => clearInterval(interval)
  }, [polling, reportId, memberId])

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">报告不存在</p>
      </div>
    )
  }

  // OCR处理中
  if (report.ocrStatus === 'PROCESSING' || report.ocrStatus === 'PENDING') {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          正在处理OCR识别...
        </p>
        <p className="text-sm text-gray-600">
          这可能需要几分钟时间，请稍候
        </p>
      </div>
    )
  }

  // OCR处理失败
  if (report.ocrStatus === 'FAILED') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-900 mb-2">
          OCR识别失败
        </h3>
        <p className="text-sm text-red-800 mb-4">
          {report.ocrError || '无法识别报告内容，请检查文件是否清晰'}
        </p>
        <p className="text-xs text-red-600">
          提示：请确保报告图片清晰，文字完整可见
        </p>
      </div>
    )
  }

  // 显示识别结果
  const abnormalIndicators = report.indicators.filter((ind) => ind.isAbnormal)
  const normalIndicators = report.indicators.filter((ind) => !ind.isAbnormal)

  return (
    <div className="space-y-6">
      {/* 报告元信息 */}
      <div className="bg-white border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">报告日期：</span>
            <span className="font-medium">
              {report.reportDate
                ? new Date(report.reportDate).toLocaleDateString('zh-CN')
                : '未识别'}
            </span>
          </div>
          {report.institution && (
            <div>
              <span className="text-gray-500">医疗机构：</span>
              <span className="font-medium">{report.institution}</span>
            </div>
          )}
          {report.reportType && (
            <div>
              <span className="text-gray-500">报告类型：</span>
              <span className="font-medium">{report.reportType}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">识别状态：</span>
            <span className="font-medium text-green-600">已完成</span>
          </div>
        </div>
      </div>

      {/* 异常指标提醒 */}
      {abnormalIndicators.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-900 mb-3">
            发现 {abnormalIndicators.length} 项异常指标
          </h3>
          <div className="space-y-2">
            {abnormalIndicators.map((indicator) => (
              <div
                key={indicator.id}
                className="flex items-center justify-between p-2 bg-white rounded"
              >
                <span className="font-medium">{indicator.name}</span>
                <span className="text-red-600">
                  {indicator.value} {indicator.unit}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  STATUS_COLORS[indicator.status]
                }`}>
                  {STATUS_LABELS[indicator.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 指标列表 */}
      <div className="bg-white border rounded-lg">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            识别到的健康指标 ({report.indicators.length} 项)
          </h3>
        </div>
        <div className="divide-y">
          {report.indicators.map((indicator) => (
            <div
              key={indicator.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                indicator.isAbnormal ? 'bg-red-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">
                      {indicator.name}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      STATUS_COLORS[indicator.status]
                    }`}>
                      {STATUS_LABELS[indicator.status]}
                    </span>
                  </div>
                  {indicator.referenceRange && (
                    <p className="text-sm text-gray-500 mt-1">
                      参考范围: {indicator.referenceRange}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {indicator.value}
                  </p>
                  <p className="text-sm text-gray-500">{indicator.unit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {report.indicators.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>未识别到任何健康指标</p>
            <p className="text-sm mt-2">
              请检查报告内容是否清晰，或尝试手动修正
            </p>
          </div>
        )}
      </div>

      {/* OCR原始文本（可选，用于调试） */}
      {report.ocrText && (
        <details className="bg-gray-50 border rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            查看OCR原始文本
          </summary>
          <pre className="mt-4 text-xs text-gray-600 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
            {report.ocrText}
          </pre>
        </details>
      )}
    </div>
  )
}

