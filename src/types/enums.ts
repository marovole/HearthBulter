/**
 * TypeScript enums and types that mirror Convex schema validators
 * These replace the @prisma/client enum imports for frontend use
 */

// Food Category enum and type
export const FoodCategory = {
  VEGETABLES: "VEGETABLES",
  FRUITS: "FRUITS",
  GRAINS: "GRAINS",
  PROTEIN: "PROTEIN",
  SEAFOOD: "SEAFOOD",
  DAIRY: "DAIRY",
  OILS: "OILS",
  SNACKS: "SNACKS",
  BEVERAGES: "BEVERAGES",
  OTHER: "OTHER",
} as const;
export type FoodCategory = (typeof FoodCategory)[keyof typeof FoodCategory];

// Budget Period enum and type
export const BudgetPeriod = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  YEARLY: "YEARLY",
  CUSTOM: "CUSTOM",
} as const;
export type BudgetPeriod = (typeof BudgetPeriod)[keyof typeof BudgetPeriod];

// Budget Status enum and type
export const BudgetStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus];

// User Role enum and type
export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Gender enum and type
export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

// Age Group enum and type
export const AgeGroup = {
  CHILD: "CHILD",
  TEENAGER: "TEENAGER",
  ADULT: "ADULT",
  ELDERLY: "ELDERLY",
} as const;
export type AgeGroup = (typeof AgeGroup)[keyof typeof AgeGroup];

// Family Member Role enum and type
export const FamilyMemberRole = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  GUEST: "GUEST",
} as const;
export type FamilyMemberRole =
  (typeof FamilyMemberRole)[keyof typeof FamilyMemberRole];

// Goal Type enum and type
export const GoalType = {
  LOSE_WEIGHT: "LOSE_WEIGHT",
  GAIN_MUSCLE: "GAIN_MUSCLE",
  MAINTAIN: "MAINTAIN",
  IMPROVE_HEALTH: "IMPROVE_HEALTH",
} as const;
export type GoalType = (typeof GoalType)[keyof typeof GoalType];

// Goal Status enum and type
export const GoalStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

// Allergen Type enum and type
export const AllergenType = {
  FOOD: "FOOD",
  ENVIRONMENTAL: "ENVIRONMENTAL",
  MEDICATION: "MEDICATION",
  OTHER: "OTHER",
} as const;
export type AllergenType = (typeof AllergenType)[keyof typeof AllergenType];

// Allergy Severity enum and type
export const AllergySeverity = {
  MILD: "MILD",
  MODERATE: "MODERATE",
  SEVERE: "SEVERE",
  LIFE_THREATENING: "LIFE_THREATENING",
} as const;
export type AllergySeverity =
  (typeof AllergySeverity)[keyof typeof AllergySeverity];

// Dietary Type enum and type
export const DietaryType = {
  OMNIVORE: "OMNIVORE",
  VEGETARIAN: "VEGETARIAN",
  VEGAN: "VEGAN",
  PESCETARIAN: "PESCETARIAN",
  KETO: "KETO",
  PALEO: "PALEO",
  MEDITERRANEAN: "MEDITERRANEAN",
  LOW_FODMAP: "LOW_FODMAP",
  CUSTOM: "CUSTOM",
} as const;
export type DietaryType = (typeof DietaryType)[keyof typeof DietaryType];

// Invitation Status enum and type
export const InvitationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type InvitationStatus =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];

// Data Source enum and type
export const DataSource = {
  USDA: "USDA",
  LOCAL: "LOCAL",
  USER_SUBMITTED: "USER_SUBMITTED",
} as const;
export type DataSource = (typeof DataSource)[keyof typeof DataSource];

// Health Data Source enum and type
export const HealthDataSource = {
  MANUAL: "MANUAL",
  WEARABLE: "WEARABLE",
  MEDICAL_REPORT: "MEDICAL_REPORT",
  APPLE_HEALTHKIT: "APPLE_HEALTHKIT",
  HUAWEI_HEALTH: "HUAWEI_HEALTH",
  GOOGLE_FIT: "GOOGLE_FIT",
  XIAOMI_HEALTH: "XIAOMI_HEALTH",
  SAMSUNG_HEALTH: "SAMSUNG_HEALTH",
  GARMIN_CONNECT: "GARMIN_CONNECT",
  FITBIT: "FITBIT",
} as const;
export type HealthDataSource =
  (typeof HealthDataSource)[keyof typeof HealthDataSource];

// Reminder Type enum and type
export const ReminderType = {
  WEIGHT: "WEIGHT",
  BLOOD_PRESSURE: "BLOOD_PRESSURE",
  HEART_RATE: "HEART_RATE",
  GENERAL: "GENERAL",
} as const;
export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];

// Meal Type enum and type
export const MealType = {
  BREAKFAST: "BREAKFAST",
  LUNCH: "LUNCH",
  DINNER: "DINNER",
  SNACK: "SNACK",
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

// Plan Status enum and type
export const PlanStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type PlanStatus = (typeof PlanStatus)[keyof typeof PlanStatus];

// OCR Status enum and type
export const OcrStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type OcrStatus = (typeof OcrStatus)[keyof typeof OcrStatus];

// Indicator Type enum and type
export const IndicatorType = {
  TOTAL_CHOLESTEROL: "TOTAL_CHOLESTEROL",
  LDL_CHOLESTEROL: "LDL_CHOLESTEROL",
  HDL_CHOLESTEROL: "HDL_CHOLESTEROL",
  TRIGLYCERIDES: "TRIGLYCERIDES",
  FASTING_GLUCOSE: "FASTING_GLUCOSE",
  POSTPRANDIAL_GLUCOSE: "POSTPRANDIAL_GLUCOSE",
  GLYCATED_HEMOGLOBIN: "GLYCATED_HEMOGLOBIN",
  ALT: "ALT",
  AST: "AST",
  TOTAL_BILIRUBIN: "TOTAL_BILIRUBIN",
  DIRECT_BILIRUBIN: "DIRECT_BILIRUBIN",
  ALP: "ALP",
  CREATININE: "CREATININE",
  UREA_NITROGEN: "UREA_NITROGEN",
  URIC_ACID: "URIC_ACID",
  WHITE_BLOOD_CELL: "WHITE_BLOOD_CELL",
  RED_BLOOD_CELL: "RED_BLOOD_CELL",
  HEMOGLOBIN: "HEMOGLOBIN",
  PLATELET: "PLATELET",
  OTHER: "OTHER",
} as const;
export type IndicatorType = (typeof IndicatorType)[keyof typeof IndicatorType];

// Indicator Status enum and type
export const IndicatorStatus = {
  NORMAL: "NORMAL",
  LOW: "LOW",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type IndicatorStatus =
  (typeof IndicatorStatus)[keyof typeof IndicatorStatus];

// List Status enum and type
export const ListStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
export type ListStatus = (typeof ListStatus)[keyof typeof ListStatus];

// Recognition Status enum and type
export const RecognitionStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type RecognitionStatus =
  (typeof RecognitionStatus)[keyof typeof RecognitionStatus];

// Report Type enum and type
export const ReportType = {
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  CUSTOM: "CUSTOM",
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];

// Report Status enum and type
export const ReportStatus = {
  GENERATING: "GENERATING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

// Score Grade enum and type
export const ScoreGrade = {
  EXCELLENT: "EXCELLENT",
  GOOD: "GOOD",
  FAIR: "FAIR",
  POOR: "POOR",
} as const;
export type ScoreGrade = (typeof ScoreGrade)[keyof typeof ScoreGrade];

// Spice Level enum and type
export const SpiceLevel = {
  NONE: "NONE",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  EXTREME: "EXTREME",
} as const;
export type SpiceLevel = (typeof SpiceLevel)[keyof typeof SpiceLevel];

// Sweetness Level enum and type
export const SweetnessLevel = {
  NONE: "NONE",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  EXTREME: "EXTREME",
} as const;
export type SweetnessLevel =
  (typeof SweetnessLevel)[keyof typeof SweetnessLevel];

// Saltiness Level enum and type
export const SaltinessLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  EXTREME: "EXTREME",
} as const;
export type SaltinessLevel =
  (typeof SaltinessLevel)[keyof typeof SaltinessLevel];

// Trend Data Type enum and type
export const TrendDataType = {
  WEIGHT: "WEIGHT",
  BODY_FAT: "BODY_FAT",
  MUSCLE_MASS: "MUSCLE_MASS",
  BLOOD_PRESSURE: "BLOOD_PRESSURE",
  HEART_RATE: "HEART_RATE",
  CALORIES: "CALORIES",
  PROTEIN: "PROTEIN",
  CARBS: "CARBS",
  FAT: "FAT",
  EXERCISE: "EXERCISE",
  SLEEP: "SLEEP",
  WATER: "WATER",
  HEALTH_SCORE: "HEALTH_SCORE",
} as const;
export type TrendDataType = (typeof TrendDataType)[keyof typeof TrendDataType];

// Anomaly Type enum and type
export const AnomalyType = {
  SUDDEN_CHANGE: "SUDDEN_CHANGE",
  NUTRITION_IMBALANCE: "NUTRITION_IMBALANCE",
  GOAL_DEVIATION: "GOAL_DEVIATION",
  THRESHOLD_EXCEEDED: "THRESHOLD_EXCEEDED",
  MISSING_DATA: "MISSING_DATA",
} as const;
export type AnomalyType = (typeof AnomalyType)[keyof typeof AnomalyType];

// Anomaly Severity enum and type
export const AnomalySeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type AnomalySeverity =
  (typeof AnomalySeverity)[keyof typeof AnomalySeverity];

// Anomaly Status enum and type
export const AnomalyStatus = {
  PENDING: "PENDING",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
  IGNORED: "IGNORED",
} as const;
export type AnomalyStatus = (typeof AnomalyStatus)[keyof typeof AnomalyStatus];

// AI Advice Type enum and type
export const AIAdviceType = {
  HEALTH_ANALYSIS: "HEALTH_ANALYSIS",
  RECIPE_OPTIMIZATION: "RECIPE_OPTIMIZATION",
  CONSULTATION: "CONSULTATION",
  REPORT_GENERATION: "REPORT_GENERATION",
} as const;
export type AIAdviceType = (typeof AIAdviceType)[keyof typeof AIAdviceType];

// Conversation Status enum and type
export const ConversationStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

// Prompt Type enum and type
export const PromptType = {
  HEALTH_ANALYSIS: "HEALTH_ANALYSIS",
  RECIPE_OPTIMIZATION: "RECIPE_OPTIMIZATION",
  CONSULTATION: "CONSULTATION",
  REPORT_GENERATION: "REPORT_GENERATION",
} as const;
export type PromptType = (typeof PromptType)[keyof typeof PromptType];

// Price Source enum and type
export const PriceSource = {
  MANUAL: "MANUAL",
  CRAWLER: "CRAWLER",
  API: "API",
  USER_REPORT: "USER_REPORT",
} as const;
export type PriceSource = (typeof PriceSource)[keyof typeof PriceSource];

// Savings Type enum and type
export const SavingsType = {
  PROMOTION: "PROMOTION",
  GROUP_BUY: "GROUP_BUY",
  SEASONAL: "SEASONAL",
  BULK_PURCHASE: "BULK_PURCHASE",
  PLATFORM_SWITCH: "PLATFORM_SWITCH",
  SUBSTITUTE: "SUBSTITUTE",
} as const;
export type SavingsType = (typeof SavingsType)[keyof typeof SavingsType];

// Recommendation Status enum and type
export const RecommendationStatus = {
  PENDING: "PENDING",
  VIEWED: "VIEWED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type RecommendationStatus =
  (typeof RecommendationStatus)[keyof typeof RecommendationStatus];

// Alert Type enum and type
export const AlertType = {
  WARNING_80: "WARNING_80",
  WARNING_100: "WARNING_100",
  OVER_BUDGET_110: "OVER_BUDGET_110",
  CATEGORY_OVER: "CATEGORY_OVER",
  DAILY_EXCESS: "DAILY_EXCESS",
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

// Alert Status enum and type
export const AlertStatus = {
  ACTIVE: "ACTIVE",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
  DISMISSED: "DISMISSED",
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

// E-commerce Platform enum and type
export const EcommercePlatform = {
  SAMS_CLUB: "SAMS_CLUB",
  HEMA: "HEMA",
  DINGDONG: "DINGDONG",
} as const;
export type EcommercePlatform =
  (typeof EcommercePlatform)[keyof typeof EcommercePlatform];

// Platform Account Status enum and type
export const PlatformAccountStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  EXPIRED: "EXPIRED",
  ERROR: "ERROR",
} as const;
export type PlatformAccountStatus =
  (typeof PlatformAccountStatus)[keyof typeof PlatformAccountStatus];

// Order Status enum and type
export const OrderStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Delivery Status enum and type
export const DeliveryStatus = {
  PREPARING: "PREPARING",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
} as const;
export type DeliveryStatus =
  (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

// Difficulty enum and type
export const Difficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

// Recipe Category enum and type
export const RecipeCategory = {
  MAIN_DISH: "MAIN_DISH",
  SIDE_DISH: "SIDE_DISH",
  SOUP: "SOUP",
  SALAD: "SALAD",
  DESSERT: "DESSERT",
  SNACK: "SNACK",
  BREAKFAST: "BREAKFAST",
  BEVERAGE: "BEVERAGE",
  SAUCE: "SAUCE",
  OTHER: "OTHER",
} as const;
export type RecipeCategory =
  (typeof RecipeCategory)[keyof typeof RecipeCategory];

// Recipe Status enum and type
export const RecipeStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
} as const;
export type RecipeStatus = (typeof RecipeStatus)[keyof typeof RecipeStatus];

// Cost Level enum and type
export const CostLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type CostLevel = (typeof CostLevel)[keyof typeof CostLevel];

// Substitution Type enum and type
export const SubstitutionType = {
  ALLERGY: "ALLERGY",
  STOCK_OUT: "STOCK_OUT",
  BUDGET: "BUDGET",
  PREFERENCE: "PREFERENCE",
  NUTRITION: "NUTRITION",
  SEASONAL: "SEASONAL",
} as const;
export type SubstitutionType =
  (typeof SubstitutionType)[keyof typeof SubstitutionType];

// Task Category enum and type
export const TaskCategory = {
  SHOPPING: "SHOPPING",
  COOKING: "COOKING",
  CLEANING: "CLEANING",
  HEALTH: "HEALTH",
  EXERCISE: "EXERCISE",
  OTHER: "OTHER",
} as const;
export type TaskCategory = (typeof TaskCategory)[keyof typeof TaskCategory];

// Task Status enum and type
export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// Task Priority enum and type
export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

// Activity Type enum and type
export const ActivityType = {
  MEAL_LOG_ADDED: "MEAL_LOG_ADDED",
  RECIPE_ADDED: "RECIPE_ADDED",
  TASK_CREATED: "TASK_CREATED",
  TASK_COMPLETED: "TASK_COMPLETED",
  SHOPPING_UPDATED: "SHOPPING_UPDATED",
  GOAL_ACHIEVED: "GOAL_ACHIEVED",
  CHECK_IN: "CHECK_IN",
  HEALTH_DATA: "HEALTH_DATA",
  OTHER: "OTHER",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

// Comment Target enum and type
export const CommentTarget = {
  TASK: "TASK",
  ACTIVITY: "ACTIVITY",
} as const;
export type CommentTarget = (typeof CommentTarget)[keyof typeof CommentTarget];

// Goal Category enum and type
export const GoalCategory = {
  WEIGHT_LOSS: "WEIGHT_LOSS",
  EXERCISE: "EXERCISE",
  NUTRITION: "NUTRITION",
  SAVINGS: "SAVINGS",
  CHECK_IN_STREAK: "CHECK_IN_STREAK",
  OTHER: "OTHER",
} as const;
export type GoalCategory = (typeof GoalCategory)[keyof typeof GoalCategory];

// Share Content Type enum and type
export const ShareContentType = {
  HEALTH_REPORT: "HEALTH_REPORT",
  GOAL_ACHIEVEMENT: "GOAL_ACHIEVEMENT",
  MEAL_LOG: "MEAL_LOG",
  RECIPE: "RECIPE",
  ACHIEVEMENT: "ACHIEVEMENT",
  CHECK_IN_STREAK: "CHECK_IN_STREAK",
  WEIGHT_MILESTONE: "WEIGHT_MILESTONE",
  WEEKLY_SUMMARY: "WEEKLY_SUMMARY",
  MONTHLY_REPORT: "MONTHLY_REPORT",
} as const;
export type ShareContentType =
  (typeof ShareContentType)[keyof typeof ShareContentType];

// Share Status enum and type
export const ShareStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  DELETED: "DELETED",
} as const;
export type ShareStatus = (typeof ShareStatus)[keyof typeof ShareStatus];

// Share Privacy Level enum and type
export const SharePrivacyLevel = {
  PUBLIC: "PUBLIC",
  FRIENDS: "FRIENDS",
  PRIVATE: "PRIVATE",
} as const;
export type SharePrivacyLevel =
  (typeof SharePrivacyLevel)[keyof typeof SharePrivacyLevel];

// Share Tracking Event Type enum and type
export const ShareTrackingEventType = {
  VIEW: "VIEW",
  CLICK: "CLICK",
  SHARE: "SHARE",
  CONVERSION: "CONVERSION",
  DOWNLOAD: "DOWNLOAD",
} as const;
export type ShareTrackingEventType =
  (typeof ShareTrackingEventType)[keyof typeof ShareTrackingEventType];

// Achievement Type enum and type
export const AchievementType = {
  CHECK_IN_STREAK: "CHECK_IN_STREAK",
  WEIGHT_LOSS: "WEIGHT_LOSS",
  NUTRITION_GOAL: "NUTRITION_GOAL",
  EXERCISE_TARGET: "EXERCISE_TARGET",
  HEALTH_MILESTONE: "HEALTH_MILESTONE",
  COMMUNITY_CONTRIBUTION: "COMMUNITY_CONTRIBUTION",
} as const;
export type AchievementType =
  (typeof AchievementType)[keyof typeof AchievementType];

// Achievement Rarity enum and type
export const AchievementRarity = {
  BRONZE: "BRONZE",
  SILVER: "SILVER",
  GOLD: "GOLD",
  PLATINUM: "PLATINUM",
  DIAMOND: "DIAMOND",
} as const;
export type AchievementRarity =
  (typeof AchievementRarity)[keyof typeof AchievementRarity];

// Leaderboard Type enum and type
export const LeaderboardType = {
  HEALTH_SCORE: "HEALTH_SCORE",
  CHECK_IN_STREAK: "CHECK_IN_STREAK",
  WEIGHT_LOSS: "WEIGHT_LOSS",
  EXERCISE_MINUTES: "EXERCISE_MINUTES",
  NUTRITION_SCORE: "NUTRITION_SCORE",
} as const;
export type LeaderboardType =
  (typeof LeaderboardType)[keyof typeof LeaderboardType];

// Leaderboard Period enum and type
export const LeaderboardPeriod = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
  ALL_TIME: "ALL_TIME",
} as const;
export type LeaderboardPeriod =
  (typeof LeaderboardPeriod)[keyof typeof LeaderboardPeriod];

// Community Post Status enum and type
export const CommunityPostStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  HIDDEN: "HIDDEN",
  DELETED: "DELETED",
} as const;
export type CommunityPostStatus =
  (typeof CommunityPostStatus)[keyof typeof CommunityPostStatus];

// Community Post Type enum and type
export const CommunityPostType = {
  EXPERIENCE: "EXPERIENCE",
  RECIPE_SHOW: "RECIPE_SHOW",
  ACHIEVEMENT: "ACHIEVEMENT",
  QUESTION: "QUESTION",
  DISCUSSION: "DISCUSSION",
} as const;
export type CommunityPostType =
  (typeof CommunityPostType)[keyof typeof CommunityPostType];

// Notification Type enum and type
export const NotificationType = {
  CHECK_IN_REMINDER: "CHECK_IN_REMINDER",
  TASK_NOTIFICATION: "TASK_NOTIFICATION",
  EXPIRY_ALERT: "EXPIRY_ALERT",
  BUDGET_WARNING: "BUDGET_WARNING",
  HEALTH_ALERT: "HEALTH_ALERT",
  GOAL_ACHIEVEMENT: "GOAL_ACHIEVEMENT",
  FAMILY_ACTIVITY: "FAMILY_ACTIVITY",
  SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
  MARKETING: "MARKETING",
  OTHER: "OTHER",
} as const;
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

// Notification Channel enum and type
export const NotificationChannel = {
  IN_APP: "IN_APP",
  EMAIL: "EMAIL",
  SMS: "SMS",
  WECHAT: "WECHAT",
  PUSH: "PUSH",
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

// Notification Priority enum and type
export const NotificationPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type NotificationPriority =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

// Notification Status enum and type
export const NotificationStatus = {
  PENDING: "PENDING",
  SENDING: "SENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

// Storage Location enum and type
export const StorageLocation = {
  REFRIGERATOR: "REFRIGERATOR",
  FREEZER: "FREEZER",
  PANTRY: "PANTRY",
  COUNTER: "COUNTER",
  CABINET: "CABINET",
  OTHER: "OTHER",
} as const;
export type StorageLocation =
  (typeof StorageLocation)[keyof typeof StorageLocation];

// Inventory Status enum and type
export const InventoryStatus = {
  FRESH: "FRESH",
  EXPIRING: "EXPIRING",
  EXPIRED: "EXPIRED",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;
export type InventoryStatus =
  (typeof InventoryStatus)[keyof typeof InventoryStatus];

// Waste Reason enum and type
export const WasteReason = {
  EXPIRED: "EXPIRED",
  SPOILED: "SPOILED",
  OVERSTOCK: "OVERSTOCK",
  PREFERENCE: "PREFERENCE",
  OTHER: "OTHER",
} as const;
export type WasteReason = (typeof WasteReason)[keyof typeof WasteReason];

// Device Type enum and type
export const DeviceType = {
  SMARTWATCH: "SMARTWATCH",
  FITNESS_BAND: "FITNESS_BAND",
  SMART_SCALE: "SMART_SCALE",
  BLOOD_PRESSURE_MONITOR: "BLOOD_PRESSURE_MONITOR",
  GLUCOSE_METER: "GLUCOSE_METER",
  SMART_RING: "SMART_RING",
  OTHER: "OTHER",
} as const;
export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

// Platform Type enum and type
export const PlatformType = {
  APPLE_HEALTHKIT: "APPLE_HEALTHKIT",
  HUAWEI_HEALTH: "HUAWEI_HEALTH",
  GOOGLE_FIT: "GOOGLE_FIT",
  XIAOMI_HEALTH: "XIAOMI_HEALTH",
  SAMSUNG_HEALTH: "SAMSUNG_HEALTH",
  GARMIN_CONNECT: "GARMIN_CONNECT",
  FITBIT: "FITBIT",
  OTHER_PLATFORM: "OTHER_PLATFORM",
} as const;
export type PlatformType = (typeof PlatformType)[keyof typeof PlatformType];

// Sync Status enum and type
export const SyncStatus = {
  PENDING: "PENDING",
  SYNCING: "SYNCING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  DISABLED: "DISABLED",
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];
