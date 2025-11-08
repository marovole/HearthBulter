# 认证能力规范

## 概述

本规范定义了从NextAuth.js迁移到Supabase Auth的完整认证系统要求、迁移策略和实施标准。

## ADDED Requirements

### Requirement: Supabase Auth集成

#### Scenario: 现代化认证系统

**需求**：完全集成Supabase Auth，替换现有的NextAuth.js认证系统，提供更强大的认证能力。

**核心功能**：
- JWT认证的令牌生成、验证和刷新
- 多社交登录支持（Google、GitHub、Apple等）
- 密码强度策略和复杂的密码哈希处理（使用bcrypt）
- 多因子认证（MFA）支持（基于TOTP）
- 会话管理，原生支持会话续期和失效处理
- 邮箱验证流程，内建邮箱验证/激活流程
- 密码重置和密码找回功能

**技术实现**：
```typescript
// src/lib/auth/supabase-auth.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export class SupabaseAuthService {
  private supabase = createClientComponentClient<Database>();

  /**
   * 用户注册
   */
  async signUp(email: string, password: string, userData: UserMetadata): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 发送验证邮件
    await this.sendVerificationEmail(email);

    return {
      success: true,
      user: data.user,
      message: '注册成功，请查收验证邮件'
    };
  }

  /**
   * 用户登录
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 记录登录历史
    await this.recordLoginHistory(data.user.id, 'password');

    return { success: true, user: data.user };
  }

  /**
   * 社交登录
   */
  async signInWithProvider(provider: Provider): Promise<{ url: string }> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: this.getProviderScopes(provider),
      },
    });

    if (error) {
      throw new Error(`OAuth login failed: ${error.message}`);
    }

    return { url: data.url };
  }

  /**
   * 令牌刷新
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    const { data, error } = await this.supabase.auth.setSession({
      refresh_token: refreshToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      session: data.session,
      expiresAt: data.session?.expires_at || 0,
    };
  }

  /**
   * 密码重置
   */
  async resetPassword(email: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: '密码重置邮件已发送'
    };
  }

  /**
   * 更新密码
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // 记录密码修改历史
    await this.recordPasswordChange(data.user.id);

    return {
      success: true,
      message: '密码更新成功'
    };
  }

  /**
   * 登出
   */
  async signOut(): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    // 清除本地会话数据
    this.clearLocalSession();

    return {
      success: true,
      message: '已登出'
    };
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * 获取会话
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  // 私有辅助方法...
}
```

**接口定义**：
```typescript
// 认证结果接口
interface AuthResult {
  success: boolean;              // 成功标志
  user?: User;                   // 用户对象（可选）
  session?: Session;             // 会话对象（可选）
  error?: string;                // 错误消息（可选）
  message?: string;              // 成功消息（可选）
}

// 令牌刷新结果接口
interface TokenRefreshResult {
  success: boolean;
  session?: Session;
  expiresAt?: number;
  error?: string;
}

// 用户元数据接口
interface UserMetadata {
  name?: string;
  avatar_url?: string;
  [key: string]: any;
}

// OAuth提供者类型
type Provider = 'google' | 'github' | 'apple' | 'facebook' | 'microsoft';
```

**认证流程图**：
```
用户操作 → 认证请求 → Supabase Auth
                ↓
        JWT令牌生成 → 令牌存储（httpOnly cookie）
                ↓
        用户信息同步 → 数据库更新
                ↓
        会话管理 → 自动续期
                ↓
        权限验证 → 访问控制
```

### Requirement: 多因子认证（MFA）

#### Scenario: 增强安全认证

**需求**：支持多因子认证，提供TOTP（基于时间的一次性密码）和备份码机制。

**功能要求**：
- TOTP设置流程（二维码生成）
- TOTP验证实现
- 备份码生成和存储
- MFA状态管理
- 恢复机制实现

**TOTP实现**：
```typescript
export class MFAAuthentication {
  /**
   * 启用MFA
   */
  async enableMFA(userId: string): Promise<MFASetupResult> {
    // 1. 生成TOTP密钥
    const secret = speakeasy.generateSecret({
      name: `Health Butler:${userId}`,
      length: 32,
    });

    // 2. 生成二维码
    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: userId,
      issuer: 'Health Butler',
    });

    // 3. 生成备份码
    const backupCodes = this.generateBackupCodes(10);

    // 4. 加密存储密钥和备份码
    const encryptedSecret = await this.encrypt(secret.base32);
    const encryptedCodes = await Promise.all(
      backupCodes.map(code => this.encrypt(code))
    );

    // 5. 保存到数据库
    await supabase
      .from('user_mfa')
      .insert({
        user_id: userId,
        secret: encryptedSecret,
        backup_codes: encryptedCodes,
        is_enabled: false, // 未验证前不启用
        created_at: new Date().toISOString(),
      });

    return {
      qrCodeUrl,
      backupCodes,
      secret: secret.base32,
    };
  }

  /**
   * 验证TOTP
   */
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    // 1. 获取用户的TOTP密钥
    const { data, error } = await supabase
      .from('user_mfa')
      .select('secret')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new Error('MFA not configured for user');
    }

    // 2. 解密密钥
    const secret = await this.decrypt(data.secret);

    // 3. 验证令牌
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // 时间窗口：±2个时间单位
    });

    if (verified) {
      // 4. 启用MFA
      await supabase
        .from('user_mfa')
        .update({ is_enabled: true })
        .eq('user_id', userId);
    }

    return verified;
  }

  /**
   * 使用备份码登录
   */
  async verifyBackupCode(userId: string, backupCode: string): Promise<boolean> {
    // 1. 获取加密的备份码
    const { data, error } = await supabase
      .from('user_mfa')
      .select('backup_codes, used_backup_codes')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    // 2. 解密备份码
    const decryptedCodes = await Promise.all(
      data.backup_codes.map(code => this.decrypt(code))
    );

    // 3. 验证备份码
    const codeIndex = decryptedCodes.indexOf(backupCode);
    if (codeIndex === -1) {
      return false;
    }

    // 4. 检查是否已经使用过
    const usedCodes = data.used_backup_codes || [];
    if (usedCodes.includes(backupCode)) {
      return false;
    }

    // 5. 标记为已使用
    await supabase
      .from('user_mfa')
      .update({
        used_backup_codes: [...usedCodes, backupCode],
      })
      .eq('user_id', userId);

    return true;
  }

  /**
   * 禁用MFA
   */
  async disableMFA(userId: string, verificationToken: string): Promise<void> {
    // 1. 验证用户身份
    const verified = await this.verifyTOTP(userId, verificationToken);
    if (!verified) {
      throw new Error('Invalid verification token');
    }

    // 2. 禁用MFA
    await supabase
      .from('user_mfa')
      .update({ is_enabled: false })
      .eq('user_id', userId);
  }

  /**
   * 生成备份码
   */
  private generateBackupCodes(count: number): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex');
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }

  /**
   * 加密数据
   */
  private async encrypt(data: string): Promise<string> {
    const key = process.env.ENCRYPTION_KEY;
    const cipher = crypto.createCipher('aes-256-gcm', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * 解密数据
   */
  private async decrypt(encrypted: string): Promise<string> {
    const key = process.env.ENCRYPTION_KEY;
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// MFA设置结果
interface MFASetupResult {
  qrCodeUrl: string;             // 二维码URL
  backupCodes: string[];         // 备份码
  secret: string;                // TOTP密钥
}
```

**MFA数据库表结构**：
```sql
CREATE TABLE user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,         -- 加密的TOTP密钥
  backup_codes TEXT[] NOT NULL,  -- 加密的备份码
  used_backup_codes TEXT[] DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的MFA配置
CREATE POLICY "Users can manage own MFA" ON user_mfa
  FOR ALL USING (auth.uid() = user_id);
```

### Requirement: 认证中间件

#### Scenario: 边缘函数认证

**需求**：在Cloudflare Pages Functions中实现轻量级认证中间件，保护API端点。

**中间件设计**：
```javascript
// functions/middleware/auth.js

/**
 * 认证验证中间件
 */
export async function requireAuth(request, env) {
  // 1. 获取令牌
  const token = getAuthToken(request);
  if (!token) {
    throw new AuthenticationError('Missing authentication token');
  }

  // 2. 检查缓存
  const cacheKey = `auth:${token}`;
  let authResult = await env.CACHE.get(cacheKey, { type: 'json' });

  if (!authResult) {
    // 3. 验证令牌
    const supabase = createSupabaseClient(env);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AuthenticationError('Invalid token');
    }

    // 4. 获取用户数据
    const { data: userData } = await supabase
      .from('users')
      .select('*, user_permissions(*)')
      .eq('id', user.id)
      .single();

    authResult = {
      user: {
        id: user.id,
        email: user.email,
        ...userData,
      },
      permissions: userData?.user_permissions?.permissions || []
    };

    // 5. 缓存结果（5分钟）
    await env.CACHE.put(cacheKey, JSON.stringify(authResult), {
      expirationTtl: 300
    });
  }

  return authResult;
}

/**
 * 可选认证中间件
 */
export async function optionalAuth(request, env) {
  try {
    return await requireAuth(request, env);
  } catch (error) {
    return null;
  }
}

/**
 * 权限验证中间件
 */
export function requirePermission(permission) {
  return async (request, env, context) => {
    const auth = await requireAuth(request, env);

    if (!auth.permissions.includes(permission)) {
      throw new AuthorizationError(
        `Permission required: ${permission}`,
        403
      );
    }

    context.auth = auth;
    return context.next();
  };
}

/**
 * 获取认证令牌
 */
function getAuthToken(request) {
  // 1. 从Authorization头获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  // 2. 从cookie获取
  const cookies = parseCookies(request.headers.get('Cookie'));
  return cookies['sb-access-token'];
}

/**
 * 解析cookies
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
  });

  return cookies;
}

// 错误类
class AuthenticationError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = status;
  }
}

class AuthorizationError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = status;
  }
}
```

**使用示例**：
```javascript
// 保护API端点
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { createSupabaseClient } from '../utils/supabase.js';

export async function onRequestGet(context) {
  try {
    // 1. 认证验证
    const auth = await requireAuth(context.request, context.env);

    // 2. 权限验证
    if (!auth.permissions.includes('read:health_data')) {
      return new Response('Forbidden', { status: 403 });
    }

    // 3. 使用Supabase查询数据
    const supabase = createSupabaseClient(context.env);
    const { data, error } = await supabase
      .from('health_data')
      .select('*')
      .eq('user_id', auth.user.id)
      .limit(20);

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error.name === 'AuthenticationError') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## MODIFIED Requirements

### Requirement: 会话管理迁移

#### Scenario: 从NextAuth.js到Supabase Auth

**修改需求**：完全重构会话管理机制，从NextAuth.js的数据库存储会话转换为Supabase Auth的JWT令牌机制。

**会话架构对比**：
```typescript
// NextAuth.js会话架构（数据库会话）
// 数据库存储：
// session {
//   id: string,
//   sessionToken: string,
//   userId: string,
//   expires: Date,
// }
//
// 验证流程：
// 1. 提取sessionToken
// 2. 数据库查询验证
// 3. 检查过期时间
// 4. 返回用户信息

// Supabase Auth会话架构（JWT令牌）
// 令牌结构：
// {
//   access_token: JWT,
//   refresh_token: string,
//   expires_in: 3600,
//   token_type: "Bearer"
// }
//
// 验证流程：
// 1. 提取access_token
// 2. JWT解析验证
// 3. 公钥签名验证
// 4. 返回用户信息（包含user_metadata）
```

**JWT令牌结构**：
```json
{
  "iss": "https://supabase.health-butler.co",
  "sub": "user-id-12345678",
  "aud": "authenticated",
  "exp": 1704067200,
  "iat": 1704063600,
  "role": "authenticated",
  "user_metadata": {
    "name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "app_metadata": {
    "provider": "google",
    "roles": ["user", "premium"]
  }
}
```

**会话存储策略**：
```typescript
// 令牌存储策略（httpOnly cookies）
const tokenStorageConfig = {
  // Access Token：短期有效（1小时）
  accessToken: {
    name: 'sb-access-token',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 3600, // 1小时
    path: '/',
  },

  // Refresh Token：长期有效（7天）
  refreshToken: {
    name: 'sb-refresh-token',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 604800, // 7天
    path: '/',
  },

  // 自动刷新策略
  autoRefresh: {
    enabled: true,
    threshold: 300, // 到期前5分钟开始刷新
    retryAttempts: 3,
    retryDelay: 1000,
  },
};
```

**会话续期流程**：
```
访问API → 检查令牌过期时间
     ↓
  未过期 → 使用当前令牌
     ↓
  已过期 → 使用refresh_token刷新
     ↓
刷新成功 → 更新cookie令牌
     ↓
刷新失败 → 清除会话，重定向登录
```

### Requirement: 权限系统重构

#### Scenario: 基于角色的访问控制（RBAC）

**修改需求**：重构现有的权限系统，从简单的布尔标志转换为基于角色的细粒度访问控制（RBAC）。

**权限架构**：
```sql
-- 角色表
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL, -- ['read:health_data', 'write:recipes']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户角色关联表
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 权限表
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 标准角色数据
INSERT INTO roles (name, description, permissions) VALUES
('free_user', '免费用户', '[