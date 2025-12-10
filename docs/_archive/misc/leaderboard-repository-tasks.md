# LeaderboardRepository 实现任务清单

**版本**: 1.0
**创建日期**: 2025-11-11
**预计完成时间**: 4天
**优先级**: P0 (最高)

---

## 🎯 项目目标

将 LeaderboardService 从直接依赖 Prisma 架构重构为 Repository 模式，实现：

- ✅ Repository 接口定义
- ✅ Supabase 实现 (主数据源)
- ✅ Prisma 实现 (双写验证)
- ✅ Service 层重构
- ✅ 单元测试和集成测试

---

## ✅ 已完成

### Day 1 (2025-11-11) - 需求分析和设计

- ✅ **审查 LeaderboardService 代码** (870行)
  - 识别所有数据库操作
  - 分析查询模式
  - 统计共 13 个数据库访问点

- ✅ **设计 LeaderboardRepository 接口** (170行)
  - 创建接口定义文件
  - 定义 11 个方法签名
  - 设计数据 DTO 和过滤器类型

**产出物**:

- `src/lib/repositories/interfaces/leaderboard-repository.ts` (接口定义)
- `service-layer-analysis-report.md` (架构分析报告)

---

## 📝 待执行任务（接下来3天）

### Day 2 (2025-11-12) - Supabase 实现

**任务 2.1**: 创建 Supabase 实现框架

- [ ] 创建文件: `src/lib/repositories/implementations/supabase-leaderboard-repository.ts`
- [ ] 导入必要依赖: SupabaseClient, Database types
- [ ] 实现类声明: `export class SupabaseLeaderboardRepository implements LeaderboardRepository`
- [ ] 添加构造函数和依赖注入
- [ ] 运行 TypeScript 类型检查: `pnpm type-check`

**任务 2.2**: 实现 Health Data 聚合方法

- [ ] 实现 `aggregateHealthDataByMember()`
  - 使用 `supabase.from('health_data').select()`
  - 实现 GROUP BY 逻辑
  - 处理日期范围过滤
  - 计算平均值和计数
- [ ] 编写单元测试
- [ ] 验证查询结果格式

**任务 2.3**: 实现成员查询方法

- [ ] 实现 `getMemberById()`
- [ ] 实现 `getMemberHealthData()`
- [ ] 实现 `getMembersHealthData()`
- [ ] 实现 `getMembersWithHealthData()`
- [ ] 编写单元测试
- [ ] 验证返回数据格式

**验收标准**:

- ✅ 4 个方法全部实现
- ✅ TypeScript 编译无错误
- ✅ 单元测试覆盖率 > 80%
- ✅ 查询返回正确的数据格式

---

### Day 3 (2025-11-13) - Prisma 实现 + 双写测试

**任务 3.1**: 创建 Prisma 实现框架

- [ ] 创建文件: `src/lib/repositories/implementations/prisma-leaderboard-repository.ts`
- [ ] 导入 PrismaClient
- [ ] 实现类声明: `export class PrismaLeaderboardRepository implements LeaderboardRepository`
- [ ] 添加构造函数和依赖注入
- [ ] 运行 TypeScript 类型检查: `pnpm type-check`

**任务 3.2**: 实现所有方法（Supabase 模式）

- [ ] 实现 `aggregateHealthDataByMember()`
- [ ] 实现 `getMemberById()`
- [ ] 实现 `getMemberHealthData()`
- [ ] 实现 `getMembersHealthData()`
- [ ] 实现 `getMembersWithHealthData()`
- [ ] 实现 `createLeaderboardEntry()`
- [ ] 实现 `createLeaderboardEntries()`
- [ ] 实现 `getLeaderboardEntries()`
- [ ] 实现 `getLatestLeaderboardEntry()`
- [ ] 实现 `getRankingHistory()`
- [ ] 实现 `countMemberHealthData()`
- [ ] 实现 `calculateCheckinStreakDays()`

**验收标准**:

- ✅ 11 个方法全部实现
- ✅ TypeScript 编译无错误
- ✅ 可与 Supabase 实现互换

**任务 3.3**: 创建双写装饰器

- [ ] 创建文件: `src/lib/repositories/decorators/dual-write-leaderboard-repository.ts`
- [ ] 实现装饰器类
- [ ] 包装所有方法，实施双写逻辑
- [ ] 添加审计日志
- [ ] 处理错误和补偿机制

**验收标准**:

- ✅ 双写装饰器可用
- ✅ 有审计日志记录
- ✅ 错误处理完善

---

### Day 4 (2025-11-14) - Service 重构和集成测试

**任务 4.1**: 重构 LeaderboardService

- [ ] 修改导入: 移除 `import { prisma } from '@/lib/db'`
- [ ] 添加构造函数参数: `private readonly leaderboardRepository: LeaderboardRepository`
- [ ] 重构所有数据库调用，使用 Repository 方法
  - [ ] `calculateHealthScoreLeaderboard()`
  - [ ] `calculateCheckinStreakLeaderboard()`
  - [ ] `calculateWeightLossLeaderboard()`
  - [ ] `calculateExerciseMinutesLeaderboard()`
  - [ ] `calculateCaloriesManagementLeaderboard()`
  - [ ] `convertToLeaderboardItems()`
  - [ ] `calculateRankChange()`
- [ ] 更新 `leaderboardService` 单例创建

**验收标准**:

- ✅ Service 不再直接依赖 prisma
- ✅ 所有方法使用 Repository
- ✅ TypeScript 编译无错误

**任务 4.2**: API 端点更新

- [ ] 更新 `/api/social/leaderboard/route.ts`
  - [ ] 在 GET/POST/PATCH 方法中创建 Repository
  - [ ] 注入到 LeaderboardService
- [ ] 如果使用装饰器，配置双写模式

**验收标准**:

- ✅ API 端点可用
- ✅ 请求成功处理
- ✅ 双写正常运行

**任务 4.3**: 集成测试

- [ ] 编写端到端测试
- [ ] 验证双写一致性
- [ ] 测试错误处理
- [ ] 性能测试

**验收标准**:

- ✅ 双写一致性 > 99%
- ✅ API 响应时间 < 200ms
- ✅ 错误日志正确记录

---

## 📊 测试计划

### 单元测试

**文件**: `src/__tests__/lib/repositories/supabase-leaderboard-repository.test.ts`

```typescript
describe("SupabaseLeaderboardRepository", () => {
  describe("aggregateHealthDataByMember", () => {
    it("应该正确聚合健康数据", async () => {
      // 准备测试数据
      // 执行查询
      // 验证结果
    });

    it("应该处理空结果", async () => {
      // 测试边界情况
    });
  });

  // 其他方法的测试...
});
```

**覆盖率要求**:

- ✅ 所有公共方法测试
- ✅ 覆盖率 > 80%
- ✅ 边界情况覆盖

### 集成测试

**文件**: `src/__tests__/integration/leaderboard-dual-write.test.ts`

```typescript
describe("Leaderboard Dual Write Integration", () => {
  it("应该同时写入 Supabase 和 Prisma", async () => {
    const repository = new DualWriteLeaderboardRepository(
      new SupabaseLeaderboardRepository(),
      new PrismaLeaderboardRepository(),
    );

    const result = await repository.createLeaderboardEntry(testData);

    // 验证两个数据库都有数据
    // 验证审计日志
  });
});
```

**验收标准**:

- ✅ 双写成功
- ✅ 数据一致性 100%
- ✅ 审计日志正确

---

## 🚀 生产部署检查清单

### 部署前

- [ ] 所有测试通过
- [ ] TypeScript 编译无错误
- [ ] 代码审查完成
- [ ] 性能测试通过

### 部署中

- [ ] 选择低峰时段部署
- [ ] 监控错误日志
- [ ] 观察响应时间
- [ ] 检查审计日志

### 部署后

- [ ] API 功能验证
- [ ] 数据一致性检查
- [ ] 24小时观察期
- [ ] 准备回滚计划

---

## 📦 产出物

### 代码文件

1. ✅ `src/lib/repositories/interfaces/leaderboard-repository.ts`
2. ⏳ `src/lib/repositories/implementations/supabase-leaderboard-repository.ts`
3. ⏳ `src/lib/repositories/implementations/prisma-leaderboard-repository.ts`
4. ⏳ `src/lib/repositories/decorators/dual-write-leaderboard-repository.ts`
5. ⏳ `src/lib/services/social/leaderboard.ts` (重构)
6. ⏳ `src/app/api/social/leaderboard/route.ts` (可选更新)

### 测试文件

7. ⏳ `src/__tests__/lib/repositories/supabase-leaderboard-repository.test.ts`
8. ⏳ `src/__tests__/lib/repositories/prisma-leaderboard-repository.test.ts`
9. ⏳ `src/__tests__/integration/leaderboard-dual-write.test.ts`
10. ⏳ `src/__tests__/lib/services/leaderboard-service.test.ts`

### 文档

11. ✅ `leaderboard-repository-tasks.md` (本文件)
12. ⏳ `migrations/leaderboard-repository-implementation.md` (实施文档)
13. ⏳ `CHANGELOG.md` (更新日志)

---

## 📈 成功指标

### 功能指标

- ✅ 所有方法正确实现
- ✅ Service 层成功重构
- ✅ API 正常运行
- ✅ 排行榜计算结果正确

### 性能指标

- ✅ API 响应时间: P50 < 100ms, P95 < 200ms
- ✅ 数据库查询时间: < 50ms
- ✅ 缓存命中率: > 70%

### 质量指标

- ✅ 测试覆盖率: > 80%
- ✅ 类型安全: 100% TypeScript 覆盖
- ✅ 双写一致性: > 99.9%
- ✅ 错误率: < 0.1%

---

## ⚠️ 风险和对策

### 风险 1: Supabase 查询性能问题

**概率**: 中
**影响**: 高

**对策**:

- 优化查询，使用索引
- 添加缓存层（Redis）
- 监控查询执行时间

### 风险 2: 双写数据不一致

**概率**: 低
**影响**: 高

**对策**:

- 实施审计日志
- 设计补偿机制
- 定期检查一致性
- 准备手动修复脚本

### 风险 3: 服务层重构引入 Bug

**概率**: 中
**影响**: 中

**对策**:

- 充分的单元测试
- 集成测试覆盖
- 灰度发布
- 监控和快速回滚机制

---

## 👥 责任分工

| 角色       | 责任人 | 职责                         |
| ---------- | ------ | ---------------------------- |
| 技术负责人 | Claude | 架构设计、代码审查、技术决策 |
| 开发工程师 | Claude | 接口实现、测试编写、部署     |
| 测试工程师 | Claude | 测试用例设计、集成测试、验收 |
| 运维工程师 | Claude | 生产部署、监控配置、回滚     |

---

## 🔄 进度跟踪

| 日期       | 完成任务            | 状态 | 备注   |
| ---------- | ------------------- | ---- | ------ |
| 2025-11-11 | 接口设计            | ✅   | 已完成 |
| 2025-11-12 | Supabase 实现       | ⏳   | 待开始 |
| 2025-11-13 | Prisma 实现 + 双写  | ⏳   | 待开始 |
| 2025-11-14 | Service 重构 + 测试 | ⏳   | 待开始 |
| 2025-11-15 | 集成测试            | ⏳   | 待开始 |
| 2025-11-16 | 生产部署            | ⏳   | 待开始 |

---

## 📝 备注

### CodeX 反馈相关

1. **架构一致性**: 将 Leaderboard 系统统一到 Repository 模式，与 Budget 系统保持一致
2. **可测试性**: 通过 Repository 接口，更容易编写单元测试
3. **可维护性**: 解耦数据库实现，便于未来迁移或支持多数据库
4. **双写支持**: Repository 模式是实施双写的基础

### 技术决策记录

**ADR-001**: 选择创建 Repository 接口而不是在 Service 内直接双写

- ✅ 优点: 符合架构原则、可测试性更好、技术债务少
- ❌ 缺点: 需要更多时间（3天 vs 1天）
- ✅ 决策: 实施 Repository 模式

**ADR-002**: 使用 TypeScript 接口而不是抽象类

- ✅ 优点: 更灵活、支持多重实现、编译时检查
- ❌ 缺点: 不能在接口中实现共享逻辑
- ✅ 决策: 使用接口

---

**文档版本**: 1.0
**最后更新**: 2025-11-11
**状态**: P0 实施计划中
