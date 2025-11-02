'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  Trash2, 
  Eye,
  SortAsc,
  SortDesc,
  Filter
} from 'lucide-react'

interface DataHistoryTableProps {
  memberId: string
  searchTerm?: string
  dateRange?: 'week' | 'month' | 'quarter' | 'year' | 'all'
  onDataDeleted?: (id: string) => void
}

interface HealthData {
  id: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  bloodPressureSystolic: number | null
  bloodPressureDiastolic: number | null
  heartRate: number | null
  bloodSugar?: number | null
  sleep?: number | null
  exercise?: number | null
  measuredAt: string
  source: string
  notes: string | null
}

type SortField = 'measuredAt' | 'weight' | 'bloodPressure' | 'heartRate'
type SortDirection = 'asc' | 'desc'

export function DataHistoryTable({ 
  memberId, 
  searchTerm = '', 
  dateRange = 'month',
  onDataDeleted 
}: DataHistoryTableProps) {
  const [data, setData] = useState<HealthData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('measuredAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    source: 'all',
    hasWeight: false,
    hasBloodPressure: false,
    hasHeartRate: false
  })

  const itemsPerPage = 10

  useEffect(() => {
    loadData()
  }, [memberId, currentPage, searchTerm, dateRange, sortField, sortDirection, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        dateRange,
        sort: sortField,
        order: sortDirection,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== false && value !== 'all')
        )
      })

      const response = await fetch(`/api/members/${memberId}/health-data?${params}`)
      if (!response.ok) {
        throw new Error('加载数据失败')
      }
      
      const result = await response.json()
      setData(result.data || [])
      setTotalPages(Math.ceil((result.total || 0) / itemsPerPage))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(data.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id])
    } else {
      setSelectedItems(prev => prev.filter(item => item !== id))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条健康数据吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/members/${memberId}/health-data/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      setData(data.filter(item => item.id !== id))
      setSelectedItems(selectedItems.filter(item => item !== id))
      
      if (onDataDeleted) {
        onDataDeleted(id)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedItems.length} 条数据吗？`)) {
      return
    }

    try {
      const deletePromises = selectedItems.map(id =>
        fetch(`/api/members/${memberId}/health-data/${id}`, { method: 'DELETE' })
      )
      
      await Promise.all(deletePromises)
      
      setData(data.filter(item => !selectedItems.includes(item.id)))
      setSelectedItems([])
    } catch (err) {
      alert('批量删除失败')
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

  const getSourceBadge = (source: string) => {
    const styles = {
      MANUAL: 'bg-blue-100 text-blue-800',
      WEARABLE: 'bg-green-100 text-green-800',
      MEDICAL_REPORT: 'bg-purple-100 text-purple-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[source as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {getSourceLabel(source)}
      </span>
    )
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
        <p className="text-gray-500">暂无符合条件的健康数据记录</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 筛选和操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            <span>筛选</span>
          </button>
          
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                已选择 {selectedItems.length} 项
              </span>
              <button
                onClick={handleBatchDelete}
                className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                <span>批量删除</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          共 {data.length} 条记录
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数据来源</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部</option>
                <option value="MANUAL">手动录入</option>
                <option value="WEARABLE">可穿戴设备</option>
                <option value="MEDICAL_REPORT">体检报告</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasWeight"
                checked={filters.hasWeight}
                onChange={(e) => setFilters(prev => ({ ...prev, hasWeight: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasWeight" className="text-sm font-medium text-gray-700">包含体重</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasBloodPressure"
                checked={filters.hasBloodPressure}
                onChange={(e) => setFilters(prev => ({ ...prev, hasBloodPressure: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasBloodPressure" className="text-sm font-medium text-gray-700">包含血压</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasHeartRate"
                checked={filters.hasHeartRate}
                onChange={(e) => setFilters(prev => ({ ...prev, hasHeartRate: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasHeartRate" className="text-sm font-medium text-gray-700">包含心率</label>
            </div>
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.length === data.length && data.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('measuredAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>测量时间</span>
                  {sortField === 'measuredAt' && (
                    sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                  )}
                </div>
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                健康指标
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                数据来源
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                备注
              </th>
              
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(item.measuredAt)}
                </td>
                
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="space-y-1">
                    {item.weight !== null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">体重:</span>
                        <span className="font-medium">{item.weight} kg</span>
                      </div>
                    )}
                    {item.bloodPressureSystolic !== null && item.bloodPressureDiastolic !== null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">血压:</span>
                        <span className="font-medium">
                          {item.bloodPressureSystolic}/{item.bloodPressureDiastolic} mmHg
                        </span>
                      </div>
                    )}
                    {item.heartRate !== null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">心率:</span>
                        <span className="font-medium">{item.heartRate} bpm</span>
                      </div>
                    )}
                    {item.bodyFat !== null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">体脂率:</span>
                        <span className="font-medium">{item.bodyFat}%</span>
                      </div>
                    )}
                    {item.muscleMass !== null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">肌肉量:</span>
                        <span className="font-medium">{item.muscleMass} kg</span>
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSourceBadge(item.source)}
                </td>
                
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="max-w-xs truncate">
                    {item.notes || '-'}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            显示第 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, data.length)} 条，共 {data.length} 条
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>上一页</span>
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>下一页</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
