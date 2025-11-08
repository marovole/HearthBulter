-- 性能优化索引
-- 为经常查询的字段创建索引以提高查询性能

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 用户偏好表索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_member_id ON user_preferences(member_id);

-- 家庭组表索引
CREATE INDEX IF NOT EXISTS idx_families_creator_id ON families(creator_id);
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code);
CREATE INDEX IF NOT EXISTS idx_families_created_at ON families(created_at DESC);

-- 家庭成员表索引
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);
CREATE INDEX IF NOT EXISTS idx_family_members_deleted_at ON family_members(deleted_at);
CREATE INDEX IF NOT EXISTS idx_family_members_created_at ON family_members(created_at DESC);

-- 复合索引：家庭ID + 用户ID + 删除状态
CREATE INDEX IF NOT EXISTS idx_family_members_composite ON family_members(family_id, user_id, deleted_at);

-- 健康数据表索引
CREATE INDEX IF NOT EXISTS idx_health_data_member_id ON health_data(member_id);
CREATE INDEX IF NOT EXISTS idx_health_data_user_id ON health_data(user_id);
CREATE INDEX IF NOT EXISTS idx_health_data_data_type ON health_data(data_type);
CREATE INDEX IF NOT EXISTS idx_health_data_recorded_at ON health_data(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_data_created_at ON health_data(created_at DESC);

-- 复合索引：成员ID + 数据类型 + 记录时间
CREATE INDEX IF NOT EXISTS idx_health_data_composite ON health_data(member_id, data_type, recorded_at DESC);

-- 食物表索引
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_name_en ON foods(name_en);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_created_by ON foods(created_by);
CREATE INDEX IF NOT EXISTS idx_foods_is_public ON foods(is_public);
CREATE INDEX IF NOT EXISTS idx_foods_verified ON foods(verified);
CREATE INDEX IF NOT EXISTS idx_foods_created_at ON foods(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_foods_cached_at ON foods(cached_at);

-- GIN 索引用于 JSONB 字段和数组
CREATE INDEX IF NOT EXISTS idx_foods_tags ON foods USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_foods_aliases ON foods USING GIN(aliases);
CREATE INDEX IF NOT EXISTS idx_foods_usda_id ON foods(usda_id);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_foods_name_search ON foods USING GIN(to_tsvector('english', coalesce(name, '')));
CREATE INDEX IF NOT EXISTS idx_foods_name_en_search ON foods USING GIN(to_tsvector('english', coalesce(name_en, '')));
CREATE INDEX IF NOT EXISTS idx_foods_description_search ON foods USING GIN(to_tsvector('english', coalesce(description, '')));

-- 饮食记录表索引
CREATE INDEX IF NOT EXISTS idx_meal_records_member_id ON meal_records(member_id);
CREATE INDEX IF NOT EXISTS idx_meal_records_user_id ON meal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_records_meal_type ON meal_records(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_records_recorded_at ON meal_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_records_created_at ON meal_records(created_at DESC);

-- 复合索引：成员ID + 记录时间
CREATE INDEX IF NOT EXISTS idx_meal_records_composite ON meal_records(member_id, recorded_at DESC);

-- GIN 索引用于 JSONB 字段
CREATE INDEX IF NOT EXISTS idx_meal_records_foods ON meal_records USING GIN(foods);
CREATE INDEX IF NOT EXISTS idx_meal_records_photo_urls ON meal_records USING GIN(photo_urls);

-- 食谱表索引
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_view_count ON recipes(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite_count ON recipes(favorite_count DESC);

-- GIN 索引用于 JSONB 字段和数组
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredients ON recipes USING GIN(ingredients);
CREATE INDEX IF NOT EXISTS idx_recipes_instructions ON recipes USING GIN(instructions);
CREATE INDEX IF NOT EXISTS idx_recipes_image_urls ON recipes USING GIN(image_urls);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_recipes_name_search ON recipes USING GIN(to_tsvector('english', coalesce(name, '')));
CREATE INDEX IF NOT EXISTS idx_recipes_description_search ON recipes USING GIN(to_tsvector('english', coalesce(description, '')));

-- 购物清单表索引
CREATE INDEX IF NOT EXISTS idx_shopping_lists_family_id ON shopping_lists(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_status ON shopping_lists(status);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_priority ON shopping_lists(priority);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_assigned_to ON shopping_lists(assigned_to);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_by ON shopping_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_at ON shopping_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_due_date ON shopping_lists(due_date);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_completed_at ON shopping_lists(completed_at);

-- GIN 索引用于 JSONB 字段
CREATE INDEX IF NOT EXISTS idx_shopping_lists_items ON shopping_lists USING GIN(items);

-- 库存表索引
CREATE INDEX IF NOT EXISTS idx_inventory_items_family_id ON inventory_items(family_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_food_id ON inventory_items(food_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry_date ON inventory_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_low_stock ON inventory_items(is_low_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_items_added_by ON inventory_items(added_by);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at ON inventory_items(deleted_at);

-- 复合索引：家庭ID + 状态 + 过期时间
CREATE INDEX IF NOT EXISTS idx_inventory_items_composite ON inventory_items(family_id, status, expiry_date);

-- 通知表索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_family_id ON notifications(family_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 复合索引：用户ID + 已读状态 + 创建时间
CREATE INDEX IF NOT EXISTS idx_notifications_composite ON notifications(user_id, is_read, created_at DESC);

-- 健康建议表索引
CREATE INDEX IF NOT EXISTS idx_health_recommendations_member_id ON health_recommendations(member_id);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_user_id ON health_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_type ON health_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_category ON health_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_priority ON health_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_status ON health_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_effective_from ON health_recommendations(effective_from);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_effective_until ON health_recommendations(effective_until);
CREATE INDEX IF NOT EXISTS idx_health_recommendations_created_at ON health_recommendations(created_at DESC);

-- 复合索引：成员ID + 状态 + 优先级
CREATE INDEX IF NOT EXISTS idx_health_recommendations_composite ON health_recommendations(member_id, status, priority);

-- AI会话表索引
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_family_id ON ai_conversations(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_member_id ON ai_conversations(member_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_id ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_message_type ON ai_conversations(message_type);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- 复合索引：用户ID + 会话ID + 创建时间
CREATE INDEX IF NOT EXISTS idx_ai_conversations_composite ON ai_conversations(user_id, session_id, created_at DESC);

-- 系统配置表索引
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
CREATE INDEX IF NOT EXISTS idx_system_configs_category ON system_configs(category);
CREATE INDEX IF NOT EXISTS idx_system_configs_is_public ON system_configs(is_public);
CREATE INDEX IF NOT EXISTS idx_system_configs_created_at ON system_configs(created_at DESC);

-- 库存使用记录表索引
CREATE INDEX IF NOT EXISTS idx_inventory_usage_records_inventory_item_id ON inventory_usage_records(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_records_meal_record_id ON inventory_usage_records(meal_record_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_records_recipe_id ON inventory_usage_records(recipe_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_records_used_by ON inventory_usage_records(used_by);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_records_created_at ON inventory_usage_records(created_at DESC);

-- 性能监控函数
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(table_name TEXT, row_count BIGINT, size_bytes BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    s.n_live_tup::BIGINT,
    pg_total_relation_size(c.oid)::BIGINT
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  JOIN pg_stat_user_tables s ON s.relname = t.tablename
  WHERE t.schemaname = 'public'
  ORDER BY s.n_live_tup DESC;
END;
$$ LANGUAGE plpgsql;

-- 创建函数来分析和优化查询性能
CREATE OR REPLACE FUNCTION analyze_slow_queries()
RETURNS TABLE(query_text TEXT, execution_time_ms NUMERIC, calls BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    query::TEXT,
    (mean_exec_time)::NUMERIC,
    calls::BIGINT
  FROM pg_stat_statements
  WHERE mean_exec_time > 100  -- 超过100ms的查询
  ORDER BY mean_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
