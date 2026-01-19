/**
 * 分析报告 API Zod Schema 定义
 */

import { z } from "zod";

// 报告类型枚举
export const reportTypeSchema = z.enum([
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "CUSTOM",
]);

// 异常严重程度枚举
export const anomalySeveritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

// 异常状态枚举
export const anomalyStatusSchema = z.enum([
  "PENDING",
  "ACKNOWLEDGED",
  "RESOLVED",
  "IGNORED",
]);

// 通用 ID Schema
const memberIdSchema = z.string().min(1, "缺少成员 ID");
const reportIdSchema = z.string().min(1, "缺少报告 ID");

// 报告查询 Schema
export const reportsQuerySchema = z.object({
  memberId: memberIdSchema,
  reportType: reportTypeSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// 报告创建 Schema
export const createReportSchema = z
  .object({
    memberId: memberIdSchema,
    reportType: reportTypeSchema,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.reportType === "CUSTOM") {
        return data.startDate && data.endDate;
      }
      return true;
    },
    { message: "自定义报告必须指定开始和结束日期" },
  );

// 报告分享 Schema
export const shareReportSchema = z.object({
  reportId: reportIdSchema,
  expiryDays: z.number().int().min(1).max(30).default(7),
});

// 异常查询 Schema
export const anomaliesQuerySchema = z.object({
  memberId: memberIdSchema,
  status: anomalyStatusSchema.optional(),
  severity: anomalySeveritySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// 异常操作 Schema
export const anomalyActionSchema = z.object({
  anomalyId: z.string().min(1, "缺少异常 ID"),
  action: z.enum(["acknowledge", "resolve", "ignore"]),
  resolution: z.string().max(500).optional(),
  memberId: z.string().optional(),
});

// 健康评分查询 Schema
export const healthScoreQuerySchema = z.object({
  memberId: memberIdSchema,
  date: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// 趋势分析查询 Schema
export const trendAnalysisQuerySchema = z.object({
  memberId: memberIdSchema,
  metricType: z.enum([
    "WEIGHT",
    "CALORIES",
    "EXERCISE",
    "SLEEP",
    "HEART_RATE",
    "BLOOD_PRESSURE",
  ]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  granularity: z.enum(["DAY", "WEEK", "MONTH"]).default("DAY"),
});

// 类型导出
export type ReportsQueryInput = z.infer<typeof reportsQuerySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ShareReportInput = z.infer<typeof shareReportSchema>;
export type AnomaliesQueryInput = z.infer<typeof anomaliesQuerySchema>;
export type AnomalyActionInput = z.infer<typeof anomalyActionSchema>;
export type HealthScoreQueryInput = z.infer<typeof healthScoreQuerySchema>;
export type TrendAnalysisQueryInput = z.infer<typeof trendAnalysisQuerySchema>;
