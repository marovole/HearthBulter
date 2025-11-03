# Next.js 15 Async Params Migration Guide

## 概述

Next.js 15引入了一个breaking change：所有动态路由的params参数现在都是异步的Promise类型。这需要我们更新所有使用动态路由参数的代码。

## 迁移模式

### Before (Next.js 14)

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  // ... 使用 id
}
```

### After (Next.js 15)

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ... 使用 id
}
```

## 迁移步骤

### 1. 更新函数签名

将params的类型从对象改为Promise包裹的对象：

```diff
- { params }: { params: { id: string } }
+ { params }: { params: Promise<{ id: string }> }
```

### 2. 在函数内部await params

在函数顶部添加await解构：

```diff
  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
+   const { id } = await params;
-   const id = params.id;
```

### 3. 多参数路由

对于嵌套的动态路由（如`/api/members/[memberId]/goals/[goalId]`）：

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> }
) {
  const { memberId, goalId } = await params;
  // ... 使用 memberId 和 goalId
}
```

## 常见路由模式

### 单参数路由

```typescript
import { IdParam } from '@/lib/utils/route-params';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<IdParam> }
) {
  const { id } = await params;
}
```

### 双参数路由

```typescript
import { MemberGoalParams } from '@/lib/utils/route-params';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<MemberGoalParams> }
) {
  const { memberId, goalId } = await params;
}
```

## 测试签名更新

测试文件中的路由handler调用也需要更新：

### Before

```typescript
const request = {
  url: 'http://localhost:3000/api/foo/123'
} as NextRequest;
const params = { id: '123' };

await GET(request, { params });
```

### After

```typescript
const request = {
  url: 'http://localhost:3000/api/foo/123'
} as NextRequest;
const params = Promise.resolve({ id: '123' });

await GET(request, { params });
```

## 需要迁移的文件列表

基于当前代码库分析，以下25个文件需要迁移：

### Analytics (2 files)
- `/api/analytics/share/route.ts`
- `/api/analytics/reports/[id]/route.ts`

### E-commerce (2 files)
- `/api/ecommerce/orders/[orderId]/route.ts`
- `/api/ecommerce/auth/[platform]/route.ts`

### Families (11 files)
- `/api/families/[familyId]/tasks/route.ts`
- `/api/families/[familyId]/tasks/[taskId]/route.ts`
- `/api/families/[familyId]/tasks/[taskId]/status/route.ts`
- `/api/families/[familyId]/tasks/[taskId]/assign/route.ts`
- `/api/families/[familyId]/tasks/my/route.ts`
- `/api/families/[familyId]/tasks/stats/route.ts`
- `/api/families/[familyId]/shopping/route.ts`
- `/api/families/[familyId]/shopping/[itemId]/route.ts`
- `/api/families/[familyId]/shopping/[itemId]/assign/route.ts`
- `/api/families/[familyId]/shopping/[itemId]/purchase/route.ts`
- `/api/families/[familyId]/shopping/stats/route.ts`

### Inventory (2 files)
- `/api/inventory/items/[id]/route.ts`
- `/api/inventory/notifications/[id]/route.ts`

### Recipes (2 files)
- `/api/recipes/[id]/rate/route.ts`
- `/api/recipes/[id]/favorite/route.ts`

### Social (3 files)
- `/api/social/share/[token]/route.ts`
- `/api/social/share/[shareToken]/route.ts`
- `/api/social/achievements/[id]/share/route.ts`

### Tracking (2 files)
- `/api/tracking/meals/[id]/route.ts`
- `/api/tracking/templates/[id]/route.ts`

### Notifications (1 file)
- `/api/notifications/[id]/route.ts`

## TypeScript类型检查

迁移完成后，运行以下命令确保没有类型错误：

```bash
npx tsc --noEmit --skipLibCheck
```

## 参考资料

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Async Request APIs RFC](https://github.com/vercel/next.js/discussions/48077)
