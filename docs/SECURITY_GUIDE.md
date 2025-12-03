# 安全开发指南

本文档描述了 Health Butler 项目的安全开发规范和最佳实践。

## 目录

1. [认证与授权](#认证与授权)
2. [API 安全](#api-安全)
3. [数据保护](#数据保护)
4. [输入验证](#输入验证)
5. [错误处理](#错误处理)
6. [依赖管理](#依赖管理)
7. [日志与监控](#日志与监控)

---

## 认证与授权

### 认证检查

所有受保护的 API 端点必须验证用户认证状态：

```typescript
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  // 必须检查 session 和 user.id
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  
  // ... 继续处理
}
```

### 授权检查

使用授权中间件验证资源访问权限：

```typescript
import { 
  requireMemberDataAccess, 
  requireOwnership,
  requireAdmin 
} from '@/lib/middleware/authorization';

// 验证成员数据访问权限
const accessResult = await requireMemberDataAccess(session.user.id, memberId);
if (!accessResult.authorized) {
  return NextResponse.json(
    { error: accessResult.reason || '无权访问' },
    { status: 403 }
  );
}

// 验证资源所有权
const ownershipResult = await requireOwnership(
  session.user.id, 
  'inventory_item', 
  resourceId
);

// 验证管理员权限
const adminResult = await requireAdmin(session.user.id);
```

### 支持的资源类型

```typescript
type ResourceType = 
  | 'inventory_item'
  | 'health_report'
  | 'meal_plan'
  | 'recipe'
  | 'health_goal'
  | 'shopping_list'
  | 'notification'
  | 'family_member'
  | 'wearable_device';
```

---

## API 安全

### 请求验证

使用 Zod schemas 验证所有输入：

```typescript
import { validateBody, validateQuery } from '@/lib/validation/api-validator';
import { createInventoryItemSchema } from '@/lib/validation/schemas/inventory';

export async function POST(request: NextRequest) {
  const result = await validateBody(request, createInventoryItemSchema);
  
  if (!result.success) {
    return NextResponse.json(result.error, { status: 400 });
  }
  
  const validatedData = result.data;
  // ... 使用经过验证的数据
}
```

### 速率限制

对 AI 调用实施速率限制：

```typescript
import { withRateLimit, RateLimitError } from '@/lib/services/ai/rate-limiter';

try {
  const result = await withRateLimit(userId, 'chat', async () => {
    return await callAIService();
  });
} catch (error) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { 
        status: 429,
        headers: { 'Retry-After': String(error.retryAfter) }
      }
    );
  }
}
```

### 管理员端点

管理员端点必须在所有环境中验证权限：

```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  
  // 始终要求认证
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  
  // 验证管理员角色
  const adminResult = await requireAdmin(session.user.id);
  if (!adminResult.authorized) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }
  
  // 记录审计日志
  logger.info('管理员操作', {
    userId: session.user.id,
    operation: 'scheduler_access',
    timestamp: new Date().toISOString(),
  });
}
```

---

## 数据保护

### Token 安全

使用安全的 Token 生成器：

```typescript
import { 
  generateSecureShareToken, 
  verifyShareToken 
} from '@/lib/security/token-generator';

// 生成 Token
const token = await generateSecureShareToken(
  resourceId,
  'health_report',
  ownerId,
  7, // 过期天数
  ['read']
);

// 验证 Token
const result = await verifyShareToken(token);
if (!result.valid) {
  return null;
}
```

**禁止使用：**
- `Math.random()` 生成安全 Token
- 简单的时间戳 + 随机数组合
- 可预测的 ID 序列

### 敏感数据加密

对敏感数据使用 AES-256-GCM 加密：

```typescript
import { encrypt, decrypt } from '@/lib/security/encryption';

// 加密
const encrypted = await encrypt(sensitiveData);

// 解密
const decrypted = await decrypt(encrypted);
```

### 电商平台 Token

对第三方平台 Token 进行加密存储：

```typescript
import { 
  prepareTokenForStorage, 
  readTokenFromStorage 
} from '@/lib/services/ecommerce/token-storage';

// 存储前加密
const encryptedTokens = await prepareTokenForStorage(
  accessToken,
  refreshToken
);

// 读取时解密
const tokens = await readTokenFromStorage(
  encryptedAccessToken,
  encryptedRefreshToken
);
```

---

## 输入验证

### 过滤器安全

Supabase 查询已包含注入防护：

```typescript
// buildFilterExpressions 自动：
// 1. 验证键名格式
// 2. 转义特殊字符
// 3. 检测危险模式

// 危险模式会被拒绝：
// - SQL 关键字注入
// - 操作符注入
// - 嵌套条件注入
```

### 文件上传

```typescript
// 验证文件类型
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('不支持的文件类型');
}

// 限制文件大小
const maxSize = 5 * 1024 * 1024; // 5MB
if (file.size > maxSize) {
  throw new Error('文件过大');
}

// 生成安全的文件名
const safeFileName = generateSecureRandomToken(16) + path.extname(file.name);
```

---

## 错误处理

### AI 错误处理

使用统一的错误处理器，不泄露提供商信息：

```typescript
import { handleAIError, AIServiceError } from '@/lib/services/ai/error-handler';

try {
  const result = await callAIService();
} catch (error) {
  const errorResponse = handleAIError(error, {
    userId,
    operation: 'chat_completion',
  });
  
  // errorResponse.message 是用户友好的消息
  // 不包含 OpenAI/Anthropic 等提供商信息
  return NextResponse.json(
    { error: errorResponse.message },
    { status: 500 }
  );
}
```

### 错误响应规范

```typescript
// 成功响应
{ data: {...}, success: true }

// 验证错误 (400)
{ 
  error: '请求参数验证失败',
  code: 'VALIDATION_ERROR',
  details: [{ field: 'name', message: '名称不能为空' }]
}

// 认证错误 (401)
{ error: '未授权' }

// 授权错误 (403)
{ error: '无权访问此资源' }

// 限流错误 (429)
{ error: '请求频率过高，请稍后再试' }

// 服务器错误 (500)
{ error: '服务器内部错误' }
// 不要暴露详细的错误堆栈
```

---

## 依赖管理

### 安全更新

定期检查和更新依赖：

```bash
# 检查已知漏洞
pnpm audit

# 更新依赖
pnpm update

# 检查过期依赖
pnpm outdated
```

### 锁定文件

- 只使用 `pnpm-lock.yaml`
- 不提交 `package-lock.json` 或 `yarn.lock`
- CI/CD 使用 `pnpm install --frozen-lockfile`

---

## 日志与监控

### 审计日志

记录敏感操作：

```typescript
import { logger } from '@/lib/logger';

// 管理员操作
logger.info('管理员操作', {
  userId,
  action: 'user_role_change',
  targetUserId,
  newRole,
  timestamp: new Date().toISOString(),
});

// 数据访问
logger.info('数据访问', {
  userId,
  resourceType: 'health_report',
  resourceId,
  action: 'read',
});

// 安全事件
logger.warn('安全事件', {
  type: 'unauthorized_access_attempt',
  userId,
  resourceId,
  reason: '非资源所有者',
});
```

### 敏感信息过滤

日志中不应包含：
- 密码
- API 密钥
- 访问令牌
- 个人健康数据详情
- 信用卡信息

```typescript
// 错误示例
logger.info('Token', { accessToken: user.accessToken }); // 不要这样做

// 正确示例
logger.info('Token 操作', { 
  userId, 
  tokenType: 'access',
  action: 'refreshed' 
});
```

---

## 安全检查清单

### 新 API 端点

- [ ] 添加认证检查 (`auth()`)
- [ ] 添加授权检查 (`requireMemberDataAccess` / `requireOwnership`)
- [ ] 使用 Zod 验证输入
- [ ] 返回适当的 HTTP 状态码
- [ ] 不泄露敏感错误信息
- [ ] 添加安全测试用例

### 新数据模型

- [ ] 添加 `deletedAt` 字段支持软删除
- [ ] 配置 RLS 策略
- [ ] 验证外键关系
- [ ] 检查唯一约束与软删除兼容性

### 新第三方集成

- [ ] Token 加密存储
- [ ] 实施速率限制
- [ ] 处理 API 错误（不泄露提供商信息）
- [ ] 配置超时和重试

---

## 报告安全问题

如果发现安全漏洞，请通过以下方式报告：

1. 不要公开披露漏洞详情
2. 发送邮件至安全团队
3. 提供漏洞复现步骤
4. 等待确认和修复

---

*最后更新: 2024-12*
