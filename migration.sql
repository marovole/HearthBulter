-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('CHILD', 'TEENAGER', 'ADULT', 'ELDERLY');

-- CreateEnum
CREATE TYPE "FamilyMemberRole" AS ENUM ('ADMIN', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'IMPROVE_HEALTH');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AllergenType" AS ENUM ('FOOD', 'ENVIRONMENTAL', 'MEDICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "DietaryType" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCETARIAN', 'KETO', 'PALEO', 'MEDITERRANEAN', 'LOW_FODMAP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('VEGETABLES', 'FRUITS', 'GRAINS', 'PROTEIN', 'SEAFOOD', 'DAIRY', 'OILS', 'SNACKS', 'BEVERAGES', 'OTHER');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('USDA', 'LOCAL', 'USER_SUBMITTED');

-- CreateEnum
CREATE TYPE "HealthDataSource" AS ENUM ('MANUAL', 'WEARABLE', 'MEDICAL_REPORT');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('WEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'GENERAL');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "IndicatorType" AS ENUM ('TOTAL_CHOLESTEROL', 'LDL_CHOLESTEROL', 'HDL_CHOLESTEROL', 'TRIGLYCERIDES', 'FASTING_GLUCOSE', 'POSTPRANDIAL_GLUCOSE', 'GLYCATED_HEMOGLOBIN', 'ALT', 'AST', 'TOTAL_BILIRUBIN', 'DIRECT_BILIRUBIN', 'ALP', 'CREATININE', 'UREA_NITROGEN', 'URIC_ACID', 'WHITE_BLOOD_CELL', 'RED_BLOOD_CELL', 'HEMOGLOBIN', 'PLATELET', 'OTHER');

-- CreateEnum
CREATE TYPE "IndicatorStatus" AS ENUM ('NORMAL', 'LOW', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ListStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecognitionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScoreGrade" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "SpiceLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "SweetnessLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "SaltinessLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "TrendDataType" AS ENUM ('WEIGHT', 'BODY_FAT', 'MUSCLE_MASS', 'BLOOD_PRESSURE', 'HEART_RATE', 'CALORIES', 'PROTEIN', 'CARBS', 'FAT', 'EXERCISE', 'SLEEP', 'WATER', 'HEALTH_SCORE');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('SUDDEN_CHANGE', 'NUTRITION_IMBALANCE', 'GOAL_DEVIATION', 'THRESHOLD_EXCEEDED', 'MISSING_DATA');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "AIAdviceType" AS ENUM ('HEALTH_ANALYSIS', 'RECIPE_OPTIMIZATION', 'CONSULTATION', 'REPORT_GENERATION');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PromptType" AS ENUM ('HEALTH_ANALYSIS', 'RECIPE_OPTIMIZATION', 'CONSULTATION', 'REPORT_GENERATION');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('AI_HEALTH_ANALYSIS', 'MEDICAL_DATA_PROCESSING', 'HEALTH_DATA_SHARING', 'HEALTH_RESEARCH_PARTICIPATION');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('MANUAL', 'CRAWLER', 'API', 'USER_REPORT');

-- CreateEnum
CREATE TYPE "SavingsType" AS ENUM ('PROMOTION', 'GROUP_BUY', 'SEASONAL', 'BULK_PURCHASE', 'PLATFORM_SWITCH', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('WARNING_80', 'WARNING_100', 'OVER_BUDGET_110', 'CATEGORY_OVER', 'DAILY_EXCESS');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "EcommercePlatform" AS ENUM ('SAMS_CLUB', 'HEMA', 'DINGDONG');

-- CreateEnum
CREATE TYPE "PlatformAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('MAIN_DISH', 'SIDE_DISH', 'SOUP', 'SALAD', 'DESSERT', 'SNACK', 'BREAKFAST', 'BEVERAGE', 'SAUCE', 'OTHER');

-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "CostLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SubstitutionType" AS ENUM ('ALLERGY', 'STOCK_OUT', 'BUDGET', 'PREFERENCE', 'NUTRITION', 'SEASONAL');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('SHOPPING', 'COOKING', 'CLEANING', 'HEALTH', 'EXERCISE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MEAL_LOG_ADDED', 'RECIPE_ADDED', 'TASK_CREATED', 'TASK_COMPLETED', 'SHOPPING_UPDATED', 'GOAL_ACHIEVED', 'CHECK_IN', 'HEALTH_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "CommentTarget" AS ENUM ('TASK', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('WEIGHT_LOSS', 'EXERCISE', 'NUTRITION', 'SAVINGS', 'CHECK_IN_STREAK', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inviteCode" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "avatar" TEXT,
    "bmi" DOUBLE PRECISION,
    "ageGroup" "AgeGroup",
    "familyId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "FamilyMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_goals" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "goalType" "GoalType" NOT NULL,
    "targetWeight" DOUBLE PRECISION,
    "currentWeight" DOUBLE PRECISION,
    "startWeight" DOUBLE PRECISION,
    "targetWeeks" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "tdee" INTEGER,
    "bmr" INTEGER,
    "activityFactor" DOUBLE PRECISION,
    "carbRatio" DOUBLE PRECISION DEFAULT 0.5,
    "proteinRatio" DOUBLE PRECISION DEFAULT 0.2,
    "fatRatio" DOUBLE PRECISION DEFAULT 0.3,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "health_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "allergenType" "AllergenType" NOT NULL,
    "allergenName" TEXT NOT NULL,
    "severity" "AllergySeverity" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_preferences" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dietType" "DietaryType" NOT NULL,
    "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isKeto" BOOLEAN NOT NULL DEFAULT false,
    "isLowCarb" BOOLEAN NOT NULL DEFAULT false,
    "isLowFat" BOOLEAN NOT NULL DEFAULT false,
    "isHighProtein" BOOLEAN NOT NULL DEFAULT false,
    "isGlutenFree" BOOLEAN NOT NULL DEFAULT false,
    "isDairyFree" BOOLEAN NOT NULL DEFAULT false,
    "isLowSodium" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dietary_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_invitations" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "role" "FamilyMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "aliases" TEXT NOT NULL DEFAULT '[]',
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "vitaminA" DOUBLE PRECISION,
    "vitaminC" DOUBLE PRECISION,
    "calcium" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    "category" "FoodCategory" NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "source" "DataSource" NOT NULL DEFAULT 'LOCAL',
    "usdaId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cachedAt" TIMESTAMP(3),

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_data" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "bodyFat" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "heartRate" INTEGER,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "HealthDataSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_reminders" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[]',
    "message" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "goalType" "GoalType" NOT NULL,
    "targetCalories" DOUBLE PRECISION NOT NULL,
    "targetProtein" DOUBLE PRECISION NOT NULL,
    "targetCarbs" DOUBLE PRECISION NOT NULL,
    "targetFat" DOUBLE PRECISION NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_ingredients" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "meal_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "budget" DOUBLE PRECISION,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "status" "ListStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "estimatedPrice" DOUBLE PRECISION,
    "assigneeId" TEXT,
    "addedBy" TEXT,
    "purchasedBy" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_logs" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "meal_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_log_foods" (
    "id" TEXT NOT NULL,
    "mealLogId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_log_foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_photos" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "food_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_streaks" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalDays" INTEGER NOT NULL DEFAULT 0,
    "lastCheckIn" TIMESTAMP(3),
    "badges" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_templates" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "quick_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_foods" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "template_foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_nutrition_targets" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "daily_nutrition_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auxiliary_trackings" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "auxiliary_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "ai_advice" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "AIAdviceType" NOT NULL,
    "content" JSONB NOT NULL,
    "prompt" TEXT,
    "tokens" INTEGER NOT NULL,
    "feedback" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ai_advice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT,
    "messages" JSONB NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "tokens" INTEGER NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromptType" NOT NULL,
    "template" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "parameters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "context" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "EcommercePlatform" NOT NULL,
    "platformUserId" TEXT,
    "username" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenType" TEXT DEFAULT 'Bearer',
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "PlatformAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "defaultDeliveryAddress" JSONB,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platformOrderId" TEXT NOT NULL,
    "platform" "EcommercePlatform" NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" TEXT,
    "deliveryStatus" "DeliveryStatus",
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentDate" TIMESTAMP(3),
    "shipmentDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "deliveryAddress" JSONB NOT NULL,
    "trackingNumber" TEXT,
    "deliveryNotes" TEXT,
    "items" JSONB NOT NULL,
    "orderSummary" JSONB,
    "platformResponse" JSONB,
    "syncError" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_products" (
    "id" TEXT NOT NULL,
    "platform" "EcommercePlatform" NOT NULL,
    "platformProductId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "specification" JSONB,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "unit" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "priceUnit" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isInStock" BOOLEAN NOT NULL DEFAULT true,
    "stockStatus" TEXT,
    "salesCount" INTEGER,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "deliveryOptions" JSONB,
    "deliveryTime" JSONB,
    "shippingFee" DOUBLE PRECISION,
    "matchedFoodId" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "matchKeywords" JSONB,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "platformData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "platform_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cuisine" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "prepTime" INTEGER NOT NULL,
    "cookTime" INTEGER NOT NULL,
    "totalTime" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "videoUrl" TEXT,
    "category" "RecipeCategory" NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "mealTypes" TEXT NOT NULL DEFAULT '[]',
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "seasons" TEXT NOT NULL DEFAULT '[]',
    "estimatedCost" DOUBLE PRECISION,
    "costLevel" "CostLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "isSubstitutable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_instructions" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "timer" INTEGER,
    "temperature" INTEGER,

    CONSTRAINT "recipe_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ratings" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recipe_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_favorites" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "favoritedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "recipe_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_views" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewDuration" INTEGER,
    "source" TEXT,

    CONSTRAINT "recipe_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_substitutions" (
    "id" TEXT NOT NULL,
    "originalIngredientId" TEXT NOT NULL,
    "substituteFoodId" TEXT NOT NULL,
    "substitutionType" "SubstitutionType" NOT NULL,
    "reason" TEXT,
    "nutritionDelta" JSONB,
    "costDelta" DOUBLE PRECISION,
    "tasteSimilarity" DOUBLE PRECISION,
    "conditions" TEXT NOT NULL DEFAULT '[]',
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ingredient_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "spiceLevel" "SpiceLevel" NOT NULL DEFAULT 'MEDIUM',
    "sweetness" "SweetnessLevel" NOT NULL DEFAULT 'MEDIUM',
    "saltiness" "SaltinessLevel" NOT NULL DEFAULT 'MEDIUM',
    "preferredCuisines" TEXT NOT NULL DEFAULT '[]',
    "avoidedIngredients" TEXT NOT NULL DEFAULT '[]',
    "preferredIngredients" TEXT NOT NULL DEFAULT '[]',
    "maxCookTime" INTEGER,
    "minServings" INTEGER NOT NULL DEFAULT 1,
    "maxServings" INTEGER NOT NULL DEFAULT 10,
    "costLevel" "CostLevel" NOT NULL DEFAULT 'MEDIUM',
    "maxEstimatedCost" DOUBLE PRECISION,
    "dietType" "DietaryType" NOT NULL DEFAULT 'OMNIVORE',
    "isLowCarb" BOOLEAN NOT NULL DEFAULT false,
    "isLowFat" BOOLEAN NOT NULL DEFAULT false,
    "isHighProtein" BOOLEAN NOT NULL DEFAULT false,
    "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isGlutenFree" BOOLEAN NOT NULL DEFAULT false,
    "isDairyFree" BOOLEAN NOT NULL DEFAULT false,
    "enableRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "recommendationWeight" JSONB,
    "learnedPreferences" JSONB DEFAULT '{}',
    "preferenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAnalyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "assigneeId" TEXT,
    "creatorId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "remindedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "targetType" "CommentTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_goals" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardDescription" TEXT,
    "rewardAchieved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "family_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ParticipatedGoals" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ParticipatedGoals_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "families_inviteCode_key" ON "families"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_userId_key" ON "family_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_preferences_memberId_key" ON "dietary_preferences"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "family_invitations_inviteCode_key" ON "family_invitations"("inviteCode");

-- CreateIndex
CREATE INDEX "foods_category_idx" ON "foods"("category");

-- CreateIndex
CREATE INDEX "foods_source_idx" ON "foods"("source");

-- CreateIndex
CREATE INDEX "foods_nameEn_idx" ON "foods"("nameEn");

-- CreateIndex
CREATE INDEX "health_data_memberId_measuredAt_idx" ON "health_data"("memberId", "measuredAt");

-- CreateIndex
CREATE INDEX "health_data_memberId_idx" ON "health_data"("memberId");

-- CreateIndex
CREATE INDEX "health_reminders_memberId_idx" ON "health_reminders"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "health_reminders_memberId_reminderType_key" ON "health_reminders"("memberId", "reminderType");

-- CreateIndex
CREATE INDEX "meal_plans_memberId_idx" ON "meal_plans"("memberId");

-- CreateIndex
CREATE INDEX "meal_plans_startDate_endDate_idx" ON "meal_plans"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "meals_planId_idx" ON "meals"("planId");

-- CreateIndex
CREATE INDEX "meals_planId_date_mealType_idx" ON "meals"("planId", "date", "mealType");

-- CreateIndex
CREATE INDEX "meal_ingredients_mealId_idx" ON "meal_ingredients"("mealId");

-- CreateIndex
CREATE INDEX "meal_ingredients_foodId_idx" ON "meal_ingredients"("foodId");

-- CreateIndex
CREATE INDEX "medical_reports_memberId_idx" ON "medical_reports"("memberId");

-- CreateIndex
CREATE INDEX "medical_reports_memberId_reportDate_idx" ON "medical_reports"("memberId", "reportDate");

-- CreateIndex
CREATE INDEX "medical_reports_ocrStatus_idx" ON "medical_reports"("ocrStatus");

-- CreateIndex
CREATE INDEX "medical_indicators_reportId_idx" ON "medical_indicators"("reportId");

-- CreateIndex
CREATE INDEX "medical_indicators_reportId_indicatorType_idx" ON "medical_indicators"("reportId", "indicatorType");

-- CreateIndex
CREATE INDEX "shopping_lists_planId_idx" ON "shopping_lists"("planId");

-- CreateIndex
CREATE INDEX "shopping_lists_status_idx" ON "shopping_lists"("status");

-- CreateIndex
CREATE INDEX "shopping_items_listId_idx" ON "shopping_items"("listId");

-- CreateIndex
CREATE INDEX "shopping_items_foodId_idx" ON "shopping_items"("foodId");

-- CreateIndex
CREATE INDEX "shopping_items_category_idx" ON "shopping_items"("category");

-- CreateIndex
CREATE INDEX "shopping_items_assigneeId_idx" ON "shopping_items"("assigneeId");

-- CreateIndex
CREATE INDEX "shopping_items_addedBy_idx" ON "shopping_items"("addedBy");

-- CreateIndex
CREATE INDEX "shopping_items_purchasedBy_idx" ON "shopping_items"("purchasedBy");

-- CreateIndex
CREATE INDEX "meal_logs_memberId_date_idx" ON "meal_logs"("memberId", "date");

-- CreateIndex
CREATE INDEX "meal_logs_memberId_mealType_idx" ON "meal_logs"("memberId", "mealType");

-- CreateIndex
CREATE INDEX "meal_log_foods_mealLogId_idx" ON "meal_log_foods"("mealLogId");

-- CreateIndex
CREATE INDEX "meal_log_foods_foodId_idx" ON "meal_log_foods"("foodId");

-- CreateIndex
CREATE INDEX "food_photos_mealLogId_idx" ON "food_photos"("mealLogId");

-- CreateIndex
CREATE INDEX "food_photos_recognitionStatus_idx" ON "food_photos"("recognitionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_streaks_memberId_key" ON "tracking_streaks"("memberId");

-- CreateIndex
CREATE INDEX "quick_templates_memberId_mealType_idx" ON "quick_templates"("memberId", "mealType");

-- CreateIndex
CREATE INDEX "quick_templates_memberId_score_idx" ON "quick_templates"("memberId", "score");

-- CreateIndex
CREATE INDEX "template_foods_templateId_idx" ON "template_foods"("templateId");

-- CreateIndex
CREATE INDEX "template_foods_foodId_idx" ON "template_foods"("foodId");

-- CreateIndex
CREATE INDEX "daily_nutrition_targets_memberId_date_idx" ON "daily_nutrition_targets"("memberId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_nutrition_targets_memberId_date_key" ON "daily_nutrition_targets"("memberId", "date");

-- CreateIndex
CREATE INDEX "auxiliary_trackings_memberId_date_idx" ON "auxiliary_trackings"("memberId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "auxiliary_trackings_memberId_date_key" ON "auxiliary_trackings"("memberId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "health_reports_shareToken_key" ON "health_reports"("shareToken");

-- CreateIndex
CREATE INDEX "health_reports_memberId_reportType_idx" ON "health_reports"("memberId", "reportType");

-- CreateIndex
CREATE INDEX "health_reports_memberId_startDate_idx" ON "health_reports"("memberId", "startDate");

-- CreateIndex
CREATE INDEX "health_reports_shareToken_idx" ON "health_reports"("shareToken");

-- CreateIndex
CREATE INDEX "health_scores_memberId_date_idx" ON "health_scores"("memberId", "date");

-- CreateIndex
CREATE INDEX "health_scores_memberId_overallScore_idx" ON "health_scores"("memberId", "overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "health_scores_memberId_date_key" ON "health_scores"("memberId", "date");

-- CreateIndex
CREATE INDEX "trend_data_memberId_dataType_idx" ON "trend_data"("memberId", "dataType");

-- CreateIndex
CREATE INDEX "trend_data_expiresAt_idx" ON "trend_data"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "trend_data_memberId_dataType_startDate_endDate_key" ON "trend_data"("memberId", "dataType", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "health_anomalies_memberId_anomalyType_idx" ON "health_anomalies"("memberId", "anomalyType");

-- CreateIndex
CREATE INDEX "health_anomalies_memberId_status_idx" ON "health_anomalies"("memberId", "status");

-- CreateIndex
CREATE INDEX "health_anomalies_detectedAt_idx" ON "health_anomalies"("detectedAt");

-- CreateIndex
CREATE INDEX "ai_advice_memberId_idx" ON "ai_advice"("memberId");

-- CreateIndex
CREATE INDEX "ai_advice_type_idx" ON "ai_advice"("type");

-- CreateIndex
CREATE INDEX "ai_advice_generatedAt_idx" ON "ai_advice"("generatedAt");

-- CreateIndex
CREATE INDEX "ai_conversations_memberId_idx" ON "ai_conversations"("memberId");

-- CreateIndex
CREATE INDEX "ai_conversations_status_idx" ON "ai_conversations"("status");

-- CreateIndex
CREATE INDEX "ai_conversations_lastMessageAt_idx" ON "ai_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "prompt_templates_type_idx" ON "prompt_templates"("type");

-- CreateIndex
CREATE INDEX "prompt_templates_isActive_idx" ON "prompt_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_type_version_key" ON "prompt_templates"("type", "version");

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_consentId_idx" ON "user_consents"("consentId");

-- CreateIndex
CREATE INDEX "user_consents_granted_idx" ON "user_consents"("granted");

-- CreateIndex
CREATE INDEX "user_consents_expiresAt_idx" ON "user_consents"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_userId_consentId_key" ON "user_consents"("userId", "consentId");

-- CreateIndex
CREATE INDEX "budgets_memberId_idx" ON "budgets"("memberId");

-- CreateIndex
CREATE INDEX "budgets_memberId_period_idx" ON "budgets"("memberId", "period");

-- CreateIndex
CREATE INDEX "budgets_startDate_endDate_idx" ON "budgets"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "spendings_budgetId_idx" ON "spendings"("budgetId");

-- CreateIndex
CREATE INDEX "spendings_budgetId_category_idx" ON "spendings"("budgetId", "category");

-- CreateIndex
CREATE INDEX "spendings_purchaseDate_idx" ON "spendings"("purchaseDate");

-- CreateIndex
CREATE INDEX "price_histories_foodId_idx" ON "price_histories"("foodId");

-- CreateIndex
CREATE INDEX "price_histories_foodId_platform_idx" ON "price_histories"("foodId", "platform");

-- CreateIndex
CREATE INDEX "price_histories_recordedAt_idx" ON "price_histories"("recordedAt");

-- CreateIndex
CREATE INDEX "savings_recommendations_memberId_idx" ON "savings_recommendations"("memberId");

-- CreateIndex
CREATE INDEX "savings_recommendations_memberId_type_idx" ON "savings_recommendations"("memberId", "type");

-- CreateIndex
CREATE INDEX "savings_recommendations_status_idx" ON "savings_recommendations"("status");

-- CreateIndex
CREATE INDEX "savings_recommendations_validUntil_idx" ON "savings_recommendations"("validUntil");

-- CreateIndex
CREATE INDEX "budget_alerts_budgetId_idx" ON "budget_alerts"("budgetId");

-- CreateIndex
CREATE INDEX "budget_alerts_budgetId_type_idx" ON "budget_alerts"("budgetId", "type");

-- CreateIndex
CREATE INDEX "budget_alerts_status_idx" ON "budget_alerts"("status");

-- CreateIndex
CREATE INDEX "platform_accounts_userId_idx" ON "platform_accounts"("userId");

-- CreateIndex
CREATE INDEX "platform_accounts_platform_idx" ON "platform_accounts"("platform");

-- CreateIndex
CREATE INDEX "platform_accounts_status_idx" ON "platform_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_accounts_userId_platform_key" ON "platform_accounts"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "orders_platformOrderId_key" ON "orders"("platformOrderId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_accountId_idx" ON "orders"("accountId");

-- CreateIndex
CREATE INDEX "orders_platform_idx" ON "orders"("platform");

-- CreateIndex
CREATE INDEX "orders_platformOrderId_idx" ON "orders"("platformOrderId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderDate_idx" ON "orders"("orderDate");

-- CreateIndex
CREATE INDEX "platform_products_platform_idx" ON "platform_products"("platform");

-- CreateIndex
CREATE INDEX "platform_products_matchedFoodId_idx" ON "platform_products"("matchedFoodId");

-- CreateIndex
CREATE INDEX "platform_products_matchConfidence_idx" ON "platform_products"("matchConfidence");

-- CreateIndex
CREATE INDEX "platform_products_cachedAt_idx" ON "platform_products"("cachedAt");

-- CreateIndex
CREATE INDEX "platform_products_expiresAt_idx" ON "platform_products"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_products_platform_platformProductId_key" ON "platform_products"("platform", "platformProductId");

-- CreateIndex
CREATE INDEX "recipes_category_idx" ON "recipes"("category");

-- CreateIndex
CREATE INDEX "recipes_difficulty_idx" ON "recipes"("difficulty");

-- CreateIndex
CREATE INDEX "recipes_status_idx" ON "recipes"("status");

-- CreateIndex
CREATE INDEX "recipes_averageRating_idx" ON "recipes"("averageRating");

-- CreateIndex
CREATE INDEX "recipes_viewCount_idx" ON "recipes"("viewCount");

-- CreateIndex
CREATE INDEX "recipes_createdAt_idx" ON "recipes"("createdAt");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_foodId_idx" ON "recipe_ingredients"("foodId");

-- CreateIndex
CREATE INDEX "recipe_instructions_recipeId_idx" ON "recipe_instructions"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_instructions_recipeId_stepNumber_key" ON "recipe_instructions"("recipeId", "stepNumber");

-- CreateIndex
CREATE INDEX "recipe_ratings_recipeId_idx" ON "recipe_ratings"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ratings_memberId_idx" ON "recipe_ratings"("memberId");

-- CreateIndex
CREATE INDEX "recipe_ratings_rating_idx" ON "recipe_ratings"("rating");

-- CreateIndex
CREATE INDEX "recipe_ratings_ratedAt_idx" ON "recipe_ratings"("ratedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ratings_recipeId_memberId_key" ON "recipe_ratings"("recipeId", "memberId");

-- CreateIndex
CREATE INDEX "recipe_favorites_recipeId_idx" ON "recipe_favorites"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_favorites_memberId_idx" ON "recipe_favorites"("memberId");

-- CreateIndex
CREATE INDEX "recipe_favorites_favoritedAt_idx" ON "recipe_favorites"("favoritedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_favorites_recipeId_memberId_key" ON "recipe_favorites"("recipeId", "memberId");

-- CreateIndex
CREATE INDEX "recipe_views_recipeId_idx" ON "recipe_views"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_views_memberId_idx" ON "recipe_views"("memberId");

-- CreateIndex
CREATE INDEX "recipe_views_viewedAt_idx" ON "recipe_views"("viewedAt");

-- CreateIndex
CREATE INDEX "ingredient_substitutions_originalIngredientId_idx" ON "ingredient_substitutions"("originalIngredientId");

-- CreateIndex
CREATE INDEX "ingredient_substitutions_substituteFoodId_idx" ON "ingredient_substitutions"("substituteFoodId");

-- CreateIndex
CREATE INDEX "ingredient_substitutions_substitutionType_idx" ON "ingredient_substitutions"("substitutionType");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_memberId_key" ON "user_preferences"("memberId");

-- CreateIndex
CREATE INDEX "user_preferences_memberId_idx" ON "user_preferences"("memberId");

-- CreateIndex
CREATE INDEX "user_preferences_dietType_idx" ON "user_preferences"("dietType");

-- CreateIndex
CREATE INDEX "user_preferences_costLevel_idx" ON "user_preferences"("costLevel");

-- CreateIndex
CREATE INDEX "tasks_familyId_idx" ON "tasks"("familyId");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "tasks_creatorId_idx" ON "tasks"("creatorId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- CreateIndex
CREATE INDEX "activities_familyId_idx" ON "activities"("familyId");

-- CreateIndex
CREATE INDEX "activities_memberId_idx" ON "activities"("memberId");

-- CreateIndex
CREATE INDEX "activities_activityType_idx" ON "activities"("activityType");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

-- CreateIndex
CREATE INDEX "comments_targetType_targetId_idx" ON "comments"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE INDEX "family_goals_familyId_idx" ON "family_goals"("familyId");

-- CreateIndex
CREATE INDEX "family_goals_creatorId_idx" ON "family_goals"("creatorId");

-- CreateIndex
CREATE INDEX "family_goals_status_idx" ON "family_goals"("status");

-- CreateIndex
CREATE INDEX "family_goals_targetDate_idx" ON "family_goals"("targetDate");

-- CreateIndex
CREATE INDEX "_ParticipatedGoals_B_index" ON "_ParticipatedGoals"("B");

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_goals" ADD CONSTRAINT "health_goals_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_preferences" ADD CONSTRAINT "dietary_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_data" ADD CONSTRAINT "health_data_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_reminders" ADD CONSTRAINT "health_reminders_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_planId_fkey" FOREIGN KEY ("planId") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_indicators" ADD CONSTRAINT "medical_indicators_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "medical_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_planId_fkey" FOREIGN KEY ("planId") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_foods" ADD CONSTRAINT "meal_log_foods_mealLogId_fkey" FOREIGN KEY ("mealLogId") REFERENCES "meal_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_log_foods" ADD CONSTRAINT "meal_log_foods_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_photos" ADD CONSTRAINT "food_photos_mealLogId_fkey" FOREIGN KEY ("mealLogId") REFERENCES "meal_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_streaks" ADD CONSTRAINT "tracking_streaks_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_templates" ADD CONSTRAINT "quick_templates_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_foods" ADD CONSTRAINT "template_foods_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "quick_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_foods" ADD CONSTRAINT "template_foods_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_nutrition_targets" ADD CONSTRAINT "daily_nutrition_targets_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auxiliary_trackings" ADD CONSTRAINT "auxiliary_trackings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_scores" ADD CONSTRAINT "health_scores_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_data" ADD CONSTRAINT "trend_data_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_anomalies" ADD CONSTRAINT "health_anomalies_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_advice" ADD CONSTRAINT "ai_advice_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spendings" ADD CONSTRAINT "spendings_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_recommendations" ADD CONSTRAINT "savings_recommendations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_products" ADD CONSTRAINT "platform_products_matchedFoodId_fkey" FOREIGN KEY ("matchedFoodId") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_instructions" ADD CONSTRAINT "recipe_instructions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_views" ADD CONSTRAINT "recipe_views_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_views" ADD CONSTRAINT "recipe_views_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_substitutions" ADD CONSTRAINT "ingredient_substitutions_originalIngredientId_fkey" FOREIGN KEY ("originalIngredientId") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_substitutions" ADD CONSTRAINT "ingredient_substitutions_substituteFoodId_fkey" FOREIGN KEY ("substituteFoodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_fkey" FOREIGN KEY ("targetId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_activity_fkey" FOREIGN KEY ("targetId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_goals" ADD CONSTRAINT "family_goals_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_goals" ADD CONSTRAINT "family_goals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipatedGoals" ADD CONSTRAINT "_ParticipatedGoals_A_fkey" FOREIGN KEY ("A") REFERENCES "family_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipatedGoals" ADD CONSTRAINT "_ParticipatedGoals_B_fkey" FOREIGN KEY ("B") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

