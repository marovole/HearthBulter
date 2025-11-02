/**
 * API错误处理工具
 * 提供统一的错误处理机制
 */

export class APIError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: any

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  static badRequest(message: string, details?: any) {
    return new APIError(message, 400, 'BAD_REQUEST', details)
  }

  static unauthorized(message: string = '未授权访问') {
    return new APIError(message, 401, 'UNAUTHORIZED')
  }

  static forbidden(message: string = '禁止访问') {
    return new APIError(message, 403, 'FORBIDDEN')
  }

  static notFound(message: string = '资源未找到') {
    return new APIError(message, 404, 'NOT_FOUND')
  }

  static internal(message: string = '服务器内部错误', details?: any) {
    return new APIError(message, 500, 'INTERNAL_ERROR', details)
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details })
    }
  }
}

/**
 * API错误处理中间件
 */
export function handleAPIError(error: unknown): APIError {
  if (error instanceof APIError) {
    return error
  }

  if (error instanceof Error) {
    console.error('API Error:', error)
    return APIError.internal(error.message)
  }

  console.error('Unknown API Error:', error)
  return APIError.internal('未知错误')
}

/**
 * 统一的API响应格式
 */
export function createAPIResponse<T>(
  data: T,
  message?: string,
  status: number = 200
) {
  return Response.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status })
}

/**
 * 错误API响应格式
 */
export function createErrorResponse(error: APIError) {
  return Response.json(error.toJSON(), { 
    status: error.statusCode 
  })
}
