/**
 * 通用类型定义
 * 避免使用any类型，提供具体的类型定义
 */

/**
 * API响应通用格式
 */
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * 日期范围参数
 */
export interface DateRange {
  startDate: Date
  endDate: Date
}

/**
 * 文件上传结果
 */
export interface FileUploadResult {
  url: string
  filename: string
  size: number
  contentType: string
}

/**
 * 操作结果
 */
export interface OperationResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 通用错误类型
 */
export interface ErrorDetails {
  field?: string
  code?: string
  message: string
  value?: any
}

/**
 * 通知类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/**
 * 优先级类型
 */
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * 状态类型
 */
export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'failed'
