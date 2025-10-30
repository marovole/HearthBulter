/**
 * Health Score Calculator
 * 健康评分计算服务
 * 
 * 计算综合健康评分（0-100分），基于：
 * - BMI评分（30分）
 * - 营养达标率评分（30分）
 * - 运动频率评分（20分）
 * - 数据完整性评分（20分）
 */

import { prisma } from '@/lib/db'
import { calculateBMI } from '@/lib/health-calculations'
import { subDays } from 'date-fns'

export interface HealthScore {
  totalScore: number // 总分（0-100）
  breakdown: {
    bmiScore: number // BMI评分（0-30）
    nutritionScore: number // 营养达标率评分（0-30）
    activityScore: number // 运动频率评分（0-20）
    dataCompletenessScore: number // 数据完整性评分（0-20）
  }
  details: {
    bmi: number | null
    bmiCategory: 'underweight' | 'normal' | 'overweight' | 'obese' | null
    nutritionAdherenceRate: number // 营养达标率（0-100）
    activityFrequency: number // 运动频率（过去30天记录天数）
    dataCompletenessRate: number // 数据完整性（0-100）
  }
  recommendations: string[] // 改进建议
}

export class HealthScoreCalculator {
  /**
   * 计算健康评分
   * @param memberId 成员ID
   */
  async calculateHealthScore(memberId: string): Promise<HealthScore> {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        healthGoals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        healthData: {
          where: {
            measuredAt: {
              gte: subDays(new Date(), 30),
            },
          },
          orderBy: { measuredAt: 'desc' },
        },
      },
    })

    if (!member) {
      throw new Error('成员不存在')
    }

    // 1. BMI评分（30分）
    const bmiScore = this.calculateBMIScore(member)
    const bmi = member.height && member.weight
      ? calculateBMI(member.weight, member.height)
      : null

    // 2. 营养达标率评分（30分）
    const nutritionScore = await this.calculateNutritionScore(memberId)

    // 3. 运动频率评分（20分）
    const activityScore = this.calculateActivityScore(member.healthData)

    // 4. 数据完整性评分（20分）
    const dataCompletenessScore = this.calculateDataCompletenessScore(
      member.healthData
    )

    const totalScore = Math.round(
      bmiScore.score +
        nutritionScore.score +
        activityScore.score +
        dataCompletenessScore.score
    )

    // 生成建议
    const recommendations = this.generateRecommendations({
      bmiScore,
      nutritionScore,
      activityScore,
      dataCompletenessScore,
    })

    return {
      totalScore,
      breakdown: {
        bmiScore: bmiScore.score,
        nutritionScore: nutritionScore.score,
        activityScore: activityScore.score,
        dataCompletenessScore: dataCompletenessScore.score,
      },
      details: {
        bmi,
        bmiCategory: bmiScore.category,
        nutritionAdherenceRate: nutritionScore.adherenceRate,
        activityFrequency: activityScore.frequency,
        dataCompletenessRate: dataCompletenessScore.completenessRate,
      },
      recommendations,
    }
  }

  /**
   * 计算BMI评分（30分）
   */
  private calculateBMIScore(member: {
    height: number | null
    weight: number | null
  }): {
    score: number
    category: 'underweight' | 'normal' | 'overweight' | 'obese' | null
  } {
    if (!member.height || !member.weight) {
      return { score: 0, category: null }
    }

    const bmi = calculateBMI(member.weight, member.height)
    let score = 0
    let category: 'underweight' | 'normal' | 'overweight' | 'obese' | null =
      null

    if (bmi < 18.5) {
      score = 15 // 偏瘦
      category = 'underweight'
    } else if (bmi >= 18.5 && bmi <= 24.9) {
      score = 30 // 正常范围
      category = 'normal'
    } else if (bmi >= 25 && bmi <= 29.9) {
      score = 20 // 超重
      category = 'overweight'
    } else {
      score = 10 // 肥胖
      category = 'obese'
    }

    return { score, category }
  }

  /**
   * 计算营养达标率评分（30分）
   */
  private async calculateNutritionScore(memberId: string): Promise<{
    score: number
    adherenceRate: number
  }> {
    // TODO: 实际营养数据到位后，基于实际摄入计算达标率
    // 暂时基于健康目标返回默认值
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        healthGoals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!member || !member.healthGoals[0]) {
      return { score: 0, adherenceRate: 0 }
    }

    // 暂时返回中等评分，meal-planning完成后会基于实际数据计算
    const adherenceRate = 70 // 假设70%达标率
    const score = Math.round((adherenceRate / 100) * 30)

    return { score, adherenceRate }
  }

  /**
   * 计算运动频率评分（20分）
   * 基于过去30天的健康数据记录频率
   */
  private calculateActivityScore(
    healthData: Array<{ measuredAt: Date }>
  ): {
    score: number
    frequency: number
  } {
    // 计算过去30天有记录的天数
    const daysWithData = new Set(
      healthData.map((d) => d.measuredAt.toISOString().split('T')[0])
    ).size

    // 理想情况：每天记录
    const idealDays = 30
    const frequency = daysWithData
    const completenessRate = Math.min(100, (daysWithData / idealDays) * 100)
    const score = Math.round((completenessRate / 100) * 20)

    return { score, frequency: daysWithData }
  }

  /**
   * 计算数据完整性评分（20分）
   * 基于健康数据的完整性和多样性
   */
  private calculateDataCompletenessScore(
    healthData: Array<{
      weight: number | null
      bodyFat: number | null
      muscleMass: number | null
      bloodPressureSystolic: number | null
      heartRate: number | null
    }>
  ): {
    score: number
    completenessRate: number
  } {
    if (healthData.length === 0) {
      return { score: 0, completenessRate: 0 }
    }

    // 计算数据完整性：检查各项指标是否有数据
    const totalFields = healthData.length * 5 // 5个主要指标
    let filledFields = 0

    healthData.forEach((data) => {
      if (data.weight !== null) filledFields++
      if (data.bodyFat !== null) filledFields++
      if (data.muscleMass !== null) filledFields++
      if (data.bloodPressureSystolic !== null) filledFields++
      if (data.heartRate !== null) filledFields++
    })

    const completenessRate = (filledFields / totalFields) * 100
    const score = Math.round((completenessRate / 100) * 20)

    return { score, completenessRate }
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(data: {
    bmiScore: { score: number; category: string | null }
    nutritionScore: { score: number; adherenceRate: number }
    activityScore: { score: number; frequency: number }
    dataCompletenessScore: { score: number; completenessRate: number }
  }): string[] {
    const recommendations: string[] = []

    // BMI建议
    if (data.bmiScore.score < 30) {
      if (data.bmiScore.category === 'underweight') {
        recommendations.push('BMI偏低，建议增加营养摄入和适度运动')
      } else if (data.bmiScore.category === 'overweight') {
        recommendations.push('BMI偏高，建议控制饮食并增加有氧运动')
      } else if (data.bmiScore.category === 'obese') {
        recommendations.push('BMI过高，建议制定减重计划并咨询专业医生')
      }
    }

    // 营养建议
    if (data.nutritionScore.score < 25) {
      recommendations.push(
        `营养达标率较低（${data.nutritionScore.adherenceRate}%），建议关注每日营养摄入`
      )
    }

    // 运动建议
    if (data.activityScore.score < 15) {
      recommendations.push(
        `过去30天仅记录${data.activityScore.frequency}天，建议每天记录健康数据`
      )
    }

    // 数据完整性建议
    if (data.dataCompletenessScore.score < 15) {
      recommendations.push(
        `数据完整性较低（${Math.round(data.dataCompletenessScore.completenessRate)}%），建议完善各项健康指标记录`
      )
    }

    // 如果没有问题，给出正面鼓励
    if (recommendations.length === 0) {
      recommendations.push('继续保持！您的健康数据表现良好')
    }

    return recommendations
  }
}

// 导出单例
export const healthScoreCalculator = new HealthScoreCalculator()

