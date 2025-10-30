-- 创建医疗报告相关表和枚举类型
-- Migration: add_medical_reports

-- 创建 OCR 状态枚举
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- 创建指标类型枚举
CREATE TYPE "IndicatorType" AS ENUM (
  'TOTAL_CHOLESTEROL',
  'LDL_CHOLESTEROL',
  'HDL_CHOLESTEROL',
  'TRIGLYCERIDES',
  'FASTING_GLUCOSE',
  'POSTPRANDIAL_GLUCOSE',
  'GLYCATED_HEMOGLOBIN',
  'ALT',
  'AST',
  'TOTAL_BILIRUBIN',
  'DIRECT_BILIRUBIN',
  'ALP',
  'CREATININE',
  'UREA_NITROGEN',
  'URIC_ACID',
  'WHITE_BLOOD_CELL',
  'RED_BLOOD_CELL',
  'HEMOGLOBIN',
  'PLATELET',
  'OTHER'
);

-- 创建指标状态枚举
CREATE TYPE "IndicatorStatus" AS ENUM ('NORMAL', 'LOW', 'HIGH', 'CRITICAL');

-- 创建体检报告表
CREATE TABLE "medical_reports" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'PENDING',
  "ocrText" TEXT,
  "ocrError" TEXT,
  "reportDate" TIMESTAMP(3),
  "institution" TEXT,
  "reportType" TEXT,
  "isCorrected" BOOLEAN NOT NULL DEFAULT false,
  "correctedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "medical_reports_pkey" PRIMARY KEY ("id")
);

-- 创建体检指标表
CREATE TABLE "medical_indicators" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "indicatorType" "IndicatorType" NOT NULL,
  "name" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "referenceRange" TEXT,
  "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
  "status" "IndicatorStatus" NOT NULL DEFAULT 'NORMAL',
  "isCorrected" BOOLEAN NOT NULL DEFAULT false,
  "originalValue" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "medical_indicators_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE INDEX "medical_reports_memberId_idx" ON "medical_reports"("memberId");
CREATE INDEX "medical_reports_memberId_reportDate_idx" ON "medical_reports"("memberId", "reportDate");
CREATE INDEX "medical_reports_ocrStatus_idx" ON "medical_reports"("ocrStatus");
CREATE INDEX "medical_indicators_reportId_idx" ON "medical_indicators"("reportId");
CREATE INDEX "medical_indicators_reportId_indicatorType_idx" ON "medical_indicators"("reportId", "indicatorType");

-- 添加外键约束
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medical_indicators" ADD CONSTRAINT "medical_indicators_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;


