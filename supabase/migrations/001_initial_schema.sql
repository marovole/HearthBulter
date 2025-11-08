-- Supabase 数据库初始架构
-- 为 Cloudflare Pages + Supabase 混合架构创建表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建用户表（与 Supabase Auth 集成）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户偏好表
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spice_level TEXT DEFAULT 'MEDIUM',
  sweetness TEXT DEFAULT 'MEDIUM',
  saltiness TEXT DEFAULT 'MEDIUM',
  preferred_cuisines JSONB DEFAULT '[]',
  avoided_ingredients JSONB DEFAULT '[]',
  preferred_ingredients JSONB DEFAULT '[]',
  max_cook_time INTEGER,
  min_servings INTEGER DEFAULT 1,
  max_servings INTEGER DEFAULT 10,
  cost_level TEXT DEFAULT 'MEDIUM',
  max_estimated_cost DECIMAL(10,2),
  diet_type TEXT DEFAULT 'OMNIVORE',
  is_low_carb BOOLEAN DEFAULT FALSE,
  is_low_fat BOOLEAN DEFAULT FALSE,
  is_high_protein BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_dairy_free BOOLEAN DEFAULT FALSE,
  enable_recommendations BOOLEAN DEFAULT TRUE,
  learned_preferences JSONB DEFAULT '{}',
  preference_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建家庭组表
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建家庭成员表
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  relationship TEXT,
  date_of_birth DATE,
  gender TEXT,
  height DECIMAL(5,2),
  activity_level TEXT DEFAULT 'MODERATE',
  dietary_restrictions JSONB DEFAULT '[]',
  health_goals JSONB DEFAULT '[]',
  allergen_avoidance JSONB DEFAULT '[]',
  calorie_target INTEGER,
  macro_targets JSONB DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建健康数据表
CREATE TABLE IF NOT EXISTS health_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- 'weight', 'blood_pressure', 'blood_sugar', 'heart_rate', 'temperature', 'steps', 'sleep', 'calories', 'water'
  value DECIMAL(10,2) NOT NULL,
  unit TEXT, -- 'kg', 'lbs', 'mmHg', 'mg/dL', 'bpm', 'celsius', 'steps', 'hours', 'kcal', 'ml'
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建食物表
CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  aliases JSONB DEFAULT '[]',
  description TEXT,
  category TEXT NOT NULL, -- 'FRUITS', 'VEGETABLES', 'PROTEINS', 'GRAINS', 'DAIRY', 'FATS', 'SWEETS', 'BEVERAGES'
  tags JSONB DEFAULT '[]',
  calories DECIMAL(8,2) NOT NULL,
  protein DECIMAL(8,2) NOT NULL,
  carbs DECIMAL(8,2) NOT NULL,
  fat DECIMAL(8,2) NOT NULL,
  fiber DECIMAL(8,2),
  sugar DECIMAL(8,2),
  sodium DECIMAL(8,2),
  vitamin_a DECIMAL(8,2),
  vitamin_c DECIMAL(8,2),
  calcium DECIMAL(8,2),
  iron DECIMAL(8,2),
  serving_size DECIMAL(8,2),
  serving_unit TEXT,
  source TEXT DEFAULT 'manual', -- 'manual', 'usda', 'user_contributed'
  usda_id TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  cached_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建饮食记录表
CREATE TABLE IF NOT EXISTS meal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
  foods JSONB NOT NULL, -- 食物详情数组
  total_calories INTEGER,
  total_protein DECIMAL(8,2),
  total_carbs DECIMAL(8,2),
  total_fat DECIMAL(8,2),
  total_fiber DECIMAL(8,2),
  total_sugar DECIMAL(8,2),
  total_sodium DECIMAL(8,2),
  notes TEXT,
  photo_urls JSONB DEFAULT '[]',
  location TEXT,
  mood TEXT,
  hunger_level INTEGER, -- 1-10
  satisfaction_level INTEGER, -- 1-10
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建食谱表
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,
  nutrition_info JSONB,
  prep_time INTEGER, -- 分钟
  cook_time INTEGER, -- 分钟
  servings INTEGER,
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  tags JSONB DEFAULT '[]',
  category TEXT,
  cuisine TEXT,
  image_urls JSONB DEFAULT '[]',
  video_url TEXT,
  source TEXT DEFAULT 'user', -- 'user', 'imported', 'ai_generated'
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建购物清单表
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL, -- 购物项数组
  total_estimated_cost DECIMAL(10,2),
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  due_date DATE,
  assigned_to UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建库存表
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  food_id UUID REFERENCES foods(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  brand TEXT,
  location TEXT, -- 存储位置
  purchase_date DATE,
  expiry_date DATE,
  min_stock DECIMAL(10,2) DEFAULT 0,
  cost DECIMAL(10,2),
  currency TEXT DEFAULT 'CNY',
  status TEXT DEFAULT 'available', -- 'available', 'low_stock', 'expired', 'used'
  is_low_stock BOOLEAN DEFAULT FALSE,
  days_to_expiry INTEGER,
  photo_url TEXT,
  notes TEXT,
  barcode TEXT,
  added_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建库存使用记录表
CREATE TABLE IF NOT EXISTS inventory_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  used_quantity DECIMAL(10,2) NOT NULL,
  remaining_quantity DECIMAL(10,2) NOT NULL,
  usage_type TEXT NOT NULL, -- 'cooking', 'expired', 'discarded'
  meal_record_id UUID REFERENCES meal_records(id),
  recipe_id UUID REFERENCES recipes(id),
  notes TEXT,
  used_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'health_reminder', 'meal_suggestion', 'inventory_alert', 'family_invite'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建健康建议表
CREATE TABLE IF NOT EXISTS health_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'nutrition', 'exercise', 'sleep', 'health_check'
  category TEXT NOT NULL, -- 'diet_suggestion', 'meal_plan', 'supplement', 'lifestyle'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'dismissed', 'expired'
  effective_from DATE,
  effective_until DATE,
  related_data JSONB DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建AI会话表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'user_query', 'ai_response', 'system'
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  intent TEXT,
  sentiment TEXT,
  related_data JSONB DEFAULT '{}',
  cost_tokens INTEGER DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'feature_flag', 'api_config', 'system_setting'
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建测试连接函数
CREATE OR REPLACE FUNCTION test_connection()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
