import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ========================================
// ENUM VALIDATORS
// ========================================

// User & Role Enums
export const vUserRole = v.union(v.literal("USER"), v.literal("ADMIN"));
export const vGender = v.union(v.literal("MALE"), v.literal("FEMALE"), v.literal("OTHER"));
export const vAgeGroup = v.union(v.literal("CHILD"), v.literal("TEENAGER"), v.literal("ADULT"), v.literal("ELDERLY"));
export const vFamilyMemberRole = v.union(v.literal("ADMIN"), v.literal("MEMBER"), v.literal("GUEST"));

// Health & Goal Enums
export const vGoalType = v.union(v.literal("LOSE_WEIGHT"), v.literal("GAIN_MUSCLE"), v.literal("MAINTAIN"), v.literal("IMPROVE_HEALTH"));
export const vGoalStatus = v.union(v.literal("ACTIVE"), v.literal("COMPLETED"), v.literal("PAUSED"), v.literal("CANCELLED"));
export const vAllergenType = v.union(v.literal("FOOD"), v.literal("ENVIRONMENTAL"), v.literal("MEDICATION"), v.literal("OTHER"));
export const vAllergySeverity = v.union(v.literal("MILD"), v.literal("MODERATE"), v.literal("SEVERE"), v.literal("LIFE_THREATENING"));
export const vDietaryType = v.union(v.literal("OMNIVORE"), v.literal("VEGETARIAN"), v.literal("VEGAN"), v.literal("PESCETARIAN"), v.literal("KETO"), v.literal("PALEO"), v.literal("MEDITERRANEAN"), v.literal("LOW_FODMAP"), v.literal("CUSTOM"));
export const vInvitationStatus = v.union(v.literal("PENDING"), v.literal("ACCEPTED"), v.literal("REJECTED"), v.literal("EXPIRED"));

// Food & Nutrition Enums
export const vFoodCategory = v.union(v.literal("VEGETABLES"), v.literal("FRUITS"), v.literal("GRAINS"), v.literal("PROTEIN"), v.literal("SEAFOOD"), v.literal("DAIRY"), v.literal("OILS"), v.literal("SNACKS"), v.literal("BEVERAGES"), v.literal("OTHER"));
export const vDataSource = v.union(v.literal("USDA"), v.literal("LOCAL"), v.literal("USER_SUBMITTED"));
export const vHealthDataSource = v.union(v.literal("MANUAL"), v.literal("WEARABLE"), v.literal("MEDICAL_REPORT"), v.literal("APPLE_HEALTHKIT"), v.literal("HUAWEI_HEALTH"), v.literal("GOOGLE_FIT"), v.literal("XIAOMI_HEALTH"), v.literal("SAMSUNG_HEALTH"), v.literal("GARMIN_CONNECT"), v.literal("FITBIT"));
export const vReminderType = v.union(v.literal("WEIGHT"), v.literal("BLOOD_PRESSURE"), v.literal("HEART_RATE"), v.literal("GENERAL"));
export const vMealType = v.union(v.literal("BREAKFAST"), v.literal("LUNCH"), v.literal("DINNER"), v.literal("SNACK"));
export const vPlanStatus = v.union(v.literal("ACTIVE"), v.literal("COMPLETED"), v.literal("CANCELLED"));

// Medical Enums
export const vOcrStatus = v.union(v.literal("PENDING"), v.literal("PROCESSING"), v.literal("COMPLETED"), v.literal("FAILED"));
export const vIndicatorType = v.union(v.literal("TOTAL_CHOLESTEROL"), v.literal("LDL_CHOLESTEROL"), v.literal("HDL_CHOLESTEROL"), v.literal("TRIGLYCERIDES"), v.literal("FASTING_GLUCOSE"), v.literal("POSTPRANDIAL_GLUCOSE"), v.literal("GLYCATED_HEMOGLOBIN"), v.literal("ALT"), v.literal("AST"), v.literal("TOTAL_BILIRUBIN"), v.literal("DIRECT_BILIRUBIN"), v.literal("ALP"), v.literal("CREATININE"), v.literal("UREA_NITROGEN"), v.literal("URIC_ACID"), v.literal("WHITE_BLOOD_CELL"), v.literal("RED_BLOOD_CELL"), v.literal("HEMOGLOBIN"), v.literal("PLATELET"), v.literal("OTHER"));
export const vIndicatorStatus = v.union(v.literal("NORMAL"), v.literal("LOW"), v.literal("HIGH"), v.literal("CRITICAL"));
export const vListStatus = v.union(v.literal("PENDING"), v.literal("IN_PROGRESS"), v.literal("COMPLETED"));
export const vRecognitionStatus = v.union(v.literal("PENDING"), v.literal("PROCESSING"), v.literal("COMPLETED"), v.literal("FAILED"));

// Report Enums
export const vReportType = v.union(v.literal("WEEKLY"), v.literal("MONTHLY"), v.literal("QUARTERLY"), v.literal("CUSTOM"));
export const vReportStatus = v.union(v.literal("GENERATING"), v.literal("COMPLETED"), v.literal("FAILED"));
export const vScoreGrade = v.union(v.literal("EXCELLENT"), v.literal("GOOD"), v.literal("FAIR"), v.literal("POOR"));

// Preference Enums
export const vSpiceLevel = v.union(v.literal("NONE"), v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("EXTREME"));
export const vSweetnessLevel = v.union(v.literal("NONE"), v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("EXTREME"));
export const vSaltinessLevel = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("EXTREME"));

// Trend & Anomaly Enums
export const vTrendDataType = v.union(v.literal("WEIGHT"), v.literal("BODY_FAT"), v.literal("MUSCLE_MASS"), v.literal("BLOOD_PRESSURE"), v.literal("HEART_RATE"), v.literal("CALORIES"), v.literal("PROTEIN"), v.literal("CARBS"), v.literal("FAT"), v.literal("EXERCISE"), v.literal("SLEEP"), v.literal("WATER"), v.literal("HEALTH_SCORE"));
export const vAnomalyType = v.union(v.literal("SUDDEN_CHANGE"), v.literal("NUTRITION_IMBALANCE"), v.literal("GOAL_DEVIATION"), v.literal("THRESHOLD_EXCEEDED"), v.literal("MISSING_DATA"));
export const vAnomalySeverity = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("CRITICAL"));
export const vAnomalyStatus = v.union(v.literal("PENDING"), v.literal("ACKNOWLEDGED"), v.literal("RESOLVED"), v.literal("IGNORED"));

// AI Enums
export const vAIAdviceType = v.union(v.literal("HEALTH_ANALYSIS"), v.literal("RECIPE_OPTIMIZATION"), v.literal("CONSULTATION"), v.literal("REPORT_GENERATION"));
export const vConversationStatus = v.union(v.literal("ACTIVE"), v.literal("ARCHIVED"));
export const vPromptType = v.union(v.literal("HEALTH_ANALYSIS"), v.literal("RECIPE_OPTIMIZATION"), v.literal("CONSULTATION"), v.literal("REPORT_GENERATION"));

// Budget Enums
export const vBudgetPeriod = v.union(v.literal("WEEKLY"), v.literal("MONTHLY"), v.literal("QUARTERLY"), v.literal("YEARLY"), v.literal("CUSTOM"));
export const vBudgetStatus = v.union(v.literal("ACTIVE"), v.literal("COMPLETED"), v.literal("CANCELLED"), v.literal("EXPIRED"));
export const vPriceSource = v.union(v.literal("MANUAL"), v.literal("CRAWLER"), v.literal("API"), v.literal("USER_REPORT"));
export const vSavingsType = v.union(v.literal("PROMOTION"), v.literal("GROUP_BUY"), v.literal("SEASONAL"), v.literal("BULK_PURCHASE"), v.literal("PLATFORM_SWITCH"), v.literal("SUBSTITUTE"));
export const vRecommendationStatus = v.union(v.literal("PENDING"), v.literal("VIEWED"), v.literal("ACCEPTED"), v.literal("REJECTED"), v.literal("EXPIRED"));
export const vAlertType = v.union(v.literal("WARNING_80"), v.literal("WARNING_100"), v.literal("OVER_BUDGET_110"), v.literal("CATEGORY_OVER"), v.literal("DAILY_EXCESS"));
export const vAlertStatus = v.union(v.literal("ACTIVE"), v.literal("ACKNOWLEDGED"), v.literal("RESOLVED"), v.literal("DISMISSED"));

// E-commerce Enums
export const vEcommercePlatform = v.union(v.literal("SAMS_CLUB"), v.literal("HEMA"), v.literal("DINGDONG"));
export const vPlatformAccountStatus = v.union(v.literal("ACTIVE"), v.literal("INACTIVE"), v.literal("EXPIRED"), v.literal("ERROR"));
export const vOrderStatus = v.union(v.literal("PENDING_PAYMENT"), v.literal("PAID"), v.literal("PROCESSING"), v.literal("SHIPPED"), v.literal("DELIVERED"), v.literal("CANCELLED"), v.literal("REFUNDED"));
export const vDeliveryStatus = v.union(v.literal("PREPARING"), v.literal("READY_FOR_PICKUP"), v.literal("OUT_FOR_DELIVERY"), v.literal("DELIVERED"), v.literal("FAILED"));

// Recipe Enums
export const vDifficulty = v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"));
export const vRecipeCategory = v.union(v.literal("MAIN_DISH"), v.literal("SIDE_DISH"), v.literal("SOUP"), v.literal("SALAD"), v.literal("DESSERT"), v.literal("SNACK"), v.literal("BREAKFAST"), v.literal("BEVERAGE"), v.literal("SAUCE"), v.literal("OTHER"));
export const vRecipeStatus = v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("ARCHIVED"), v.literal("DELETED"));
export const vCostLevel = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"));
export const vSubstitutionType = v.union(v.literal("ALLERGY"), v.literal("STOCK_OUT"), v.literal("BUDGET"), v.literal("PREFERENCE"), v.literal("NUTRITION"), v.literal("SEASONAL"));

// Task Enums
export const vTaskCategory = v.union(v.literal("SHOPPING"), v.literal("COOKING"), v.literal("CLEANING"), v.literal("HEALTH"), v.literal("EXERCISE"), v.literal("OTHER"));
export const vTaskStatus = v.union(v.literal("TODO"), v.literal("IN_PROGRESS"), v.literal("COMPLETED"), v.literal("CANCELLED"));
export const vTaskPriority = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("URGENT"));
export const vActivityType = v.union(v.literal("MEAL_LOG_ADDED"), v.literal("RECIPE_ADDED"), v.literal("TASK_CREATED"), v.literal("TASK_COMPLETED"), v.literal("SHOPPING_UPDATED"), v.literal("GOAL_ACHIEVED"), v.literal("CHECK_IN"), v.literal("HEALTH_DATA"), v.literal("OTHER"));
export const vCommentTarget = v.union(v.literal("TASK"), v.literal("ACTIVITY"));
export const vGoalCategory = v.union(v.literal("WEIGHT_LOSS"), v.literal("EXERCISE"), v.literal("NUTRITION"), v.literal("SAVINGS"), v.literal("CHECK_IN_STREAK"), v.literal("OTHER"));

// Share & Social Enums
export const vShareContentType = v.union(v.literal("HEALTH_REPORT"), v.literal("GOAL_ACHIEVEMENT"), v.literal("MEAL_LOG"), v.literal("RECIPE"), v.literal("ACHIEVEMENT"), v.literal("CHECK_IN_STREAK"), v.literal("WEIGHT_MILESTONE"), v.literal("WEEKLY_SUMMARY"), v.literal("MONTHLY_REPORT"));
export const vShareStatus = v.union(v.literal("ACTIVE"), v.literal("EXPIRED"), v.literal("REVOKED"), v.literal("DELETED"));
export const vSharePrivacyLevel = v.union(v.literal("PUBLIC"), v.literal("FRIENDS"), v.literal("PRIVATE"));
export const vShareTrackingEventType = v.union(v.literal("VIEW"), v.literal("CLICK"), v.literal("SHARE"), v.literal("CONVERSION"), v.literal("DOWNLOAD"));
export const vAchievementType = v.union(v.literal("CHECK_IN_STREAK"), v.literal("WEIGHT_LOSS"), v.literal("NUTRITION_GOAL"), v.literal("EXERCISE_TARGET"), v.literal("HEALTH_MILESTONE"), v.literal("COMMUNITY_CONTRIBUTION"));
export const vAchievementRarity = v.union(v.literal("BRONZE"), v.literal("SILVER"), v.literal("GOLD"), v.literal("PLATINUM"), v.literal("DIAMOND"));
export const vLeaderboardType = v.union(v.literal("HEALTH_SCORE"), v.literal("CHECK_IN_STREAK"), v.literal("WEIGHT_LOSS"), v.literal("EXERCISE_MINUTES"), v.literal("NUTRITION_SCORE"));
export const vLeaderboardPeriod = v.union(v.literal("DAILY"), v.literal("WEEKLY"), v.literal("MONTHLY"), v.literal("YEARLY"), v.literal("ALL_TIME"));
export const vCommunityPostStatus = v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("HIDDEN"), v.literal("DELETED"));
export const vCommunityPostType = v.union(v.literal("EXPERIENCE"), v.literal("RECIPE_SHOW"), v.literal("ACHIEVEMENT"), v.literal("QUESTION"), v.literal("DISCUSSION"));

// Notification Enums
export const vNotificationType = v.union(v.literal("CHECK_IN_REMINDER"), v.literal("TASK_NOTIFICATION"), v.literal("EXPIRY_ALERT"), v.literal("BUDGET_WARNING"), v.literal("HEALTH_ALERT"), v.literal("GOAL_ACHIEVEMENT"), v.literal("FAMILY_ACTIVITY"), v.literal("SYSTEM_ANNOUNCEMENT"), v.literal("MARKETING"), v.literal("OTHER"));
export const vNotificationChannel = v.union(v.literal("IN_APP"), v.literal("EMAIL"), v.literal("SMS"), v.literal("WECHAT"), v.literal("PUSH"));
export const vNotificationPriority = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("URGENT"));
export const vNotificationStatus = v.union(v.literal("PENDING"), v.literal("SENDING"), v.literal("SENT"), v.literal("FAILED"), v.literal("CANCELLED"));

// Inventory Enums
export const vStorageLocation = v.union(v.literal("REFRIGERATOR"), v.literal("FREEZER"), v.literal("PANTRY"), v.literal("COUNTER"), v.literal("CABINET"), v.literal("OTHER"));
export const vInventoryStatus = v.union(v.literal("FRESH"), v.literal("EXPIRING"), v.literal("EXPIRED"), v.literal("LOW_STOCK"), v.literal("OUT_OF_STOCK"));
export const vWasteReason = v.union(v.literal("EXPIRED"), v.literal("SPOILED"), v.literal("OVERSTOCK"), v.literal("PREFERENCE"), v.literal("OTHER"));

// Device Enums
export const vDeviceType = v.union(v.literal("SMARTWATCH"), v.literal("FITNESS_BAND"), v.literal("SMART_SCALE"), v.literal("BLOOD_PRESSURE_MONITOR"), v.literal("GLUCOSE_METER"), v.literal("SMART_RING"), v.literal("OTHER"));
export const vPlatformType = v.union(v.literal("APPLE_HEALTHKIT"), v.literal("HUAWEI_HEALTH"), v.literal("GOOGLE_FIT"), v.literal("XIAOMI_HEALTH"), v.literal("SAMSUNG_HEALTH"), v.literal("GARMIN_CONNECT"), v.literal("FITBIT"), v.literal("OTHER_PLATFORM"));
export const vSyncStatus = v.union(v.literal("PENDING"), v.literal("SYNCING"), v.literal("SUCCESS"), v.literal("FAILED"), v.literal("DISABLED"));

// ========================================
// SCHEMA DEFINITION
// ========================================

export default defineSchema({
  // ==================== CORE USER/FAMILY ====================

  users: defineTable({
    email: v.string(),
    emailVerified: v.optional(v.number()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    password: v.optional(v.string()),
    role: vUserRole,
    deletedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"]),

  families: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
    creatorId: v.id("users"),
    deletedAt: v.optional(v.number()),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_creatorId", ["creatorId"]),

  familyMembers: defineTable({
    name: v.string(),
    gender: vGender,
    birthDate: v.number(),
    height: v.optional(v.float64()),
    weight: v.optional(v.float64()),
    avatar: v.optional(v.string()),
    bmi: v.optional(v.float64()),
    ageGroup: v.optional(vAgeGroup),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
    role: vFamilyMemberRole,
    deletedAt: v.optional(v.number()),
  })
    .index("by_familyId", ["familyId"])
    .index("by_userId", ["userId"]),

  familyInvitations: defineTable({
    familyId: v.id("families"),
    email: v.string(),
    inviteCode: v.string(),
    role: vFamilyMemberRole,
    status: vInvitationStatus,
    expiresAt: v.number(),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_email", ["email"])
    .index("by_familyId", ["familyId"]),

  // ==================== HEALTH ====================

  healthGoals: defineTable({
    memberId: v.id("familyMembers"),
    goalType: vGoalType,
    targetWeight: v.optional(v.float64()),
    currentWeight: v.optional(v.float64()),
    startWeight: v.optional(v.float64()),
    targetWeeks: v.optional(v.number()),
    startDate: v.number(),
    targetDate: v.optional(v.number()),
    tdee: v.optional(v.number()),
    bmr: v.optional(v.number()),
    activityFactor: v.optional(v.float64()),
    carbRatio: v.optional(v.float64()),
    proteinRatio: v.optional(v.float64()),
    fatRatio: v.optional(v.float64()),
    status: vGoalStatus,
    progress: v.optional(v.float64()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_status", ["memberId", "status"]),

  allergies: defineTable({
    memberId: v.id("familyMembers"),
    allergenType: vAllergenType,
    allergenName: v.string(),
    severity: vAllergySeverity,
    description: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"]),

  dietaryPreferences: defineTable({
    memberId: v.id("familyMembers"),
    dietType: vDietaryType,
    isVegetarian: v.boolean(),
    isVegan: v.boolean(),
    isKeto: v.boolean(),
    isLowCarb: v.boolean(),
    isLowFat: v.boolean(),
    isHighProtein: v.boolean(),
    isGlutenFree: v.boolean(),
    isDairyFree: v.boolean(),
    isLowSodium: v.boolean(),
    notes: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"]),

  healthData: defineTable({
    memberId: v.id("familyMembers"),
    weight: v.optional(v.float64()),
    bodyFat: v.optional(v.float64()),
    muscleMass: v.optional(v.float64()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    measuredAt: v.number(),
    source: vHealthDataSource,
    notes: v.optional(v.string()),
    deviceConnectionId: v.optional(v.id("deviceConnections")),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_measuredAt", ["memberId", "measuredAt"]),

  healthReminders: defineTable({
    memberId: v.id("familyMembers"),
    reminderType: vReminderType,
    enabled: v.boolean(),
    hour: v.number(),
    minute: v.number(),
    daysOfWeek: v.array(v.number()),
    message: v.optional(v.string()),
    lastTriggeredAt: v.optional(v.number()),
    streakDays: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_reminderType", ["memberId", "reminderType"]),

  healthReports: defineTable({
    memberId: v.id("familyMembers"),
    reportType: vReportType,
    startDate: v.number(),
    endDate: v.number(),
    title: v.string(),
    summary: v.optional(v.string()),
    dataSnapshot: v.string(),
    insights: v.optional(v.string()),
    overallScore: v.optional(v.float64()),
    htmlContent: v.optional(v.string()),
    pdfUrl: v.optional(v.string()),
    shareToken: v.optional(v.string()),
    shareExpiresAt: v.optional(v.number()),
    status: vReportStatus,
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_shareToken", ["shareToken"]),

  healthScores: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    overallScore: v.float64(),
    nutritionScore: v.optional(v.float64()),
    exerciseScore: v.optional(v.float64()),
    sleepScore: v.optional(v.float64()),
    medicalScore: v.optional(v.float64()),
    grade: vScoreGrade,
    dataCompleteness: v.float64(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_date", ["memberId", "date"]),

  healthAnomalies: defineTable({
    memberId: v.id("familyMembers"),
    anomalyType: vAnomalyType,
    severity: vAnomalySeverity,
    title: v.string(),
    description: v.string(),
    detectedAt: v.number(),
    dataType: vTrendDataType,
    value: v.float64(),
    expectedMin: v.optional(v.float64()),
    expectedMax: v.optional(v.float64()),
    deviation: v.optional(v.float64()),
    status: vAnomalyStatus,
    resolvedAt: v.optional(v.number()),
    resolution: v.optional(v.string()),
    notified: v.boolean(),
    notifiedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_status", ["memberId", "status"]),

  trendData: defineTable({
    memberId: v.id("familyMembers"),
    dataType: vTrendDataType,
    startDate: v.number(),
    endDate: v.number(),
    aggregatedData: v.string(),
    mean: v.optional(v.float64()),
    median: v.optional(v.float64()),
    min: v.optional(v.float64()),
    max: v.optional(v.float64()),
    stdDev: v.optional(v.float64()),
    trendDirection: v.optional(v.string()),
    slope: v.optional(v.float64()),
    rSquared: v.optional(v.float64()),
    predictions: v.optional(v.string()),
    expiresAt: v.number(),
    hitCount: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_dataType", ["memberId", "dataType"]),

  // ==================== MEDICAL REPORTS ====================

  medicalReports: defineTable({
    memberId: v.id("familyMembers"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    ocrStatus: vOcrStatus,
    ocrText: v.optional(v.string()),
    ocrError: v.optional(v.string()),
    reportDate: v.optional(v.number()),
    institution: v.optional(v.string()),
    reportType: v.optional(v.string()),
    isCorrected: v.boolean(),
    correctedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_ocrStatus", ["ocrStatus"]),

  medicalIndicators: defineTable({
    reportId: v.id("medicalReports"),
    indicatorType: vIndicatorType,
    name: v.string(),
    value: v.float64(),
    unit: v.string(),
    referenceRange: v.optional(v.string()),
    isAbnormal: v.boolean(),
    status: vIndicatorStatus,
    isCorrected: v.boolean(),
    originalValue: v.optional(v.float64()),
  })
    .index("by_reportId", ["reportId"]),

  // ==================== FOOD & NUTRITION ====================

  foods: defineTable({
    name: v.string(),
    nameEn: v.optional(v.string()),
    aliases: v.array(v.string()),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    fiber: v.optional(v.float64()),
    sugar: v.optional(v.float64()),
    sodium: v.optional(v.float64()),
    vitaminA: v.optional(v.float64()),
    vitaminC: v.optional(v.float64()),
    calcium: v.optional(v.float64()),
    iron: v.optional(v.float64()),
    category: vFoodCategory,
    tags: v.array(v.string()),
    source: vDataSource,
    usdaId: v.optional(v.string()),
    verified: v.boolean(),
    cachedAt: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_name", ["name"])
    .index("by_usdaId", ["usdaId"])
    .searchIndex("search_foods", {
      searchField: "name",
      filterFields: ["category", "verified"],
    }),

  // ==================== MEAL PLANNING ====================

  mealPlans: defineTable({
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    goalType: vGoalType,
    targetCalories: v.float64(),
    targetProtein: v.float64(),
    targetCarbs: v.float64(),
    targetFat: v.float64(),
    status: vPlanStatus,
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_status", ["memberId", "status"]),

  meals: defineTable({
    planId: v.id("mealPlans"),
    date: v.number(),
    mealType: vMealType,
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
  })
    .index("by_planId", ["planId"])
    .index("by_planId_date", ["planId", "date"]),

  mealIngredients: defineTable({
    mealId: v.id("meals"),
    foodId: v.id("foods"),
    amount: v.float64(),
  })
    .index("by_mealId", ["mealId"])
    .index("by_foodId", ["foodId"]),

  // ==================== MEAL LOGGING ====================

  mealLogs: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    mealType: vMealType,
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    fiber: v.optional(v.float64()),
    sugar: v.optional(v.float64()),
    sodium: v.optional(v.float64()),
    notes: v.optional(v.string()),
    checkedAt: v.number(),
    isTemplate: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_date", ["memberId", "date"]),

  mealLogFoods: defineTable({
    mealLogId: v.id("mealLogs"),
    foodId: v.id("foods"),
    amount: v.float64(),
  })
    .index("by_mealLogId", ["mealLogId"])
    .index("by_foodId", ["foodId"]),

  foodPhotos: defineTable({
    mealLogId: v.id("mealLogs"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    recognitionStatus: vRecognitionStatus,
    recognitionResult: v.optional(v.string()),
    confidence: v.optional(v.float64()),
    recognitionError: v.optional(v.string()),
  })
    .index("by_mealLogId", ["mealLogId"]),

  // ==================== DAILY TRACKING ====================

  dailyNutritionTargets: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    targetCalories: v.float64(),
    targetProtein: v.float64(),
    targetCarbs: v.float64(),
    targetFat: v.float64(),
    actualCalories: v.float64(),
    actualProtein: v.float64(),
    actualCarbs: v.float64(),
    actualFat: v.float64(),
    caloriesDeviation: v.float64(),
    proteinDeviation: v.float64(),
    carbsDeviation: v.float64(),
    fatDeviation: v.float64(),
    isCompleted: v.boolean(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_date", ["memberId", "date"]),

  auxiliaryTrackings: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    waterIntake: v.optional(v.number()),
    waterTarget: v.optional(v.number()),
    exerciseMinutes: v.optional(v.number()),
    caloriesBurned: v.optional(v.number()),
    exerciseType: v.optional(v.string()),
    sleepHours: v.optional(v.float64()),
    sleepQuality: v.optional(v.string()),
    weight: v.optional(v.float64()),
    bodyFat: v.optional(v.float64()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_date", ["memberId", "date"]),

  trackingStreaks: defineTable({
    memberId: v.id("familyMembers"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    totalDays: v.number(),
    lastCheckIn: v.optional(v.number()),
    badges: v.array(v.string()),
  })
    .index("by_memberId", ["memberId"]),

  quickTemplates: defineTable({
    memberId: v.id("familyMembers"),
    name: v.string(),
    description: v.optional(v.string()),
    mealType: vMealType,
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    useCount: v.number(),
    lastUsed: v.optional(v.number()),
    score: v.float64(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_mealType", ["memberId", "mealType"]),

  templateFoods: defineTable({
    templateId: v.id("quickTemplates"),
    foodId: v.id("foods"),
    amount: v.float64(),
  })
    .index("by_templateId", ["templateId"]),

  // ==================== SHOPPING & INVENTORY ====================

  shoppingLists: defineTable({
    planId: v.id("mealPlans"),
    name: v.string(),
    budget: v.optional(v.float64()),
    estimatedCost: v.optional(v.float64()),
    actualCost: v.optional(v.float64()),
    status: vListStatus,
  })
    .index("by_planId", ["planId"])
    .index("by_status", ["status"]),

  shoppingListShares: defineTable({
    listId: v.id("shoppingLists"),
    token: v.string(),
    expiresAt: v.number(),
    createdBy: v.string(),
    viewCount: v.number(),
    lastViewedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_listId", ["listId"]),

  shoppingItems: defineTable({
    listId: v.id("shoppingLists"),
    foodId: v.id("foods"),
    amount: v.float64(),
    category: vFoodCategory,
    purchased: v.boolean(),
    estimatedPrice: v.optional(v.float64()),
    assigneeId: v.optional(v.id("familyMembers")),
    addedBy: v.optional(v.id("familyMembers")),
    purchasedBy: v.optional(v.id("familyMembers")),
    purchasedAt: v.optional(v.number()),
  })
    .index("by_listId", ["listId"])
    .index("by_foodId", ["foodId"])
    .index("by_category", ["category"]),

  inventoryItems: defineTable({
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.float64(),
    unit: v.string(),
    originalQuantity: v.float64(),
    purchaseDate: v.number(),
    purchasePrice: v.optional(v.float64()),
    purchaseSource: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    productionDate: v.optional(v.number()),
    daysToExpiry: v.optional(v.number()),
    storageLocation: vStorageLocation,
    storageNotes: v.optional(v.string()),
    status: vInventoryStatus,
    minStockThreshold: v.optional(v.float64()),
    isLowStock: v.boolean(),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
    packageInfo: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_foodId", ["foodId"])
    .index("by_memberId_status", ["memberId", "status"])
    .index("by_expiryDate", ["expiryDate"]),

  inventoryUsages: defineTable({
    inventoryItemId: v.id("inventoryItems"),
    memberId: v.id("familyMembers"),
    usedQuantity: v.float64(),
    usedAt: v.number(),
    usageType: v.string(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
    notes: v.optional(v.string()),
    recipeName: v.optional(v.string()),
  })
    .index("by_inventoryItemId", ["inventoryItemId"])
    .index("by_memberId", ["memberId"]),

  wasteLogs: defineTable({
    inventoryItemId: v.id("inventoryItems"),
    memberId: v.id("familyMembers"),
    wastedQuantity: v.float64(),
    wasteReason: vWasteReason,
    wastedAt: v.number(),
    estimatedCost: v.optional(v.float64()),
    notes: v.optional(v.string()),
    preventable: v.boolean(),
    preventionTip: v.optional(v.string()),
  })
    .index("by_inventoryItemId", ["inventoryItemId"])
    .index("by_memberId", ["memberId"]),

  // ==================== BUDGET ====================

  budgets: defineTable({
    memberId: v.id("familyMembers"),
    name: v.string(),
    period: vBudgetPeriod,
    startDate: v.number(),
    endDate: v.number(),
    totalAmount: v.float64(),
    vegetableBudget: v.optional(v.float64()),
    meatBudget: v.optional(v.float64()),
    fruitBudget: v.optional(v.float64()),
    grainBudget: v.optional(v.float64()),
    dairyBudget: v.optional(v.float64()),
    seafoodBudget: v.optional(v.float64()),
    oilsBudget: v.optional(v.float64()),
    snacksBudget: v.optional(v.float64()),
    beveragesBudget: v.optional(v.float64()),
    otherBudget: v.optional(v.float64()),
    status: vBudgetStatus,
    usedAmount: v.float64(),
    remainingAmount: v.optional(v.float64()),
    usagePercentage: v.optional(v.float64()),
    alertThreshold80: v.boolean(),
    alertThreshold100: v.boolean(),
    alertThreshold110: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_memberId_period", ["memberId", "period"]),

  spendings: defineTable({
    budgetId: v.id("budgets"),
    amount: v.float64(),
    category: vFoodCategory,
    description: v.string(),
    transactionId: v.optional(v.string()),
    platform: v.optional(v.string()),
    items: v.optional(v.any()),
    purchaseDate: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_budgetId_category", ["budgetId", "category"]),

  priceHistories: defineTable({
    foodId: v.id("foods"),
    price: v.float64(),
    unit: v.string(),
    unitPrice: v.float64(),
    platform: v.string(),
    recordedAt: v.number(),
    source: vPriceSource,
    isValid: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_foodId", ["foodId"])
    .index("by_foodId_platform", ["foodId", "platform"]),

  savingsRecommendations: defineTable({
    memberId: v.id("familyMembers"),
    type: vSavingsType,
    title: v.string(),
    description: v.string(),
    savings: v.float64(),
    originalPrice: v.optional(v.float64()),
    discountedPrice: v.optional(v.float64()),
    platform: v.optional(v.string()),
    foodItems: v.optional(v.any()),
    validUntil: v.optional(v.number()),
    status: vRecommendationStatus,
    viewed: v.boolean(),
    acted: v.boolean(),
    feedback: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_status", ["status"]),

  budgetAlerts: defineTable({
    budgetId: v.id("budgets"),
    type: vAlertType,
    threshold: v.float64(),
    currentValue: v.float64(),
    message: v.string(),
    status: vAlertStatus,
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    notified: v.boolean(),
    notifiedAt: v.optional(v.number()),
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_status", ["status"]),

  // ==================== RECIPES ====================

  recipes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    cuisine: v.optional(v.string()),
    difficulty: vDifficulty,
    prepTime: v.number(),
    cookTime: v.number(),
    totalTime: v.number(),
    servings: v.number(),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    fiber: v.optional(v.float64()),
    sugar: v.optional(v.float64()),
    sodium: v.optional(v.float64()),
    imageUrl: v.optional(v.string()),
    images: v.array(v.string()),
    videoUrl: v.optional(v.string()),
    category: vRecipeCategory,
    tags: v.array(v.string()),
    mealTypes: v.array(v.string()),
    averageRating: v.float64(),
    ratingCount: v.number(),
    favoriteCount: v.number(),
    viewCount: v.number(),
    status: vRecipeStatus,
    isPublic: v.boolean(),
    isVerified: v.boolean(),
    seasons: v.array(v.string()),
    estimatedCost: v.optional(v.float64()),
    costLevel: vCostLevel,
    deletedAt: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_difficulty", ["difficulty"])
    .index("by_status", ["status"])
    .index("by_averageRating", ["averageRating"])
    .searchIndex("search_recipes", {
      searchField: "name",
      filterFields: ["category", "difficulty", "status"],
    }),

  recipeIngredients: defineTable({
    recipeId: v.id("recipes"),
    foodId: v.id("foods"),
    amount: v.float64(),
    unit: v.string(),
    notes: v.optional(v.string()),
    optional: v.boolean(),
    isSubstitutable: v.boolean(),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_foodId", ["foodId"]),

  recipeInstructions: defineTable({
    recipeId: v.id("recipes"),
    stepNumber: v.number(),
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    timer: v.optional(v.number()),
    temperature: v.optional(v.number()),
  })
    .index("by_recipeId", ["recipeId"]),

  recipeRatings: defineTable({
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    rating: v.number(),
    comment: v.optional(v.string()),
    tags: v.array(v.string()),
    ratedAt: v.number(),
    isPublic: v.boolean(),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_memberId", ["memberId"]),

  recipeFavorites: defineTable({
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    favoritedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_memberId", ["memberId"]),

  recipeViews: defineTable({
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    viewedAt: v.number(),
    viewDuration: v.optional(v.number()),
    source: v.optional(v.string()),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_memberId", ["memberId"]),

  ingredientSubstitutions: defineTable({
    originalIngredientId: v.id("recipeIngredients"),
    substituteFoodId: v.id("foods"),
    substitutionType: vSubstitutionType,
    reason: v.optional(v.string()),
    nutritionDelta: v.optional(v.any()),
    costDelta: v.optional(v.float64()),
    tasteSimilarity: v.optional(v.float64()),
    conditions: v.array(v.string()),
    isValid: v.boolean(),
  })
    .index("by_originalIngredientId", ["originalIngredientId"])
    .index("by_substituteFoodId", ["substituteFoodId"]),

  userPreferences: defineTable({
    memberId: v.id("familyMembers"),
    spiceLevel: vSpiceLevel,
    sweetness: vSweetnessLevel,
    saltiness: vSaltinessLevel,
    preferredCuisines: v.array(v.string()),
    avoidedIngredients: v.array(v.string()),
    preferredIngredients: v.array(v.string()),
    maxCookTime: v.optional(v.number()),
    minServings: v.number(),
    maxServings: v.number(),
    costLevel: vCostLevel,
    maxEstimatedCost: v.optional(v.float64()),
    dietType: vDietaryType,
    isLowCarb: v.boolean(),
    isLowFat: v.boolean(),
    isHighProtein: v.boolean(),
    isVegetarian: v.boolean(),
    isVegan: v.boolean(),
    isGlutenFree: v.boolean(),
    isDairyFree: v.boolean(),
    enableRecommendations: v.boolean(),
    recommendationWeight: v.optional(v.any()),
    learnedPreferences: v.optional(v.any()),
    preferenceScore: v.float64(),
    lastAnalyzedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"]),

  // ==================== TASKS & ACTIVITIES ====================

  tasks: defineTable({
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    category: vTaskCategory,
    assigneeId: v.optional(v.id("familyMembers")),
    creatorId: v.id("familyMembers"),
    status: vTaskStatus,
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    priority: vTaskPriority,
    reminderSent: v.boolean(),
    remindedAt: v.optional(v.number()),
  })
    .index("by_familyId", ["familyId"])
    .index("by_assigneeId", ["assigneeId"])
    .index("by_status", ["status"]),

  activities: defineTable({
    familyId: v.id("families"),
    memberId: v.optional(v.id("familyMembers")),
    activityType: vActivityType,
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    isPublic: v.boolean(),
  })
    .index("by_familyId", ["familyId"])
    .index("by_memberId", ["memberId"]),

  comments: defineTable({
    targetType: vCommentTarget,
    targetId: v.string(),
    authorId: v.id("familyMembers"),
    content: v.string(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_targetId", ["targetId"])
    .index("by_authorId", ["authorId"]),

  familyGoals: defineTable({
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    category: vGoalCategory,
    targetValue: v.float64(),
    currentValue: v.float64(),
    unit: v.optional(v.string()),
    status: vGoalStatus,
    startDate: v.number(),
    targetDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    creatorId: v.id("familyMembers"),
    progress: v.float64(),
    rewardDescription: v.optional(v.string()),
    rewardAchieved: v.boolean(),
    participantIds: v.array(v.id("familyMembers")),
  })
    .index("by_familyId", ["familyId"])
    .index("by_status", ["status"]),

  // ==================== SOCIAL & SHARING ====================

  sharedContents: defineTable({
    memberId: v.id("familyMembers"),
    contentType: vShareContentType,
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    shareToken: v.string(),
    shareUrl: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
    sharedPlatforms: v.array(v.string()),
    privacyLevel: vSharePrivacyLevel,
    allowComment: v.boolean(),
    allowLike: v.boolean(),
    viewCount: v.number(),
    likeCount: v.number(),
    commentCount: v.number(),
    shareCount: v.number(),
    clickCount: v.number(),
    downloadCount: v.number(),
    conversionCount: v.number(),
    status: vShareStatus,
    expiresAt: v.optional(v.number()),
    communityPostId: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_shareToken", ["shareToken"])
    .index("by_status", ["status"]),

  shareTrackings: defineTable({
    shareToken: v.string(),
    eventType: vShareTrackingEventType,
    platform: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    referrer: v.optional(v.string()),
    metadata: v.optional(v.any()),
    occurredAt: v.number(),
  })
    .index("by_shareToken", ["shareToken"])
    .index("by_eventType", ["eventType"]),

  achievements: defineTable({
    memberId: v.id("familyMembers"),
    type: vAchievementType,
    title: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    rarity: vAchievementRarity,
    level: v.number(),
    points: v.number(),
    targetValue: v.optional(v.float64()),
    currentValue: v.optional(v.float64()),
    progress: v.float64(),
    isUnlocked: v.boolean(),
    unlockedAt: v.optional(v.number()),
    isShared: v.boolean(),
    sharedAt: v.optional(v.number()),
    rewardType: v.optional(v.string()),
    rewardValue: v.optional(v.string()),
    rewardClaimed: v.boolean(),
    metadata: v.optional(v.any()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_type", ["type"])
    .index("by_isUnlocked", ["isUnlocked"]),

  leaderboardEntries: defineTable({
    memberId: v.id("familyMembers"),
    leaderboardType: vLeaderboardType,
    period: vLeaderboardPeriod,
    periodStart: v.number(),
    periodEnd: v.number(),
    score: v.float64(),
    rank: v.number(),
    previousRank: v.optional(v.number()),
    rankChange: v.optional(v.number()),
    totalParticipants: v.number(),
    percentile: v.optional(v.float64()),
    isAnonymous: v.boolean(),
    showRank: v.boolean(),
    metadata: v.optional(v.any()),
    calculatedAt: v.number(),
  })
    .index("by_leaderboardType", ["leaderboardType"])
    .index("by_period", ["period"])
    .index("by_rank", ["rank"]),

  communityPosts: defineTable({
    memberId: v.id("familyMembers"),
    type: vCommunityPostType,
    title: v.string(),
    content: v.string(),
    images: v.array(v.string()),
    tags: v.array(v.string()),
    relatedContentType: v.optional(vShareContentType),
    relatedContentId: v.optional(v.string()),
    status: vCommunityPostStatus,
    isPinned: v.boolean(),
    isFeatured: v.boolean(),
    viewCount: v.number(),
    likeCount: v.number(),
    commentCount: v.number(),
    shareCount: v.number(),
    isModerated: v.boolean(),
    moderatedAt: v.optional(v.number()),
    moderatorId: v.optional(v.string()),
    moderationResult: v.optional(v.any()),
    reportCount: v.number(),
    isHidden: v.boolean(),
    publishedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  communityComments: defineTable({
    postId: v.id("communityPosts"),
    memberId: v.id("familyMembers"),
    content: v.string(),
    parentId: v.optional(v.id("communityComments")),
    isDeleted: v.boolean(),
    isHidden: v.boolean(),
    reportCount: v.number(),
    isModerated: v.boolean(),
    moderatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_postId", ["postId"])
    .index("by_memberId", ["memberId"])
    .index("by_parentId", ["parentId"]),

  // ==================== NOTIFICATIONS ====================

  notifications: defineTable({
    memberId: v.id("familyMembers"),
    type: vNotificationType,
    title: v.string(),
    content: v.string(),
    priority: vNotificationPriority,
    channels: v.array(v.string()),
    status: vNotificationStatus,
    sentAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    deliveryResults: v.optional(v.string()),
    retryCount: v.number(),
    maxRetries: v.number(),
    nextRetryAt: v.optional(v.number()),
    isDeduped: v.boolean(),
    dedupKey: v.optional(v.string()),
    batchId: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  notificationPreferences: defineTable({
    memberId: v.id("familyMembers"),
    enableNotifications: v.boolean(),
    globalQuietHoursStart: v.optional(v.number()),
    globalQuietHoursEnd: v.optional(v.number()),
    dailyMaxNotifications: v.number(),
    dailyMaxSMS: v.number(),
    dailyMaxEmail: v.number(),
    channelPreferences: v.string(),
    typeSettings: v.string(),
    wechatOpenId: v.optional(v.string()),
    wechatSubscribed: v.boolean(),
    pushToken: v.optional(v.string()),
    pushEnabled: v.boolean(),
    emailEnabled: v.boolean(),
    emailUnsubscribedAt: v.optional(v.number()),
    phoneEnabled: v.boolean(),
    phoneNumber: v.optional(v.string()),
    enableSmartScheduling: v.boolean(),
    enableDeduplication: v.boolean(),
  })
    .index("by_memberId", ["memberId"]),

  notificationTemplates: defineTable({
    type: vNotificationType,
    titleTemplate: v.string(),
    contentTemplate: v.string(),
    channelTemplates: v.string(),
    variables: v.array(v.string()),
    isActive: v.boolean(),
    version: v.string(),
    defaultChannels: v.array(v.string()),
    defaultPriority: vNotificationPriority,
    translations: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    usageCount: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_type", ["type"])
    .index("by_isActive", ["isActive"]),

  notificationLogs: defineTable({
    notificationId: v.id("notifications"),
    channel: vNotificationChannel,
    status: vNotificationStatus,
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorDetails: v.optional(v.any()),
    externalId: v.optional(v.string()),
    trackingData: v.optional(v.any()),
    cost: v.optional(v.float64()),
    currency: v.optional(v.string()),
    processingTime: v.optional(v.number()),
    retryCount: v.number(),
  })
    .index("by_notificationId", ["notificationId"])
    .index("by_channel", ["channel"])
    .index("by_status", ["status"]),

  // ==================== AI ====================

  aiAdvices: defineTable({
    memberId: v.id("familyMembers"),
    type: vAIAdviceType,
    content: v.any(),
    prompt: v.optional(v.string()),
    tokens: v.number(),
    feedback: v.optional(v.any()),
    generatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_type", ["type"]),

  aiConversations: defineTable({
    memberId: v.id("familyMembers"),
    title: v.optional(v.string()),
    messages: v.any(),
    status: vConversationStatus,
    tokens: v.number(),
    lastMessageAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_status", ["status"]),

  promptTemplates: defineTable({
    name: v.string(),
    type: vPromptType,
    template: v.string(),
    version: v.string(),
    parameters: v.optional(v.any()),
    isActive: v.boolean(),
  })
    .index("by_type", ["type"])
    .index("by_isActive", ["isActive"]),

  userConsents: defineTable({
    userId: v.string(),
    consentId: v.string(),
    granted: v.boolean(),
    context: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_consentId", ["consentId"]),

  // ==================== E-COMMERCE ====================

  platformAccounts: defineTable({
    userId: v.id("users"),
    platform: vEcommercePlatform,
    platformUserId: v.optional(v.string()),
    username: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    status: vPlatformAccountStatus,
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    syncError: v.optional(v.string()),
    defaultDeliveryAddress: v.optional(v.any()),
    preferences: v.optional(v.any()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_platform", ["platform"])
    .index("by_userId_platform", ["userId", "platform"]),

  orders: defineTable({
    userId: v.id("users"),
    accountId: v.id("platformAccounts"),
    platformOrderId: v.string(),
    platform: vEcommercePlatform,
    subtotal: v.float64(),
    shippingFee: v.float64(),
    discount: v.float64(),
    totalAmount: v.float64(),
    status: vOrderStatus,
    paymentStatus: v.optional(v.string()),
    deliveryStatus: v.optional(vDeliveryStatus),
    orderDate: v.number(),
    paymentDate: v.optional(v.number()),
    shipmentDate: v.optional(v.number()),
    deliveryDate: v.optional(v.number()),
    actualDeliveryDate: v.optional(v.number()),
    deliveryAddress: v.any(),
    trackingNumber: v.optional(v.string()),
    deliveryNotes: v.optional(v.string()),
    items: v.any(),
    orderSummary: v.optional(v.any()),
    platformResponse: v.optional(v.any()),
    syncError: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_accountId", ["accountId"])
    .index("by_platform", ["platform"])
    .index("by_platformOrderId", ["platformOrderId"])
    .index("by_status", ["status"]),

  platformProducts: defineTable({
    platform: vEcommercePlatform,
    platformProductId: v.string(),
    sku: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    specification: v.optional(v.any()),
    weight: v.optional(v.float64()),
    volume: v.optional(v.float64()),
    unit: v.optional(v.string()),
    price: v.float64(),
    originalPrice: v.optional(v.float64()),
    currency: v.string(),
    priceUnit: v.optional(v.string()),
    stock: v.number(),
    isInStock: v.boolean(),
    stockStatus: v.optional(v.string()),
    salesCount: v.optional(v.number()),
    rating: v.optional(v.float64()),
    reviewCount: v.optional(v.number()),
    deliveryOptions: v.optional(v.any()),
    deliveryTime: v.optional(v.any()),
    shippingFee: v.optional(v.float64()),
    matchedFoodId: v.optional(v.id("foods")),
    matchConfidence: v.optional(v.float64()),
    matchKeywords: v.optional(v.any()),
    cachedAt: v.number(),
    expiresAt: v.number(),
    isValid: v.boolean(),
    platformData: v.optional(v.any()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_platform", ["platform"])
    .index("by_matchedFoodId", ["matchedFoodId"])
    .index("by_platform_productId", ["platform", "platformProductId"]),

  // ==================== DEVICES ====================

  deviceConnections: defineTable({
    memberId: v.id("familyMembers"),
    deviceId: v.string(),
    deviceType: vDeviceType,
    deviceName: v.string(),
    manufacturer: v.string(),
    model: v.optional(v.string()),
    firmwareVersion: v.optional(v.string()),
    platform: vPlatformType,
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    syncStatus: vSyncStatus,
    syncInterval: v.number(),
    permissions: v.array(v.string()),
    dataTypes: v.array(v.string()),
    isActive: v.boolean(),
    isAutoSync: v.boolean(),
    connectionDate: v.number(),
    disconnectionDate: v.optional(v.number()),
    lastError: v.optional(v.string()),
    errorCount: v.number(),
    retryCount: v.number(),
  })
    .index("by_memberId", ["memberId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_deviceType", ["deviceType"])
    .index("by_isActive", ["isActive"]),
});
