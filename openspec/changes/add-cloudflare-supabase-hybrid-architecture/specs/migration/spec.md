# 数据迁移能力规范

## 概述

本规范定义了从现有Neon PostgreSQL数据库迁移到Supabase的完整流程、要求和验收标准。

## ADDED Requirements

### Requirement: 数据库结构迁移

系统 **SHALL** 完整迁移现有 Neon PostgreSQL 数据库的所有表结构（70+ 表）、索引、主键/外键约束、视图和存储过程到 Supabase PostgreSQL，**MUST** 确保所有表之间的关系完整性和引用约束保持一致，并 **SHALL** 在迁移后进行完整性验证，确保表数量、约束数量和索引数量与源数据库完全一致。

#### Scenario: 表结构和关系迁移

**Given** 现有 Neon PostgreSQL 数据库包含 70+ 张表及其关系
**When** 执行数据库结构迁移到 Supabase
**Then** 系统 SHALL 使用 pg_dump 导出完整的 schema（仅结构，不含数据）
**And** 系统 SHALL 保留所有主键、外键约束、唯一约束和检查约束
**And** 系统 SHALL 迁移所有索引（包括普通索引、唯一索引、复合索引）
**And** 系统 SHALL 迁移所有视图和物化视图
**And** 系统 MUST 在单个事务中应用 schema 到 Supabase，确保原子性
**And** 系统 SHALL 验证迁移后的表数量、约束数量和索引数量与源数据库一致
**And** 整个结构迁移时间 SHALL 少于 30 分钟，验证时间少于 10 分钟

**需求**：必须完整迁移现有数据库的所有表结构、索引、约束和关系，确保数据一致性。

**验收标准**：
- 迁移所有表结构（70+表）
- 保留所有主键、外键约束
- 迁移所有索引和唯一约束
- 保持表之间的关系完整性
- 迁移存储过程和函数（如适用）
- 迁移视图和物化视图

**迁移工具**：
```bash
# 数据库结构导出工具
pg_dump --schema-only --no-privileges --no-owner \
  --no-tablespaces --no-comments \
  --file=schema.sql \
  $DATABASE_URL

# 结构验证脚本
psql $SUPABASE_URL < schema.sql --single-transaction
```

**迁移验证**：
```sql
-- 验证表数量
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- 验证外键约束
SELECT COUNT(*) AS foreign_key_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- 验证索引数量
SELECT COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public';
```

**性能要求**：
- 结构迁移时间：< 30分钟
- 验证时间：< 10分钟
- 回滚时间：< 5分钟

### Requirement: 数据完整性迁移

系统 **SHALL** 在数据迁移过程中保证零数据丢失和完整性，**MUST** 确保数据行数、数据内容、时间戳、JSON/JSONB 字段和外键引用关系在新旧数据库之间完全一致（误差 < 0.01%），并 **SHALL** 使用 MD5 哈希验证和行数对比两种方式验证数据一致性。

#### Scenario: 数据一致性保证

**Given** 需要从 Neon PostgreSQL 迁移所有数据到 Supabase PostgreSQL
**When** 执行数据迁移操作
**Then** 系统 SHALL 逐表迁移数据，并记录每张表的迁移进度
**And** 系统 MUST 验证新旧数据库中每张表的行数一致性（误差 < 0.01%）
**And** 系统 SHALL 对每张表的数据内容计算 MD5 哈希值，确保新旧数据库哈希一致
**And** 系统 SHALL 正确转换和保留所有时间戳字段及时区信息
**And** 系统 SHALL 完整迁移 JSON 和 JSONB 数据类型，无结构损坏
**And** 系统 MUST 验证外键引用关系的完整性，确保无悬挂引用
**And** 若发现数据不一致，系统 SHALL 记录详细的差异报告并中止迁移

**需求**：在迁移过程中必须保证数据的完整性、准确性和一致性，实现零数据丢失。

**验收标准**：
- 数据行数完全一致（误差<0.01%）
- 数据内容完全一致（哈希验证）
- 时间戳和时区信息正确转换
- JSON/JSONB数据类型正确迁移
- 大文本和二进制数据完整迁移
- 外键引用关系保持一致

**数据验证**：
```typescript
// 数据一致性验证脚本
export class DataValidator {
  static async validateMigration(tableName: string): Promise<boolean> {
    // 1. 行数验证
    const oldCount = await queryOld(`SELECT COUNT(*) FROM ${tableName}`);
    const newCount = await queryNew(`SELECT COUNT(*) FROM ${tableName}`);

    if (oldCount !== newCount) {
      throw new Error(`Row count mismatch for ${tableName}`);
    }

    // 2. 数据哈希验证
    const oldChecksum = await queryOld(
      `SELECT MD5(string_agg(row_to_json(t)::text, ''))
       FROM (SELECT * FROM ${tableName} ORDER BY id) t`
    );
    const newChecksum = await queryNew(
      `SELECT MD5(string_agg(row_to_json(t)::text, ''))
       FROM (SELECT * FROM ${tableName} ORDER BY id) t`
    );

    if (oldChecksum !== newChecksum) {
      throw new Error(`Data checksum mismatch for ${tableName}`);
    }

    return true;
  }
}
```

**数据质量检查**：
```sql
-- 检查空值约束
SELECT table_name, column_name
FROM information_schema.columns
WHERE is_nullable = 'NO'
AND column_default IS NULL
AND table_schema = 'public';

-- 检查外键约束有效性
SELECT tc.constraint_name, tc.table_name, kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND NOT EXISTS (
  SELECT 1 FROM tc.table_name
  WHERE column_name IS NULL
);
```

### Requirement: 增量数据同步

系统 **SHALL** 实现增量数据同步机制以支持零停机迁移，允许新老数据库系统并行运行，**MUST** 确保同步延迟小于 5 秒，**SHALL** 支持断点续传和自动重试（最多 3 次），并 **SHALL** 提供冲突解决机制（基于时间戳的"最新优先"策略或合并策略）和实时同步状态监控。

#### Scenario: 零停机迁移

**Given** 系统需要在不停机的情况下从 Neon 迁移到 Supabase
**When** 启用增量数据同步服务
**Then** 系统 SHALL 捕获 Neon 数据库的所有写操作（INSERT、UPDATE、DELETE）
**And** 系统 SHALL 将捕获的变更批量同步到 Supabase 数据库
**And** 系统 MUST 确保同步延迟小于 5 秒，满足准实时要求
**And** 系统 SHALL 在网络中断或同步失败时支持断点续传，从最后成功位置继续
**And** 系统 SHALL 在发生写入冲突时使用"最新优先"策略自动解决
**And** 系统 SHALL 提供同步状态监控面板，显示总同步记录数、错误次数、平均延迟和吞吐量
**And** 系统 MUST 在同步异常超过阈值时触发告警并暂停同步

**需求**：实现增量数据同步机制，支持新老系统并行运行，实现零停机迁移。

**验收标准**：
- 实时同步新写入数据
- 同步延迟<5秒
- 支持断点续传
- 冲突解决机制
- 同步状态监控
- 失败重试机制

**同步架构**：
```typescript
// 增量同步服务
export class IncrementalSyncService {
  private syncConfig: SyncConfig;
  private metrics: SyncMetrics;

  constructor(config: SyncConfig) {
    this.syncConfig = config;
    this.metrics = {
      totalSynced: 0,
      errors: 0,
      latency: 0
    };
  }

  async startSync(): Promise<void> {
    // 1. 监听变更事件
    const changes = await this.captureChanges();

    // 2. 批量处理变更
    for (const batch of this.batchChanges(changes)) {
      try {
        await this.syncBatch(batch);
        this.metrics.totalSynced += batch.length;
      } catch (error) {
        this.metrics.errors++;
        await this.handleSyncError(error, batch);
      }
    }

    // 3. 更新同步位置
    await this.updateSyncPosition();
  }

  async syncBatch(records: any[]): Promise<void> {
    // 双写模式：同时写入新旧数据库
    await Promise.all([
      this.writeToOldDatabase(records),
      this.writeToNewDatabase(records)
    ]);
  }
}
```

**同步配置**：
```typescript
interface SyncConfig {
  tables: string[];              // 需要同步的表
  batchSize: number;             // 批量大小
  syncInterval: number;          // 同步间隔(ms)
  errorRetryAttempts: number;    // 错误重试次数
  errorRetryDelay: number;       // 重试延迟(ms)
  conflictResolution: 'latest' | 'merge'; // 冲突解决策略
}

interface SyncMetrics {
  totalSynced: number;           // 总同步记录数
  errors: number;                // 错误次数
  latency: number;               // 平均延迟(ms)
  lastSyncTime?: Date;           // 最后同步时间
  throughput?: number;           // 吞吐量(records/s)
}
```

## MODIFIED Requirements

### Requirement: 用户数据迁移

系统 **SHALL** 从 NextAuth.js 的用户认证数据结构完全迁移到 Supabase Auth，**MUST** 转换用户密码哈希（Bcrypt 格式兼容）、OAuth 提供者账户关联、用户元数据（name、avatar_url）和应用元数据（roles、permissions），并 **SHALL** 迁移所有活跃会话（使用 Supabase Auth 创建等效会话），确保用户在迁移后无需重新登录。

#### Scenario: 无缝用户迁移

**Given** 现有系统使用 NextAuth.js 管理用户认证和会话
**When** 迁移到 Supabase Auth
**Then** 系统 SHALL 为每个现有用户在 Supabase Auth 中创建对应的用户账户
**And** 系统 SHALL 转换用户密码哈希（Bcrypt 格式兼容，无需重新加密）
**And** 系统 SHALL 迁移用户元数据（name、avatar_url）到 Supabase Auth 的 user_metadata 字段
**And** 系统 SHALL 迁移用户角色和权限到 app_metadata 字段
**And** 系统 SHALL 迁移 OAuth 账户关联（provider、provider_id）
**And** 系统 MUST 更新所有外键引用（将旧 user_id 映射到新 Supabase user_id）
**And** 系统 SHALL 迁移所有活跃会话，创建等效的 Supabase Auth 会话令牌
**And** 系统 SHALL 确保迁移后用户可直接使用现有凭据登录，无需重置密码

**修改需求**：从NextAuth.js迁移到Supabase Auth，保持用户会话和认证状态。

**变更影响**：
- 用户密码哈希格式转换
- OAuth提供者账户关联
- 会话令牌迁移
- 用户权限和角色映射

**迁移策略**：
```typescript
// 用户认证数据迁移
export class UserMigrationService {
  async migrateUserAuth(user: OldUser): Promise<NewUser> {
    // 1. 创建Supabase用户
    const { data: { user: newUser }, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: user.emailVerified,
      password_hash: await this.convertPasswordHash(user.password),
      user_metadata: {
        name: user.name,
        avatar_url: user.image,
        migration_date: new Date().toISOString()
      },
      app_metadata: {
        provider: user.accounts[0]?.provider,
        roles: user.roles,
        permissions: user.permissions
      }
    });

    if (error) {
      throw new Error(`Failed to migrate user ${user.id}: ${error.message}`);
    }

    // 2. 迁移用户数据关联
    await this.migrateUserData(user.id, newUser.id);

    return newUser;
  }

  async convertPasswordHash(oldHash: string): Promise<string> {
    // 密码哈希格式转换
    // NextAuth.js Bcrypt -> Supabase Bcrypt
    return oldHash; // Bcrypt格式兼容，无需转换
  }

  async migrateUserData(oldUserId: string, newUserId: string): Promise<void> {
    // 更新所有外键引用
    await supabase.rpc('update_user_references', {
      old_user_id: oldUserId,
      new_user_id: newUserId
    });
  }
}
```

**会话迁移**：
```typescript
// 会话数据迁移
export class SessionMigrationService {
  async migrateActiveSessions(): Promise<void> {
    // 1. 获取所有活跃会话
    const activeSessions = await prisma.session.findMany({
      where: {
        expires: { gt: new Date() }
      }
    });

    // 2. 创建新的Supabase会话
    for (const session of activeSessions) {
      await this.createSupabaseSession(session);
    }
  }

  async createSupabaseSession(oldSession: any): Promise<void> {
    // 创建等效的Supabase认证会话
    const expiresAt = Math.floor(oldSession.expires.getTime() / 1000);

    await supabase.auth.setSession({
      access_token: oldSession.sessionToken,
      refresh_token: oldSession.sessionToken,
      expires_at: expiresAt
    });
  }
}
```

### Requirement: 大型数据表迁移

系统 **SHALL** 对大型数据表（行数 > 100万或数据量 > 1GB）采用分区迁移策略，**MUST** 按时间范围或 ID 范围将数据分批迁移（每批 1000-10000 行），**SHALL** 支持多个迁移任务并行执行以提高吞吐量，并 **SHALL** 使用临时表和增量验证机制，确保迁移过程中不影响生产环境性能且可随时中止和恢复。

#### Scenario: TB级数据表迁移

**Given** 数据库中存在大型数据表（如日志表、时间序列数据表）包含数百万行数据
**When** 执行大型数据表迁移
**Then** 系统 SHALL 按分区字段（如 created_at、id）将表数据分成多个批次（每批 1000-10000 行）
**And** 系统 SHALL 为每个分区创建临时表，先迁移到临时表进行验证
**And** 系统 MUST 启用并行迁移，允许多个分区同时迁移以提高速度
**And** 系统 SHALL 启用数据传输压缩，减少网络带宽消耗
**And** 系统 SHALL 对每个已迁移分区执行增量验证（行数和数据哈希）
**And** 验证成功后，系统 SHALL 将临时表数据合并到目标表
**And** 系统 SHALL 支持中止和恢复，记录迁移进度允许从断点继续
**And** 整个迁移过程 MUST 不影响生产环境的查询性能（通过速率限制控制）

**修改需求**：优化大型数据表的迁移策略，避免超时和内存溢出。

**优化策略**：
- 分区迁移：按时间范围或ID范围分批迁移
- 并行处理：多个迁移任务并行执行
- 压缩传输：启用数据传输压缩
- 增量检查：定期验证已迁移数据

**分区迁移配置**：
```typescript
interface PartitionMigrationConfig {
  tableName: string;
  partitionColumn: string;       // 分区字段（如：id, created_at）
  partitionStrategy: 'range' | 'hash'; // 分区策略
  partitionSize: number;          // 每批记录数
  parallelWorkers: number;        // 并行工作线程数
  tempTablePrefix: string;        // 临时表前缀
}

// 分区迁移执行
export class PartitionMigrationService {
  async migratePartition(
    config: PartitionMigrationConfig,
    partition: PartitionRange
  ): Promise<MigrationResult> {
    const tempTableName = `${config.tempTablePrefix}_${config.tableName}`;

    // 1. 创建临时表
    await this.createTempTable(tempTableName, config.tableName);

    // 2. 迁移分区数据
    await this.migratePartitionData(
      config.tableName,
      tempTableName,
      partition,
      config.partitionColumn
    );

    // 3. 验证数据完整性
    const validation = await this.validatePartitionMigration(
      config.tableName,
      tempTableName,
      partition
    );

    // 4. 应用到目标表
    if (validation.success) {
      await this.applyPartitionMigration(tempTableName, config.tableName);
    }

    return {
      tableName: config.tableName,
      partition: partition,
      success: validation.success,
      rowCount: validation.rowCount,
      validationErrors: validation.errors
    };
  }
}
```

## REMOVED Requirements

### 6. 废弃中间件架构

#### 场景：Vercel Edge Function限制

**移除说明**：废弃现有的Vercel Edge Function中间件，改用Cloudflare Pages Functions.

**移除原因**：
- Vercel Edge Function 1MB大小限制
- 无法部署现有中间件代码
- 需要重新设计为轻量级边缘函数

**影响范围**：
- 根目录middleware.ts
- src目录的所有中间件文件
- 认证和授权中间件
- 日志和监控中间件

**替代方案**：
```javascript
// 移除前（Vercel Edge Middleware）
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. 认证检查
  const token = request.cookies.get('auth-token');
  const user = validateToken(token);

  // 2. 数据库查询
  const userData = await prisma.user.findUnique({
    where: { id: user.id }
  });

  // 3. 权限验证
  if (!hasPermission(userData, request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return response;
}

// 移除后（Cloudflare Pages Functions）
// functions/middleware/auth.js
export async function onRequest(context) {
  const { request, env } = context;

  try {
    // 1. 轻量级认证验证
    const user = await validateAuthToken(request, env);

    // 2. 边缘缓存检查
    const cacheKey = `user:${user.id}:permissions`;
    const permissions = await env.CACHE.get(cacheKey);

    if (!permissions) {
      // 3. 最小化数据库查询
      const { data } = await env.supabase
        .from('user_permissions')
        .select('permissions')
        .eq('user_id', user.id)
        .single();

      await env.CACHE.put(cacheKey, data.permissions, { expirationTtl: 300 });
    }

    return await context.next();

  } catch (error) {
    return new Response('Unauthorized', { status: 401 });
  }
}
```

## 迁移质量要求

### 7. 数据验证和校验

**验证清单**：
- [ ] 表数量验证：新旧数据库表数量一致
- [ ] 数据行数验证：每个表的数据行数一致
- [ ] 数据内容验证：抽样数据内容一致
- [ ] 约束验证：所有约束条件有效
- [ ] 性能验证：查询性能不降级
- [ ] 功能验证：所有功能正常工作

**自动化验证**：
```typescript
// 自动化迁移验证脚本
export class MigrationValidator {
  async validateCompleteMigration(): Promise<ValidationReport> {
    const checks = [
      this.validateTableCounts.bind(this),
      this.validateRowCounts.bind(this),
      this.validateDataChecksums.bind(this),
      this.validateConstraints.bind(this),
      this.validateIndexes.bind(this),
      this.validateForeignKeys.bind(this)
    ];

    const results = await Promise.all(checks.map(check => check()));

    return {
      timestamp: new Date().toISOString(),
      totalChecks: checks.length,
      passedChecks: results.filter(r => r.passed).length,
      failedChecks: results.filter(r => !r.passed).length,
      details: results,
      overallSuccess: results.every(r => r.passed)
    };
  }
}
```

### 8. 回滚策略

**回滚要求**：
- 支持一键回滚到原有系统
- 回滚时间<15分钟
- 保留回滚操作日志
- 支持多次回滚和重试

**回滚检查清单**：
- [ ] 数据库备份可用
- [ ] DNS配置可以切换
- [ ] 应用配置可以回滚
- [ ] 环境变量可以恢复
- [ ] 监控告警可以切换

这个迁移规范确保了数据迁移的质量、完整性和安全性，同时提供了详细的实施指导和验证标准。所有迁移操作都必须按照这个规范执行，并记录详细的操作日志和验证结果。