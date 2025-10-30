-- Migration: Add Budget Optimization Models
-- Created: 2025-10-30
-- Description: Add comprehensive budget tracking and optimization models

-- Create Budget Period enum
CREATE TYPE "BudgetPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- Create Budget Status enum
CREATE TYPE "BudgetStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- Create Price Source enum
CREATE TYPE "PriceSource" AS ENUM ('MANUAL', 'CRAWLER', 'API', 'USER_REPORT');

-- Create Savings Type enum
CREATE TYPE "SavingsType" AS ENUM ('PROMOTION', 'GROUP_BUY', 'SEASONAL', 'BULK_PURCHASE', 'PLATFORM_SWITCH', 'SUBSTITUTE');

-- Create Recommendation Status enum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- Create Alert Type enum
CREATE TYPE "AlertType" AS ENUM ('WARNING_80', 'WARNING_100', 'OVER_BUDGET_110', 'CATEGORY_OVER', 'DAILY_EXCESS');

-- Create Alert Status enum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- Create Budget table
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "vegetableBudget" DOUBLE PRECISION,
    "meatBudget" DOUBLE PRECISION,
    "fruitBudget" DOUBLE PRECISION,
    "grainBudget" DOUBLE PRECISION,
    "dairyBudget" DOUBLE PRECISION,
    "otherBudget" DOUBLE PRECISION,
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "usedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION,
    "usagePercentage" DOUBLE PRECISION,
    "alertThreshold80" BOOLEAN NOT NULL DEFAULT true,
    "alertThreshold100" BOOLEAN NOT NULL DEFAULT true,
    "alertThreshold110" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- Create Spending table
CREATE TABLE "spendings" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "transactionId" TEXT,
    "platform" TEXT,
    "items" JSONB,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "spendings_pkey" PRIMARY KEY ("id")
);

-- Create Price History table
CREATE TABLE "price_histories" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "platform" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "PriceSource" NOT NULL DEFAULT 'MANUAL',
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "price_histories_pkey" PRIMARY KEY ("id")
);

-- Create Savings Recommendations table
CREATE TABLE "savings_recommendations" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "SavingsType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "discountedPrice" DOUBLE PRECISION,
    "platform" TEXT,
    "foodItems" JSONB,
    "validUntil" TIMESTAMP(3),
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "acted" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "savings_recommendations_pkey" PRIMARY KEY ("id")
);

-- Create Budget Alerts table
CREATE TABLE "budget_alerts" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Budget table
CREATE INDEX "budgets_memberId_idx" ON "budgets"("memberId");
CREATE INDEX "budgets_memberId_period_idx" ON "budgets"("memberId", "period");
CREATE INDEX "budgets_startDate_endDate_idx" ON "budgets"("startDate", "endDate");

-- Create indexes for Spending table
CREATE INDEX "spendings_budgetId_idx" ON "spendings"("budgetId");
CREATE INDEX "spendings_budgetId_category_idx" ON "spendings"("budgetId", "category");
CREATE INDEX "spendings_purchaseDate_idx" ON "spendings"("purchaseDate");

-- Create indexes for Price History table
CREATE INDEX "price_histories_foodId_idx" ON "price_histories"("foodId");
CREATE INDEX "price_histories_foodId_platform_idx" ON "price_histories"("foodId", "platform");
CREATE INDEX "price_histories_recordedAt_idx" ON "price_histories"("recordedAt");

-- Create indexes for Savings Recommendations table
CREATE INDEX "savings_recommendations_memberId_idx" ON "savings_recommendations"("memberId");
CREATE INDEX "savings_recommendations_memberId_type_idx" ON "savings_recommendations"("memberId", "type");
CREATE INDEX "savings_recommendations_status_idx" ON "savings_recommendations"("status");
CREATE INDEX "savings_recommendations_validUntil_idx" ON "savings_recommendations"("validUntil");

-- Create indexes for Budget Alerts table
CREATE INDEX "budget_alerts_budgetId_idx" ON "budget_alerts"("budgetId");
CREATE INDEX "budget_alerts_budgetId_type_idx" ON "budget_alerts"("budgetId", "type");
CREATE INDEX "budget_alerts_status_idx" ON "budget_alerts"("status");

-- Add foreign key constraints
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "spendings" ADD CONSTRAINT "spendings_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "savings_recommendations" ADD CONSTRAINT "savings_recommendations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
