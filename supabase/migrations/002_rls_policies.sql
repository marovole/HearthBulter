-- 行级安全策略 (RLS) 配置
-- 为所有表启用 RLS 并创建适当的策略

-- 用户表策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和更新自己的资料
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 用户偏好表策略
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = member_id);

-- 家庭组表策略
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Families are viewable by members" ON families
  FOR SELECT USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = families.id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

CREATE POLICY "Only creators can update families" ON families
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Only creators can delete families" ON families
  FOR DELETE USING (auth.uid() = creator_id);

-- 家庭成员表策略
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 查看策略：用户可以查看自己家庭的成员
CREATE POLICY "Family members are viewable by family members" ON family_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- 创建策略：家庭管理员可以添加成员
CREATE POLICY "Family admins can add members" ON family_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND (fm.role = 'ADMIN' OR fm.user_id = (SELECT creator_id FROM families WHERE id = family_members.family_id))
      AND fm.deleted_at IS NULL
    )
  );

-- 更新策略：用户可以更新自己的成员信息，管理员可以更新其他成员
CREATE POLICY "Members can update own info or admins can update" ON family_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND (fm.role = 'ADMIN' OR fm.user_id = (SELECT creator_id FROM families WHERE id = family_members.family_id))
      AND fm.deleted_at IS NULL
    )
  );

-- 删除策略：软删除，管理员可以删除成员
CREATE POLICY "Admins can soft delete members" ON family_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND (fm.role = 'ADMIN' OR fm.user_id = (SELECT creator_id FROM families WHERE id = family_members.family_id))
      AND fm.deleted_at IS NULL
    )
  );

-- 健康数据表策略
ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己和自己家庭成员的健康数据
CREATE POLICY "Users can view own and family health data" ON health_data
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN family_members target_fm ON fm.family_id = target_fm.family_id
      WHERE fm.user_id = auth.uid()
      AND target_fm.id = health_data.member_id
      AND fm.deleted_at IS NULL
      AND target_fm.deleted_at IS NULL
    )
  );

-- 用户可以创建自己家庭成员的健康数据
CREATE POLICY "Users can create family health data" ON health_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = health_data.member_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- 用户可以更新自己家庭成员的健康数据
CREATE POLICY "Users can update family health data" ON health_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN family_members target_fm ON fm.family_id = target_fm.family_id
      WHERE fm.user_id = auth.uid()
      AND target_fm.id = health_data.member_id
      AND fm.deleted_at IS NULL
      AND target_fm.deleted_at IS NULL
    )
  );

-- 用户可以删除自己家庭成员的健康数据
CREATE POLICY "Users can delete family health data" ON health_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN family_members target_fm ON fm.family_id = target_fm.family_id
      WHERE fm.user_id = auth.uid()
      AND target_fm.id = health_data.member_id
      AND fm.deleted_at IS NULL
      AND target_fm.deleted_at IS NULL
    )
  );

-- 食物表策略
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

-- 公开食物数据可以被任何人查看
CREATE POLICY "Public foods are viewable by anyone" ON foods
  FOR SELECT USING (verified = TRUE OR source = 'usda');

-- 用户创建的食物可以被查看
CREATE POLICY "User created foods are viewable" ON foods
  FOR SELECT USING (
    created_by = auth.uid() OR
    is_public = TRUE OR
    verified = TRUE
  );

-- 用户可以创建食物
CREATE POLICY "Users can create foods" ON foods
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- 用户可以更新自己创建的食物
CREATE POLICY "Users can update own foods" ON foods
  FOR UPDATE USING (created_by = auth.uid());

-- 用户可以删除自己创建的食物
CREATE POLICY "Users can delete own foods" ON foods
  FOR DELETE USING (created_by = auth.uid());

-- 饮食记录表策略
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己和自己家庭成员的饮食记录
CREATE POLICY "Users can view own and family meal records" ON meal_records
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN family_members target_fm ON fm.family_id = target_fm.family_id
      WHERE fm.user_id = auth.uid()
      AND target_fm.id = meal_records.member_id
      AND fm.deleted_at IS NULL
      AND target_fm.deleted_at IS NULL
    )
  );

-- 用户可以创建自己家庭成员的饮食记录
CREATE POLICY "Users can create family meal records" ON meal_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = meal_records.member_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- 用户可以更新自己家庭成员的饮食记录
CREATE POLICY "Users can update family meal records" ON meal_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN family_members target_fm ON fm.family_id = target_fm.family_id
      WHERE fm.user_id = auth.uid()
      AND target_fm.id = meal_records.member_id
      AND fm.deleted_at IS NULL
      AND target_fm.deleted_at IS NULL
    )
  );

-- 用户可以删除自己家庭成员的饮食记录
CREATE POLICY "Users can delete family meal records" ON meal_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN family_members target_fm ON fm.family_id = target_fm.family_id
      WHERE fm.user_id = auth.uid()
      AND target_fm.id = meal_records.member_id
      AND fm.deleted_at IS NULL
      AND target_fm.deleted_at IS NULL
    )
  );

-- 食谱表策略
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- 任何人都可以查看公开食谱
CREATE POLICY "Anyone can view public recipes" ON recipes
  FOR SELECT USING (is_public = TRUE);

-- 用户可以查看自己创建的食谱
CREATE POLICY "Users can view own recipes" ON recipes
  FOR SELECT USING (created_by = auth.uid());

-- 用户可以查看家庭共享的食谱
CREATE POLICY "Users can view family recipes" ON recipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.user_id = auth.uid()
      AND fm.family_id = recipes.family_id
      AND fm.deleted_at IS NULL
    )
  );

-- 用户可以创建食谱
CREATE POLICY "Users can create recipes" ON recipes
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- 用户可以更新自己创建的食谱
CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE USING (created_by = auth.uid());

-- 用户可以删除自己创建的食谱
CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE USING (created_by = auth.uid());

-- 购物清单表策略
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- 家庭成员可以查看购物清单
CREATE POLICY "Family members can view shopping lists" ON shopping_lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = shopping_lists.family_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- 家庭成员可以创建购物清单
CREATE POLICY "Family members can create shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = shopping_lists.family_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- 创建者和管理员可以更新购物清单
CREATE POLICY "Creators and admins can update shopping lists" ON shopping_lists
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = shopping_lists.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'ADMIN'
      AND fm.deleted_at IS NULL
    )
  );

-- 库存表策略
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- 家庭成员可以查看库存
CREATE POLICY "Family members can view inventory" ON inventory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = inventory_items.family_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- 家庭成员可以创建库存项目
CREATE POLICY "Family members can create inventory items" ON inventory_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = inventory_items.family_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- 添加者和管理员可以更新库存项目
CREATE POLICY "Adders and admins can update inventory items" ON inventory_items
  FOR UPDATE USING (
    added_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = inventory_items.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'ADMIN'
      AND fm.deleted_at IS NULL
    )
  );

-- 通知表策略
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的通知
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- 用户可以更新自己的通知（标记为已读等）
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 健康建议表策略
ALTER TABLE health_recommendations ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己成员的健康建议
CREATE POLICY "Users can view family health recommendations" ON health_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN family_members target_fm ON fm.family_id = target_fm.family_id
      WHERE fm.user_id = auth.uid()
      AND target_fm.id = health_recommendations.member_id
      AND fm.deleted_at IS NULL
      AND target_fm.deleted_at IS NULL
    )
  );

-- 用户可以创建自己成员的健康建议
CREATE POLICY "Users can create family health recommendations" ON health_recommendations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = health_recommendations.member_id
      AND fm.user_id = auth.uid()
      AND fm.deleted_at IS NULL
    )
  );

-- AI会话表策略
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的AI会话
CREATE POLICY "Users can view own ai conversations" ON ai_conversations
  FOR SELECT USING (user_id = auth.uid());

-- 用户可以创建AI会话
CREATE POLICY "Users can create ai conversations" ON ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 系统配置表策略
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- 公开配置可以被任何人查看
CREATE POLICY "Public configs are viewable by anyone" ON system_configs
  FOR SELECT USING (is_public = TRUE);

-- 创建函数来更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表创建更新触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_data_updated_at BEFORE UPDATE ON health_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_records_updated_at BEFORE UPDATE ON meal_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_recommendations_updated_at BEFORE UPDATE ON health_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
