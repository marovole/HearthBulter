/**
 * Validation Utilities
 * Common validation functions for the application
 */

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * User Registration Schema
 */
export const registerSchema = z.object({
  name: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符')),
  email: z
    .string()
    .transform((val) => val.toLowerCase().trim())
    .pipe(z.string().email('请输入有效的邮箱地址')),
  password: z
    .string()
    .min(8, '密码至少需要8个字符')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
      '密码必须包含字母和数字'
    ),
})

/**
 * Validate registration data
 */
export function validateRegistration(data: unknown) {
  return registerSchema.safeParse(data)
}

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Password strength validation
 * - Minimum 8 characters
 * - At least one letter
 * - At least one number
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Za-z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  return true
}

/**
 * Sanitize string input
 * - Trim whitespace
 * - Remove potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .slice(0, 1000) // Limit length to prevent DOS
}

/**
 * Validate member data
 */
export const memberSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: '性别必须是男或女' }),
  }),
  birthDate: z.coerce.date(),
  height: z.number().min(50).max(250).optional(),
  weight: z.number().min(20).max(300).optional(),
})

/**
 * Validate health goal data
 */
export const healthGoalSchema = z.object({
  goalType: z.enum(['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'IMPROVE_HEALTH']),
  targetWeight: z.number().min(20).max(300).optional(),
  targetWeeks: z.number().min(1).max(52).optional(),
  activityLevel: z.enum([
    'SEDENTARY',
    'LIGHT',
    'MODERATE',
    'ACTIVE',
    'VERY_ACTIVE',
  ]),
  carbRatio: z.number().min(0).max(1).default(0.5),
  proteinRatio: z.number().min(0).max(1).default(0.2),
  fatRatio: z.number().min(0).max(1).default(0.3),
})

/**
 * Validate allergy data
 */
export const allergySchema = z.object({
  allergenType: z.enum(['FOOD', 'ENVIRONMENTAL', 'MEDICATION', 'OTHER']),
  allergenName: z.string().min(1, '过敏原名称不能为空').max(100),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
  description: z.string().max(500).optional(),
})

// ============ API 验证和错误处理工具函数 ============

// 通用响应格式化函数
export function formatValidationError(error: z.ZodError) {
  return {
    error: '输入验证失败',
    details: error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    })),
  }
}

// 通用验证函数
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          formatValidationError(result.error),
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: '请求体格式错误' },
        { status: 400 }
      ),
    }
  }
}

// 通用错误处理函数
export function handleApiError(error: unknown, context: string) {
  console.error(`${context}失败:`, error)

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      formatValidationError(error),
      { status: 400 }
    )
  }

  if (error instanceof Error) {
    // 记录详细错误信息用于调试
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      context,
    })

    // 返回用户友好的错误信息
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: '服务器内部错误' },
    { status: 500 }
  )
}

// 常用验证schemas
export const commonSchemas = {
  // 分页参数
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  // ID参数
  id: z.string().min(1, 'ID不能为空'),

  // 邮箱
  email: z.string().email('请输入有效的邮箱地址'),

  // 姓名
  name: z.string()
    .min(1, '姓名不能为空')
    .max(50, '姓名不能超过50个字符')
    .trim(),

  // 性别 (更新为包含OTHER选项)
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    errorMap: () => ({ message: '性别必须是 MALE、FEMALE 或 OTHER' }),
  }),

  // 日期
  date: z.string().datetime('请输入有效的日期时间'),

  // 正数
  positiveNumber: z.number()
    .positive('必须是正数')
    .max(10000, '数值不能超过10000'),

  // 体重 (kg)
  weight: z.number()
    .positive('体重必须是正数')
    .min(1, '体重不能小于1kg')
    .max(500, '体重不能大于500kg'),

  // 身高 (cm)
  height: z.number()
    .positive('身高必须是正数')
    .min(20, '身高不能小于20cm')
    .max(250, '身高不能大于250cm'),

  // 年龄
  age: z.number()
    .int('年龄必须是整数')
    .min(0, '年龄不能小于0')
    .max(150, '年龄不能大于150'),
}

// API响应格式化函数
export function formatApiSuccess<T>(data: T, message?: string) {
  return NextResponse.json(
    { success: true, data, message },
    { status: 200 }
  )
}

export function formatApiCreated<T>(data: T, message = '创建成功') {
  return NextResponse.json(
    { success: true, data, message },
    { status: 201 }
  )
}

// 输入清理函数 (增强版本)
export function sanitizeStringEnhanced(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .replace(/[<>]/g, '') // 移除潜在的HTML标签字符
    .slice(0, 1000) // 限制长度防止DOS攻击
}

export function sanitizeHtml(value: string): string {
  // 基础HTML清理，避免XSS攻击
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // 移除iframe标签
    .replace(/javascript:/gi, '') // 移除javascript:协议
    .replace(/on\w+\s*=/gi, '') // 移除事件处理器
    .replace(/[<>]/g, '') // 移除HTML标签字符
}

// 邀请相关验证schemas
export const invitationSchemas = {
  create: z.object({
    email: z.string().email('请输入有效的邮箱地址'),
    role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  }),

  accept: z.object({
    memberName: z.string().min(1, '请提供成员名称').max(50).trim(),
  }),
}

// 健康数据验证schemas
export const healthDataSchemas = {
  create: z.object({
    weight: commonSchemas.weight.optional(),
    bodyFat: z.number().min(0).max(100).optional(),
    muscleMass: commonSchemas.weight.optional(),
    bloodPressureSystolic: z.number().min(60).max(250).optional(),
    bloodPressureDiastolic: z.number().min(40).max(150).optional(),
    heartRate: z.number().min(30).max(220).optional(),
    measuredAt: z.date().optional(),
    notes: z.string().max(500).optional(),
  }),

  update: z.object({
    weight: commonSchemas.weight.optional(),
    bodyFat: z.number().min(0).max(100).optional(),
    muscleMass: commonSchemas.weight.optional(),
    bloodPressureSystolic: z.number().min(60).max(250).optional(),
    bloodPressureDiastolic: z.number().min(40).max(150).optional(),
    heartRate: z.number().min(30).max(220).optional(),
    measuredAt: z.date().optional(),
    notes: z.string().max(500).optional(),
  }),
}

// 权限验证函数
export function validatePermission(
  userRole: string,
  requiredRole: string,
  isCreator: boolean = false
): boolean {
  if (isCreator) return true
  if (requiredRole === 'ADMIN' && userRole === 'ADMIN') return true
  if (requiredRole === 'MEMBER') return true
  return false
}
