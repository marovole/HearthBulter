/**
 * 本地枚举类型定义
 * 从 Prisma schema 提取，替代 @prisma/client 导入
 * 用于 Neon 数据库迁移后保持类型兼容
 */

// ========== 用户和认证 ==========

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum AgeGroup {
  CHILD = "CHILD",
  TEENAGER = "TEENAGER",
  ADULT = "ADULT",
  ELDERLY = "ELDERLY",
}

export enum FamilyMemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  GUEST = "GUEST",
}

// ========== 健康目标 ==========

export enum GoalType {
  LOSE_WEIGHT = "LOSE_WEIGHT",
  GAIN_MUSCLE = "GAIN_MUSCLE",
  MAINTAIN = "MAINTAIN",
  IMPROVE_HEALTH = "IMPROVE_HEALTH",
}

export enum GoalStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  PAUSED = "PAUSED",
  CANCELLED = "CANCELLED",
}

export enum GoalCategory {
  WEIGHT_LOSS = "WEIGHT_LOSS",
  EXERCISE = "EXERCISE",
  NUTRITION = "NUTRITION",
  SAVINGS = "SAVINGS",
  CHECK_IN_STREAK = "CHECK_IN_STREAK",
  OTHER = "OTHER",
}

// ========== 过敏和饮食 ==========

export enum AllergenType {
  FOOD = "FOOD",
  ENVIRONMENTAL = "ENVIRONMENTAL",
  MEDICATION = "MEDICATION",
  OTHER = "OTHER",
}

export enum AllergySeverity {
  MILD = "MILD",
  MODERATE = "MODERATE",
  SEVERE = "SEVERE",
  LIFE_THREATENING = "LIFE_THREATENING",
}

export enum DietaryType {
  OMNIVORE = "OMNIVORE",
  VEGETARIAN = "VEGETARIAN",
  VEGAN = "VEGAN",
  PESCETARIAN = "PESCETARIAN",
  KETO = "KETO",
  PALEO = "PALEO",
  MEDITERRANEAN = "MEDITERRANEAN",
  LOW_FODMAP = "LOW_FODMAP",
  CUSTOM = "CUSTOM",
}

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

// ========== 食物和营养 ==========

export enum FoodCategory {
  VEGETABLES = "VEGETABLES",
  FRUITS = "FRUITS",
  GRAINS = "GRAINS",
  PROTEIN = "PROTEIN",
  SEAFOOD = "SEAFOOD",
  DAIRY = "DAIRY",
  OILS = "OILS",
  SNACKS = "SNACKS",
  BEVERAGES = "BEVERAGES",
  OTHER = "OTHER",
}

export enum DataSource {
  USDA = "USDA",
  LOCAL = "LOCAL",
  USER_SUBMITTED = "USER_SUBMITTED",
}

export enum HealthDataSource {
  MANUAL = "MANUAL",
  WEARABLE = "WEARABLE",
  MEDICAL_REPORT = "MEDICAL_REPORT",
  APPLE_HEALTHKIT = "APPLE_HEALTHKIT",
  HUAWEI_HEALTH = "HUAWEI_HEALTH",
  GOOGLE_FIT = "GOOGLE_FIT",
  XIAOMI_HEALTH = "XIAOMI_HEALTH",
  SAMSUNG_HEALTH = "SAMSUNG_HEALTH",
  GARMIN_CONNECT = "GARMIN_CONNECT",
  FITBIT = "FITBIT",
}

export enum ReminderType {
  WEIGHT = "WEIGHT",
  BLOOD_PRESSURE = "BLOOD_PRESSURE",
  HEART_RATE = "HEART_RATE",
  GENERAL = "GENERAL",
}

export enum MealType {
  BREAKFAST = "BREAKFAST",
  LUNCH = "LUNCH",
  DINNER = "DINNER",
  SNACK = "SNACK",
}

export enum PlanStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// ========== OCR 和识别 ==========

export enum OcrStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum RecognitionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// ========== 医疗指标 ==========

export enum IndicatorType {
  TOTAL_CHOLESTEROL = "TOTAL_CHOLESTEROL",
  LDL_CHOLESTEROL = "LDL_CHOLESTEROL",
  HDL_CHOLESTEROL = "HDL_CHOLESTEROL",
  TRIGLYCERIDES = "TRIGLYCERIDES",
  FASTING_GLUCOSE = "FASTING_GLUCOSE",
  POSTPRANDIAL_GLUCOSE = "POSTPRANDIAL_GLUCOSE",
  GLYCATED_HEMOGLOBIN = "GLYCATED_HEMOGLOBIN",
  ALT = "ALT",
  AST = "AST",
  TOTAL_BILIRUBIN = "TOTAL_BILIRUBIN",
  DIRECT_BILIRUBIN = "DIRECT_BILIRUBIN",
  ALP = "ALP",
  CREATININE = "CREATININE",
  UREA_NITROGEN = "UREA_NITROGEN",
  URIC_ACID = "URIC_ACID",
  WHITE_BLOOD_CELL = "WHITE_BLOOD_CELL",
  RED_BLOOD_CELL = "RED_BLOOD_CELL",
  HEMOGLOBIN = "HEMOGLOBIN",
  PLATELET = "PLATELET",
  OTHER = "OTHER",
}

export enum IndicatorStatus {
  NORMAL = "NORMAL",
  LOW = "LOW",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// ========== 清单状态 ==========

export enum ListStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

// ========== 报告 ==========

export enum ReportType {
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  CUSTOM = "CUSTOM",
}

export enum ReportStatus {
  GENERATING = "GENERATING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// ========== 健康评分 ==========

export enum ScoreGrade {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

// ========== 口味偏好 ==========

export enum SpiceLevel {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  EXTREME = "EXTREME",
}

export enum SweetnessLevel {
  NONE = "NONE",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  EXTREME = "EXTREME",
}

export enum SaltinessLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  EXTREME = "EXTREME",
}

// ========== 趋势和异常 ==========

export enum TrendDataType {
  WEIGHT = "WEIGHT",
  BODY_FAT = "BODY_FAT",
  MUSCLE_MASS = "MUSCLE_MASS",
  BLOOD_PRESSURE = "BLOOD_PRESSURE",
  HEART_RATE = "HEART_RATE",
  CALORIES = "CALORIES",
  PROTEIN = "PROTEIN",
  CARBS = "CARBS",
  FAT = "FAT",
  EXERCISE = "EXERCISE",
  SLEEP = "SLEEP",
  WATER = "WATER",
  HEALTH_SCORE = "HEALTH_SCORE",
}

export enum AnomalyType {
  SUDDEN_CHANGE = "SUDDEN_CHANGE",
  NUTRITION_IMBALANCE = "NUTRITION_IMBALANCE",
  GOAL_DEVIATION = "GOAL_DEVIATION",
  THRESHOLD_EXCEEDED = "THRESHOLD_EXCEEDED",
  MISSING_DATA = "MISSING_DATA",
}

export enum AnomalySeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum AnomalyStatus {
  PENDING = "PENDING",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
  IGNORED = "IGNORED",
}

// ========== AI 服务 ==========

export enum AIAdviceType {
  HEALTH_ANALYSIS = "HEALTH_ANALYSIS",
  RECIPE_OPTIMIZATION = "RECIPE_OPTIMIZATION",
  CONSULTATION = "CONSULTATION",
  REPORT_GENERATION = "REPORT_GENERATION",
}

export enum ConversationStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum PromptType {
  HEALTH_ANALYSIS = "HEALTH_ANALYSIS",
  RECIPE_OPTIMIZATION = "RECIPE_OPTIMIZATION",
  CONSULTATION = "CONSULTATION",
  REPORT_GENERATION = "REPORT_GENERATION",
}

export enum ConsentType {
  AI_HEALTH_ANALYSIS = "AI_HEALTH_ANALYSIS",
  MEDICAL_DATA_PROCESSING = "MEDICAL_DATA_PROCESSING",
  HEALTH_DATA_SHARING = "HEALTH_DATA_SHARING",
  HEALTH_RESEARCH_PARTICIPATION = "HEALTH_RESEARCH_PARTICIPATION",
}

// ========== 预算管理 ==========

export enum BudgetPeriod {
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
  CUSTOM = "CUSTOM",
}

export enum BudgetStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum PriceSource {
  MANUAL = "MANUAL",
  CRAWLER = "CRAWLER",
  API = "API",
  USER_REPORT = "USER_REPORT",
}

export enum SavingsType {
  PROMOTION = "PROMOTION",
  GROUP_BUY = "GROUP_BUY",
  SEASONAL = "SEASONAL",
  BULK_PURCHASE = "BULK_PURCHASE",
  PLATFORM_SWITCH = "PLATFORM_SWITCH",
  SUBSTITUTE = "SUBSTITUTE",
}

export enum RecommendationStatus {
  PENDING = "PENDING",
  VIEWED = "VIEWED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum AlertType {
  WARNING_80 = "WARNING_80",
  WARNING_100 = "WARNING_100",
  OVER_BUDGET_110 = "OVER_BUDGET_110",
  CATEGORY_OVER = "CATEGORY_OVER",
  DAILY_EXCESS = "DAILY_EXCESS",
}

export enum AlertStatus {
  ACTIVE = "ACTIVE",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

// ========== 电商平台 ==========

export enum EcommercePlatform {
  SAMS_CLUB = "SAMS_CLUB",
  HEMA = "HEMA",
  DINGDONG = "DINGDONG",
  INSTACART = "INSTACART",
}

export enum PlatformAccountStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
  ERROR = "ERROR",
}

export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum DeliveryStatus {
  PREPARING = "PREPARING",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
}

// ========== 食谱 ==========

export enum Difficulty {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

export enum RecipeCategory {
  MAIN_DISH = "MAIN_DISH",
  SIDE_DISH = "SIDE_DISH",
  SOUP = "SOUP",
  SALAD = "SALAD",
  DESSERT = "DESSERT",
  SNACK = "SNACK",
  BREAKFAST = "BREAKFAST",
  BEVERAGE = "BEVERAGE",
  SAUCE = "SAUCE",
  OTHER = "OTHER",
}

export enum RecipeStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

export enum CostLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum SubstitutionType {
  ALLERGY = "ALLERGY",
  STOCK_OUT = "STOCK_OUT",
  BUDGET = "BUDGET",
  PREFERENCE = "PREFERENCE",
  NUTRITION = "NUTRITION",
  SEASONAL = "SEASONAL",
}

// ========== 任务管理 ==========

export enum TaskCategory {
  SHOPPING = "SHOPPING",
  COOKING = "COOKING",
  CLEANING = "CLEANING",
  HEALTH = "HEALTH",
  EXERCISE = "EXERCISE",
  OTHER = "OTHER",
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum ActivityType {
  MEAL_LOG_ADDED = "MEAL_LOG_ADDED",
  RECIPE_ADDED = "RECIPE_ADDED",
  TASK_CREATED = "TASK_CREATED",
  TASK_COMPLETED = "TASK_COMPLETED",
  SHOPPING_UPDATED = "SHOPPING_UPDATED",
  GOAL_ACHIEVED = "GOAL_ACHIEVED",
  CHECK_IN = "CHECK_IN",
  HEALTH_DATA = "HEALTH_DATA",
  OTHER = "OTHER",
}

export enum CommentTarget {
  TASK = "TASK",
  ACTIVITY = "ACTIVITY",
}

// ========== 分享和社交 ==========

export enum ShareContentType {
  HEALTH_REPORT = "HEALTH_REPORT",
  GOAL_ACHIEVEMENT = "GOAL_ACHIEVEMENT",
  MEAL_LOG = "MEAL_LOG",
  RECIPE = "RECIPE",
  ACHIEVEMENT = "ACHIEVEMENT",
  CHECK_IN_STREAK = "CHECK_IN_STREAK",
  WEIGHT_MILESTONE = "WEIGHT_MILESTONE",
  WEEKLY_SUMMARY = "WEEKLY_SUMMARY",
  MONTHLY_REPORT = "MONTHLY_REPORT",
}

export enum SharePlatform {
  WECHAT = "WECHAT",
  WECHAT_MOMENTS = "WECHAT_MOMENTS",
  WEIBO = "WEIBO",
  LINK = "LINK",
  COMMUNITY = "COMMUNITY",
}

export enum ShareStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  DELETED = "DELETED",
}

export enum SharePrivacyLevel {
  PUBLIC = "PUBLIC",
  FRIENDS = "FRIENDS",
  PRIVATE = "PRIVATE",
}

export enum ShareTrackingEventType {
  VIEW = "VIEW",
  CLICK = "CLICK",
  SHARE = "SHARE",
  CONVERSION = "CONVERSION",
  DOWNLOAD = "DOWNLOAD",
}

// ========== 成就系统 ==========

export enum AchievementType {
  CHECK_IN_STREAK = "CHECK_IN_STREAK",
  WEIGHT_LOSS = "WEIGHT_LOSS",
  NUTRITION_GOAL = "NUTRITION_GOAL",
  EXERCISE_TARGET = "EXERCISE_TARGET",
  HEALTH_MILESTONE = "HEALTH_MILESTONE",
  COMMUNITY_CONTRIBUTION = "COMMUNITY_CONTRIBUTION",
}

export enum AchievementRarity {
  BRONZE = "BRONZE",
  SILVER = "SILVER",
  GOLD = "GOLD",
  PLATINUM = "PLATINUM",
  DIAMOND = "DIAMOND",
}

// ========== 排行榜 ==========

export enum LeaderboardType {
  HEALTH_SCORE = "HEALTH_SCORE",
  CHECK_IN_STREAK = "CHECK_IN_STREAK",
  WEIGHT_LOSS = "WEIGHT_LOSS",
  EXERCISE_MINUTES = "EXERCISE_MINUTES",
  NUTRITION_SCORE = "NUTRITION_SCORE",
}

export enum LeaderboardPeriod {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
  ALL_TIME = "ALL_TIME",
}

// ========== 社区帖子 ==========

export enum CommunityPostStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  HIDDEN = "HIDDEN",
  DELETED = "DELETED",
}

export enum CommunityPostType {
  EXPERIENCE = "EXPERIENCE",
  RECIPE_SHOW = "RECIPE_SHOW",
  ACHIEVEMENT = "ACHIEVEMENT",
  QUESTION = "QUESTION",
  DISCUSSION = "DISCUSSION",
}

// ========== 通知系统 ==========

export enum NotificationType {
  CHECK_IN_REMINDER = "CHECK_IN_REMINDER",
  TASK_NOTIFICATION = "TASK_NOTIFICATION",
  EXPIRY_ALERT = "EXPIRY_ALERT",
  BUDGET_WARNING = "BUDGET_WARNING",
  HEALTH_ALERT = "HEALTH_ALERT",
  GOAL_ACHIEVEMENT = "GOAL_ACHIEVEMENT",
  FAMILY_ACTIVITY = "FAMILY_ACTIVITY",
  SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT",
  MARKETING = "MARKETING",
  OTHER = "OTHER",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  SMS = "SMS",
  WECHAT = "WECHAT",
  PUSH = "PUSH",
}

export enum NotificationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENDING = "SENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

// ========== 库存管理 ==========

export enum StorageLocation {
  REFRIGERATOR = "REFRIGERATOR",
  FREEZER = "FREEZER",
  PANTRY = "PANTRY",
  COUNTER = "COUNTER",
  CABINET = "CABINET",
  OTHER = "OTHER",
}

export enum InventoryStatus {
  FRESH = "FRESH",
  EXPIRING = "EXPIRING",
  EXPIRED = "EXPIRED",
  LOW_STOCK = "LOW_STOCK",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export enum WasteReason {
  EXPIRED = "EXPIRED",
  SPOILED = "SPOILED",
  OVERSTOCK = "OVERSTOCK",
  PREFERENCE = "PREFERENCE",
  OTHER = "OTHER",
}

// ========== 设备同步 ==========

export enum DeviceType {
  SMARTWATCH = "SMARTWATCH",
  FITNESS_BAND = "FITNESS_BAND",
  SMART_SCALE = "SMART_SCALE",
  BLOOD_PRESSURE_MONITOR = "BLOOD_PRESSURE_MONITOR",
  GLUCOSE_METER = "GLUCOSE_METER",
  SMART_RING = "SMART_RING",
  OTHER = "OTHER",
}

export enum PlatformType {
  APPLE_HEALTHKIT = "APPLE_HEALTHKIT",
  HUAWEI_HEALTH = "HUAWEI_HEALTH",
  GOOGLE_FIT = "GOOGLE_FIT",
  XIAOMI_HEALTH = "XIAOMI_HEALTH",
  SAMSUNG_HEALTH = "SAMSUNG_HEALTH",
  GARMIN_CONNECT = "GARMIN_CONNECT",
  FITBIT = "FITBIT",
  OTHER_PLATFORM = "OTHER_PLATFORM",
}

export enum SyncStatus {
  PENDING = "PENDING",
  SYNCING = "SYNCING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  DISABLED = "DISABLED",
}

export enum DevicePermission {
  READ_STEPS = "READ_STEPS",
  READ_HEART_RATE = "READ_HEART_RATE",
  READ_CALORIES = "READ_CALORIES",
  READ_SLEEP = "READ_SLEEP",
  READ_WEIGHT = "READ_WEIGHT",
  READ_BLOOD_PRESSURE = "READ_BLOOD_PRESSURE",
  READ_DISTANCE = "READ_DISTANCE",
  READ_ACTIVE_MINUTES = "READ_ACTIVE_MINUTES",
  READ_EXERCISE = "READ_EXERCISE",
}

export enum HealthDataType {
  STEPS = "STEPS",
  HEART_RATE = "HEART_RATE",
  CALORIES_BURNED = "CALORIES_BURNED",
  SLEEP_DURATION = "SLEEP_DURATION",
  SLEEP_QUALITY = "SLEEP_QUALITY",
  WEIGHT = "WEIGHT",
  BODY_FAT = "BODY_FAT",
  MUSCLE_MASS = "MUSCLE_MASS",
  BLOOD_PRESSURE = "BLOOD_PRESSURE",
  DISTANCE = "DISTANCE",
  ACTIVE_MINUTES = "ACTIVE_MINUTES",
  EXERCISE_TYPE = "EXERCISE_TYPE",
  EXERCISE_DURATION = "EXERCISE_DURATION",
  RESTING_HEART_RATE = "RESTING_HEART_RATE",
  FLOORS_CLIMBED = "FLOORS_CLIMBED",
  STANDING_HOURS = "STANDING_HOURS",
}

// ========== 类型别名（兼容层） ==========
// 这些类型用于匹配 Prisma 生成的类型名称

export type $Enums = {
  UserRole: typeof UserRole;
  Gender: typeof Gender;
  AgeGroup: typeof AgeGroup;
  FamilyMemberRole: typeof FamilyMemberRole;
  GoalType: typeof GoalType;
  GoalStatus: typeof GoalStatus;
  GoalCategory: typeof GoalCategory;
  AllergenType: typeof AllergenType;
  AllergySeverity: typeof AllergySeverity;
  DietaryType: typeof DietaryType;
  InvitationStatus: typeof InvitationStatus;
  FoodCategory: typeof FoodCategory;
  DataSource: typeof DataSource;
  HealthDataSource: typeof HealthDataSource;
  ReminderType: typeof ReminderType;
  MealType: typeof MealType;
  PlanStatus: typeof PlanStatus;
  OcrStatus: typeof OcrStatus;
  RecognitionStatus: typeof RecognitionStatus;
  IndicatorType: typeof IndicatorType;
  IndicatorStatus: typeof IndicatorStatus;
  ListStatus: typeof ListStatus;
  ReportType: typeof ReportType;
  ReportStatus: typeof ReportStatus;
  ScoreGrade: typeof ScoreGrade;
  SpiceLevel: typeof SpiceLevel;
  SweetnessLevel: typeof SweetnessLevel;
  SaltinessLevel: typeof SaltinessLevel;
  TrendDataType: typeof TrendDataType;
  AnomalyType: typeof AnomalyType;
  AnomalySeverity: typeof AnomalySeverity;
  AnomalyStatus: typeof AnomalyStatus;
  AIAdviceType: typeof AIAdviceType;
  ConversationStatus: typeof ConversationStatus;
  PromptType: typeof PromptType;
  ConsentType: typeof ConsentType;
  BudgetPeriod: typeof BudgetPeriod;
  BudgetStatus: typeof BudgetStatus;
  PriceSource: typeof PriceSource;
  SavingsType: typeof SavingsType;
  RecommendationStatus: typeof RecommendationStatus;
  AlertType: typeof AlertType;
  AlertStatus: typeof AlertStatus;
  EcommercePlatform: typeof EcommercePlatform;
  PlatformAccountStatus: typeof PlatformAccountStatus;
  OrderStatus: typeof OrderStatus;
  DeliveryStatus: typeof DeliveryStatus;
  Difficulty: typeof Difficulty;
  RecipeCategory: typeof RecipeCategory;
  RecipeStatus: typeof RecipeStatus;
  CostLevel: typeof CostLevel;
  SubstitutionType: typeof SubstitutionType;
  TaskCategory: typeof TaskCategory;
  TaskStatus: typeof TaskStatus;
  TaskPriority: typeof TaskPriority;
  ActivityType: typeof ActivityType;
  CommentTarget: typeof CommentTarget;
  ShareContentType: typeof ShareContentType;
  SharePlatform: typeof SharePlatform;
  ShareStatus: typeof ShareStatus;
  SharePrivacyLevel: typeof SharePrivacyLevel;
  ShareTrackingEventType: typeof ShareTrackingEventType;
  AchievementType: typeof AchievementType;
  AchievementRarity: typeof AchievementRarity;
  LeaderboardType: typeof LeaderboardType;
  LeaderboardPeriod: typeof LeaderboardPeriod;
  CommunityPostStatus: typeof CommunityPostStatus;
  CommunityPostType: typeof CommunityPostType;
  NotificationType: typeof NotificationType;
  NotificationChannel: typeof NotificationChannel;
  NotificationPriority: typeof NotificationPriority;
  NotificationStatus: typeof NotificationStatus;
  StorageLocation: typeof StorageLocation;
  InventoryStatus: typeof InventoryStatus;
  WasteReason: typeof WasteReason;
  DeviceType: typeof DeviceType;
  PlatformType: typeof PlatformType;
  SyncStatus: typeof SyncStatus;
  DevicePermission: typeof DevicePermission;
  HealthDataType: typeof HealthDataType;
};
