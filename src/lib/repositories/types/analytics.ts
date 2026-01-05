/**
 * 分析域 DTO 类型定义
 *
 * 本模块定义分析报告相关的数据传输对象，包括：
 * - 成员档案
 * - 时间序列数据
 * - 趋势分析
 * - 异常检测
 * - 报告生成
 *
 * @module analytics
 */

import { z } from "zod";
import type { Database } from "@/types/supabase-database";
import { dateRangeFilterSchema } from "./common";

type FamilyMemberRow = Database["public"]["Tables"]["family_members"]["Row"];
type MealRecordRow = Database["public"]["Tables"]["meal_records"]["Row"];
type HealthDataRow = Database["public"]["Tables"]["health_data"]["Row"];

/**
 * 成员档案 Schema
 */
export const memberProfileSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  name: z.string().min(1),
  gender: z.string().nullable(),
  birthDate: z.coerce.date(),
  height: z.number().positive().nullable(),
  weight: z.number().positive().nullable(),
  avatar: z.string().url().nullable(),
});

export type MemberProfileDTO = z.infer<typeof memberProfileSchema>;

/**
 * 时间序列点 Schema
 */
export const timeSeriesPointSchema = z.object({
  date: z.coerce.date(),
  value: z.number(),
});

export type TimeSeriesPointDTO = z.infer<typeof timeSeriesPointSchema>;

/**
 * 趋势查询 Schema
 */
export const trendQuerySchema = z.object({
  memberId: z.string().uuid(),
  metric: z.enum([
    "WEIGHT",
    "BODY_FAT",
    "MUSCLE_MASS",
    "BLOOD_PRESSURE",
    "HEART_RATE",
    "CALORIES",
    "PROTEIN",
    "CARBS",
    "FAT",
    "EXERCISE",
    "SLEEP",
    "WATER",
    "HEALTH_SCORE",
  ]),
  range: dateRangeFilterSchema,
});

export type TrendQueryDTO = z.infer<typeof trendQuerySchema>;

/**
 * 趋势序列 Schema
 */
export const trendSeriesSchema = z.object({
  metric: trendQuerySchema.shape.metric,
  points: z.array(timeSeriesPointSchema),
  statistics: z.object({
    mean: z.number(),
    median: z.number(),
    min: z.number(),
    max: z.number(),
    stdDev: z.number(),
  }),
});

export type TrendSeriesDTO = z.infer<typeof trendSeriesSchema>;

/**
 * 异常 Schema
 */
export const anomalySchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "EXTREME"]),
  detectedAt: z.coerce.date(),
});

export type AnomalyDTO = z.infer<typeof anomalySchema>;

/**
 * 报告周期 Schema
 */
export const reportPeriodSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  type: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "CUSTOM"]),
});

export type ReportPeriodDTO = z.infer<typeof reportPeriodSchema>;

/**
 * 报告摘要 Schema
 */
export const reportSummarySchema = z.object({
  member: memberProfileSchema,
  period: reportPeriodSchema,
  totalDays: z.number().int().nonnegative(),
  dataCompleteDays: z.number().int().nonnegative(),
  averageScore: z.number(),
  achievements: z.array(z.string()),
  concerns: z.array(z.string()),
  recommendations: z.array(z.string()),
  anomalies: z.array(anomalySchema),
});

export type ReportSummaryDTO = z.infer<typeof reportSummarySchema>;

/**
 * 报告快照 Schema
 */
export const reportSnapshotSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  period: reportPeriodSchema,
  payload: z.record(z.any()),
  status: z.enum(["GENERATING", "COMPLETED", "FAILED"]).default("GENERATING"),
  createdAt: z.coerce.date(),
});

export type ReportSnapshotDTO = z.infer<typeof reportSnapshotSchema>;
