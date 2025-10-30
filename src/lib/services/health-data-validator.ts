/**
 * Health Data Validation Service
 * 
 * 提供健康数据验证和异常检测功能
 */

import { differenceInDays } from 'date-fns'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { HealthDataSource } from '@prisma/client'

/**
 * 健康数据输入类型
 */
export interface HealthDataInput {
  weight?: number | null
  bodyFat?: number | null
  muscleMass?: number | null
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  heartRate?: number | null
  measuredAt?: Date | string
  source?: HealthDataSource
  notes?: string | null
}

/**
 * 验证结果类型
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * 异常检测结果类型
 */
export interface AnomalyDetectionResult {
  isAnomaly: boolean
  message?: string
}

/**
 * Zod验证schema
 */
export const healthDataSchema = z.object({
  weight: z
    .number()
    .min(20, '体重不能低于20kg')
    .max(300, '体重不能超过300kg')
    .nullable()
    .optional(),
  bodyFat: z
    .number()
    .min(3, '体脂率不能低于3%')
    .max(50, '体脂率不能超过50%')
    .nullable()
    .optional(),
  muscleMass: z
    .number()
    .min(0, '肌肉量不能为负数')
    .max(200, '肌肉量不能超过200kg')
    .nullable()
    .optional(),
  bloodPressureSystolic: z
    .number()
    .int('收缩压必须为整数')
    .min(60, '收缩压不能低于60mmHg')
    .max(200, '收缩压不能超过200mmHg')
    .nullable()
    .optional(),
  bloodPressureDiastolic: z
    .number()
    .int('舒张压必须为整数')
    .min(40, '舒张压不能低于40mmHg')
    .max(150, '舒张压不能超过150mmHg')
    .nullable()
    .optional(),
  heartRate: z
    .number()
    .int('心率必须为整数')
    .min(40, '心率不能低于40bpm')
    .max(220, '心率不能超过220bpm')
    .nullable()
    .optional(),
  measuredAt: z.coerce.date().optional(),
  source: z.enum(['MANUAL', 'WEARABLE', 'MEDICAL_REPORT']).optional(),
  notes: z.string().max(500, '备注不能超过500个字符').nullable().optional(),
})

/**
 * 验证健康数据
 */
export function validateHealthData(
  data: HealthDataInput
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 使用Zod进行基础验证
  const validation = healthDataSchema.safeParse(data)
  if (!validation.success) {
    validation.error.errors.forEach((err) => {
      errors.push(err.message)
    })
    return { valid: false, errors, warnings }
  }

  // 验证血压逻辑
  if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
    if (data.bloodPressureSystolic < data.bloodPressureDiastolic) {
      errors.push('收缩压不应低于舒张压')
    }
  }

  // 验证是否有至少一个健康指标
  const hasAnyData =
    data.weight !== null &&
    data.weight !== undefined ||
    data.bodyFat !== null &&
    data.bodyFat !== undefined ||
    data.muscleMass !== null &&
    data.muscleMass !== undefined ||
    data.bloodPressureSystolic !== null &&
    data.bloodPressureSystolic !== undefined ||
    data.heartRate !== null &&
    data.heartRate !== undefined

  if (!hasAnyData) {
    errors.push('至少需要录入一个健康指标')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * 检测异常数据
 * 对比最近一条记录，检测是否有异常变化
 */
export async function detectAnomaly(
  memberId: string,
  newData: HealthDataInput
): Promise<AnomalyDetectionResult> {
  try {
    // 查找最近一条记录
    const lastRecord = await prisma.healthData.findFirst({
      where: { memberId },
      orderBy: { measuredAt: 'desc' },
    })

    if (!lastRecord) {
      return { isAnomaly: false }
    }

    const warnings: string[] = []
    const measuredAt = newData.measuredAt
      ? new Date(newData.measuredAt)
      : new Date()
    const daysDiff = Math.abs(
      differenceInDays(measuredAt, lastRecord.measuredAt)
    )

    // 检测体重异常变化（>5kg/天）
    if (newData.weight && lastRecord.weight) {
      const weightChange = Math.abs(newData.weight - lastRecord.weight)
      const weightChangePerDay = daysDiff > 0 ? weightChange / daysDiff : weightChange

      if (weightChangePerDay > 5) {
        warnings.push(
          `体重变化异常：${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg，请确认数据准确性`
        )
      } else if (weightChangePerDay > 3) {
        warnings.push(
          `体重变化较大：${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg，请确认是否正常`
        )
      }
    }

    // 检测体脂率异常变化（>5%/天）
    if (newData.bodyFat && lastRecord.bodyFat) {
      const bodyFatChange = Math.abs(newData.bodyFat - lastRecord.bodyFat)
      const bodyFatChangePerDay = daysDiff > 0 ? bodyFatChange / daysDiff : bodyFatChange

      if (bodyFatChangePerDay > 5) {
        warnings.push(
          `体脂率变化异常：${bodyFatChange > 0 ? '+' : ''}${bodyFatChange.toFixed(1)}%，请确认数据准确性`
        )
      }
    }

    // 检测血压异常变化
    if (
      newData.bloodPressureSystolic &&
      lastRecord.bloodPressureSystolic
    ) {
      const bpChange = Math.abs(
        newData.bloodPressureSystolic - lastRecord.bloodPressureSystolic
      )
      if (bpChange > 30) {
        warnings.push(
          `收缩压变化较大：${bpChange}mmHg，请确认数据准确性`
        )
      }
    }

    // 检测心率异常变化
    if (newData.heartRate && lastRecord.heartRate) {
      const hrChange = Math.abs(newData.heartRate - lastRecord.heartRate)
      if (hrChange > 50) {
        warnings.push(
          `心率变化较大：${hrChange}bpm，请确认数据准确性`
        )
      }
    }

    if (warnings.length > 0) {
      return {
        isAnomaly: true,
        message: warnings.join('；'),
      }
    }

    return { isAnomaly: false }
  } catch (error) {
    console.error('异常检测失败:', error)
    // 异常检测失败不影响数据录入，只返回无异常
    return { isAnomaly: false }
  }
}

/**
 * 验证并检测异常
 * 组合验证和异常检测
 */
export async function validateAndDetectAnomaly(
  memberId: string,
  data: HealthDataInput
): Promise<ValidationResult & { anomaly?: AnomalyDetectionResult }> {
  const validation = validateHealthData(data)

  if (!validation.valid) {
    return validation
  }

  const anomaly = await detectAnomaly(memberId, data)
  if (anomaly.isAnomaly && anomaly.message) {
    validation.warnings = validation.warnings || []
    validation.warnings.push(anomaly.message)
  }

  return { ...validation, anomaly }
}
