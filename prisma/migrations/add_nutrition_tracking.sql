-- 添加营养摄入打卡系统的数据表

-- 创建食物识别状态枚举
CREATE TYPE "RecognitionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- 餐饮记录表（打卡记录）
CREATE TABLE "meal_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "memberId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "mealType" "MealType" NOT NULL,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "fiber" DOUBLE PRECISION DEFAULT 0,
  "sugar" DOUBLE PRECISION DEFAULT 0,
  "sodium" DOUBLE PRECISION DEFAULT 0,
  "notes" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isTemplate" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  
  CONSTRAINT "meal_logs_memberId_fkey" FOREIGN KEY ("memberId") 
    REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "meal_logs_memberId_date_idx" ON "meal_logs"("memberId", "date");
CREATE INDEX "meal_logs_memberId_mealType_idx" ON "meal_logs"("memberId", "mealType");

-- 餐饮记录食物关联表
CREATE TABLE "meal_log_foods" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mealLogId" TEXT NOT NULL,
  "foodId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "meal_log_foods_mealLogId_fkey" FOREIGN KEY ("mealLogId") 
    REFERENCES "meal_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "meal_log_foods_foodId_fkey" FOREIGN KEY ("foodId") 
    REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "meal_log_foods_mealLogId_idx" ON "meal_log_foods"("mealLogId");
CREATE INDEX "meal_log_foods_foodId_idx" ON "meal_log_foods"("foodId");

-- 食物照片表
CREATE TABLE "food_photos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mealLogId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "recognitionStatus" "RecognitionStatus" NOT NULL DEFAULT 'PENDING',
  "recognitionResult" TEXT,
  "confidence" DOUBLE PRECISION,
  "recognitionError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "food_photos_mealLogId_fkey" FOREIGN KEY ("mealLogId") 
    REFERENCES "meal_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "food_photos_mealLogId_idx" ON "food_photos"("mealLogId");
CREATE INDEX "food_photos_recognitionStatus_idx" ON "food_photos"("recognitionStatus");

-- 连续打卡记录表
CREATE TABLE "tracking_streaks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "memberId" TEXT NOT NULL UNIQUE,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "longestStreak" INTEGER NOT NULL DEFAULT 0,
  "totalDays" INTEGER NOT NULL DEFAULT 0,
  "lastCheckIn" TIMESTAMP(3),
  "badges" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "tracking_streaks_memberId_fkey" FOREIGN KEY ("memberId") 
    REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 快速模板表
CREATE TABLE "quick_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "memberId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "mealType" "MealType" NOT NULL,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsed" TIMESTAMP(3),
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  
  CONSTRAINT "quick_templates_memberId_fkey" FOREIGN KEY ("memberId") 
    REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "quick_templates_memberId_mealType_idx" ON "quick_templates"("memberId", "mealType");
CREATE INDEX "quick_templates_memberId_score_idx" ON "quick_templates"("memberId", "score");

-- 模板食物关联表
CREATE TABLE "template_foods" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "foodId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  
  CONSTRAINT "template_foods_templateId_fkey" FOREIGN KEY ("templateId") 
    REFERENCES "quick_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "template_foods_foodId_fkey" FOREIGN KEY ("foodId") 
    REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "template_foods_templateId_idx" ON "template_foods"("templateId");
CREATE INDEX "template_foods_foodId_idx" ON "template_foods"("foodId");

-- 每日营养目标追踪表
CREATE TABLE "daily_nutrition_targets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "memberId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "targetCalories" DOUBLE PRECISION NOT NULL,
  "targetProtein" DOUBLE PRECISION NOT NULL,
  "targetCarbs" DOUBLE PRECISION NOT NULL,
  "targetFat" DOUBLE PRECISION NOT NULL,
  "actualCalories" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualProtein" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualCarbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "actualFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "caloriesDeviation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "proteinDeviation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carbsDeviation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fatDeviation" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "daily_nutrition_targets_memberId_fkey" FOREIGN KEY ("memberId") 
    REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "daily_nutrition_targets_memberId_date_key" UNIQUE ("memberId", "date")
);

CREATE INDEX "daily_nutrition_targets_memberId_date_idx" ON "daily_nutrition_targets"("memberId", "date");

-- 辅助打卡表（饮水、运动、睡眠、体重）
CREATE TABLE "auxiliary_trackings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "memberId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "waterIntake" INTEGER DEFAULT 0,
  "waterTarget" INTEGER DEFAULT 2000,
  "exerciseMinutes" INTEGER DEFAULT 0,
  "caloriesBurned" INTEGER DEFAULT 0,
  "exerciseType" TEXT,
  "sleepHours" DOUBLE PRECISION,
  "sleepQuality" TEXT,
  "weight" DOUBLE PRECISION,
  "bodyFat" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "auxiliary_trackings_memberId_fkey" FOREIGN KEY ("memberId") 
    REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "auxiliary_trackings_memberId_date_key" UNIQUE ("memberId", "date")
);

CREATE INDEX "auxiliary_trackings_memberId_date_idx" ON "auxiliary_trackings"("memberId", "date");

