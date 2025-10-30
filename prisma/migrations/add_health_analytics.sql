-- 创建健康分析和报告相关的表和枚举

-- 报告类型枚举
CREATE TYPE "ReportType" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');

-- 报告状态枚举
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- 评分等级枚举
CREATE TYPE "ScoreGrade" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- 趋势数据类型枚举
CREATE TYPE "TrendDataType" AS ENUM (
  'WEIGHT', 'BODY_FAT', 'MUSCLE_MASS', 'BLOOD_PRESSURE', 'HEART_RATE',
  'CALORIES', 'PROTEIN', 'CARBS', 'FAT', 'EXERCISE', 'SLEEP', 'WATER', 'HEALTH_SCORE'
);

-- 异常类型枚举
CREATE TYPE "AnomalyType" AS ENUM (
  'SUDDEN_CHANGE', 'NUTRITION_IMBALANCE', 'GOAL_DEVIATION', 'THRESHOLD_EXCEEDED', 'MISSING_DATA'
);

-- 异常严重程度枚举
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 异常状态枚举
CREATE TYPE "AnomalyStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');

-- 健康报告表
CREATE TABLE "health_reports" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "dataSnapshot" TEXT NOT NULL,
    "insights" TEXT,
    "overallScore" DOUBLE PRECISION,
    "htmlContent" TEXT,
    "pdfUrl" TEXT,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "health_reports_pkey" PRIMARY KEY ("id")
);

-- 健康评分历史表
CREATE TABLE "health_scores" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "nutritionScore" DOUBLE PRECISION,
    "exerciseScore" DOUBLE PRECISION,
    "sleepScore" DOUBLE PRECISION,
    "medicalScore" DOUBLE PRECISION,
    "grade" "ScoreGrade" NOT NULL,
    "dataCompleteness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_scores_pkey" PRIMARY KEY ("id")
);

-- 趋势数据缓存表
CREATE TABLE "trend_data" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dataType" "TrendDataType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "aggregatedData" TEXT NOT NULL,
    "mean" DOUBLE PRECISION,
    "median" DOUBLE PRECISION,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "stdDev" DOUBLE PRECISION,
    "trendDirection" TEXT,
    "slope" DOUBLE PRECISION,
    "rSquared" DOUBLE PRECISION,
    "predictions" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trend_data_pkey" PRIMARY KEY ("id")
);

-- 异常检测记录表
CREATE TABLE "health_anomalies" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "anomalyType" "AnomalyType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataType" "TrendDataType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "expectedMin" DOUBLE PRECISION,
    "expectedMax" DOUBLE PRECISION,
    "deviation" DOUBLE PRECISION,
    "status" "AnomalyStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "health_anomalies_pkey" PRIMARY KEY ("id")
);

-- 创建唯一约束
CREATE UNIQUE INDEX "health_reports_shareToken_key" ON "health_reports"("shareToken");
CREATE UNIQUE INDEX "health_scores_memberId_date_key" ON "health_scores"("memberId", "date");
CREATE UNIQUE INDEX "trend_data_memberId_dataType_startDate_endDate_key" ON "trend_data"("memberId", "dataType", "startDate", "endDate");

-- 创建索引
CREATE INDEX "health_reports_memberId_reportType_idx" ON "health_reports"("memberId", "reportType");
CREATE INDEX "health_reports_memberId_startDate_idx" ON "health_reports"("memberId", "startDate");
CREATE INDEX "health_reports_shareToken_idx" ON "health_reports"("shareToken");

CREATE INDEX "health_scores_memberId_date_idx" ON "health_scores"("memberId", "date");
CREATE INDEX "health_scores_memberId_overallScore_idx" ON "health_scores"("memberId", "overallScore");

CREATE INDEX "trend_data_memberId_dataType_idx" ON "trend_data"("memberId", "dataType");
CREATE INDEX "trend_data_expiresAt_idx" ON "trend_data"("expiresAt");

CREATE INDEX "health_anomalies_memberId_anomalyType_idx" ON "health_anomalies"("memberId", "anomalyType");
CREATE INDEX "health_anomalies_memberId_status_idx" ON "health_anomalies"("memberId", "status");
CREATE INDEX "health_anomalies_detectedAt_idx" ON "health_anomalies"("detectedAt");

-- 添加外键约束
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_scores" ADD CONSTRAINT "health_scores_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trend_data" ADD CONSTRAINT "trend_data_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_anomalies" ADD CONSTRAINT "health_anomalies_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

