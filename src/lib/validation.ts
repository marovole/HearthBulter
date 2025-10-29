/**
 * Validation Utilities
 * Common validation functions for the application
 */

import { z } from 'zod'

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
