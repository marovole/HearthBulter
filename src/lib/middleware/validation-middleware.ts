/**
 * API输入验证中间件
 * 提供统一的请求验证、数据清理和错误处理
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { APIError, createErrorResponse } from '@/lib/errors/api-error'
import { logger } from '@/lib/logger'

export interface ValidationSchema {
  body?: z.ZodSchema
  query?: z.ZodSchema
  params?: z.ZodSchema
  files?: z.ZodSchema
}

export interface ValidationResult<T = any> {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
  sanitized?: any
}

/**
 * 统一验证中间件
 */
export class ValidationMiddleware {
  private static instance: ValidationMiddleware

  static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware()
    }
    return ValidationMiddleware.instance
  }

  /**
   * 验证请求
   */
  async validateRequest<T>(
    request: NextRequest,
    schema: ValidationSchema,
    context?: {
      params?: Record<string, string>
      userId?: string
      sessionId?: string
    }
  ): Promise<ValidationResult<T>> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    try {
      const result: any = {}
      const errors: Record<string, string[]> = {}

      // 验证请求体
      if (schema.body) {
        const bodyResult = await this.validateBody(request, schema.body)
        if (!bodyResult.success) {
          errors.body = bodyResult.errors
        } else {
          result.body = bodyResult.data
          result.sanitized = { ...(result.sanitized || {}), body: bodyResult.sanitized }
        }
      }

      // 验证查询参数
      if (schema.query) {
        const queryResult = await this.validateQuery(request, schema.query)
        if (!queryResult.success) {
          errors.query = queryResult.errors
        } else {
          result.query = queryResult.data
          result.sanitized = { ...(result.sanitized || {}), query: queryResult.sanitized }
        }
      }

      // 验证路径参数
      if (schema.params) {
        const paramsResult = await this.validateParams(
          context?.params || {},
          schema.params
        )
        if (!paramsResult.success) {
          errors.params = paramsResult.errors
        } else {
          result.params = paramsResult.data
          result.sanitized = { ...(result.sanitized || {}), params: paramsResult.sanitized }
        }
      }

      // 验证文件上传
      if (schema.files) {
        const filesResult = await this.validateFiles(request, schema.files)
        if (!filesResult.success) {
          errors.files = filesResult.errors
        } else {
          result.files = filesResult.data
          result.sanitized = { ...(result.sanitized || {}), files: filesResult.sanitized }
        }
      }

      const duration = Date.now() - startTime

      // 记录验证结果
      if (Object.keys(errors).length > 0) {
        logger.warn('请求验证失败', {
          requestId,
          errors,
          url: request.url,
          method: request.method,
          duration,
          userId: context?.userId
        })

        return {
          success: false,
          errors
        }
      }

      logger.info('请求验证成功', {
        requestId,
        url: request.url,
        method: request.method,
        duration,
        userId: context?.userId
      })

      return {
        success: true,
        data: result,
        sanitized: result.sanitized
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error('请求验证异常', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        url: request.url,
        method: request.method,
        duration,
        userId: context?.userId
      })

      return {
        success: false,
        errors: {
          system: ['验证过程中发生异常']
        }
      }
    }
  }

  /**
   * 验证请求体
   */
  private async validateBody<T>(
    request: NextRequest,
    schema: z.ZodSchema
  ): Promise<ValidationResult<T>> {
    try {
      const body = await request.json()
      
      // 基本安全检查
      const sanitizedBody = this.sanitizeInput(body)
      
      const result = schema.safeParse(sanitizedBody)
      
      if (!result.success) {
        return {
          success: false,
          errors: this.formatZodErrors(result.error)
        }
      }

      return {
        success: true,
        data: result.data,
        sanitized: sanitizedBody
      }
    } catch (error) {
      return {
        success: false,
        errors: { body: ['请求体格式错误或为空'] }
      }
    }
  }

  /**
   * 验证查询参数
   */
  private async validateQuery<T>(
    request: NextRequest,
    schema: z.ZodSchema
  ): Promise<ValidationResult<T>> {
    try {
      const { searchParams } = new URL(request.url)
      const query = Object.fromEntries(searchParams)
      
      // 基本安全检查
      const sanitizedQuery = this.sanitizeInput(query)
      
      const result = schema.safeParse(sanitizedQuery)
      
      if (!result.success) {
        return {
          success: false,
          errors: this.formatZodErrors(result.error)
        }
      }

      return {
        success: true,
        data: result.data,
        sanitized: sanitizedQuery
      }
    } catch (error) {
      return {
        success: false,
        errors: { query: ['查询参数格式错误'] }
      }
    }
  }

  /**
   * 验证路径参数
   */
  private async validateParams<T>(
    params: Record<string, string>,
    schema: z.ZodSchema
  ): Promise<ValidationResult<T>> {
    try {
      // 基本安全检查
      const sanitizedParams = this.sanitizeInput(params)
      
      const result = schema.safeParse(sanitizedParams)
      
      if (!result.success) {
        return {
          success: false,
          errors: this.formatZodErrors(result.error)
        }
      }

      return {
        success: true,
        data: result.data,
        sanitized: sanitizedParams
      }
    } catch (error) {
      return {
        success: false,
        errors: { params: ['路径参数格式错误'] }
      }
    }
  }

  /**
   * 验证文件上传
   */
  private async validateFiles<T>(
    request: NextRequest,
    schema: z.ZodSchema
  ): Promise<ValidationResult<T>> {
    try {
      // 检查是否是multipart/form-data
      const contentType = request.headers.get('content-type')
      if (!contentType?.includes('multipart/form-data')) {
        return {
          success: false,
          errors: { files: ['文件上传需要multipart/form-data格式'] }
        }
      }

      // 注意：在Next.js中，文件处理通常需要使用其他方法
      // 这里提供基本的验证框架
      return {
        success: true,
        data: {} as T,
        sanitized: {}
      }
    } catch (error) {
      return {
        success: false,
        errors: { files: ['文件验证失败'] }
      }
    }
  }

  /**
   * 格式化Zod错误
   */
  private formatZodErrors(error: z.ZodError): string[] {
    return error.errors.map(err => {
      const field = err.path.join('.')
      const message = err.message
      
      if (err.code === 'invalid_string') {
        return `${field}: ${message}`
      }
      if (err.code === 'invalid_type') {
        return `${field}: 类型错误，期望${err.expected}，实际${err.received}`
      }
      if (err.code === 'too_small') {
        return `${field}: 值太小，最小值${err.minimum}`
      }
      if (err.code === 'too_big') {
        return `${field}: 值太大，最大值${err.maximum}`
      }
      if (err.code === 'invalid_enum_value') {
        return `${field}: 无效的值，必须是${err.options?.join(', ')}之一`
      }
      
      return `${field}: ${message}`
    })
  }

  /**
   * 清理输入数据
   */
  private sanitizeInput(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return this.sanitizeString(input)
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item))
    }

    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      // 清理键名
      const sanitizedKey = this.sanitizeString(key)
      
      // 清理值
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = this.sanitizeInput(value)
      } else {
        sanitized[sanitizedKey] = value
      }
    }

    return sanitized
  }

  /**
   * 清理字符串
   */
  private sanitizeString(str: any): string {
    if (typeof str !== 'string') {
      return str
    }

    return str
      // 防止XSS攻击
      .replace(/[<>]/g, '')
      // 防止SQL注入
      .replace(/['"]/g, '')
      // 限制长度
      .substring(0, 10000)
      .trim()
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

// 导出单例实例
export const validationMiddleware = ValidationMiddleware.getInstance()

// 导出便捷方法
export const validateRequest = <T>(
  request: NextRequest,
  schema: ValidationSchema,
  context?: { params?: Record<string, string>; userId?: string }
) => validationMiddleware.validateRequest<T>(request, schema, context)

// 导出预定义的验证模式
export const commonSchemas = {
  // 分页参数
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  }),

  // ID参数
  id: z.string().min(1, 'ID不能为空'),

  // 家庭成员ID
  memberId: z.string().min(1, '家庭成员ID不能为空'),

  // 日期范围
  dateRange: z.object({
    startDate: z.string().datetime('开始日期格式无效'),
    endDate: z.string().datetime('结束日期格式无效')
  }),

  // 搜索参数
  search: z.object({
    term: z.string().max(100, '搜索词不能超过100个字符').optional(),
    filters: z.record(z.any()).optional()
  }),

  // 排序参数
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('desc')
  }),

  // 文件上传
  file: z.object({
    name: z.string().max(255),
    type: z.string(),
    size: z.number().max(50 * 1024 * 1024), // 50MB
    content: z.any()
  })
}

// 创建高阶验证函数
export function withValidation<T>(
  schema: ValidationSchema,
  handler: (request: NextRequest, context: { data: T; sanitized: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params?: Record<string, string>; userId?: string }) => {
    const validationResult = await validateRequest<T>(request, schema, context)
    
    if (!validationResult.success) {
      const error = APIError.badRequest('请求参数验证失败', { errors: validationResult.errors })
      return createErrorResponse(error)
    }

    return handler(request, {
      data: validationResult.data!,
      sanitized: validationResult.sanitized || {}
    })
  }
}
