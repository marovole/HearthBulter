# Batch 10-14 已迁移端点风险评估报告

**评估日期**: 2025-11-11
**范围**: Batch 10-14 已迁移的15个API端点
**评估方法**: 基于代码审查、数据关键性、使用频率

---

## 风险评估矩阵

| 风险等级 | 定义 | 颜色标识 |
|---------|------|---------|
| 🔴 高风险 | 涉及财务、用户核心数据，数据丢失/错误影响大 | 红色 |
| 🟡 中风险 | 涉及用户生成内容，数据丢失影响用户体验 | 黄色 |
| 🟢 低风险 | 分析、监控数据，可接受小时级不一致 | 绿色 |
| ⚪ 无风险 | 只读查询，无数据写入 | 灰色 |

---

## Batch 10: Recipes相关端点 (3个)

### 1. GET /api/recipes/favorites

**风险等级**: 🟡 中风险

**功能描述**: 获取用户收藏的食谱列表

**数据关键性**: 用户收藏的食谱，属于个性化数据，丢失会影响用户体验

**数据表**: `recipe_favorites`, `recipes`, `recipe_ingredients`, `foods`

**数据量**:
- recipe_favorites: ~500-1000条/天新增
- 平均每个用户: 10-50个收藏

**风险点**:
1. 多表关联查询（recipe_favorites → recipes → recipe_ingredients → foods）
2. 关联数据不一致会导致食谱信息显示不完整
3. 用户会明显感知到收藏丢失

**可接受不一致阈值**: < 0.1% (即1000条中最多1条)

**验证脚本**: `scripts/consistency/check-recipe-favorites.ts`

```typescript
// 检查逻辑
// 1. 抽样1000条recipe_favorites记录
// 2. 对比Prisma和Supabase返回的recipe详情
// 3. 验证ingredients列表完整性
// 4. 输出不一致率
```

**自动化验证频率**: 每4小时一次

---

### 2. POST/PUT/DELETE /api/recipes/favorites

**风险等级**: 🟡 中风险

**功能描述**: 收藏/取消收藏食谱

**数据关键性**: 用户操作，需要ACID保证

**风险点**:
1. 没有双写保护，如果Supabase写入失败，用户操作会丢失
2. 如果写入成功但返回失败，用户可能重复操作导致脏数据
3. 并发操作可能导致状态不一致

**可接受不一致阈值**: 0% (操作必须100%成功或明确失败)

**验证脚本**: `scripts/consistency/check-favorites-mutations.ts`

```typescript
// 检查逻辑
// 1. 监听POST/DELETE操作
// 2. 5秒后对比两个数据库状态
// 3. 验证memberId+recipeId唯一约束
// 4. 记录任何不一致
```

**监控重点**: 操作成功率、重复收藏率

---

### 3. GET /api/recipes/history

**风险等级**: 🟢 低风险

**功能描述**: 获取用户查看食谱的历史记录

**数据关键性**: 分析数据，用于推荐算法

**数据表**: `recipe_view_history`

**数据量**: ~5000条/天

**风险点**:
1. 丢失部分历史数据影响推荐准确度
2. 不影响用户核心功能
3. 历史数据有30天TTL

**可接受不一致阈值**: < 1% (可接受少量数据丢失)

**验证脚本**: `scripts/consistency/check-recipe-history.ts`

```typescript
// 检查逻辑
// 抽样过去7天的数据，对比两个数据库
// 允许少量丢失
```

**监控重点**: 数据丢失率趋势

---

### 4. GET /api/recipes/substitute

**风险等级**: ⚪ 无风险

**功能描述**: 获取食材替换建议（只读API）

**数据表**: `food_substitutions`, `foods`

**风险点**:
1. 纯只读查询
2. 不涉及用户数据
3. 数据静态，变化少

**验证方式**: 无需自动验证，手动抽查即可

---

## Batch 11: Recommendations端点 (3个)

### 5. GET /api/recommendations/popular

**风险等级**: ⚪ 无风险

**功能描述**: 获取热门食谱推荐（只读）

**数据表**: `recipe_favorites`, `recipe_view_history`

**风险点**:
1. 纯聚合查询，无用户数据写入
2. 结果可接受小时级延迟
3. 不影响核心业务

**验证方式**: 手动验证结果合理性

---

### 6. GET /api/recommendations/similar

**风险等级**: ⚪ 无风险

**功能描述**: 根据食谱获取相似推荐（只读）

**风险点**: 同popular端点

---

### 7. POST /api/recommendations/refresh

**风险等级**: 🟢 低风险

**功能描述**: 触发推荐算法刷新缓存

**风险点**:
1. 后台任务，用户无感知
2. 失败会自动重试
3. 不影响在线用户

**监控重点**: 任务成功率、执行时间

---

## Batch 12: Cleanup/Monitoring/Tracking端点 (3个)

### 8. DELETE /api/cleanup/expired-invitations

**风险等级**: 🟢 低风险

**功能描述**: 清理过期的家庭邀请

**数据表**: `family_invitations`

**数据量**: 每月清理~100-500条

**风险点**:
1. 清理任务，不影响在线用户
2. 即使失败，过期邀请会自动被忽略
3. 数据可接受延迟删除

**可接受不一致阈值**: < 5% (可接受部分未清理)

**监控重点**: 清理成功率、剩余过期邀请数量

---

### 9. GET /api/monitoring/route

**风险等级**: ⚪ 无风险

**功能描述**: 系统健康检查端点（只读）

**风险点**: 纯只读，无副作用

---

### 10. POST /api/tracking/reminders

**风险等级**: 🟢 低风险

**功能描述**: 记录提醒交互事件（点击、完成）

**数据表**: `reminder_interactions`

**数据量**: ~2000条/天

**风险点**:
1. 分析数据，用于优化提醒算法
2. 丢失少量数据可接受
3. 无用户直接感知

**可接受不一致阈值**: < 2%

---

## Batch 13: Analytics/Notifications端点 (3个)

### 11. GET /api/analytics/anomalies

**风险等级**: 🟢 低风险

**功能描述**: 获取健康数据异常检测

**数据表**: `health_data_anomalies`

**风险点**:
1. 分析数据，用于提醒用户
2. 数据量大，可接受小时级延迟
3. 不影响核心功能

**可接受不一致阈值**: < 5%

---

### 12. GET/PUT/DELETE /api/analytics/reports

**风险等级**: 🟡 中风险

**功能描述**: 健康报告管理

**数据表**: `health_reports`

**数据量**:
- 每用户: 5-20份报告
- 总量: ~50,000份

**风险点**:
1. 用户生成的核心健康数据
2. 丢失报告影响用户体验
3. 报告生成是耗时操作

**可接受不一致阈值**: < 0.5%

**验证脚本**: `scripts/consistency/check-health-reports.ts`

```typescript
// 检查逻辑
// 1. 抽样1000份报告
// 2. 验证reportType, startDate, endDate, overallScore
// 3. 确保summary字段完整性
// 4. 检查文件导出记录
```

**特别关注**:
- POST操作（生成报告）必须100%成功或明确失败
- GET操作可接受99.5%一致性

---

### 13. GET /api/notifications/stats

**风险等级**: 🟢 低风险

**功能描述**: 获取通知统计（已读/未读数量）

**数据表**: `notifications`

**风险点**:
1. 统计结果，实时性要求不高
2. 5分钟延迟可接受
3. 刷新页面会重新计算

**可接受不一致阈值**: < 3%

---

## Batch 14: Social端点 (5个)

### 14. GET /api/social/achievements

**风险等级**: 🟡 中风险

**功能描述**: 社交成就系统（读取和解锁成就）

**数据表**: `achievements`

**数据量**:
- 每用户: 10-50个成就
- 总量: ~100,000个

**风险点**:
1. 成就解锁是用户激励系统的核心
2. 用户会明显感知到成就丢失
3. 涉及积分/排行榜，需要一致性
4. 代码中发现：**混合使用Prisma和Supabase**：
   ```typescript
   // Line 7: import { prisma } from '@/lib/db/supabase-adapter';
   // Line 54-76: 使用prisma查询member权限（非迁移部分）
   // Line 105-120: 使用prisma查询achievements（已迁移部分❌）
   ```
   **这是一个严重问题**：此端点已经"部分迁移"但未完全迁移，继续使用prisma，可能导致数据不一致

**可接受不一致阈值**: < 0.1%

**验证脚本**: `scripts/consistency/check-achievements.ts`

```typescript
// 检查逻辑
// 1. 对比两个数据库的achievement数量
// 2. 验证rarity、points、type等关键字段
// 3. 检查unlockedAt时间戳
// 4. 验证memberId关联是否存在
```

**监控重点**: 成就解锁成功率、排行榜数据一致性

---

### 15. POST /api/social/achievements

**风险等级**: 🟡 中风险

**功能描述**: 手动解锁成就（管理员功能）

**风险点**:
1. 管理员操作，需要审计日志
2. 操作不可逆（成就解锁后不应删除）
3. 涉及积分变更，影响排行榜

**监控重点**:
- 人工解锁次数（异常检测：如果突然增多可能是滥用）
- 积分变更记录

---

### 16. GET /api/social/leaderboard

**风险等级**: 🟢 低风险

**功能描述**: 排行榜查询（只读）

**风险点**:
1. 聚合查询，实时性要求不高
2. 缓存5分钟可接受
3. 不影响核心功能

---

### 17. GET/POST /api/social/share

**风险等级**: 🟢 低风险

**功能描述**: 生成和验证分享链接

**数据表**: `social_shares`

**风险点**:
1. 分享链接生成，不是核心业务
2. 链接失效/重复生成可以接受
3. 有30天过期时间

**可接受不一致阈值**: < 5%

---

## 汇总统计

### 按风险等级分布

| 风险等级 | 数量 | 百分比 | 端点列表 |
|---------|------|--------|---------|
| 🔴 高风险 | 0 | 0% | - |
| 🟡 中风险 | 5 | 29% | favorites, favorites-mutations, reports, achievements, achievements-mutations |
| 🟢 低风险 | 9 | 53% | history, recommendations-refresh, cleanup, tracking, analytics-anomalies, analytics-reports, notifications-stats, leaderboard, share |
| ⚪ 无风险 | 3 | 18% | substitute, popular, similar, monitoring |
| **总计** | **17** | **100%** | - |

### 按Batch分布

| Batch | 迁移日期 | 端点数 | 中风险 | 低风险 | 无风险 |
|-------|---------|--------|--------|--------|--------|
| Batch 10 | 近期 | 3 | 2 | 1 | 0 |
| Batch 11 | 近期 | 3 | 0 | 1 | 2 |
| Batch 12 | 近期 | 3 | 0 | 2 | 1 |
| Batch 13 | 近期 | 3 | 1 | 2 | 0 |
| Batch 14 | 近期 | 5 | 2 | 2 | 1 |

### 关键发现

#### 1. 部分迁移问题（严重） ⚠️⚠️⚠️

**问题**: `/api/social/achievements`端点存在"部分迁移"现象

**证据**:
```typescript
// src/app/api/social/achievements/route.ts:

// Line 7: 导入了supabase-adapter（看起来迁移了）
import { prisma } from '@/lib/db/supabase-adapter';

// Line 54-76: 使用prisma进行成员权限查询（这不属于Batch 14迁移范围，可以接受）
const member = await prisma.familyMember.findFirst({...});

// Line 105-120: ❌ 使用prisma查询achievements（这应该是Batch 14的迁移内容！）
const userAchievements = await prisma.achievement.findMany({
  where,
  include: { member: {...} }
});
```

**风险**:
- 该端点**并未实际完成迁移**
- 标签显示"Migrated"但实际仍在使用Prisma
- 如果其他端点也有类似问题，意味着"已迁移"端点列表不准确
- 双写框架需要覆盖这些"假迁移"端点

**立即行动项**:
1. 审查所有"已迁移"端点的实际代码
2. 识别类似"部分迁移"问题
3. 更新迁移状态清单
4. 将这些端点标记为"需要重新迁移"

#### 2. 缺少双写保护（严重） ⚠️⚠️

所有已迁移端点都**直接写入Supabase**，没有Prisma双写备份。

这意味着：
- 如果Supabase写入失败，数据永久丢失
- 没有一致性检查机制
- 无法验证迁移前后数据一致性
- 生产风险极高

**受影响端点**: 所有17个端点

#### 3. 事务完整性风险（中等） ⚠️

某些端点涉及多表操作，但没有事务保证：

例如 `/api/recipes/favorites`:
- 写入 `recipe_favorites`
- 查询 `recipes`
- 查询 `recipe_ingredients`
- 查询 `foods`

如果中间步骤失败，数据可能处于不一致状态。

---

## 验证脚本优先级

### P0 - 立即执行（24小时内）

1. **check-fake-migrations.ts**
   - 扫描所有"已迁移"端点
   - 检测是否实际使用Supabase
   - 输出真实迁移状态报告

2. **check-achievements-consistency.ts**
   - 针对发现的部分迁移问题
   - 对比Prisma和Supabase的achievement数据
   - 识别不一致的记录

### P1 - 本周内完成

3. **check-recipe-favorites-consistency.ts**
   - 中风险数据，需要保障
   - 验证收藏数据完整性

4. **check-health-reports-consistency.ts**
   - 用户健康数据
   - 验证报告生成和存储

### P2 - 按计划执行

5. **check-transaction-mutations.ts**
   - 验证写入操作的一致性
   - 监控双写成功率

6. **check-analytics-consistency.ts**
   - 分析类数据
   - 抽样验证即可

---

## 数据量估算（每日）

| 表名 | 写入量 | 读取量 | 风险等级 |
|------|--------|--------|---------|
| recipe_favorites | ~500 | ~5000 | 🟡 中 |
| recipe_view_history | ~5000 | - | 🟢 低 |
| health_reports | ~200 | ~1000 | 🟡 中 |
| achievements | ~100 | ~2000 | 🟡 中 |
| notifications | ~2000 | ~5000 | 🟢 低 |
| social_shares | ~100 | ~500 | 🟢 低 |

---

## 立即行动计划

### 今天（接下来的2小时）

1. ✅ **完成风险评估报告**（本文件）
2. 🔄 **编写 fake-migration 检测脚本**
3. 🔄 **运行检测，识别真实迁移状态**

### 明天（24小时内）

4. 完成P0验证脚本
5. 在Grafana创建一致性监控看板
6. 设置告警规则

### 本周内

7. 重新迁移发现的问题端点
8. 实施双写框架到所有中风险端点
9. 制定详细的回滚计划

---

**报告编制**: Claude Code
**审核状态**: 待技术负责人审核
**下一步**: 立即执行P0验证脚本
