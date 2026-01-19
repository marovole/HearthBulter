## MODIFIED Requirements

### Requirement: Achievement System
系统 SHALL 跟踪用户成就徽章和进度，使用 Supabase Client 查询 achievement_definitions 和 achievement_records 表，并修复嵌套权限验证问题。

#### Scenario: Achievement trigger detection
- **WHEN** 用户完成特定条件（连续打卡7天）
- **THEN** 查询 Supabase achievement_definitions 表检查是否满足条件，创建 achievement_records 记录

#### Scenario: Achievement gallery showcase
- **WHEN** 用户访问成就墙
- **THEN** 查询 Supabase achievement_records 和 achievement_definitions 表，显示已获得和未获得的成就

#### Scenario: Achievement sharing capability
- **WHEN** 用户点击「分享成就」
- **THEN** 查询 Supabase 获取成就详情，生成分享图片和内容

### Requirement: Leaderboard System
系统 SHALL 显示健康评分排名和连续打卡榜，查询 Supabase v_social_leaderboard Materialized View 优化性能。

#### Scenario: Health score leaderboard
- **WHEN** 用户查看排行榜
- **THEN** 查询 Supabase v_social_leaderboard 视图（Materialized View），显示用户健康评分排名

#### Scenario: Streak leaderboard
- **WHEN** 用户查看连续打卡榜
- **WHEN** 指定时间范围（daily/weekly/monthly）
- **THEN** 查询 Supabase streak_records 表，计算并显示连续天数排名

#### Scenario: Friend leaderboards
- **WHEN** 用户选择查看好友榜
- **WHEN** 查询 Supabase user_relationships 表获取好友列表
- **THEN** 在好友范围内计算排名并显示

#### Scenario: Ranking change notifications
- **WHEN** 用户排名发生变化
- **THEN**: 查询 Supabase 比较新旧排名，发送通知提醒用户

### Requirement: API Endpoints - /api/social/achievements (GET)
系统 SHALL 提供获取用户成就列表的 API 端点，使用 Supabase 查询并实现多级权限验证（用户只能查看自己或家庭成员的成就）。

#### Scenario: Get achievements with permission check
- **WHEN** 用户请求 GET /api/social/achievements
- **GIVEN** 用户只能查看自己或家庭成员的成就
- **THEN**:
  1. 查询 Supabase 获取当前用户所在家庭列表（family_members 表）
  2. 查询 Supabase 获取家庭成员用户 ID 列表
  3. 查询 Supabase achievement_records 表，WHERE user_id IN (用户ID列表)
  4. 结合 achievement_definitions 返回完整的成就信息

#### Scenario: Filter by category
- **WHEN** 用户查询特定类别成就（如：nutrition, exercise）
- **THEN**: 在 Supabase 查询中添加 category 过滤条件

#### Scenario: Filter by status
- **WHEN** 用户查询未解锁成就
- **THEN**: 查询 Supabase achievement_definitions，LEFT JOIN achievement_records，返回未获得的成就

### Requirement: API Endpoints - /api/social/leaderboard (GET)
系统 SHALL 提供获取排行榜数据的 API 端点，查询 Supabase v_social_leaderboard Materialized View，返回带排名的用户健康评分数据。

#### Scenario: Get leaderboard with ranking
- **WHEN** 用户请求 GET /api/social/leaderboard?type=health_score&period=weekly
- **THEN**: 查询 Supabase v_social_leaderboard 视图，返回排名数据

#### Scenario: Get user rank and percentile
- **WHEN** 用户请求 GET /api/social/leaderboard/my-rank
- **THEN**: 查询 Supabase 获取用户具体排名和百分位数

#### Scenario: Get leaderboard changes
- **WHEN** 用户查询排名变化（与上一周期对比）
- **THEN**: 查询 Supabase 当前周期和上一周期数据，计算排名变化
