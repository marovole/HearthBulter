import { createErrorResponse } from './response.js'

export function handleError(error) {
  console.error('API Error:', error)
  
  // 处理已知的错误类型
  if (error instanceof ValidationError) {
    return createErrorResponse(error.message, 400)
  }
  
  if (error instanceof AuthenticationError) {
    return createErrorResponse(error.message, 401)
  }
  
  if (error instanceof AuthorizationError) {
    return createErrorResponse(error.message, 403)
  }
  
  if (error instanceof NotFoundError) {
    return createErrorResponse(error.message, 404)
  }
  
  // 数据库错误
  if (error.message?.includes('database') || error.message?.includes('Database')) {
    console.error('Database error details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    return createErrorResponse('Database operation failed', 500)
  }
  
  // Supabase 特定错误
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
        return createErrorResponse('Resource not found', 404)
      case 'PGRST301':
        return createErrorResponse('JWT expired', 401)
      case 'PGRST401':
        return createErrorResponse('Unauthorized', 401)
      case '23505': // Unique violation
        return createErrorResponse('Resource already exists', 409)
      case '23503': // Foreign key violation
        return createErrorResponse('Invalid reference', 400)
      default:
        console.error('Supabase error code:', error.code)
    }
  }
  
  // 默认错误响应
  return createErrorResponse(
    process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    500
  )
}

// 自定义错误类
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

// 错误处理中间件
export function withErrorHandler(handler) {
  return async (context) => {
    try {
      return await handler(context)
    } catch (error) {
      return handleError(error)
    }
  }
}
