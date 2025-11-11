-- Supabase Migration: Generated from Prisma Schema
-- Generated at: 2025-11-09T15:32:39.696Z
-- Total Models: 68
-- Total Enums: 80

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Enum Types
-- ========================================

CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');

CREATE TYPE age_group AS ENUM ('CHILD', 'TEENAGER', 'ADULT', 'ELDERLY');

CREATE TYPE family_member_role AS ENUM ('ADMIN', 'MEMBER', 'GUEST');

CREATE TYPE goal_type AS ENUM ('LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'IMPROVE_HEALTH');

CREATE TYPE goal_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

CREATE TYPE allergen_type AS ENUM ('FOOD', 'ENVIRONMENTAL', 'MEDICATION', 'OTHER');

CREATE TYPE allergy_severity AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

CREATE TYPE dietary_type AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCETARIAN', 'KETO', 'PALEO', 'MEDITERRANEAN', 'LOW_FODMAP', 'CUSTOM');

CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

CREATE TYPE food_category AS ENUM ('VEGETABLES', 'FRUITS', 'GRAINS', 'PROTEIN', 'SEAFOOD', 'DAIRY', 'OILS', 'SNACKS', 'BEVERAGES', 'OTHER');

CREATE TYPE data_source AS ENUM ('USDA', 'LOCAL', 'USER_SUBMITTED');

CREATE TYPE health_data_source AS ENUM ('MANUAL', 'WEARABLE', 'MEDICAL_REPORT', 'APPLE_HEALTHKIT', 'HUAWEI_HEALTH', 'GOOGLE_FIT', 'XIAOMI_HEALTH', 'SAMSUNG_HEALTH', 'GARMIN_CONNECT', 'FITBIT');

CREATE TYPE reminder_type AS ENUM ('WEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'GENERAL');

CREATE TYPE meal_type AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

CREATE TYPE plan_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TYPE ocr_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TYPE indicator_type AS ENUM ('TOTAL_CHOLESTEROL', 'LDL_CHOLESTEROL', 'HDL_CHOLESTEROL', 'TRIGLYCERIDES', 'FASTING_GLUCOSE', 'POSTPRANDIAL_GLUCOSE', 'GLYCATED_HEMOGLOBIN', 'ALT', 'AST', 'TOTAL_BILIRUBIN', 'DIRECT_BILIRUBIN', 'ALP', 'CREATININE', 'UREA_NITROGEN', 'URIC_ACID', 'WHITE_BLOOD_CELL', 'RED_BLOOD_CELL', 'HEMOGLOBIN', 'PLATELET', 'OTHER');

CREATE TYPE indicator_status AS ENUM ('NORMAL', 'LOW', 'HIGH', 'CRITICAL');

CREATE TYPE list_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

CREATE TYPE recognition_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TYPE report_type AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');

CREATE TYPE report_status AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

CREATE TYPE score_grade AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

CREATE TYPE spice_level AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME');

CREATE TYPE sweetness_level AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME');

CREATE TYPE saltiness_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');

CREATE TYPE trend_data_type AS ENUM ('WEIGHT', 'BODY_FAT', 'MUSCLE_MASS', 'BLOOD_PRESSURE', 'HEART_RATE', 'CALORIES', 'PROTEIN', 'CARBS', 'FAT', 'EXERCISE', 'SLEEP', 'WATER', 'HEALTH_SCORE');

CREATE TYPE anomaly_type AS ENUM ('SUDDEN_CHANGE', 'NUTRITION_IMBALANCE', 'GOAL_DEVIATION', 'THRESHOLD_EXCEEDED', 'MISSING_DATA');

CREATE TYPE anomaly_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE anomaly_status AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');

CREATE TYPE a_i_advice_type AS ENUM ('HEALTH_ANALYSIS', 'RECIPE_OPTIMIZATION', 'CONSULTATION', 'REPORT_GENERATION');

CREATE TYPE conversation_status AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE prompt_type AS ENUM ('HEALTH_ANALYSIS', 'RECIPE_OPTIMIZATION', 'CONSULTATION', 'REPORT_GENERATION');

CREATE TYPE consent_type AS ENUM ('AI_HEALTH_ANALYSIS', 'MEDICAL_DATA_PROCESSING', 'HEALTH_DATA_SHARING', 'HEALTH_RESEARCH_PARTICIPATION');

CREATE TYPE budget_period AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

CREATE TYPE budget_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

CREATE TYPE price_source AS ENUM ('MANUAL', 'CRAWLER', 'API', 'USER_REPORT');

CREATE TYPE savings_type AS ENUM ('PROMOTION', 'GROUP_BUY', 'SEASONAL', 'BULK_PURCHASE', 'PLATFORM_SWITCH', 'SUBSTITUTE');

CREATE TYPE recommendation_status AS ENUM ('PENDING', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

CREATE TYPE alert_type AS ENUM ('WARNING_80', 'WARNING_100', 'OVER_BUDGET_110', 'CATEGORY_OVER', 'DAILY_EXCESS');

CREATE TYPE alert_status AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

CREATE TYPE ecommerce_platform AS ENUM ('SAMS_CLUB', 'HEMA', 'DINGDONG');

CREATE TYPE platform_account_status AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'ERROR');

CREATE TYPE order_status AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

CREATE TYPE delivery_status AS ENUM ('PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED');

CREATE TYPE difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');

CREATE TYPE recipe_category AS ENUM ('MAIN_DISH', 'SIDE_DISH', 'SOUP', 'SALAD', 'DESSERT', 'SNACK', 'BREAKFAST', 'BEVERAGE', 'SAUCE', 'OTHER');

CREATE TYPE recipe_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED');

CREATE TYPE cost_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE substitution_type AS ENUM ('ALLERGY', 'STOCK_OUT', 'BUDGET', 'PREFERENCE', 'NUTRITION', 'SEASONAL');

CREATE TYPE task_category AS ENUM ('SHOPPING', 'COOKING', 'CLEANING', 'HEALTH', 'EXERCISE', 'OTHER');

CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE activity_type AS ENUM ('MEAL_LOG_ADDED', 'RECIPE_ADDED', 'TASK_CREATED', 'TASK_COMPLETED', 'SHOPPING_UPDATED', 'GOAL_ACHIEVED', 'CHECK_IN', 'HEALTH_DATA', 'OTHER');

CREATE TYPE comment_target AS ENUM ('TASK', 'ACTIVITY');

CREATE TYPE goal_category AS ENUM ('WEIGHT_LOSS', 'EXERCISE', 'NUTRITION', 'SAVINGS', 'CHECK_IN_STREAK', 'OTHER');

CREATE TYPE share_content_type AS ENUM ('HEALTH_REPORT', 'GOAL_ACHIEVEMENT', 'MEAL_LOG', 'RECIPE', 'ACHIEVEMENT', 'CHECK_IN_STREAK', 'WEIGHT_MILESTONE', 'WEEKLY_SUMMARY', 'MONTHLY_REPORT');

CREATE TYPE share_platform AS ENUM ('WECHAT', 'WECHAT_MOMENTS', 'WEIBO', 'LINK', 'COMMUNITY');

CREATE TYPE share_status AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'DELETED');

CREATE TYPE achievement_type AS ENUM ('CHECK_IN_STREAK', 'WEIGHT_LOSS', 'NUTRITION_GOAL', 'EXERCISE_TARGET', 'HEALTH_MILESTONE', 'COMMUNITY_CONTRIBUTION');

CREATE TYPE achievement_rarity AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

CREATE TYPE leaderboard_type AS ENUM ('HEALTH_SCORE', 'CHECK_IN_STREAK', 'WEIGHT_LOSS', 'EXERCISE_MINUTES', 'NUTRITION_SCORE');

CREATE TYPE leaderboard_period AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME');

CREATE TYPE community_post_status AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'DELETED');

CREATE TYPE community_post_type AS ENUM ('EXPERIENCE', 'RECIPE_SHOW', 'ACHIEVEMENT', 'QUESTION', 'DISCUSSION');

CREATE TYPE share_privacy_level AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

CREATE TYPE share_tracking_event_type AS ENUM ('VIEW', 'CLICK', 'SHARE', 'CONVERSION', 'DOWNLOAD');

CREATE TYPE notification_type AS ENUM ('CHECK_IN_REMINDER', 'TASK_NOTIFICATION', 'EXPIRY_ALERT', 'BUDGET_WARNING', 'HEALTH_ALERT', 'GOAL_ACHIEVEMENT', 'FAMILY_ACTIVITY', 'SYSTEM_ANNOUNCEMENT', 'MARKETING', 'OTHER');

CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WECHAT', 'PUSH');

CREATE TYPE notification_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE notification_status AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TYPE storage_location AS ENUM ('REFRIGERATOR', 'FREEZER', 'PANTRY', 'COUNTER', 'CABINET', 'OTHER');

CREATE TYPE inventory_status AS ENUM ('FRESH', 'EXPIRING', 'EXPIRED', 'LOW_STOCK', 'OUT_OF_STOCK');

CREATE TYPE waste_reason AS ENUM ('EXPIRED', 'SPOILED', 'OVERSTOCK', 'PREFERENCE', 'OTHER');

CREATE TYPE device_type AS ENUM ('SMARTWATCH', 'FITNESS_BAND', 'SMART_SCALE', 'BLOOD_PRESSURE_MONITOR', 'GLUCOSE_METER', 'SMART_RING', 'OTHER');

CREATE TYPE platform_type AS ENUM ('APPLE_HEALTHKIT', 'HUAWEI_HEALTH', 'GOOGLE_FIT', 'XIAOMI_HEALTH', 'SAMSUNG_HEALTH', 'GARMIN_CONNECT', 'FITBIT', 'OTHER_PLATFORM');

CREATE TYPE sync_status AS ENUM ('PENDING', 'SYNCING', 'SUCCESS', 'FAILED', 'DISABLED');

CREATE TYPE device_permission AS ENUM ('READ_STEPS', 'READ_HEART_RATE', 'READ_CALORIES', 'READ_SLEEP', 'READ_WEIGHT', 'READ_BLOOD_PRESSURE', 'READ_DISTANCE', 'READ_ACTIVE_MINUTES', 'READ_EXERCISE');

CREATE TYPE health_data_type AS ENUM ('STEPS', 'HEART_RATE', 'CALORIES_BURNED', 'SLEEP_DURATION', 'SLEEP_QUALITY', 'WEIGHT', 'BODY_FAT', 'MUSCLE_MASS', 'BLOOD_PRESSURE', 'DISTANCE', 'ACTIVE_MINUTES', 'EXERCISE_TYPE', 'EXERCISE_DURATION', 'RESTING_HEART_RATE', 'FLOORS_CLIMBED', 'STANDING_HOURS');

-- ========================================
-- Table Definitions
-- ========================================

-- Table: user
CREATE TABLE IF NOT EXISTS user (
  id UUID PRIMARY KEY DEFAULT cuid(,
  email TEXT NOT NULL UNIQUE,
  email_verified TIMESTAMP WITH TIME ZONE,
  name TEXT,
  image TEXT,
  password TEXT,
  role user_role DEFAULT USER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  family_members FamilyMember
);

-- Table: family
CREATE TABLE IF NOT EXISTS family (
  id UUID PRIMARY KEY DEFAULT cuid(,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE,
  creator_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  members FamilyMember[] NOT NULL
);

-- Table: family_member
CREATE TABLE IF NOT EXISTS family_member (
  id UUID PRIMARY KEY DEFAULT cuid(,
  name TEXT NOT NULL,
  gender gender NOT NULL,
  birth_date TIMESTAMP WITH TIME ZONE NOT NULL,
  height DECIMAL(10,2),
  weight DECIMAL(10,2),
  avatar TEXT,
  bmi DECIMAL(10,2),
  age_group age_group,
  family_id TEXT NOT NULL,
  user_id TEXT UNIQUE,
  role family_member_role DEFAULT MEMBER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  achievements Achievement[] NOT NULL,
  ai_advices AIAdvice[] NOT NULL,
  ai_conversations AIConversation[] NOT NULL,
  allergies Allergy[] NOT NULL,
  auxiliary_trackings AuxiliaryTracking[] NOT NULL,
  budgets Budget[] NOT NULL,
  community_comments CommunityComment[] NOT NULL,
  community_posts CommunityPost[] NOT NULL,
  daily_nutrition_targets DailyNutritionTarget[] NOT NULL,
  dietary_preference DietaryPreference,
  health_anomalies HealthAnomaly[] NOT NULL,
  health_data HealthData[] NOT NULL,
  health_goals HealthGoal[] NOT NULL,
  health_reminders HealthReminder[] NOT NULL,
  health_reports HealthReport[] NOT NULL,
  health_scores HealthScore[] NOT NULL,
  leaderboard_entries LeaderboardEntry[] NOT NULL,
  meal_logs MealLog[] NOT NULL,
  meal_plans MealPlan[] NOT NULL,
  medical_reports MedicalReport[] NOT NULL,
  quick_templates QuickTemplate[] NOT NULL,
  recipe_favorites RecipeFavorite[] NOT NULL,
  recipe_ratings RecipeRating[] NOT NULL,
  recipe_views RecipeView[] NOT NULL,
  savings_recommendations SavingsRecommendation[] NOT NULL,
  shared_contents SharedContent[] NOT NULL,
  tracking_streak TrackingStreak,
  trend_data TrendData[] NOT NULL,
  user_preferences UserPreference
);

-- Table: health_goal
CREATE TABLE IF NOT EXISTS health_goal (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  goal_type goal_type NOT NULL,
  target_weight DECIMAL(10,2),
  current_weight DECIMAL(10,2),
  start_weight DECIMAL(10,2),
  target_weeks INTEGER,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  target_date TIMESTAMP WITH TIME ZONE,
  tdee INTEGER,
  bmr INTEGER,
  activity_factor DECIMAL(10,2),
  carb_ratio DECIMAL(10,2) DEFAULT 0.5,
  protein_ratio DECIMAL(10,2) DEFAULT 0.2,
  fat_ratio DECIMAL(10,2) DEFAULT 0.3,
  status goal_status DEFAULT ACTIVE NOT NULL,
  progress DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: allergy
CREATE TABLE IF NOT EXISTS allergy (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  allergen_type allergen_type NOT NULL,
  allergen_name TEXT NOT NULL,
  severity allergy_severity NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: dietary_preference
CREATE TABLE IF NOT EXISTS dietary_preference (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL UNIQUE,
  diet_type dietary_type NOT NULL,
  is_vegetarian BOOLEAN DEFAULT FALSE NOT NULL,
  is_vegan BOOLEAN DEFAULT FALSE NOT NULL,
  is_keto BOOLEAN DEFAULT FALSE NOT NULL,
  is_low_carb BOOLEAN DEFAULT FALSE NOT NULL,
  is_low_fat BOOLEAN DEFAULT FALSE NOT NULL,
  is_high_protein BOOLEAN DEFAULT FALSE NOT NULL,
  is_gluten_free BOOLEAN DEFAULT FALSE NOT NULL,
  is_dairy_free BOOLEAN DEFAULT FALSE NOT NULL,
  is_low_sodium BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: family_invitation
CREATE TABLE IF NOT EXISTS family_invitation (
  id UUID PRIMARY KEY DEFAULT cuid(,
  family_id TEXT NOT NULL,
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  role family_member_role DEFAULT MEMBER NOT NULL,
  status invitation_status DEFAULT PENDING NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: food
CREATE TABLE IF NOT EXISTS food (
  id UUID PRIMARY KEY DEFAULT cuid(,
  name TEXT NOT NULL,
  name_en TEXT,
  aliases TEXT DEFAULT "[]" NOT NULL,
  calories DECIMAL(10,2) NOT NULL,
  protein DECIMAL(10,2) NOT NULL,
  carbs DECIMAL(10,2) NOT NULL,
  fat DECIMAL(10,2) NOT NULL,
  fiber DECIMAL(10,2),
  sugar DECIMAL(10,2),
  sodium DECIMAL(10,2),
  vitamin_a DECIMAL(10,2),
  vitamin_c DECIMAL(10,2),
  calcium DECIMAL(10,2),
  iron DECIMAL(10,2),
  category food_category NOT NULL,
  tags TEXT DEFAULT "[]" NOT NULL,
  source data_source DEFAULT LOCAL NOT NULL,
  usda_id TEXT,
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE,
  meal_ingredients MealIngredient[] NOT NULL,
  meal_log_foods MealLogFood[] NOT NULL,
  price_histories PriceHistory[] NOT NULL,
  shopping_items ShoppingItem[] NOT NULL,
  template_foods TemplateFood[] NOT NULL
);

-- Table: health_data
CREATE TABLE IF NOT EXISTS health_data (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  weight DECIMAL(10,2),
  body_fat DECIMAL(10,2),
  muscle_mass DECIMAL(10,2),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  source health_data_source DEFAULT MANUAL NOT NULL,
  notes TEXT,
  device_connection_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: health_reminder
CREATE TABLE IF NOT EXISTS health_reminder (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  reminder_type reminder_type NOT NULL,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  hour INTEGER NOT NULL,
  minute INTEGER DEFAULT 0 NOT NULL,
  days_of_week TEXT DEFAULT "[]" NOT NULL,
  message TEXT,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  streak_days INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: meal_plan
CREATE TABLE IF NOT EXISTS meal_plan (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  goal_type goal_type NOT NULL,
  target_calories DECIMAL(10,2) NOT NULL,
  target_protein DECIMAL(10,2) NOT NULL,
  target_carbs DECIMAL(10,2) NOT NULL,
  target_fat DECIMAL(10,2) NOT NULL,
  status plan_status DEFAULT ACTIVE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  meals Meal[] NOT NULL,
  shopping_lists ShoppingList[] NOT NULL
);

-- Table: meal
CREATE TABLE IF NOT EXISTS meal (
  id UUID PRIMARY KEY DEFAULT cuid(,
  plan_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  meal_type meal_type NOT NULL,
  calories DECIMAL(10,2) NOT NULL,
  protein DECIMAL(10,2) NOT NULL,
  carbs DECIMAL(10,2) NOT NULL,
  fat DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ingredients MealIngredient[] NOT NULL
);

-- Table: meal_ingredient
CREATE TABLE IF NOT EXISTS meal_ingredient (
  id UUID PRIMARY KEY DEFAULT cuid(,
  meal_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL
);

-- Table: medical_report
CREATE TABLE IF NOT EXISTS medical_report (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  ocr_status ocr_status DEFAULT PENDING NOT NULL,
  ocr_text TEXT,
  ocr_error TEXT,
  report_date TIMESTAMP WITH TIME ZONE,
  institution TEXT,
  report_type TEXT,
  is_corrected BOOLEAN DEFAULT FALSE NOT NULL,
  corrected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  indicators MedicalIndicator[] NOT NULL
);

-- Table: medical_indicator
CREATE TABLE IF NOT EXISTS medical_indicator (
  id UUID PRIMARY KEY DEFAULT cuid(,
  report_id TEXT NOT NULL,
  indicator_type indicator_type NOT NULL,
  name TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  reference_range TEXT,
  is_abnormal BOOLEAN DEFAULT FALSE NOT NULL,
  status indicator_status DEFAULT NORMAL NOT NULL,
  is_corrected BOOLEAN DEFAULT FALSE NOT NULL,
  original_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: shopping_list_share
CREATE TABLE IF NOT EXISTS shopping_list_share (
  id UUID PRIMARY KEY DEFAULT cuid(,
  list_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by TEXT NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: shopping_list
CREATE TABLE IF NOT EXISTS shopping_list (
  id UUID PRIMARY KEY DEFAULT cuid(,
  plan_id TEXT NOT NULL,
  name TEXT DEFAULT cuid( NOT NULL,
  budget DECIMAL(10,2),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  status list_status DEFAULT PENDING NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  items ShoppingItem[] NOT NULL,
  shares ShoppingListShare[] NOT NULL
);

-- Table: shopping_item
CREATE TABLE IF NOT EXISTS shopping_item (
  id UUID PRIMARY KEY DEFAULT cuid(,
  list_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category food_category NOT NULL,
  purchased BOOLEAN DEFAULT FALSE NOT NULL,
  estimated_price DECIMAL(10,2),
  assignee_id TEXT,
  added_by TEXT,
  purchased_by TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: meal_log
CREATE TABLE IF NOT EXISTS meal_log (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  meal_type meal_type NOT NULL,
  calories DECIMAL(10,2) NOT NULL,
  protein DECIMAL(10,2) NOT NULL,
  carbs DECIMAL(10,2) NOT NULL,
  fat DECIMAL(10,2) NOT NULL,
  fiber DECIMAL(10,2) DEFAULT 0,
  sugar DECIMAL(10,2) DEFAULT 0,
  sodium DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  is_template BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  photos FoodPhoto[] NOT NULL,
  foods MealLogFood[] NOT NULL
);

-- Table: meal_log_food
CREATE TABLE IF NOT EXISTS meal_log_food (
  id UUID PRIMARY KEY DEFAULT cuid(,
  meal_log_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: food_photo
CREATE TABLE IF NOT EXISTS food_photo (
  id UUID PRIMARY KEY DEFAULT cuid(,
  meal_log_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  recognition_status recognition_status DEFAULT PENDING NOT NULL,
  recognition_result TEXT,
  confidence DECIMAL(10,2),
  recognition_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: tracking_streak
CREATE TABLE IF NOT EXISTS tracking_streak (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  total_days INTEGER DEFAULT 0 NOT NULL,
  last_check_in TIMESTAMP WITH TIME ZONE,
  badges TEXT DEFAULT "[]" NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: quick_template
CREATE TABLE IF NOT EXISTS quick_template (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  meal_type meal_type NOT NULL,
  calories DECIMAL(10,2) NOT NULL,
  protein DECIMAL(10,2) NOT NULL,
  carbs DECIMAL(10,2) NOT NULL,
  fat DECIMAL(10,2) NOT NULL,
  use_count INTEGER DEFAULT 0 NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE,
  score DECIMAL(10,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  foods TemplateFood[] NOT NULL
);

-- Table: template_food
CREATE TABLE IF NOT EXISTS template_food (
  id UUID PRIMARY KEY DEFAULT cuid(,
  template_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL
);

-- Table: daily_nutrition_target
CREATE TABLE IF NOT EXISTS daily_nutrition_target (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  target_calories DECIMAL(10,2) NOT NULL,
  target_protein DECIMAL(10,2) NOT NULL,
  target_carbs DECIMAL(10,2) NOT NULL,
  target_fat DECIMAL(10,2) NOT NULL,
  actual_calories DECIMAL(10,2) DEFAULT 0 NOT NULL,
  actual_protein DECIMAL(10,2) DEFAULT 0 NOT NULL,
  actual_carbs DECIMAL(10,2) DEFAULT 0 NOT NULL,
  actual_fat DECIMAL(10,2) DEFAULT 0 NOT NULL,
  calories_deviation DECIMAL(10,2) DEFAULT 0 NOT NULL,
  protein_deviation DECIMAL(10,2) DEFAULT 0 NOT NULL,
  carbs_deviation DECIMAL(10,2) DEFAULT 0 NOT NULL,
  fat_deviation DECIMAL(10,2) DEFAULT 0 NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: auxiliary_tracking
CREATE TABLE IF NOT EXISTS auxiliary_tracking (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  water_intake INTEGER DEFAULT 0,
  water_target INTEGER DEFAULT 2000,
  exercise_minutes INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  exercise_type TEXT,
  sleep_hours DECIMAL(10,2),
  sleep_quality TEXT,
  weight DECIMAL(10,2),
  body_fat DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: health_report
CREATE TABLE IF NOT EXISTS health_report (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  report_type report_type NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  data_snapshot TEXT NOT NULL,
  insights TEXT,
  overall_score DECIMAL(10,2),
  html_content TEXT,
  pdf_url TEXT,
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMP WITH TIME ZONE,
  status report_status DEFAULT GENERATING NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: health_score
CREATE TABLE IF NOT EXISTS health_score (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  overall_score DECIMAL(10,2) NOT NULL,
  nutrition_score DECIMAL(10,2),
  exercise_score DECIMAL(10,2),
  sleep_score DECIMAL(10,2),
  medical_score DECIMAL(10,2),
  grade score_grade NOT NULL,
  data_completeness DECIMAL(10,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: trend_data
CREATE TABLE IF NOT EXISTS trend_data (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  data_type trend_data_type NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  aggregated_data TEXT NOT NULL,
  mean DECIMAL(10,2),
  median DECIMAL(10,2),
  min DECIMAL(10,2),
  max DECIMAL(10,2),
  std_dev DECIMAL(10,2),
  trend_direction TEXT,
  slope DECIMAL(10,2),
  r_squared DECIMAL(10,2),
  predictions TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: health_anomaly
CREATE TABLE IF NOT EXISTS health_anomaly (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  anomaly_type anomaly_type NOT NULL,
  severity anomaly_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  data_type trend_data_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  expected_min DECIMAL(10,2),
  expected_max DECIMAL(10,2),
  deviation DECIMAL(10,2),
  status anomaly_status DEFAULT PENDING NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  notified BOOLEAN DEFAULT FALSE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: a_i_advice
CREATE TABLE IF NOT EXISTS a_i_advice (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  type a_i_advice_type NOT NULL,
  content JSONB NOT NULL,
  prompt TEXT,
  tokens INTEGER NOT NULL,
  feedback JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: a_i_conversation
CREATE TABLE IF NOT EXISTS a_i_conversation (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  title TEXT,
  messages JSONB NOT NULL,
  status conversation_status DEFAULT ACTIVE NOT NULL,
  tokens INTEGER NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: prompt_template
CREATE TABLE IF NOT EXISTS prompt_template (
  id UUID PRIMARY KEY DEFAULT cuid(,
  name TEXT NOT NULL,
  type prompt_type NOT NULL,
  template TEXT NOT NULL,
  version TEXT DEFAULT "1.0" NOT NULL,
  parameters JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: user_consent
CREATE TABLE IF NOT EXISTS user_consent (
  id UUID PRIMARY KEY DEFAULT cuid(,
  user_id TEXT NOT NULL,
  consent_id TEXT NOT NULL,
  granted BOOLEAN DEFAULT FALSE NOT NULL,
  context JSONB,
  ip_address TEXT,
  user_agent TEXT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: budget
CREATE TABLE IF NOT EXISTS budget (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  name TEXT NOT NULL,
  period budget_period NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  vegetable_budget DECIMAL(10,2),
  meat_budget DECIMAL(10,2),
  fruit_budget DECIMAL(10,2),
  grain_budget DECIMAL(10,2),
  dairy_budget DECIMAL(10,2),
  other_budget DECIMAL(10,2),
  status budget_status DEFAULT ACTIVE NOT NULL,
  used_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  remaining_amount DECIMAL(10,2),
  usage_percentage DECIMAL(10,2),
  alert_threshold80 BOOLEAN DEFAULT TRUE NOT NULL,
  alert_threshold100 BOOLEAN DEFAULT TRUE NOT NULL,
  alert_threshold110 BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  alerts BudgetAlert[] NOT NULL,
  spendings Spending[] NOT NULL
);

-- Table: spending
CREATE TABLE IF NOT EXISTS spending (
  id UUID PRIMARY KEY DEFAULT cuid(,
  budget_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category food_category NOT NULL,
  description TEXT NOT NULL,
  transaction_id TEXT,
  platform TEXT,
  items JSONB,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: price_history
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT cuid(,
  food_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  platform TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  source price_source DEFAULT MANUAL NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: savings_recommendation
CREATE TABLE IF NOT EXISTS savings_recommendation (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  type savings_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  savings DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discounted_price DECIMAL(10,2),
  platform TEXT,
  food_items JSONB,
  valid_until TIMESTAMP WITH TIME ZONE,
  status recommendation_status DEFAULT PENDING NOT NULL,
  viewed BOOLEAN DEFAULT FALSE NOT NULL,
  acted BOOLEAN DEFAULT FALSE NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: budget_alert
CREATE TABLE IF NOT EXISTS budget_alert (
  id UUID PRIMARY KEY DEFAULT cuid(,
  budget_id TEXT NOT NULL,
  type alert_type NOT NULL,
  threshold DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) NOT NULL,
  message TEXT NOT NULL,
  status alert_status DEFAULT ACTIVE NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notified BOOLEAN DEFAULT FALSE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: platform_account
CREATE TABLE IF NOT EXISTS platform_account (
  id UUID PRIMARY KEY DEFAULT cuid(,
  user_id TEXT NOT NULL,
  platform ecommerce_platform NOT NULL,
  platform_user_id TEXT,
  username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT "Bearer",
  scope TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  status platform_account_status DEFAULT ACTIVE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  default_delivery_address JSONB,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  orders Order[] NOT NULL
);

-- Table: order
CREATE TABLE IF NOT EXISTS order (
  id UUID PRIMARY KEY DEFAULT cuid(,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  platform_order_id TEXT NOT NULL UNIQUE,
  platform ecommerce_platform NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_fee DECIMAL(10,2) DEFAULT 0 NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status order_status DEFAULT PENDING_PAYMENT NOT NULL,
  payment_status TEXT,
  delivery_status delivery_status,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  shipment_date TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,
  delivery_address JSONB NOT NULL,
  tracking_number TEXT,
  delivery_notes TEXT,
  items JSONB NOT NULL,
  order_summary JSONB,
  platform_response JSONB,
  sync_error TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: platform_product
CREATE TABLE IF NOT EXISTS platform_product (
  id UUID PRIMARY KEY DEFAULT cuid(,
  platform ecommerce_platform NOT NULL,
  platform_product_id TEXT NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  specification JSONB,
  weight DECIMAL(10,2),
  volume DECIMAL(10,2),
  unit TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  currency TEXT DEFAULT "CNY" NOT NULL,
  price_unit TEXT,
  stock INTEGER DEFAULT 0 NOT NULL,
  is_in_stock BOOLEAN DEFAULT TRUE NOT NULL,
  stock_status TEXT,
  sales_count INTEGER,
  rating DECIMAL(10,2),
  review_count INTEGER,
  delivery_options JSONB,
  delivery_time JSONB,
  shipping_fee DECIMAL(10,2),
  matched_food_id TEXT,
  match_confidence DECIMAL(10,2),
  match_keywords JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE NOT NULL,
  platform_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: recipe
CREATE TABLE IF NOT EXISTS recipe (
  id UUID PRIMARY KEY DEFAULT cuid(,
  name TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  difficulty difficulty DEFAULT MEDIUM NOT NULL,
  prep_time INTEGER NOT NULL,
  cook_time INTEGER NOT NULL,
  total_time INTEGER NOT NULL,
  servings INTEGER NOT NULL,
  calories DECIMAL(10,2) NOT NULL,
  protein DECIMAL(10,2) NOT NULL,
  carbs DECIMAL(10,2) NOT NULL,
  fat DECIMAL(10,2) NOT NULL,
  fiber DECIMAL(10,2),
  sugar DECIMAL(10,2),
  sodium DECIMAL(10,2),
  image_url TEXT,
  images TEXT DEFAULT "[]" NOT NULL,
  video_url TEXT,
  category recipe_category NOT NULL,
  tags TEXT DEFAULT "[]" NOT NULL,
  meal_types TEXT DEFAULT "[]" NOT NULL,
  average_rating DECIMAL(10,2) DEFAULT 0 NOT NULL,
  rating_count INTEGER DEFAULT 0 NOT NULL,
  favorite_count INTEGER DEFAULT 0 NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  status recipe_status DEFAULT DRAFT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  seasons TEXT DEFAULT "[]" NOT NULL,
  estimated_cost DECIMAL(10,2),
  cost_level cost_level DEFAULT MEDIUM NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  favorites RecipeFavorite[] NOT NULL,
  ingredients RecipeIngredient[] NOT NULL,
  instructions RecipeInstruction[] NOT NULL,
  ratings RecipeRating[] NOT NULL,
  views RecipeView[] NOT NULL
);

-- Table: recipe_ingredient
CREATE TABLE IF NOT EXISTS recipe_ingredient (
  id UUID PRIMARY KEY DEFAULT cuid(,
  recipe_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  optional BOOLEAN DEFAULT FALSE NOT NULL,
  is_substitutable BOOLEAN DEFAULT TRUE NOT NULL
);

-- Table: recipe_instruction
CREATE TABLE IF NOT EXISTS recipe_instruction (
  id UUID PRIMARY KEY DEFAULT cuid(,
  recipe_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  timer INTEGER,
  temperature INTEGER
);

-- Table: recipe_rating
CREATE TABLE IF NOT EXISTS recipe_rating (
  id UUID PRIMARY KEY DEFAULT cuid(,
  recipe_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  tags TEXT DEFAULT "[]" NOT NULL,
  rated_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  is_public BOOLEAN DEFAULT TRUE NOT NULL
);

-- Table: recipe_favorite
CREATE TABLE IF NOT EXISTS recipe_favorite (
  id UUID PRIMARY KEY DEFAULT cuid(,
  recipe_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  favorited_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  notes TEXT
);

-- Table: recipe_view
CREATE TABLE IF NOT EXISTS recipe_view (
  id UUID PRIMARY KEY DEFAULT cuid(,
  recipe_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  view_duration INTEGER,
  source TEXT
);

-- Table: ingredient_substitution
CREATE TABLE IF NOT EXISTS ingredient_substitution (
  id UUID PRIMARY KEY DEFAULT cuid(,
  original_ingredient_id TEXT NOT NULL,
  substitute_food_id TEXT NOT NULL,
  substitution_type substitution_type NOT NULL,
  reason TEXT,
  nutrition_delta JSONB,
  cost_delta DECIMAL(10,2),
  taste_similarity DECIMAL(10,2),
  conditions TEXT DEFAULT "[]" NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE NOT NULL
);

-- Table: user_preference
CREATE TABLE IF NOT EXISTS user_preference (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL UNIQUE,
  spice_level spice_level DEFAULT MEDIUM NOT NULL,
  sweetness sweetness_level DEFAULT MEDIUM NOT NULL,
  saltiness saltiness_level DEFAULT MEDIUM NOT NULL,
  preferred_cuisines TEXT DEFAULT "[]" NOT NULL,
  avoided_ingredients TEXT DEFAULT "[]" NOT NULL,
  preferred_ingredients TEXT DEFAULT "[]" NOT NULL,
  max_cook_time INTEGER,
  min_servings INTEGER DEFAULT 1 NOT NULL,
  max_servings INTEGER DEFAULT 10 NOT NULL,
  cost_level cost_level DEFAULT MEDIUM NOT NULL,
  max_estimated_cost DECIMAL(10,2),
  diet_type dietary_type DEFAULT OMNIVORE NOT NULL,
  is_low_carb BOOLEAN DEFAULT FALSE NOT NULL,
  is_low_fat BOOLEAN DEFAULT FALSE NOT NULL,
  is_high_protein BOOLEAN DEFAULT FALSE NOT NULL,
  is_vegetarian BOOLEAN DEFAULT FALSE NOT NULL,
  is_vegan BOOLEAN DEFAULT FALSE NOT NULL,
  is_gluten_free BOOLEAN DEFAULT FALSE NOT NULL,
  is_dairy_free BOOLEAN DEFAULT FALSE NOT NULL,
  enable_recommendations BOOLEAN DEFAULT TRUE NOT NULL,
  recommendation_weight JSONB,
  learned_preferences JSONB
);

-- Table: task
CREATE TABLE IF NOT EXISTS task (
  id UUID PRIMARY KEY DEFAULT cuid(,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category task_category NOT NULL,
  assignee_id TEXT,
  creator_id TEXT NOT NULL,
  status task_status DEFAULT TODO NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  priority task_priority DEFAULT MEDIUM NOT NULL,
  reminder_sent BOOLEAN DEFAULT FALSE NOT NULL,
  reminded_at TIMESTAMP WITH TIME ZONE
);

-- Table: activity
CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT cuid(,
  family_id TEXT NOT NULL,
  member_id TEXT,
  activity_type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  is_public BOOLEAN DEFAULT TRUE NOT NULL
);

-- Table: comment
CREATE TABLE IF NOT EXISTS comment (
  id UUID PRIMARY KEY DEFAULT cuid(,
  target_type comment_target NOT NULL,
  target_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: family_goal
CREATE TABLE IF NOT EXISTS family_goal (
  id UUID PRIMARY KEY DEFAULT cuid(,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category goal_category NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0 NOT NULL,
  unit TEXT,
  status goal_status DEFAULT ACTIVE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  target_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  creator_id TEXT NOT NULL,
  progress DECIMAL(10,2) DEFAULT 0 NOT NULL,
  reward_description TEXT,
  reward_achieved BOOLEAN DEFAULT FALSE NOT NULL
);

-- Table: shared_content
CREATE TABLE IF NOT EXISTS shared_content (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  content_type share_content_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  metadata JSONB,
  share_token TEXT NOT NULL UNIQUE,
  share_url TEXT,
  invite_code TEXT,
  shared_platforms TEXT DEFAULT "[]" NOT NULL,
  privacy_level share_privacy_level DEFAULT PUBLIC NOT NULL,
  allow_comment BOOLEAN DEFAULT TRUE NOT NULL,
  allow_like BOOLEAN DEFAULT TRUE NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  comment_count INTEGER DEFAULT 0 NOT NULL,
  share_count INTEGER DEFAULT 0 NOT NULL,
  click_count INTEGER DEFAULT 0 NOT NULL,
  download_count INTEGER DEFAULT 0 NOT NULL,
  conversion_count INTEGER DEFAULT 0 NOT NULL,
  status share_status DEFAULT ACTIVE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  community_post_id TEXT UNIQUE,
  share_tracking ShareTracking[] NOT NULL
);

-- Table: share_tracking
CREATE TABLE IF NOT EXISTS share_tracking (
  id UUID PRIMARY KEY DEFAULT cuid(,
  share_token TEXT NOT NULL,
  event_type share_tracking_event_type NOT NULL,
  platform TEXT,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  metadata JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL
);

-- Table: achievement
CREATE TABLE IF NOT EXISTS achievement (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  type achievement_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  image_url TEXT,
  rarity achievement_rarity NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  points INTEGER DEFAULT 0 NOT NULL,
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  progress DECIMAL(10,2) DEFAULT 0 NOT NULL,
  is_unlocked BOOLEAN DEFAULT FALSE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  is_shared BOOLEAN DEFAULT FALSE NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE,
  reward_type TEXT,
  reward_value TEXT,
  reward_claimed BOOLEAN DEFAULT FALSE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: leaderboard_entry
CREATE TABLE IF NOT EXISTS leaderboard_entry (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  leaderboard_type leaderboard_type NOT NULL,
  period leaderboard_period NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  rank INTEGER NOT NULL,
  previous_rank INTEGER,
  rank_change INTEGER,
  total_participants INTEGER DEFAULT 0 NOT NULL,
  percentile DECIMAL(10,2),
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  show_rank BOOLEAN DEFAULT TRUE NOT NULL,
  metadata JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: community_post
CREATE TABLE IF NOT EXISTS community_post (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  type community_post_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT DEFAULT "[]" NOT NULL,
  tags TEXT DEFAULT "[]" NOT NULL,
  related_content_type share_content_type,
  related_content_id TEXT,
  status community_post_status DEFAULT DRAFT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  comment_count INTEGER DEFAULT 0 NOT NULL,
  share_count INTEGER DEFAULT 0 NOT NULL,
  is_moderated BOOLEAN DEFAULT FALSE NOT NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderator_id TEXT,
  moderation_result JSONB,
  report_count INTEGER DEFAULT 0 NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  comments CommunityComment[] NOT NULL
);

-- Table: community_comment
CREATE TABLE IF NOT EXISTS community_comment (
  id UUID PRIMARY KEY DEFAULT cuid(,
  post_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
  report_count INTEGER DEFAULT 0 NOT NULL,
  is_moderated BOOLEAN DEFAULT FALSE NOT NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: notification
CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority notification_priority DEFAULT MEDIUM NOT NULL,
  channels TEXT DEFAULT "[\"IN_APP\"]" NOT NULL,
  status notification_status DEFAULT PENDING NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  action_url TEXT,
  action_text TEXT,
  delivery_results TEXT
);

-- Table: notification_preference
CREATE TABLE IF NOT EXISTS notification_preference (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL UNIQUE,
  enable_notifications BOOLEAN DEFAULT TRUE NOT NULL,
  global_quiet_hours_start INTEGER,
  global_quiet_hours_end INTEGER,
  daily_max_notifications INTEGER DEFAULT 50 NOT NULL,
  daily_max_s_m_s INTEGER DEFAULT 5 NOT NULL,
  daily_max_email INTEGER DEFAULT 20 NOT NULL,
  channel_preferences TEXT NOT NULL
);

-- Table: notification_template
CREATE TABLE IF NOT EXISTS notification_template (
  id UUID PRIMARY KEY DEFAULT cuid(,
  type notification_type NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  channel_templates TEXT NOT NULL
);

-- Table: notification_log
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT cuid(,
  notification_id TEXT NOT NULL,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  external_id TEXT,
  tracking_data JSONB,
  cost DECIMAL(10,2),
  currency TEXT,
  processing_time INTEGER,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: inventory_item
CREATE TABLE IF NOT EXISTS inventory_item (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  original_quantity DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  purchase_price DECIMAL(10,2),
  purchase_source TEXT,
  expiry_date TIMESTAMP WITH TIME ZONE,
  production_date TIMESTAMP WITH TIME ZONE,
  days_to_expiry INTEGER,
  storage_location storage_location DEFAULT PANTRY NOT NULL,
  storage_notes TEXT,
  status inventory_status DEFAULT FRESH NOT NULL,
  min_stock_threshold DECIMAL(10,2),
  is_low_stock BOOLEAN DEFAULT FALSE NOT NULL,
  barcode TEXT,
  brand TEXT,
  package_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  usage_records InventoryUsage[] NOT NULL,
  waste_records WasteLog[] NOT NULL
);

-- Table: inventory_usage
CREATE TABLE IF NOT EXISTS inventory_usage (
  id UUID PRIMARY KEY DEFAULT cuid(,
  inventory_item_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  used_quantity DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  usage_type TEXT NOT NULL,
  related_id TEXT,
  related_type TEXT,
  notes TEXT,
  recipe_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL
);

-- Table: waste_log
CREATE TABLE IF NOT EXISTS waste_log (
  id UUID PRIMARY KEY DEFAULT cuid(,
  inventory_item_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  wasted_quantity DECIMAL(10,2) NOT NULL,
  waste_reason waste_reason NOT NULL,
  wasted_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  estimated_cost DECIMAL(10,2),
  notes TEXT,
  preventable BOOLEAN DEFAULT TRUE NOT NULL,
  prevention_tip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL
);

-- Table: device_connection
CREATE TABLE IF NOT EXISTS device_connection (
  id UUID PRIMARY KEY DEFAULT cuid(,
  member_id TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  device_type device_type NOT NULL,
  device_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT,
  firmware_version TEXT,
  platform platform_type NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status sync_status DEFAULT PENDING NOT NULL,
  sync_interval INTEGER DEFAULT 1800 NOT NULL,
  permissions device_permission[] NOT NULL,
  data_types health_data_type[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_auto_sync BOOLEAN DEFAULT TRUE NOT NULL,
  connection_date TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  disconnection_date TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  error_count INTEGER DEFAULT 0 NOT NULL,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now( NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ========================================
-- Foreign Key Constraints
-- ========================================

ALTER TABLE user ADD CONSTRAINT fk_user_created_families
  FOREIGN KEY (created_families) REFERENCES family(id)
  ON DELETE CASCADE;

ALTER TABLE user ADD CONSTRAINT fk_user_orders
  FOREIGN KEY (orders) REFERENCES order(id)
  ON DELETE CASCADE;

ALTER TABLE user ADD CONSTRAINT fk_user_platform_accounts
  FOREIGN KEY (platform_accounts) REFERENCES platform_account(id)
  ON DELETE CASCADE;

ALTER TABLE family ADD CONSTRAINT fk_family_activities
  FOREIGN KEY (activities) REFERENCES activity(id)
  ON DELETE CASCADE;

ALTER TABLE family ADD CONSTRAINT fk_family_creator
  FOREIGN KEY (creator) REFERENCES user(id)
  ON DELETE CASCADE;

ALTER TABLE family ADD CONSTRAINT fk_family_goals
  FOREIGN KEY (goals) REFERENCES family_goal(id)
  ON DELETE CASCADE;

ALTER TABLE family ADD CONSTRAINT fk_family_tasks
  FOREIGN KEY (tasks) REFERENCES task(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_member_activities
  FOREIGN KEY (member_activities) REFERENCES activity(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_member_comments
  FOREIGN KEY (member_comments) REFERENCES comment(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_devices
  FOREIGN KEY (devices) REFERENCES device_connection(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_created_goals
  FOREIGN KEY (created_goals) REFERENCES family_goal(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_family
  FOREIGN KEY (family) REFERENCES family(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_user
  FOREIGN KEY (user) REFERENCES user(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_inventory_items
  FOREIGN KEY (inventory_items) REFERENCES inventory_item(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_inventory_usages
  FOREIGN KEY (inventory_usages) REFERENCES inventory_usage(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_notification_preference
  FOREIGN KEY (notification_preference) REFERENCES notification_preference(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_notifications
  FOREIGN KEY (notifications) REFERENCES notification(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_added_shopping_items
  FOREIGN KEY (added_shopping_items) REFERENCES shopping_item(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_assigned_shopping_items
  FOREIGN KEY (assigned_shopping_items) REFERENCES shopping_item(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_purchased_shopping_items
  FOREIGN KEY (purchased_shopping_items) REFERENCES shopping_item(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_assigned_tasks
  FOREIGN KEY (assigned_tasks) REFERENCES task(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_created_tasks
  FOREIGN KEY (created_tasks) REFERENCES task(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_waste_logs
  FOREIGN KEY (waste_logs) REFERENCES waste_log(id)
  ON DELETE CASCADE;

ALTER TABLE family_member ADD CONSTRAINT fk_family_member_participated_goals
  FOREIGN KEY (participated_goals) REFERENCES family_goal(id)
  ON DELETE CASCADE;

ALTER TABLE health_goal ADD CONSTRAINT fk_health_goal_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE allergy ADD CONSTRAINT fk_allergy_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE dietary_preference ADD CONSTRAINT fk_dietary_preference_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE food ADD CONSTRAINT fk_food_substitute_foods
  FOREIGN KEY (substitute_foods) REFERENCES ingredient_substitution(id)
  ON DELETE CASCADE;

ALTER TABLE food ADD CONSTRAINT fk_food_inventory_items
  FOREIGN KEY (inventory_items) REFERENCES inventory_item(id)
  ON DELETE CASCADE;

ALTER TABLE food ADD CONSTRAINT fk_food_platform_products
  FOREIGN KEY (platform_products) REFERENCES platform_product(id)
  ON DELETE CASCADE;

ALTER TABLE food ADD CONSTRAINT fk_food_recipe_ingredients
  FOREIGN KEY (recipe_ingredients) REFERENCES recipe_ingredient(id)
  ON DELETE CASCADE;

ALTER TABLE health_data ADD CONSTRAINT fk_health_data_device_connection
  FOREIGN KEY (device_connection) REFERENCES device_connection(id)
  ON DELETE CASCADE;

ALTER TABLE health_data ADD CONSTRAINT fk_health_data_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE health_reminder ADD CONSTRAINT fk_health_reminder_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE meal_plan ADD CONSTRAINT fk_meal_plan_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE meal ADD CONSTRAINT fk_meal_plan
  FOREIGN KEY (plan) REFERENCES meal_plan(id)
  ON DELETE CASCADE;

ALTER TABLE meal_ingredient ADD CONSTRAINT fk_meal_ingredient_food
  FOREIGN KEY (food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE meal_ingredient ADD CONSTRAINT fk_meal_ingredient_meal
  FOREIGN KEY (meal) REFERENCES meal(id)
  ON DELETE CASCADE;

ALTER TABLE medical_report ADD CONSTRAINT fk_medical_report_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE medical_indicator ADD CONSTRAINT fk_medical_indicator_report
  FOREIGN KEY (report) REFERENCES medical_report(id)
  ON DELETE CASCADE;

ALTER TABLE shopping_list_share ADD CONSTRAINT fk_shopping_list_share_list
  FOREIGN KEY (list) REFERENCES shopping_list(id)
  ON DELETE CASCADE;

ALTER TABLE shopping_list ADD CONSTRAINT fk_shopping_list_plan
  FOREIGN KEY (plan) REFERENCES meal_plan(id)
  ON DELETE CASCADE;

ALTER TABLE shopping_item ADD CONSTRAINT fk_shopping_item_added_by_member
  FOREIGN KEY (added_by_member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE shopping_item ADD CONSTRAINT fk_shopping_item_assignee
  FOREIGN KEY (assignee) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE shopping_item ADD CONSTRAINT fk_shopping_item_food
  FOREIGN KEY (food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE shopping_item ADD CONSTRAINT fk_shopping_item_list
  FOREIGN KEY (list) REFERENCES shopping_list(id)
  ON DELETE CASCADE;

ALTER TABLE shopping_item ADD CONSTRAINT fk_shopping_item_purchased_by_member
  FOREIGN KEY (purchased_by_member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE meal_log ADD CONSTRAINT fk_meal_log_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE meal_log_food ADD CONSTRAINT fk_meal_log_food_food
  FOREIGN KEY (food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE meal_log_food ADD CONSTRAINT fk_meal_log_food_meal_log
  FOREIGN KEY (meal_log) REFERENCES meal_log(id)
  ON DELETE CASCADE;

ALTER TABLE food_photo ADD CONSTRAINT fk_food_photo_meal_log
  FOREIGN KEY (meal_log) REFERENCES meal_log(id)
  ON DELETE CASCADE;

ALTER TABLE tracking_streak ADD CONSTRAINT fk_tracking_streak_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE quick_template ADD CONSTRAINT fk_quick_template_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE template_food ADD CONSTRAINT fk_template_food_food
  FOREIGN KEY (food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE template_food ADD CONSTRAINT fk_template_food_template
  FOREIGN KEY (template) REFERENCES quick_template(id)
  ON DELETE CASCADE;

ALTER TABLE daily_nutrition_target ADD CONSTRAINT fk_daily_nutrition_target_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE auxiliary_tracking ADD CONSTRAINT fk_auxiliary_tracking_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE health_report ADD CONSTRAINT fk_health_report_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE health_score ADD CONSTRAINT fk_health_score_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE trend_data ADD CONSTRAINT fk_trend_data_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE health_anomaly ADD CONSTRAINT fk_health_anomaly_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE a_i_advice ADD CONSTRAINT fk_a_i_advice_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE a_i_conversation ADD CONSTRAINT fk_a_i_conversation_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE budget ADD CONSTRAINT fk_budget_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE spending ADD CONSTRAINT fk_spending_budget
  FOREIGN KEY (budget) REFERENCES budget(id)
  ON DELETE CASCADE;

ALTER TABLE price_history ADD CONSTRAINT fk_price_history_food
  FOREIGN KEY (food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE savings_recommendation ADD CONSTRAINT fk_savings_recommendation_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE budget_alert ADD CONSTRAINT fk_budget_alert_budget
  FOREIGN KEY (budget) REFERENCES budget(id)
  ON DELETE CASCADE;

ALTER TABLE platform_account ADD CONSTRAINT fk_platform_account_user
  FOREIGN KEY (user) REFERENCES user(id)
  ON DELETE CASCADE;

ALTER TABLE order ADD CONSTRAINT fk_order_account
  FOREIGN KEY (account) REFERENCES platform_account(id)
  ON DELETE CASCADE;

ALTER TABLE order ADD CONSTRAINT fk_order_user
  FOREIGN KEY (user) REFERENCES user(id)
  ON DELETE CASCADE;

ALTER TABLE platform_product ADD CONSTRAINT fk_platform_product_matched_food
  FOREIGN KEY (matched_food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_ingredient ADD CONSTRAINT fk_recipe_ingredient_substitutions
  FOREIGN KEY (substitutions) REFERENCES ingredient_substitution(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_ingredient ADD CONSTRAINT fk_recipe_ingredient_food
  FOREIGN KEY (food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_ingredient ADD CONSTRAINT fk_recipe_ingredient_recipe
  FOREIGN KEY (recipe) REFERENCES recipe(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_instruction ADD CONSTRAINT fk_recipe_instruction_recipe
  FOREIGN KEY (recipe) REFERENCES recipe(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_rating ADD CONSTRAINT fk_recipe_rating_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_rating ADD CONSTRAINT fk_recipe_rating_recipe
  FOREIGN KEY (recipe) REFERENCES recipe(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_favorite ADD CONSTRAINT fk_recipe_favorite_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_favorite ADD CONSTRAINT fk_recipe_favorite_recipe
  FOREIGN KEY (recipe) REFERENCES recipe(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_view ADD CONSTRAINT fk_recipe_view_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE recipe_view ADD CONSTRAINT fk_recipe_view_recipe
  FOREIGN KEY (recipe) REFERENCES recipe(id)
  ON DELETE CASCADE;

ALTER TABLE ingredient_substitution ADD CONSTRAINT fk_ingredient_substitution_original_ingredient
  FOREIGN KEY (original_ingredient) REFERENCES recipe_ingredient(id)
  ON DELETE CASCADE;

ALTER TABLE ingredient_substitution ADD CONSTRAINT fk_ingredient_substitution_substitute_food
  FOREIGN KEY (substitute_food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE task ADD CONSTRAINT fk_task_comments
  FOREIGN KEY (comments) REFERENCES comment(id)
  ON DELETE CASCADE;

ALTER TABLE task ADD CONSTRAINT fk_task_assignee
  FOREIGN KEY (assignee) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE task ADD CONSTRAINT fk_task_creator
  FOREIGN KEY (creator) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE task ADD CONSTRAINT fk_task_family
  FOREIGN KEY (family) REFERENCES family(id)
  ON DELETE CASCADE;

ALTER TABLE activity ADD CONSTRAINT fk_activity_family
  FOREIGN KEY (family) REFERENCES family(id)
  ON DELETE CASCADE;

ALTER TABLE activity ADD CONSTRAINT fk_activity_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE activity ADD CONSTRAINT fk_activity_comments
  FOREIGN KEY (comments) REFERENCES comment(id)
  ON DELETE CASCADE;

ALTER TABLE comment ADD CONSTRAINT fk_comment_activity
  FOREIGN KEY (activity) REFERENCES activity(id)
  ON DELETE CASCADE;

ALTER TABLE comment ADD CONSTRAINT fk_comment_author
  FOREIGN KEY (author) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE comment ADD CONSTRAINT fk_comment_task
  FOREIGN KEY (task) REFERENCES task(id)
  ON DELETE CASCADE;

ALTER TABLE family_goal ADD CONSTRAINT fk_family_goal_creator
  FOREIGN KEY (creator) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE family_goal ADD CONSTRAINT fk_family_goal_family
  FOREIGN KEY (family) REFERENCES family(id)
  ON DELETE CASCADE;

ALTER TABLE family_goal ADD CONSTRAINT fk_family_goal_participants
  FOREIGN KEY (participants) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE shared_content ADD CONSTRAINT fk_shared_content_community_post
  FOREIGN KEY (community_post) REFERENCES community_post(id)
  ON DELETE CASCADE;

ALTER TABLE shared_content ADD CONSTRAINT fk_shared_content_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE shared_content ADD CONSTRAINT fk_shared_content_achievements
  FOREIGN KEY (achievements) REFERENCES achievement(id)
  ON DELETE CASCADE;

ALTER TABLE share_tracking ADD CONSTRAINT fk_share_tracking_shared_content
  FOREIGN KEY (shared_content) REFERENCES shared_content(id)
  ON DELETE CASCADE;

ALTER TABLE achievement ADD CONSTRAINT fk_achievement_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE achievement ADD CONSTRAINT fk_achievement_shared_contents
  FOREIGN KEY (shared_contents) REFERENCES shared_content(id)
  ON DELETE CASCADE;

ALTER TABLE leaderboard_entry ADD CONSTRAINT fk_leaderboard_entry_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE community_post ADD CONSTRAINT fk_community_post_shared_content
  FOREIGN KEY (shared_content) REFERENCES shared_content(id)
  ON DELETE CASCADE;

ALTER TABLE community_post ADD CONSTRAINT fk_community_post_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE community_comment ADD CONSTRAINT fk_community_comment_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE community_comment ADD CONSTRAINT fk_community_comment_parent
  FOREIGN KEY (parent) REFERENCES community_comment(id)
  ON DELETE CASCADE;

ALTER TABLE community_comment ADD CONSTRAINT fk_community_comment_replies
  FOREIGN KEY (replies) REFERENCES community_comment(id)
  ON DELETE CASCADE;

ALTER TABLE community_comment ADD CONSTRAINT fk_community_comment_post
  FOREIGN KEY (post) REFERENCES community_post(id)
  ON DELETE CASCADE;

ALTER TABLE notification_log ADD CONSTRAINT fk_notification_log_notification
  FOREIGN KEY (notification) REFERENCES notification(id)
  ON DELETE CASCADE;

ALTER TABLE inventory_item ADD CONSTRAINT fk_inventory_item_food
  FOREIGN KEY (food) REFERENCES food(id)
  ON DELETE CASCADE;

ALTER TABLE inventory_item ADD CONSTRAINT fk_inventory_item_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE inventory_usage ADD CONSTRAINT fk_inventory_usage_inventory_item
  FOREIGN KEY (inventory_item) REFERENCES inventory_item(id)
  ON DELETE CASCADE;

ALTER TABLE inventory_usage ADD CONSTRAINT fk_inventory_usage_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE waste_log ADD CONSTRAINT fk_waste_log_inventory_item
  FOREIGN KEY (inventory_item) REFERENCES inventory_item(id)
  ON DELETE CASCADE;

ALTER TABLE waste_log ADD CONSTRAINT fk_waste_log_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE device_connection ADD CONSTRAINT fk_device_connection_member
  FOREIGN KEY (member) REFERENCES family_member(id)
  ON DELETE CASCADE;

ALTER TABLE device_connection ADD CONSTRAINT fk_device_connection_health_data
  FOREIGN KEY (health_data) REFERENCES health_data(id)
  ON DELETE CASCADE;

-- ========================================
-- Performance Indexes
-- ========================================

CREATE INDEX idx_user_created_families ON user(created_families);
CREATE INDEX idx_user_orders ON user(orders);
CREATE INDEX idx_user_platform_accounts ON user(platform_accounts);
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_created_at ON user(created_at);
CREATE INDEX idx_user_updated_at ON user(updated_at);
CREATE INDEX idx_user_deleted_at ON user(deleted_at);
CREATE INDEX idx_family_activities ON family(activities);
CREATE INDEX idx_family_creator ON family(creator);
CREATE INDEX idx_family_goals ON family(goals);
CREATE INDEX idx_family_tasks ON family(tasks);
CREATE INDEX idx_family_invite_code ON family(invite_code);
CREATE INDEX idx_family_created_at ON family(created_at);
CREATE INDEX idx_family_updated_at ON family(updated_at);
CREATE INDEX idx_family_deleted_at ON family(deleted_at);
CREATE INDEX idx_family_member_member_activities ON family_member(member_activities);
CREATE INDEX idx_family_member_member_comments ON family_member(member_comments);
CREATE INDEX idx_family_member_devices ON family_member(devices);
CREATE INDEX idx_family_member_created_goals ON family_member(created_goals);
CREATE INDEX idx_family_member_family ON family_member(family);
CREATE INDEX idx_family_member_user ON family_member(user);
CREATE INDEX idx_family_member_inventory_items ON family_member(inventory_items);
CREATE INDEX idx_family_member_inventory_usages ON family_member(inventory_usages);
CREATE INDEX idx_family_member_notification_preference ON family_member(notification_preference);
CREATE INDEX idx_family_member_notifications ON family_member(notifications);
CREATE INDEX idx_family_member_added_shopping_items ON family_member(added_shopping_items);
CREATE INDEX idx_family_member_assigned_shopping_items ON family_member(assigned_shopping_items);
CREATE INDEX idx_family_member_purchased_shopping_items ON family_member(purchased_shopping_items);
CREATE INDEX idx_family_member_assigned_tasks ON family_member(assigned_tasks);
CREATE INDEX idx_family_member_created_tasks ON family_member(created_tasks);
CREATE INDEX idx_family_member_waste_logs ON family_member(waste_logs);
CREATE INDEX idx_family_member_participated_goals ON family_member(participated_goals);
CREATE INDEX idx_family_member_user_id ON family_member(user_id);
CREATE INDEX idx_family_member_created_at ON family_member(created_at);
CREATE INDEX idx_family_member_updated_at ON family_member(updated_at);
CREATE INDEX idx_family_member_deleted_at ON family_member(deleted_at);
CREATE INDEX idx_family_member_user_id ON family_member(user_id);
CREATE INDEX idx_family_member_family_id ON family_member(family_id);
CREATE INDEX idx_health_goal_member ON health_goal(member);
CREATE INDEX idx_health_goal_created_at ON health_goal(created_at);
CREATE INDEX idx_health_goal_updated_at ON health_goal(updated_at);
CREATE INDEX idx_health_goal_deleted_at ON health_goal(deleted_at);
CREATE INDEX idx_health_goal_member_id ON health_goal(member_id);
CREATE INDEX idx_allergy_member ON allergy(member);
CREATE INDEX idx_allergy_created_at ON allergy(created_at);
CREATE INDEX idx_allergy_updated_at ON allergy(updated_at);
CREATE INDEX idx_allergy_deleted_at ON allergy(deleted_at);
CREATE INDEX idx_allergy_member_id ON allergy(member_id);
CREATE INDEX idx_dietary_preference_member ON dietary_preference(member);
CREATE INDEX idx_dietary_preference_member_id ON dietary_preference(member_id);
CREATE INDEX idx_dietary_preference_created_at ON dietary_preference(created_at);
CREATE INDEX idx_dietary_preference_updated_at ON dietary_preference(updated_at);
CREATE INDEX idx_dietary_preference_deleted_at ON dietary_preference(deleted_at);
CREATE INDEX idx_dietary_preference_member_id ON dietary_preference(member_id);
CREATE INDEX idx_family_invitation_invite_code ON family_invitation(invite_code);
CREATE INDEX idx_family_invitation_created_at ON family_invitation(created_at);
CREATE INDEX idx_family_invitation_updated_at ON family_invitation(updated_at);
CREATE INDEX idx_family_invitation_family_id ON family_invitation(family_id);
CREATE INDEX idx_food_substitute_foods ON food(substitute_foods);
CREATE INDEX idx_food_inventory_items ON food(inventory_items);
CREATE INDEX idx_food_platform_products ON food(platform_products);
CREATE INDEX idx_food_recipe_ingredients ON food(recipe_ingredients);
CREATE INDEX idx_food_created_at ON food(created_at);
CREATE INDEX idx_food_updated_at ON food(updated_at);
CREATE INDEX idx_health_data_device_connection ON health_data(device_connection);
CREATE INDEX idx_health_data_member ON health_data(member);
CREATE INDEX idx_health_data_created_at ON health_data(created_at);
CREATE INDEX idx_health_data_updated_at ON health_data(updated_at);
CREATE INDEX idx_health_data_member_id ON health_data(member_id);
CREATE INDEX idx_health_reminder_member ON health_reminder(member);
CREATE INDEX idx_health_reminder_created_at ON health_reminder(created_at);
CREATE INDEX idx_health_reminder_updated_at ON health_reminder(updated_at);
CREATE INDEX idx_health_reminder_member_id ON health_reminder(member_id);
CREATE INDEX idx_meal_plan_member ON meal_plan(member);
CREATE INDEX idx_meal_plan_created_at ON meal_plan(created_at);
CREATE INDEX idx_meal_plan_updated_at ON meal_plan(updated_at);
CREATE INDEX idx_meal_plan_deleted_at ON meal_plan(deleted_at);
CREATE INDEX idx_meal_plan_member_id ON meal_plan(member_id);
CREATE INDEX idx_meal_plan ON meal(plan);
CREATE INDEX idx_meal_created_at ON meal(created_at);
CREATE INDEX idx_meal_updated_at ON meal(updated_at);
CREATE INDEX idx_meal_ingredient_food ON meal_ingredient(food);
CREATE INDEX idx_meal_ingredient_meal ON meal_ingredient(meal);
CREATE INDEX idx_medical_report_member ON medical_report(member);
CREATE INDEX idx_medical_report_created_at ON medical_report(created_at);
CREATE INDEX idx_medical_report_updated_at ON medical_report(updated_at);
CREATE INDEX idx_medical_report_deleted_at ON medical_report(deleted_at);
CREATE INDEX idx_medical_report_member_id ON medical_report(member_id);
CREATE INDEX idx_medical_indicator_report ON medical_indicator(report);
CREATE INDEX idx_medical_indicator_created_at ON medical_indicator(created_at);
CREATE INDEX idx_medical_indicator_updated_at ON medical_indicator(updated_at);
CREATE INDEX idx_shopping_list_share_list ON shopping_list_share(list);
CREATE INDEX idx_shopping_list_share_token ON shopping_list_share(token);
CREATE INDEX idx_shopping_list_share_created_at ON shopping_list_share(created_at);
CREATE INDEX idx_shopping_list_share_updated_at ON shopping_list_share(updated_at);
CREATE INDEX idx_shopping_list_plan ON shopping_list(plan);
CREATE INDEX idx_shopping_list_created_at ON shopping_list(created_at);
CREATE INDEX idx_shopping_list_updated_at ON shopping_list(updated_at);
CREATE INDEX idx_shopping_item_added_by_member ON shopping_item(added_by_member);
CREATE INDEX idx_shopping_item_assignee ON shopping_item(assignee);
CREATE INDEX idx_shopping_item_food ON shopping_item(food);
CREATE INDEX idx_shopping_item_list ON shopping_item(list);
CREATE INDEX idx_shopping_item_purchased_by_member ON shopping_item(purchased_by_member);
CREATE INDEX idx_shopping_item_created_at ON shopping_item(created_at);
CREATE INDEX idx_shopping_item_updated_at ON shopping_item(updated_at);
CREATE INDEX idx_meal_log_member ON meal_log(member);
CREATE INDEX idx_meal_log_created_at ON meal_log(created_at);
CREATE INDEX idx_meal_log_updated_at ON meal_log(updated_at);
CREATE INDEX idx_meal_log_deleted_at ON meal_log(deleted_at);
CREATE INDEX idx_meal_log_member_id ON meal_log(member_id);
CREATE INDEX idx_meal_log_food_food ON meal_log_food(food);
CREATE INDEX idx_meal_log_food_meal_log ON meal_log_food(meal_log);
CREATE INDEX idx_meal_log_food_created_at ON meal_log_food(created_at);
CREATE INDEX idx_meal_log_food_updated_at ON meal_log_food(updated_at);
CREATE INDEX idx_food_photo_meal_log ON food_photo(meal_log);
CREATE INDEX idx_food_photo_created_at ON food_photo(created_at);
CREATE INDEX idx_food_photo_updated_at ON food_photo(updated_at);
CREATE INDEX idx_tracking_streak_member ON tracking_streak(member);
CREATE INDEX idx_tracking_streak_member_id ON tracking_streak(member_id);
CREATE INDEX idx_tracking_streak_created_at ON tracking_streak(created_at);
CREATE INDEX idx_tracking_streak_updated_at ON tracking_streak(updated_at);
CREATE INDEX idx_tracking_streak_member_id ON tracking_streak(member_id);
CREATE INDEX idx_quick_template_member ON quick_template(member);
CREATE INDEX idx_quick_template_created_at ON quick_template(created_at);
CREATE INDEX idx_quick_template_updated_at ON quick_template(updated_at);
CREATE INDEX idx_quick_template_deleted_at ON quick_template(deleted_at);
CREATE INDEX idx_quick_template_member_id ON quick_template(member_id);
CREATE INDEX idx_template_food_food ON template_food(food);
CREATE INDEX idx_template_food_template ON template_food(template);
CREATE INDEX idx_daily_nutrition_target_member ON daily_nutrition_target(member);
CREATE INDEX idx_daily_nutrition_target_created_at ON daily_nutrition_target(created_at);
CREATE INDEX idx_daily_nutrition_target_updated_at ON daily_nutrition_target(updated_at);
CREATE INDEX idx_daily_nutrition_target_member_id ON daily_nutrition_target(member_id);
CREATE INDEX idx_auxiliary_tracking_member ON auxiliary_tracking(member);
CREATE INDEX idx_auxiliary_tracking_created_at ON auxiliary_tracking(created_at);
CREATE INDEX idx_auxiliary_tracking_updated_at ON auxiliary_tracking(updated_at);
CREATE INDEX idx_auxiliary_tracking_member_id ON auxiliary_tracking(member_id);
CREATE INDEX idx_health_report_member ON health_report(member);
CREATE INDEX idx_health_report_share_token ON health_report(share_token);
CREATE INDEX idx_health_report_created_at ON health_report(created_at);
CREATE INDEX idx_health_report_updated_at ON health_report(updated_at);
CREATE INDEX idx_health_report_deleted_at ON health_report(deleted_at);
CREATE INDEX idx_health_report_member_id ON health_report(member_id);
CREATE INDEX idx_health_score_member ON health_score(member);
CREATE INDEX idx_health_score_created_at ON health_score(created_at);
CREATE INDEX idx_health_score_updated_at ON health_score(updated_at);
CREATE INDEX idx_health_score_member_id ON health_score(member_id);
CREATE INDEX idx_trend_data_member ON trend_data(member);
CREATE INDEX idx_trend_data_created_at ON trend_data(created_at);
CREATE INDEX idx_trend_data_updated_at ON trend_data(updated_at);
CREATE INDEX idx_trend_data_member_id ON trend_data(member_id);
CREATE INDEX idx_health_anomaly_member ON health_anomaly(member);
CREATE INDEX idx_health_anomaly_created_at ON health_anomaly(created_at);
CREATE INDEX idx_health_anomaly_updated_at ON health_anomaly(updated_at);
CREATE INDEX idx_health_anomaly_deleted_at ON health_anomaly(deleted_at);
CREATE INDEX idx_health_anomaly_member_id ON health_anomaly(member_id);
CREATE INDEX idx_a_i_advice_member ON a_i_advice(member);
CREATE INDEX idx_a_i_advice_created_at ON a_i_advice(created_at);
CREATE INDEX idx_a_i_advice_updated_at ON a_i_advice(updated_at);
CREATE INDEX idx_a_i_advice_deleted_at ON a_i_advice(deleted_at);
CREATE INDEX idx_a_i_advice_member_id ON a_i_advice(member_id);
CREATE INDEX idx_a_i_conversation_member ON a_i_conversation(member);
CREATE INDEX idx_a_i_conversation_created_at ON a_i_conversation(created_at);
CREATE INDEX idx_a_i_conversation_updated_at ON a_i_conversation(updated_at);
CREATE INDEX idx_a_i_conversation_deleted_at ON a_i_conversation(deleted_at);
CREATE INDEX idx_a_i_conversation_member_id ON a_i_conversation(member_id);
CREATE INDEX idx_prompt_template_created_at ON prompt_template(created_at);
CREATE INDEX idx_prompt_template_updated_at ON prompt_template(updated_at);
CREATE INDEX idx_user_consent_created_at ON user_consent(created_at);
CREATE INDEX idx_user_consent_updated_at ON user_consent(updated_at);
CREATE INDEX idx_user_consent_user_id ON user_consent(user_id);
CREATE INDEX idx_budget_member ON budget(member);
CREATE INDEX idx_budget_created_at ON budget(created_at);
CREATE INDEX idx_budget_updated_at ON budget(updated_at);
CREATE INDEX idx_budget_deleted_at ON budget(deleted_at);
CREATE INDEX idx_budget_member_id ON budget(member_id);
CREATE INDEX idx_spending_budget ON spending(budget);
CREATE INDEX idx_spending_created_at ON spending(created_at);
CREATE INDEX idx_spending_updated_at ON spending(updated_at);
CREATE INDEX idx_spending_deleted_at ON spending(deleted_at);
CREATE INDEX idx_price_history_food ON price_history(food);
CREATE INDEX idx_price_history_created_at ON price_history(created_at);
CREATE INDEX idx_price_history_updated_at ON price_history(updated_at);
CREATE INDEX idx_price_history_deleted_at ON price_history(deleted_at);
CREATE INDEX idx_savings_recommendation_member ON savings_recommendation(member);
CREATE INDEX idx_savings_recommendation_created_at ON savings_recommendation(created_at);
CREATE INDEX idx_savings_recommendation_updated_at ON savings_recommendation(updated_at);
CREATE INDEX idx_savings_recommendation_deleted_at ON savings_recommendation(deleted_at);
CREATE INDEX idx_savings_recommendation_member_id ON savings_recommendation(member_id);
CREATE INDEX idx_budget_alert_budget ON budget_alert(budget);
CREATE INDEX idx_budget_alert_created_at ON budget_alert(created_at);
CREATE INDEX idx_budget_alert_updated_at ON budget_alert(updated_at);
CREATE INDEX idx_platform_account_user ON platform_account(user);
CREATE INDEX idx_platform_account_created_at ON platform_account(created_at);
CREATE INDEX idx_platform_account_updated_at ON platform_account(updated_at);
CREATE INDEX idx_platform_account_deleted_at ON platform_account(deleted_at);
CREATE INDEX idx_platform_account_user_id ON platform_account(user_id);
CREATE INDEX idx_order_account ON order(account);
CREATE INDEX idx_order_user ON order(user);
CREATE INDEX idx_order_platform_order_id ON order(platform_order_id);
CREATE INDEX idx_order_created_at ON order(created_at);
CREATE INDEX idx_order_updated_at ON order(updated_at);
CREATE INDEX idx_order_deleted_at ON order(deleted_at);
CREATE INDEX idx_order_user_id ON order(user_id);
CREATE INDEX idx_platform_product_matched_food ON platform_product(matched_food);
CREATE INDEX idx_platform_product_created_at ON platform_product(created_at);
CREATE INDEX idx_platform_product_updated_at ON platform_product(updated_at);
CREATE INDEX idx_platform_product_deleted_at ON platform_product(deleted_at);
CREATE INDEX idx_recipe_created_at ON recipe(created_at);
CREATE INDEX idx_recipe_updated_at ON recipe(updated_at);
CREATE INDEX idx_recipe_deleted_at ON recipe(deleted_at);
CREATE INDEX idx_recipe_ingredient_substitutions ON recipe_ingredient(substitutions);
CREATE INDEX idx_recipe_ingredient_food ON recipe_ingredient(food);
CREATE INDEX idx_recipe_ingredient_recipe ON recipe_ingredient(recipe);
CREATE INDEX idx_recipe_instruction_recipe ON recipe_instruction(recipe);
CREATE INDEX idx_recipe_rating_member ON recipe_rating(member);
CREATE INDEX idx_recipe_rating_recipe ON recipe_rating(recipe);
CREATE INDEX idx_recipe_rating_member_id ON recipe_rating(member_id);
CREATE INDEX idx_recipe_favorite_member ON recipe_favorite(member);
CREATE INDEX idx_recipe_favorite_recipe ON recipe_favorite(recipe);
CREATE INDEX idx_recipe_favorite_member_id ON recipe_favorite(member_id);
CREATE INDEX idx_recipe_view_member ON recipe_view(member);
CREATE INDEX idx_recipe_view_recipe ON recipe_view(recipe);
CREATE INDEX idx_recipe_view_member_id ON recipe_view(member_id);
CREATE INDEX idx_ingredient_substitution_original_ingredient ON ingredient_substitution(original_ingredient);
CREATE INDEX idx_ingredient_substitution_substitute_food ON ingredient_substitution(substitute_food);
CREATE INDEX idx_user_preference_member_id ON user_preference(member_id);
CREATE INDEX idx_user_preference_member_id ON user_preference(member_id);
CREATE INDEX idx_task_comments ON task(comments);
CREATE INDEX idx_task_assignee ON task(assignee);
CREATE INDEX idx_task_creator ON task(creator);
CREATE INDEX idx_task_family ON task(family);
CREATE INDEX idx_task_created_at ON task(created_at);
CREATE INDEX idx_task_updated_at ON task(updated_at);
CREATE INDEX idx_task_family_id ON task(family_id);
CREATE INDEX idx_activity_family ON activity(family);
CREATE INDEX idx_activity_member ON activity(member);
CREATE INDEX idx_activity_comments ON activity(comments);
CREATE INDEX idx_activity_created_at ON activity(created_at);
CREATE INDEX idx_activity_member_id ON activity(member_id);
CREATE INDEX idx_activity_family_id ON activity(family_id);
CREATE INDEX idx_comment_activity ON comment(activity);
CREATE INDEX idx_comment_author ON comment(author);
CREATE INDEX idx_comment_task ON comment(task);
CREATE INDEX idx_comment_created_at ON comment(created_at);
CREATE INDEX idx_comment_updated_at ON comment(updated_at);
CREATE INDEX idx_comment_deleted_at ON comment(deleted_at);
CREATE INDEX idx_family_goal_creator ON family_goal(creator);
CREATE INDEX idx_family_goal_family ON family_goal(family);
CREATE INDEX idx_family_goal_participants ON family_goal(participants);
CREATE INDEX idx_family_goal_created_at ON family_goal(created_at);
CREATE INDEX idx_family_goal_updated_at ON family_goal(updated_at);
CREATE INDEX idx_family_goal_family_id ON family_goal(family_id);
CREATE INDEX idx_shared_content_community_post ON shared_content(community_post);
CREATE INDEX idx_shared_content_member ON shared_content(member);
CREATE INDEX idx_shared_content_achievements ON shared_content(achievements);
CREATE INDEX idx_shared_content_share_token ON shared_content(share_token);
CREATE INDEX idx_shared_content_community_post_id ON shared_content(community_post_id);
CREATE INDEX idx_shared_content_created_at ON shared_content(created_at);
CREATE INDEX idx_shared_content_updated_at ON shared_content(updated_at);
CREATE INDEX idx_shared_content_deleted_at ON shared_content(deleted_at);
CREATE INDEX idx_shared_content_member_id ON shared_content(member_id);
CREATE INDEX idx_share_tracking_shared_content ON share_tracking(shared_content);
CREATE INDEX idx_achievement_member ON achievement(member);
CREATE INDEX idx_achievement_shared_contents ON achievement(shared_contents);
CREATE INDEX idx_achievement_created_at ON achievement(created_at);
CREATE INDEX idx_achievement_updated_at ON achievement(updated_at);
CREATE INDEX idx_achievement_member_id ON achievement(member_id);
CREATE INDEX idx_leaderboard_entry_member ON leaderboard_entry(member);
CREATE INDEX idx_leaderboard_entry_created_at ON leaderboard_entry(created_at);
CREATE INDEX idx_leaderboard_entry_updated_at ON leaderboard_entry(updated_at);
CREATE INDEX idx_leaderboard_entry_member_id ON leaderboard_entry(member_id);
CREATE INDEX idx_community_post_shared_content ON community_post(shared_content);
CREATE INDEX idx_community_post_member ON community_post(member);
CREATE INDEX idx_community_post_created_at ON community_post(created_at);
CREATE INDEX idx_community_post_updated_at ON community_post(updated_at);
CREATE INDEX idx_community_post_deleted_at ON community_post(deleted_at);
CREATE INDEX idx_community_post_member_id ON community_post(member_id);
CREATE INDEX idx_community_comment_member ON community_comment(member);
CREATE INDEX idx_community_comment_parent ON community_comment(parent);
CREATE INDEX idx_community_comment_replies ON community_comment(replies);
CREATE INDEX idx_community_comment_post ON community_comment(post);
CREATE INDEX idx_community_comment_created_at ON community_comment(created_at);
CREATE INDEX idx_community_comment_updated_at ON community_comment(updated_at);
CREATE INDEX idx_community_comment_deleted_at ON community_comment(deleted_at);
CREATE INDEX idx_community_comment_member_id ON community_comment(member_id);
CREATE INDEX idx_notification_member_id ON notification(member_id);
CREATE INDEX idx_notification_preference_member_id ON notification_preference(member_id);
CREATE INDEX idx_notification_preference_member_id ON notification_preference(member_id);
CREATE INDEX idx_notification_template_type ON notification_template(type);
CREATE INDEX idx_notification_log_notification ON notification_log(notification);
CREATE INDEX idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX idx_notification_log_updated_at ON notification_log(updated_at);
CREATE INDEX idx_inventory_item_food ON inventory_item(food);
CREATE INDEX idx_inventory_item_member ON inventory_item(member);
CREATE INDEX idx_inventory_item_created_at ON inventory_item(created_at);
CREATE INDEX idx_inventory_item_updated_at ON inventory_item(updated_at);
CREATE INDEX idx_inventory_item_deleted_at ON inventory_item(deleted_at);
CREATE INDEX idx_inventory_item_member_id ON inventory_item(member_id);
CREATE INDEX idx_inventory_usage_inventory_item ON inventory_usage(inventory_item);
CREATE INDEX idx_inventory_usage_member ON inventory_usage(member);
CREATE INDEX idx_inventory_usage_created_at ON inventory_usage(created_at);
CREATE INDEX idx_inventory_usage_member_id ON inventory_usage(member_id);
CREATE INDEX idx_waste_log_inventory_item ON waste_log(inventory_item);
CREATE INDEX idx_waste_log_member ON waste_log(member);
CREATE INDEX idx_waste_log_created_at ON waste_log(created_at);
CREATE INDEX idx_waste_log_member_id ON waste_log(member_id);
CREATE INDEX idx_device_connection_member ON device_connection(member);
CREATE INDEX idx_device_connection_health_data ON device_connection(health_data);
CREATE INDEX idx_device_connection_device_id ON device_connection(device_id);
CREATE INDEX idx_device_connection_created_at ON device_connection(created_at);
CREATE INDEX idx_device_connection_updated_at ON device_connection(updated_at);
CREATE INDEX idx_device_connection_member_id ON device_connection(member_id);

-- ========================================
-- Triggers
-- ========================================


-- 自动更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有包含 updated_at 的表添加触发器
-- 注意：需要手动为每个表创建触发器
-- 示例：
-- CREATE TRIGGER update_users_updated_at
--   BEFORE UPDATE ON users
--   FOR EACH ROW
--   EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- Row-Level Security Policies
-- ========================================

ALTER TABLE user ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read user"
  ON user FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert user"
  ON user FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own user"
  ON user FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own user"
  ON user FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE family ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read family"
  ON family FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert family"
  ON family FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own family"
  ON family FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own family"
  ON family FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE family_member ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read family_member"
  ON family_member FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert family_member"
  ON family_member FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own family_member"
  ON family_member FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own family_member"
  ON family_member FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE health_goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read health_goal"
  ON health_goal FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert health_goal"
  ON health_goal FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own health_goal"
  ON health_goal FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own health_goal"
  ON health_goal FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE allergy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read allergy"
  ON allergy FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert allergy"
  ON allergy FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own allergy"
  ON allergy FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own allergy"
  ON allergy FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE dietary_preference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read dietary_preference"
  ON dietary_preference FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert dietary_preference"
  ON dietary_preference FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own dietary_preference"
  ON dietary_preference FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own dietary_preference"
  ON dietary_preference FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE family_invitation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read family_invitation"
  ON family_invitation FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert family_invitation"
  ON family_invitation FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own family_invitation"
  ON family_invitation FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own family_invitation"
  ON family_invitation FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE food ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read food"
  ON food FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert food"
  ON food FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own food"
  ON food FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own food"
  ON food FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read health_data"
  ON health_data FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert health_data"
  ON health_data FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own health_data"
  ON health_data FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own health_data"
  ON health_data FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE health_reminder ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read health_reminder"
  ON health_reminder FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert health_reminder"
  ON health_reminder FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own health_reminder"
  ON health_reminder FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own health_reminder"
  ON health_reminder FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read meal_plan"
  ON meal_plan FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert meal_plan"
  ON meal_plan FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own meal_plan"
  ON meal_plan FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own meal_plan"
  ON meal_plan FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE meal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read meal"
  ON meal FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert meal"
  ON meal FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own meal"
  ON meal FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own meal"
  ON meal FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE meal_ingredient ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read meal_ingredient"
  ON meal_ingredient FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert meal_ingredient"
  ON meal_ingredient FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own meal_ingredient"
  ON meal_ingredient FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own meal_ingredient"
  ON meal_ingredient FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE medical_report ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read medical_report"
  ON medical_report FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert medical_report"
  ON medical_report FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own medical_report"
  ON medical_report FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own medical_report"
  ON medical_report FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE medical_indicator ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read medical_indicator"
  ON medical_indicator FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert medical_indicator"
  ON medical_indicator FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own medical_indicator"
  ON medical_indicator FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own medical_indicator"
  ON medical_indicator FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE shopping_list_share ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read shopping_list_share"
  ON shopping_list_share FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert shopping_list_share"
  ON shopping_list_share FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own shopping_list_share"
  ON shopping_list_share FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own shopping_list_share"
  ON shopping_list_share FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read shopping_list"
  ON shopping_list FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert shopping_list"
  ON shopping_list FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own shopping_list"
  ON shopping_list FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own shopping_list"
  ON shopping_list FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE shopping_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read shopping_item"
  ON shopping_item FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert shopping_item"
  ON shopping_item FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own shopping_item"
  ON shopping_item FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own shopping_item"
  ON shopping_item FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE meal_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read meal_log"
  ON meal_log FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert meal_log"
  ON meal_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own meal_log"
  ON meal_log FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own meal_log"
  ON meal_log FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE meal_log_food ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read meal_log_food"
  ON meal_log_food FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert meal_log_food"
  ON meal_log_food FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own meal_log_food"
  ON meal_log_food FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own meal_log_food"
  ON meal_log_food FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE food_photo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read food_photo"
  ON food_photo FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert food_photo"
  ON food_photo FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own food_photo"
  ON food_photo FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own food_photo"
  ON food_photo FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE tracking_streak ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read tracking_streak"
  ON tracking_streak FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert tracking_streak"
  ON tracking_streak FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own tracking_streak"
  ON tracking_streak FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own tracking_streak"
  ON tracking_streak FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE quick_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read quick_template"
  ON quick_template FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert quick_template"
  ON quick_template FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own quick_template"
  ON quick_template FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own quick_template"
  ON quick_template FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE template_food ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read template_food"
  ON template_food FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert template_food"
  ON template_food FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own template_food"
  ON template_food FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own template_food"
  ON template_food FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE daily_nutrition_target ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read daily_nutrition_target"
  ON daily_nutrition_target FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert daily_nutrition_target"
  ON daily_nutrition_target FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own daily_nutrition_target"
  ON daily_nutrition_target FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own daily_nutrition_target"
  ON daily_nutrition_target FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE auxiliary_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read auxiliary_tracking"
  ON auxiliary_tracking FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert auxiliary_tracking"
  ON auxiliary_tracking FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own auxiliary_tracking"
  ON auxiliary_tracking FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own auxiliary_tracking"
  ON auxiliary_tracking FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE health_report ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read health_report"
  ON health_report FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert health_report"
  ON health_report FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own health_report"
  ON health_report FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own health_report"
  ON health_report FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE health_score ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read health_score"
  ON health_score FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert health_score"
  ON health_score FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own health_score"
  ON health_score FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own health_score"
  ON health_score FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE trend_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read trend_data"
  ON trend_data FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert trend_data"
  ON trend_data FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own trend_data"
  ON trend_data FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own trend_data"
  ON trend_data FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE health_anomaly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read health_anomaly"
  ON health_anomaly FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert health_anomaly"
  ON health_anomaly FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own health_anomaly"
  ON health_anomaly FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own health_anomaly"
  ON health_anomaly FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE a_i_advice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read a_i_advice"
  ON a_i_advice FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert a_i_advice"
  ON a_i_advice FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own a_i_advice"
  ON a_i_advice FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own a_i_advice"
  ON a_i_advice FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE a_i_conversation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read a_i_conversation"
  ON a_i_conversation FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert a_i_conversation"
  ON a_i_conversation FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own a_i_conversation"
  ON a_i_conversation FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own a_i_conversation"
  ON a_i_conversation FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE prompt_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read prompt_template"
  ON prompt_template FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert prompt_template"
  ON prompt_template FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own prompt_template"
  ON prompt_template FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own prompt_template"
  ON prompt_template FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read user_consent"
  ON user_consent FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert user_consent"
  ON user_consent FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own user_consent"
  ON user_consent FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own user_consent"
  ON user_consent FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read budget"
  ON budget FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert budget"
  ON budget FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own budget"
  ON budget FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own budget"
  ON budget FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE spending ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read spending"
  ON spending FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert spending"
  ON spending FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own spending"
  ON spending FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own spending"
  ON spending FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read price_history"
  ON price_history FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert price_history"
  ON price_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own price_history"
  ON price_history FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own price_history"
  ON price_history FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE savings_recommendation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read savings_recommendation"
  ON savings_recommendation FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert savings_recommendation"
  ON savings_recommendation FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own savings_recommendation"
  ON savings_recommendation FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own savings_recommendation"
  ON savings_recommendation FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE budget_alert ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read budget_alert"
  ON budget_alert FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert budget_alert"
  ON budget_alert FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own budget_alert"
  ON budget_alert FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own budget_alert"
  ON budget_alert FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE platform_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read platform_account"
  ON platform_account FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert platform_account"
  ON platform_account FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own platform_account"
  ON platform_account FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own platform_account"
  ON platform_account FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read order"
  ON order FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert order"
  ON order FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own order"
  ON order FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own order"
  ON order FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE platform_product ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read platform_product"
  ON platform_product FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert platform_product"
  ON platform_product FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own platform_product"
  ON platform_product FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own platform_product"
  ON platform_product FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE recipe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read recipe"
  ON recipe FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert recipe"
  ON recipe FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own recipe"
  ON recipe FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own recipe"
  ON recipe FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE recipe_ingredient ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read recipe_ingredient"
  ON recipe_ingredient FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert recipe_ingredient"
  ON recipe_ingredient FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own recipe_ingredient"
  ON recipe_ingredient FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own recipe_ingredient"
  ON recipe_ingredient FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE recipe_instruction ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read recipe_instruction"
  ON recipe_instruction FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert recipe_instruction"
  ON recipe_instruction FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own recipe_instruction"
  ON recipe_instruction FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own recipe_instruction"
  ON recipe_instruction FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE recipe_rating ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read recipe_rating"
  ON recipe_rating FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert recipe_rating"
  ON recipe_rating FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own recipe_rating"
  ON recipe_rating FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own recipe_rating"
  ON recipe_rating FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE recipe_favorite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read recipe_favorite"
  ON recipe_favorite FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert recipe_favorite"
  ON recipe_favorite FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own recipe_favorite"
  ON recipe_favorite FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own recipe_favorite"
  ON recipe_favorite FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE recipe_view ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read recipe_view"
  ON recipe_view FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert recipe_view"
  ON recipe_view FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own recipe_view"
  ON recipe_view FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own recipe_view"
  ON recipe_view FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE ingredient_substitution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read ingredient_substitution"
  ON ingredient_substitution FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert ingredient_substitution"
  ON ingredient_substitution FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own ingredient_substitution"
  ON ingredient_substitution FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own ingredient_substitution"
  ON ingredient_substitution FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE user_preference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read user_preference"
  ON user_preference FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert user_preference"
  ON user_preference FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own user_preference"
  ON user_preference FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own user_preference"
  ON user_preference FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE task ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read task"
  ON task FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert task"
  ON task FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own task"
  ON task FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own task"
  ON task FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read activity"
  ON activity FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert activity"
  ON activity FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own activity"
  ON activity FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own activity"
  ON activity FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE comment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read comment"
  ON comment FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert comment"
  ON comment FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own comment"
  ON comment FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own comment"
  ON comment FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE family_goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read family_goal"
  ON family_goal FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert family_goal"
  ON family_goal FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own family_goal"
  ON family_goal FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own family_goal"
  ON family_goal FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read shared_content"
  ON shared_content FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert shared_content"
  ON shared_content FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own shared_content"
  ON shared_content FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own shared_content"
  ON shared_content FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE share_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read share_tracking"
  ON share_tracking FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert share_tracking"
  ON share_tracking FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own share_tracking"
  ON share_tracking FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own share_tracking"
  ON share_tracking FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE achievement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read achievement"
  ON achievement FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert achievement"
  ON achievement FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own achievement"
  ON achievement FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own achievement"
  ON achievement FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE leaderboard_entry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read leaderboard_entry"
  ON leaderboard_entry FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert leaderboard_entry"
  ON leaderboard_entry FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own leaderboard_entry"
  ON leaderboard_entry FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own leaderboard_entry"
  ON leaderboard_entry FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE community_post ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read community_post"
  ON community_post FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert community_post"
  ON community_post FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own community_post"
  ON community_post FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own community_post"
  ON community_post FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE community_comment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read community_comment"
  ON community_comment FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert community_comment"
  ON community_comment FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own community_comment"
  ON community_comment FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own community_comment"
  ON community_comment FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read notification"
  ON notification FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert notification"
  ON notification FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own notification"
  ON notification FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own notification"
  ON notification FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE notification_preference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read notification_preference"
  ON notification_preference FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert notification_preference"
  ON notification_preference FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own notification_preference"
  ON notification_preference FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own notification_preference"
  ON notification_preference FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE notification_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read notification_template"
  ON notification_template FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert notification_template"
  ON notification_template FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own notification_template"
  ON notification_template FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own notification_template"
  ON notification_template FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read notification_log"
  ON notification_log FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert notification_log"
  ON notification_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own notification_log"
  ON notification_log FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own notification_log"
  ON notification_log FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE inventory_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read inventory_item"
  ON inventory_item FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert inventory_item"
  ON inventory_item FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own inventory_item"
  ON inventory_item FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own inventory_item"
  ON inventory_item FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE inventory_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read inventory_usage"
  ON inventory_usage FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert inventory_usage"
  ON inventory_usage FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own inventory_usage"
  ON inventory_usage FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own inventory_usage"
  ON inventory_usage FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read waste_log"
  ON waste_log FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert waste_log"
  ON waste_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own waste_log"
  ON waste_log FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own waste_log"
  ON waste_log FOR DELETE
  USING (auth.uid() IS NOT NULL);

ALTER TABLE device_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read device_connection"
  ON device_connection FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users to insert device_connection"
  ON device_connection FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to update own device_connection"
  ON device_connection FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow users to delete own device_connection"
  ON device_connection FOR DELETE
  USING (auth.uid() IS NOT NULL);
