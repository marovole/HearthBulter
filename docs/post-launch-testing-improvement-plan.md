# 后续工作实施计划

## 背景

在完成 `fix-pre-launch-critical-issues` 提案（P0 优先级）和 `P1` 优先级工作的初步阶段后，我们已建立稳定的测试基础设施并提升了部分覆盖率。本计划详细描述了四个后续工作方向的具体实施计划。

## 当前状态

### 已完成的 P0 工作
✅ 修复社交分享类型定义
✅ 运行 ESLint 自动修复
✅ Next.js 15 异步参数修复（API 路由）
✅ 修复 Prisma schema 错误（Comment 模型）
✅ 构建成功 ✓

### 已完成的 P1 初步工作
✅ 安装测试基础设施（ts-jest, @types/jest, node-mocks-http）
✅ 生成 15 个测试文件（10个 API 路由测试 + 5个 服务层测试）
✅ 创建通用组件类型定义（`src/types/components.ts`）
✅ 修复核心组件的 any 类型问题
✅ 编写 1 个完整的 API 测试示例（leaderboard）

### 当前指标
- **测试覆盖率**：4.96%（目标 25%）
- **测试套件**：57 个（+21%）
- **测试总数**：777 个（+5.4%）
- **构建状态**：✅ 通过

---

## 后续工作方向

### 工作方向 1：完善测试用例

**目标**：为生成的 15 个测试文件添加实际测试逻辑

**优先级文件（按业务价值排序）**:
1. **社交功能**（用户参与度高）
   - `api/social/stats/route.test.ts` - 社交统计数据
   - `api/social/achievements/route.test.ts` - 成就系统
   - `api/social/share/[token]/route.test.ts` - 内容分享

2. **设备同步**（核心功能）
   - `api/devices/route.test.ts` - 设备管理
   - `api/devices/sync/route.test.ts` - 数据同步

3. **通知系统**（用户交互）
   - `api/notifications/route.test.ts` - 通知列表

4. **服务层测试**（业务逻辑）
   - `services/device-sync-service.test.ts` - 设备同步服务
   - `services/nutrition-calculator.test.ts` - 营养计算服务

#### 实施步骤

**每个测试文件的完善流程**：
1. **导入被测试模块**（使用正确的路径和mock）
2. **创建 Mock 数据**（与真实数据结构吻合）
3. **设置 Mock 函数**（使用 jest.mock()）
4. **编写测试场景**：
   - 正常流程（Happy Path）
   - 边界条件（Edge Cases）
   - 错误处理（Error Scenarios）

#### 示例模板（基于 leaderboard 测试）

```typescript
/**
 * API 路由测试模板
 * 适用于 GET/POST/PUT/DELETE 请求
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock 依赖
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    // 具体模型的 mock
  },
}));

describe('API 路由测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 认证测试
  describe('Authentication', () => {
    it('should return 401 when unauthorized', async () => {
      // 实现
    });
  });

  // 参数验证
  describe('Validation', () => {
    it('should validate required parameters', async () => {
      // 实现
    });

    it('should return 400 for invalid parameters', async () => {
      // 实现
    });
  });

  // 业务逻辑
  describe('Business Logic', () => {
    it('should process request correctly', async () => {
      // 实现
    });

    it('should handle database operations', async () => {
      // 实现
    });
  });

  // 错误处理
  describe('Error Handling', () => {
    it('should handle database errors gracefuly', async () => {
      // 实现
    });

    it('should handle service errors gracefuly', async () => {
      // 实现
    });
  });
});
```

---

### 工作方向 2：提升覆盖率

**目标**：将测试覆盖率从 4.96% 提升到 25% 目标

#### 当前覆盖率分析

**高价值目标模块**（按优先级排序）：

1. **lib/services/** 目录（核心服务逻辑）
   - 当前覆盖率：~8%
   - 目标：提升到 60%
   - 关键文件：
     - `ai/conversation-manager.ts` - AI 对话管理
     - `nutrition-calculator.ts` - 营养计算
     - `device-sync-service.ts` - 设备同步
     - `notification-service.ts` - 通知服务
     - `sensitive-filter.ts` - 敏感信息过滤

2. **lib/utils/** 目录（工具函数）
   - 当前覆盖率：~15%
   - 目标：提升到 80%
   - 关键文件：
     - `date-utils.ts` - 日期时间工具
     - `validation.ts` - 数据验证
     - `health-calculations.ts` - 健康计算

3. **components/ui/** 目录（UI 基础组件）
   - 当前覆盖率：~30%
   - 目标：提升到 70%
   - 关键文件：SVG 图标、基础组件

#### 实施策略

**阶段 1：核心服务层**（预计提升覆盖率 8% → 15%）
- 为每个服务方法编写单元测试
- Mock 外部依赖（数据库、第三方 API）
- 测试所有分支和边界条件

**阶段 2：工具函数**（预计提升覆盖率 15% → 20%）
- 为工具函数编写函数式测试
- 测试各种输入组合
- 验证错误处理

**阶段 3：UI 组件**（预计提升覆盖率 20% → 25%）
- 为组件编写集成测试
- 测试用户交互
- 验证状态管理

---

### 工作方向 3：修复 any 类型

**目标**：逐步减少代码库中的 any 类型使用

#### 当前 any 类型统计

按使用频率排序的模块：

1. **components/meal-planning/**（高频使用）
   - `RecipeRecommendationSettings.tsx` - 菜谱推荐设置
   - `MealAcceptance.tsx` - 餐食接受度
   - `PortionAdjuster.tsx` - 份量调整
   - `MacroNutrientChart.tsx` - 宏观营养素图表

2. **components/dashboard/**（中等使用）
   - `HealthScoreCard.tsx`
   - `WeightTrendChart.tsx`

3. **components/ui/**（基础组件）
   - `consent-dialog.tsx` - 同意弹窗
   - `alert-dialog.tsx`

4. **lib/services/**（业务逻辑）
   - MealCard.tsx 等组件中的 any

#### 修复优先级

**P0 - 高频组件**（影响用户多）：
- 菜谱推荐相关组件
- 餐食接受和份量调整
- 同意弹窗（隐私相关）

**P1 - 核心组件**（影响功能）：
- 健康数据卡片
- 图表组件

**P2 - 其他组件**（逐步优化）

#### 修复步骤（每个组件）

1. **识别 any 类型位置**
   ```bash
   grep -n "any" src/components/path/to/component.tsx | wc -l
   ```

2. **提取类型定义**
   - 如果类型可复用，添加到 `src/types/components.ts`
   - 如果是组件特有类型，定义在组件文件内

3. **替换 any 类型为具体类型**

4. **测试验证**
   - TypeScript 编译通过
   - 功能测试通过

#### 示例：修复组件的 any 类型

**Before:**
```typescript
const handlePortionAdjust = (servings: number, ingredients: any[], nutrition: any) => {
  // ...
};
```

**After:**
```typescript
interface Ingredient {
  id: string
  name: string
  amount: number
  unit: string
  calories?: number
}

interface NutritionData {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const handlePortionAdjust = (servings: number, ingredients: Ingredient[], nutrition: NutritionData) => {
  // ...
};
```

---

### 工作方向 4：集成测试

**目标**：测试完整的用户流程

#### 优先级用户流程

**P0 - 认证流程**（入口流程）：
1. 用户注册
   - 输入邮箱和密码
   - 验证输入
   - 创建用户账户
   - 发送验证邮件

2. 用户登录
   - 输入凭证
   - 验证身份
   - 创建会话
   - 重定向到仪表板

3. 密码重置
   - 请求重置
   - 验证邮箱
   - 发送重置链接
   - 设置新密码

**P1 - 数据录入流程**（核心功能）：

1. **添加健康数据**
   - 登录用户
   - 选择成员
   - 录入健康指标（体重、血压等）
   - 查看趋势图表

2. **创建家庭**
   - 登录用户
   - 创建家庭
   - 邀请成员
   - 成员接受邀请

3. **生成营养报告**
   - 设置营养目标
   - 录入饮食记录
   - 生成分析报告
   - 查看营养建议

**P2 - 社交功能流程**（用户互动）：

1. **分享成就**
   - 用户达成健康目标
   - 生成分享内容
   - 分享到社交平台
   - 查看分享统计

2. **查看排行榜**
   - 访问排行榜页面
   - 选择排行榜类型
   - 查看排名
   - 分享排名

#### 实施步骤（以用户注册为例）

**1. 设置测试数据**
```typescript
const testUser = {
  email: 'test@example.com',
  password: 'Test123456',
  name: 'Test User',
};
```

**2. 创建测试场景**
```typescript
describe('User Registration Flow', () => {
  it('should complete full registration process', async () => {
    // Step 1: 访问注册页面
    const registerPage = await visit('/register');

    // Step 2: 填写注册表单
    await registerPage.fillForm({
      email: testUser.email,
      password: testUser.password,
      name: testUser.name,
    });

    // Step 3: 提交表单
    const response = await registerPage.submit();

    // Step 4: 验证结果
    expect(response.status).toBe(201);
    expect(response.json().user.email).toBe(testUser.email);

    // Step 5: 验证邮件已发送
    const email = await getSentEmail(testUser.email);
    expect(email.subject).toContain('Verify your email');

    // Step 6: 点击验证链接
    const verifyResponse = await visit(email.verifyLink);
    expect(verifyResponse.status).toBe(200);

    // Step 7: 登录
    const loginResponse = await login(testUser.email, testUser.password);
    expect(loginResponse.status).toBe(200);

    // Step 8: 验证登录状态
    expect(loginResponse.token).toBeDefined();
  });
});
```

**3. 清理测试数据**
```typescript
afterEach(async () => {
  await deleteUser(testUser.email);
});
```

---

## 实施建议

### 分阶段实施

**第 1 周**：
- 完成社交功能 API 测试（3个文件）
- 修复 MealAcceptance 组件的 any 类型
- 开始编写设备同步服务测试

**第 2 周**：
- 完成设备相关 API 测试（3个文件）
- 完成通知系统 API 测试（2个文件）
- 修复 MealPlanning 组件的 any 类型

**第 3 周**：
- 完成服务层测试（5个文件）
- 提升 3-4 个工具函数的覆盖率
- 修复更多组件的 any 类型

**第 4 周**：
- 编写用户注册集成测试
- 编写健康数据录入集成测试
- 评估覆盖率提升进度

### 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| any 类型修复导致 bug | 中 | 中 | 每次修复后运行测试，小批量修改 |
| 集成测试复杂性高 | 中 | 高 | 使用分页测试，每个流程单独测试 |
| 测试覆盖率提升缓慢 | 低 | 中 | 优先测试高价值模块 |

### 成功标准

- [ ] 测试覆盖率 ≥ 25%
- [ ] 所有生成的测试文件完善（至少基础测试通过）
- [ ] any 类型使用减少 50%
- [ ] 至少 3 个关键用户流程有集成测试
- [ ] 构建和测试全部通过

---

## 附录：快速开始

### 运行单个测试

```bash
# API 测试
npm test -- src/__tests__/api/api/social/stats/route.test.ts

# 组件测试
npm test -- src/__tests__/components/meal-planning/MealCard.test.tsx

# 服务测试
npm test -- src/__tests__/lib/services/device-sync-service.test.ts
```

### 查看覆盖率

```bash
npm run test:coverage
```

### 查找 any 类型

```bash
# 统计组件中的 any 使用
grep -r "any" src/components --include="*.tsx" | wc -l

# 查看具体位置
grep -rn "any" src/components/path/to/component.tsx
```

---

## 总结

四个工作方向相互补充，形成完整的测试优化闭环：

1. **完善测试用例**：为已有测试骨架添加血肉
2. **提升覆盖率**：系统性地提高代码覆盖
3. **修复 any 类型**：提升类型安全和代码质量
4. **集成测试**：验证完整的用户体验

通过分阶段实施，可以在 4 周内显著提升项目质量和可维护性。
