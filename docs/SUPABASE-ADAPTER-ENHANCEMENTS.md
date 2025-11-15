# Supabase 适配器增强功能文档

## 概述

本文档描述了对 `src/lib/db/supabase-adapter.ts` 的三项核心增强功能，旨在提供更完整的 Prisma 兼容性并解决迁移过程中发现的关键问题。

---

## 增强功能列表

### 1. 嵌套关系 Join 支持

#### 问题描述
原实现只支持一层关系 join，对于 `include: { ingredients: { include: { food: true } } }` 只会生成 `ingredients(*)`，导致嵌套数据丢失。

#### 解决方案
实现了递归的 `buildSelectQuery`、`buildSelectFromSelect` 和 `buildRelationFragment` 函数，支持任意深度的嵌套关系。

#### 使用示例

```typescript
// Prisma 风格的嵌套 include
const recipes = await supabaseAdapter.recipe.findMany({
  include: {
    ingredients: {
      include: {
        food: true  // 嵌套关系
      }
    },
    instructions: true,
    nutrition: true,
  }
});

// 生成的 Supabase 查询字符串:
// *,ingredients(food(*)),instructions(*),nutrition(*)
```

#### 技术细节
- `buildSelectQuery`: 主入口，处理 include 和 select 参数
- `buildRelationFragment`: 递归构建每个关系的片段
- 支持 `select` 优先于 `include`
- 自动处理 `*` 字段的包含逻辑

---

### 2. OrderBy 数组格式支持

#### 问题描述
原实现假设 `orderBy` 是普通对象，对数组格式调用 `Object.entries()` 会得到数字索引，导致 SQL 错误 `column "0" does not exist`。

#### 解决方案
增强 orderBy 处理逻辑，自动识别数组和对象格式，统一处理。

#### 使用示例

```typescript
// 对象格式（单字段排序）
const results1 = await supabaseAdapter.achievement.findMany({
  orderBy: { rarity: 'desc' }
});

// 数组格式（多字段排序）
const results2 = await supabaseAdapter.achievement.findMany({
  orderBy: [
    { rarity: 'desc' },
    { unlockedAt: 'desc' }
  ]
});

// 两种格式都能正确处理
```

#### 技术细节
- 使用 `Array.isArray()` 检测格式
- 统一转换为数组进行处理
- 每个对象取第一个字段（符合 Prisma 约定）
- 大小写不敏感的 `desc` 检测

---

### 3. JSON Path 操作符支持

#### 问题描述
原实现不支持 Prisma 的 JSON 操作符，无法查询 JSON 字段的嵌套路径，导致业务逻辑失效。

#### 解决方案
实现了 `buildJsonPathSelector` 和 `applyJsonPathFilters` 函数，将 Prisma 风格的 JSON path 查询转换为 PostgREST 的 JSON 操作符。

#### 使用示例

```typescript
// 查询 JSON 字段的嵌套路径
const recipes = await supabaseAdapter.recipe.findMany({
  where: {
    metadata: {
      path: ['season'],
      equals: 'SUMMER'
    }
  }
});

// 生成的 PostgREST 查询:
// metadata->>'season' = 'SUMMER'

// 支持复杂路径
const filtered = await supabaseAdapter.recipe.findMany({
  where: {
    metadata: {
      path: ['settings', 'notifications', 'enabled'],
      equals: true
    }
  }
});

// 生成: metadata->'settings'->'notifications'->>'enabled' = true
```

#### 支持的操作符
- `equals`: 等于
- `not`: 不等于
- `in`: 在列表中
- `notIn`: 不在列表中
- `lt`, `lte`, `gt`, `gte`: 比较操作符
- `contains`: 包含字符串（模糊匹配）
- `startsWith`: 以...开头
- `endsWith`: 以...结尾

#### 技术细节
- `buildJsonPathSelector`: 构建 PostgREST JSON 路径选择器
- 中间路径使用 `->`, 最后一个使用 `->>`（返回文本）
- 自动转义单引号
- 支持所有标准比较和字符串操作符

---

## 限制和未来工作

### 当前限制

1. **不支持 Prisma 的 `some`/`every`/`none` 量词**
   - 这些需要 SQL 的 EXISTS 子查询或数组包含操作
   - 建议使用 Supabase RPC 函数或 SQL 视图

2. **不支持事务**
   - Supabase JS 客户端不直接支持事务
   - 需要使用数据库函数

3. **循环引用检测**
   - 当前未实现循环引用检测
   - 理论上可能导致无限递归

### 未来改进方向

1. **添加循环引用检测**
   ```typescript
   function buildSelectQuery(include, select, visited = new Set()) {
     // 检测循环
   }
   ```

2. **实现 `some`/`every`/`none` 支持**
   - 方案 A: 映射到 Supabase 的数组操作符
   - 方案 B: 创建专用的 RPC 函数

3. **性能优化**
   - 添加查询字符串缓存
   - 优化递归深度

4. **更好的错误处理**
   - 验证 include/select 配置
   - 提供有意义的错误消息

---

## 测试验证

### 类型检查
```bash
npm run type-check
```
所有 recommendations 端点的类型错误已修复。

### 单元测试
测试文件：`src/__tests__/lib/supabase-adapter-enhancements.test.ts`

测试覆盖：
- ✅ 嵌套关系类型签名
- ✅ OrderBy 数组和对象格式
- ✅ JSON path 操作符配置
- ✅ 复合查询集成测试

---

## 迁移指南

### 从旧版本升级

如果您的代码之前使用了 workaround（如手动构建 SQL），现在可以直接使用标准的 Prisma API：

**Before:**
```typescript
// 使用 TODO 注释和单字段 orderBy
orderBy: { rarity: 'desc' }, // TODO: 只支持单字段
```

**After:**
```typescript
// 直接使用数组格式
orderBy: [
  { rarity: 'desc' },
  { unlockedAt: 'desc' }
]
```

### 新项目使用

直接使用 Prisma 风格的 API，适配器会自动处理：

```typescript
const data = await supabaseAdapter.model.findMany({
  where: {
    status: 'ACTIVE',
    metadata: {
      path: ['type'],
      equals: 'premium'
    }
  },
  include: {
    relation1: {
      include: {
        nestedRelation: true
      }
    },
    relation2: true
  },
  orderBy: [
    { priority: 'desc' },
    { createdAt: 'asc' }
  ],
  take: 10
});
```

---

## 贡献

这些增强功能是基于 CodeX MCP 协作规范开发的：

1. **需求分析**: 通过 Code Review 发现关键问题
2. **设计方案**: CodeX 提供 unified diff patch 建议
3. **独立实现**: 基于建议进行批判性思考和重写
4. **验证测试**: 类型检查和单元测试验证

---

## 相关资源

- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [PostgREST JSON Operators](https://postgrest.org/en/stable/references/api/tables_views.html#json-columns)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

---

## 更新日志

### 2025-01-11
- ✅ 实现嵌套关系 join 支持
- ✅ 实现 orderBy 数组格式支持
- ✅ 实现 JSON path 操作符支持
- ✅ 所有类型检查通过
- ✅ 添加单元测试和文档

---

**维护者**: Claude Code + CodeX MCP
**最后更新**: 2025-01-11
