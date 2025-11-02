'use client'

import React, { useState } from 'react'
import { 
  Download, 
  Upload, 
  FileText, 
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react'

interface DataImportExportProps {
  memberId: string
  onClose?: () => void
}

interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel'
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'
  customStartDate?: string
  customEndDate?: string
  includeMetrics: {
    weight: boolean
    bodyFat: boolean
    muscleMass: boolean
    bloodPressure: boolean
    heartRate: boolean
    notes: boolean
  }
}

export function DataImportExport({ memberId, onClose }: DataImportExportProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [loading, setLoading] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: 'month',
    includeMetrics: {
      weight: true,
      bodyFat: true,
      muscleMass: true,
      bloodPressure: true,
      heartRate: true,
      notes: true
    }
  })
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        format: exportOptions.format,
        dateRange: exportOptions.dateRange,
        memberId,
        metrics: Object.keys(exportOptions.includeMetrics)
          .filter(key => exportOptions.includeMetrics[key as keyof typeof exportOptions.includeMetrics])
          .join(',')
      })

      if (exportOptions.dateRange === 'custom' && exportOptions.customStartDate && exportOptions.customEndDate) {
        params.append('startDate', exportOptions.customStartDate)
        params.append('endDate', exportOptions.customEndDate)
      }

      const response = await fetch(`/api/members/${memberId}/health-data/export?${params}`)
      
      if (!response.ok) {
        throw new Error('导出失败')
      }

      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      
      const filename = `health-data-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`
      a.download = filename
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setImportResult({
        success: true,
        message: `数据已成功导出为 ${exportOptions.format.toUpperCase()} 格式`
      })

    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : '导出失败'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setImportResult({
        success: false,
        message: '请选择要导入的文件'
      })
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('memberId', memberId)

      const response = await fetch(`/api/members/${memberId}/health-data/import`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '导入失败')
      }

      setImportResult({
        success: true,
        message: `成功导入 ${result.imported} 条数据`,
        details: result
      })

      // 清空文件选择
      setImportFile(null)

    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : '导入失败'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 验证文件类型
      const allowedTypes = ['.csv', '.xlsx', '.xls']
      const fileExtension = file.name.substring(file.name.lastIndexOf('.'))
      
      if (!allowedTypes.includes(fileExtension)) {
        setImportResult({
          success: false,
          message: '仅支持 CSV、Excel 格式的文件'
        })
        return
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setImportResult({
          success: false,
          message: '文件大小不能超过 10MB'
        })
        return
      }

      setImportFile(file)
      setImportResult(null)
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-600" />
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-blue-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">数据导入/导出</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium ${
            activeTab === 'export'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>导出数据</span>
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium ${
            activeTab === 'import'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>导入数据</span>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {activeTab === 'export' ? (
          <div className="space-y-6">
            {/* 导出格式选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">导出格式</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'csv', label: 'CSV', desc: '适合数据分析' },
                  { value: 'excel', label: 'Excel', desc: '适合表格编辑' },
                  { value: 'pdf', label: 'PDF', desc: '适合打印分享' }
                ].map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setExportOptions(prev => ({ ...prev, format: format.value as any }))}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      exportOptions.format === format.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      {getFormatIcon(format.value)}
                      <span className="font-medium text-gray-900">{format.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">{format.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 时间范围选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">时间范围</label>
              <div className="flex items-center space-x-4">
                <select
                  value={exportOptions.dateRange}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="week">最近一周</option>
                  <option value="month">最近一月</option>
                  <option value="quarter">最近三月</option>
                  <option value="year">最近一年</option>
                  <option value="all">全部时间</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              {exportOptions.dateRange === 'custom' && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={exportOptions.customStartDate || ''}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, customStartDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={exportOptions.customEndDate || ''}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, customEndDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 数据指标选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">包含指标</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(exportOptions.includeMetrics).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeMetrics: {
                          ...prev.includeMetrics,
                          [key]: e.target.checked
                        }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {key === 'weight' ? '体重' :
                       key === 'bodyFat' ? '体脂率' :
                       key === 'muscleMass' ? '肌肉量' :
                       key === 'bloodPressure' ? '血压' :
                       key === 'heartRate' ? '心率' : '备注'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 导出按钮 */}
            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Download className="h-5 w-5" />
              <span>{loading ? '导出中...' : '导出数据'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 文件上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">选择文件</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {importFile ? importFile.name : '点击选择文件或拖拽文件到此处'}
                  </p>
                  <p className="text-xs text-gray-500">支持 CSV、Excel 格式，最大 10MB</p>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer text-sm font-medium"
                >
                  选择文件
                </label>
              </div>
            </div>

            {/* 导入说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">导入说明</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 文件必须包含表头行，列名包括：测量时间、体重、体脂率、肌肉量、收缩压、舒张压、心率、备注</li>
                <li>• 日期格式：YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss</li>
                <li>• 数值字段请使用数字格式，血压格式：120/80</li>
                <li>• 重复数据将被自动跳过</li>
              </ul>
            </div>

            {/* 导入按钮 */}
            <button
              onClick={handleImport}
              disabled={loading || !importFile}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Upload className="h-5 w-5" />
              <span>{loading ? '导入中...' : '导入数据'}</span>
            </button>
          </div>
        )}

        {/* 结果提示 */}
        {importResult && (
          <div className={`mt-6 p-4 rounded-lg flex items-start space-x-3 ${
            importResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {importResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm ${
                importResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {importResult.message}
              </p>
              {importResult.details && (
                <div className="mt-2 text-xs text-green-700">
                  <p>导入详情：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>成功导入：{importResult.details.imported} 条</li>
                    <li>跳过重复：{importResult.details.skipped} 条</li>
                    <li>失败：{importResult.details.failed} 条</li>
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
