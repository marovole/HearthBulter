# 部署能力规范

## 概述

本规范定义了Cloudflare Pages + Supabase混合架构的完整部署流程、环境配置、部署策略和最佳实践，确保系统稳定、可靠地部署到生产环境。

## ADDED Requirements

### Requirement: 多云部署架构

系统 **SHALL** 实现多云、多区域部署架构，利用 Cloudflare 的全球 CDN 网络和 Supabase 的多区域数据库支持，确保系统在任意单点故障情况下仍能维持服务可用性，**MUST** 支持至少 2 个独立区域的部署（主区域和备用区域），并 **SHALL** 提供开发、预发布和生产三个独立环境，每个环境拥有独立的配置和数据隔离。

#### Scenario: 高可用部署

**Given** 系统部署在全球多个区域以确保高可用性
**When** 主区域（如美国西部）发生故障或性能降级
**Then** Cloudflare 全局负载均衡器 SHALL 自动将流量路由到备用区域（如欧洲）
**And** 系统 SHALL 确保用户请求在 5 秒内自动切换到备用区域
**And** 系统 MUST 保持数据一致性，通过 Supabase 多区域复制机制同步数据
**And** 系统 SHALL 在主区域恢复后自动进行流量回切，或保持在备用区域直到手动切换

**需求**：实现多云、多区域部署架构，确保系统高可用性和灾难恢复能力。

**部署架构**：
```
┌─────────────────────────────────────────────────────────────┐
│                      全局负载均衡器（Cloudflare）                │
│                      Global Load Balancer                      │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┬───────────┐
         │           │           │           │
┌────────▼───┐  ┌────▼────┐  ┌──▼───┐  ┌────▼────┐
│ 主区域      │  │ 备用区域  │  │ 开发环境 │  │ 预发布环境 │
│ Production │  │ Standby │  │ Dev  │  │ Staging │
│ 美国西部    │  │ 欧洲      │  │      │  │         │
└────────────┘  └─────────┘  └──────┘  └─────────┘
```

**部署组件**：
```typescript
// 部署配置接口
interface DeploymentConfig {
  // 环境配置
  environment: {
    name: string;                // 环境名称
    region: string;              // 部署区域
    domain: string;              // 域名
    ssl: {
      enabled: boolean;          // SSL启用
      minVersion: 'TLSv1.2' | 'TLSv1.3'; // 最小TLS版本
    };
  };

  // Cloudflare Pages配置
  pages: {
    projectName: string;         // 项目名称
    buildCommand: string;        // 构建命令
    buildOutputDir: string;      // 构建输出目录
    rootDir: string;             // 根目录
    envVars: Record<string, string>; // 环境变量
  };

  // Supabase配置
  supabase: {
    projectUrl: string;          // 项目URL
    anonKey: string;             // Anon Key
    serviceKey: string;          // Service Key
    database: {
      poolSize: number;          // 连接池大小
      ssl: boolean;              // SSL启用
    };
  };

  // CI/CD配置
  ciCd: {
    provider: 'github' | 'gitlab' | 'bitbucket';
    branch: string;              // 部署分支
    trigger: 'push' | 'manual' | 'schedule';
  };

  // 回滚配置
  rollback: {
    enabled: boolean;            // 启用回滚
    strategy: 'immediate' | 'gradual'; // 回滚策略
    healthCheck: boolean;        // 健康检查
  };
}

// 生产环境配置
const productionConfig: DeploymentConfig = {
  environment: {
    name: 'production',
    region: 'us-west',
    domain: 'health-butler.pages.dev',
    ssl: {
      enabled: true,
      minVersion: 'TLSv1.3',
    },
  },

  pages: {
    projectName: 'health-butler-prod',
    buildCommand: 'npm run build:supabase',
    buildOutputDir: '.next/static',
    rootDir: '/',
    envVars: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://prod.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'prod-anon-key',
      NEXT_PUBLIC_SITE_URL: 'https://health-butler.pages.dev',
    },
  },

  supabase: {
    projectUrl: 'https://prod.supabase.co',
    anonKey: 'prod-anon-key',
    serviceKey: 'prod-service-key',
    database: {
      poolSize: 20,
      ssl: true,
    },
  },

  ciCd: {
    provider: 'github',
    branch: 'main',
    trigger: 'push',
  },

  rollback: {
    enabled: true,
    strategy: 'gradual',
    healthCheck: true,
  },
};
```

### Requirement: CI/CD流水线

系统 **SHALL** 使用 GitHub Actions 构建完整的 CI/CD 流水线，实现从代码提交到生产部署的全流程自动化，**MUST** 包含代码质量检查（ESLint、TypeScript类型检查）、自动化测试（单元测试、集成测试、E2E测试）、安全扫描、性能测试和多环境自动部署，并 **SHALL** 在部署失败时提供自动回滚能力和实时通知机制。

#### Scenario: 自动化部署

**Given** 开发者向 main 分支提交代码
**When** GitHub Actions 流水线被触发
**Then** 系统 SHALL 依次执行代码质量检查（ESLint、类型检查）和自动化测试（单元测试、集成测试）
**And** 若所有检查通过，系统 SHALL 自动构建应用并生成部署制品
**And** 系统 SHALL 先部署到预发布环境并执行验收测试和安全扫描
**And** 验收测试通过后，系统 MUST 等待手动批准后才能部署到生产环境
**And** 部署到生产环境后，系统 SHALL 执行健康检查和冒烟测试
**And** 若部署或测试失败，系统 SHALL 自动回滚到上一个稳定版本并通过 Slack 通知团队

**需求**：构建完整的CI/CD流水线，实现代码提交到生产部署的全自动化。

**流水线架构**：
```
代码提交 → 触发构建 → 静态检查 → 单元测试 → 集成测试
   ↓
构建制品 → 部署到开发环境 → E2E测试 → 性能测试
   ↓
批准 → 部署到预发布环境 → 验收测试 → 安全扫描
   ↓
批准 → 部署到生产环境 → 健康检查 → 监控
```

**GitHub Actions配置**：
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  # 代码质量检查
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: TypeScript type check
        run: npm run type-check

      - name: Run unit tests
        run: npm test

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

  # 构建应用
  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    outputs:
      build-url: ${{ steps.deploy.outputs.url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build:supabase
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: .next/static
          retention-days: 7

  # 部署到开发环境
  deploy-dev:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    environment:
      name: development
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: .next/static

      - name: Deploy to Cloudflare Pages (Dev)
        uses: cloudflare/pages-action@v1
        id: deploy
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: health-butler-dev
          directory: .next/static
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

      - name: Run performance tests
        run: npm run test:performance
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

  # 部署到预发布环境
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: .next/static

      - name: Deploy to Cloudflare Pages (Staging)
        uses: cloudflare/pages-action@v1
        id: deploy
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: health-butler-staging
          directory: .next/static
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

      - name: Acceptance tests
        run: npm run test:acceptance
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

      - name: Security scan
        run: npm run security:scan
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

      - name: Lighthouse CI
        run: npm run lighthouse
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

  # 部署到生产环境
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: .next/static

      - name: Deploy to Cloudflare Pages (Production)
        uses: cloudflare/pages-action@v1
        id: deploy
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: health-butler-prod
          directory: .next/static
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: main

      - name: Health check
        run: |
          curl -f ${{ steps.deploy.outputs.url }}/api/health

      - name: Smoke tests
        run: npm run test:smoke
        env:
          BASE_URL: ${{ steps.deploy.outputs.url }}

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'Successfully deployed to production'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Requirement: 部署策略

系统 **SHALL** 支持多种零停机部署策略（蓝绿部署、金丝雀部署、滚动部署和功能开关部署），允许根据变更风险和业务需求灵活选择部署方式，**MUST** 在部署过程中持续进行健康检查和性能监控，并 **SHALL** 在检测到异常指标（错误率 > 1%、P95延迟 > 500ms、成功率 < 99%）时自动触发回滚机制，确保用户完全无感知部署过程。

#### Scenario: 零停机部署

**Given** 系统需要部署新版本代码到生产环境
**When** 选择蓝绿部署策略进行发布
**Then** 系统 SHALL 先将新版本部署到绿色环境（非生产环境）
**And** 系统 SHALL 对绿色环境执行完整的健康检查和功能验证
**And** 健康检查通过后，系统 SHALL 将流量从蓝色环境切换到绿色环境
**And** 系统 SHALL 监控绿色环境至少 5 分钟，确保无异常指标
**And** 若监控指标正常，系统 SHALL 停用蓝色环境并保留作为回滚备份
**And** 若监控发现异常（错误率升高、响应变慢），系统 MUST 立即回滚到蓝色环境

**需求**：实施零停机部署策略，确保用户无感知地完成部署。

**部署策略**：
```typescript
// 部署策略管理器
export class DeploymentStrategyManager {
  /**
   * 蓝绿部署
   */
  async blueGreenDeploy(newVersion: string): Promise<DeployResult> {
    // 1. 部署新版本到绿色环境
    await this.deployToEnvironment('green', newVersion);

    // 2. 健康检查
    const health = await this.healthCheck('green');
    if (!health.healthy) {
      throw new Error('Green environment health check failed');
    }

    // 3. 路由流量到绿色环境
    await this.switchTraffic('green');

    // 4. 监控一段时间
    await this.monitorTraffic('green', 300000); // 5分钟

    // 5. 停用蓝色环境
    await this.deactivateEnvironment('blue');

    return {
      strategy: 'blue-green',
      version: newVersion,
      status: 'success',
      trafficSwitched: true,
      oldVersionRetained: true,
    };
  }

  /**
   * 金丝雀部署
   */
  async canaryDeploy(newVersion: string, canaryPercentage: number): Promise<DeployResult> {
    // 1. 部署金丝雀版本
    await this.deployToEnvironment('canary', newVersion);

    // 2. 路由小部分流量到金丝雀
    await this.splitTraffic({
      production: 100 - canaryPercentage,
      canary: canaryPercentage,
    });

    // 3. 监控金丝雀指标
    const metrics = await this.monitorCanary(canaryPercentage);

    // 4. 判断是否继续推广
    if (this.shouldPromote(metrics)) {
      // 5. 逐步增加流量
      await this.rampUpTraffic(newVersion, canaryPercentage);

      return {
        strategy: 'canary',
        version: newVersion,
        status: 'promoted',
        trafficPercentage: 100,
        metrics,
      };
    } else {
      // 6. 回滚金丝雀
      await this.rollbackCanary();

      return {
        strategy: 'canary',
        version: newVersion,
        status: 'rolled-back',
        trafficPercentage: 0,
        metrics,
        error: 'Canary metrics did not meet promotion criteria',
      };
    }
  }

  /**
   * 滚动部署
   */
  async rollingDeploy(newVersion: string, batchSize: number): Promise<DeployResult> {
    const instances = await this.getActiveInstances();
    const batches = this.createBatches(instances, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // 1. 部署到批次
      await this.deployBatch(batch, newVersion);

      // 2. 等待批次健康
      await this.waitForBatchHealth(batch);

      // 3. 等待时间窗口
      if (i < batches.length - 1) {
        await this.waitTimeWindow(60000); // 1分钟
      }
    }

    return {
      strategy: 'rolling',
      version: newVersion,
      status: 'success',
      batches: batches.length,
      batchSize,
    };
  }

  /**
   * 功能开关部署
   */
  async featureFlagDeploy(feature: string, enabled: boolean): Promise<DeployResult> {
    // 1. 更新功能开关配置
    await this.updateFeatureFlag(feature, enabled);

    // 2. 渐进式推出
    if (enabled) {
      // 2.1 内部用户测试
      await this.enableForGroup(feature, 'internal');
      await this.waitAndMonitor(3600000); // 1小时

      // 2.2 5%用户测试
      await this.enableForPercentage(feature, 5);
      await this.waitAndMonitor(7200000); // 2小时

      // 2.3 25%用户测试
      await this.enableForPercentage(feature, 25);
      await this.waitAndMonitor(21600000); // 6小时

      // 2.4 全量用户
      await this.enableForAll(feature);
    } else {
      // 渐进式关闭
      await this.disableFeature(feature);
    }

    return {
      strategy: 'feature-flag',
      version: 'N/A',
      status: enabled ? 'enabled' : 'disabled',
      feature,
      rollout: enabled ? 'gradual' : 'immediate',
    };
  }

  private async healthCheck(environment: string): Promise<HealthCheckResult> {
    const healthUrl = `https://${environment}.health-butler.pages.dev/api/health`;

    try {
      const response = await fetch(healthUrl);
      return {
        healthy: response.ok,
        status: response.status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        status: 500,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private shouldPromote(metrics: CanaryMetrics): boolean {
    // 金丝雀推广标准
    const thresholds = {
      errorRate: 0.01,             // 错误率 < 1%
      p95Latency: 500,             // P95延迟 < 500ms
      successRate: 0.99,           // 成功率 > 99%
      userSatisfaction: 0.95,      // 用户满意度 > 95%
    };

    return (
      metrics.errorRate < thresholds.errorRate &&
      metrics.p95Latency < thresholds.p95Latency &&
      metrics.successRate > thresholds.successRate &&
      metrics.userSatisfaction > thresholds.userSatisfaction
    );
  }
}

// 部署结果
interface DeployResult {
  strategy: string;              // 部署策略
  version: string;               // 版本
  status: string;                // 状态
  [key: string]: any;
}

// 健康检查结果
interface HealthCheckResult {
  healthy: boolean;
  status: number;
  error?: string;
  timestamp: string;
}

// 金丝雀指标
interface CanaryMetrics {
  errorRate: number;             // 错误率
  p95Latency: number;            // P95延迟
  successRate: number;           // 成功率
  userSatisfaction: number;      // 用户满意度
}
```

**部署策略对比**：

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| 蓝绿部署 | 零停机、快速回滚 | 资源成本高 | 关键业务系统 |
| 金丝雀部署 | 风险低、渐进式 | 监控复杂度高 | 用户量大的系统 |
| 滚动部署 | 资源成本低 | 回滚慢 | 分布式系统 |
| 功能开关 | 灵活、风险低 | 代码复杂度高 | 新功能发布 |

### Requirement: 数据库迁移策略

系统 **SHALL** 支持零停机数据库 schema 迁移，采用向后兼容迁移、扩展-收缩迁移或影子表迁移策略，**MUST** 在迁移过程中确保数据完整性和一致性（通过双写、数据回填和一致性验证），并 **SHALL** 在迁移失败时提供快速回滚能力（< 5 分钟），确保生产环境数据库始终可用且数据零丢失。

#### Scenario: 零停机数据库迁移

**Given** 需要在生产数据库中添加新字段或修改现有字段结构
**When** 使用向后兼容迁移策略执行 schema 变更
**Then** 系统 SHALL 首先添加新字段（允许为空）而不删除旧字段
**And** 系统 SHALL 启用双写模式，同时写入旧字段和新字段
**And** 系统 SHALL 批量回填历史数据，将旧字段的数据转换并写入新字段
**And** 系统 MUST 验证数据一致性，抽样检查旧字段和新字段的数据匹配度
**And** 一致性验证通过后，系统 SHALL 切换应用读取逻辑到新字段
**And** 系统 SHALL 停止写入旧字段，并在确认无影响后删除旧字段

**需求**：实现在不停止服务的情况下迁移数据库，确保数据完整性和系统可用性。

**迁移策略**：
```typescript
// 数据库迁移管理器
export class DatabaseMigrationManager {
  private supabase: SupabaseClient;

  /**
   * 向后兼容迁移
   */
  async backwardCompatibleMigration(migration: Migration): Promise<MigrationResult> {
    // 步骤1：添加新字段（可为空）
    await this.addColumn(migration.table, migration.newColumn);

    // 步骤2：双写模式
    await this.enableDualWrite(migration.table, migration.oldColumn, migration.newColumn);

    // 步骤3：回填数据
    await this.backfillData(migration.table, migration.oldColumn, migration.newColumn);

    // 步骤4：验证数据一致性
    const consistency = await this.verifyDataConsistency(
      migration.table,
      migration.oldColumn,
      migration.newColumn
    );

    if (!consistency.isConsistent) {
      throw new Error('Data consistency check failed');
    }

    // 步骤5：切换读取到新字段
    await this.switchReadToNewColumn(migration.table, migration.newColumn);

    // 步骤6：停止写入旧字段
    await this.disableWriteToOldColumn(migration.table, migration.oldColumn);

    // 步骤7：删除旧字段（可选）
    if (migration.dropOldColumn) {
      await this.dropColumn(migration.table, migration.oldColumn);
    }

    return {
      migrationId: migration.id,
      status: 'success',
      method: 'backward_compatible',
      stepsCompleted: migration.dropOldColumn ? 7 : 6,
      dataConsistencyVerified: true,
    };
  }

  /**
   * 扩展迁移
   */
  async expandMigration(migration: Migration): Promise<MigrationResult> {
    // 步骤1：扩展阶段 - 添加新字段
    await this.addColumn(migration.table, migration.newColumn);

    // 步骤2：扩展阶段 - 双写
    await this.enableDualWrite(migration.table, migration.oldColumn, migration.newColumn);

    // 步骤3：等待合并部署
    await this.waitForFullDeployment();

    // 步骤4：收缩阶段 - 只写新字段
    await this.switchWriteToNewColumn(migration.table, migration.newColumn);

    // 步骤5：收缩阶段 - 回填数据
    await this.backfillData(migration.table, migration.oldColumn, migration.newColumn);

    // 步骤6：收缩阶段 - 删除双写代码
    await this.removeDualWriteCode();

    // 步骤7：收缩阶段 - 删除旧字段
    await this.dropColumn(migration.table, migration.oldColumn);

    return {
      migrationId: migration.id,
      status: 'success',
      method: 'expand_contract',
      stepsCompleted: 7,
    };
  }

  /**
   * 影子迁移
   */
  async shadowMigration(migration: Migration): Promise<MigrationResult> {
    // 步骤1：创建影子表
    await this.createShadowTable(migration.table, migration.shadowTable);

    // 步骤2：同步写入主表和影子表
    await this.enableShadowWriting(migration.table, migration.shadowTable);

    // 步骤3：同步存量数据
    await this.syncExistingData(migration.table, migration.shadowTable);

    // 步骤4：验证影子表数据
    const isConsistent = await this.verifyShadowTable(
      migration.table,
      migration.shadowTable
    );

    if (!isConsistent) {
      throw new Error('Shadow table verification failed');
    }

    // 步骤5：切换读取到影子表
    await this.switchReadToShadowTable(migration.shadowTable);

    // 步骤6：重命名表
    await this.renameTable(migration.table, `${migration.table}_backup`);
    await this.renameTable(migration.shadowTable, migration.table);

    return {
      migrationId: migration.id,
      status: 'success',
      method: 'shadow_table',
      shadowVerified: true,
    };
  }

  /**
   * 数据回填
   */
  private async backfillData(
    table: string,
    oldColumn: string,
    newColumn: string,
    batchSize = 1000
  ): Promise<void> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.supabase
        .from(table)
        .select(`id, ${oldColumn}`)
        .not(oldColumn, 'is', null)
        .is(newColumn, null)
        .range(offset, offset + batchSize - 1);

      if (batch.error || !batch.data || batch.data.length === 0) {
        hasMore = false;
        break;
      }

      // 批量更新
      const updates = batch.data.map(row => ({
        id: row.id,
        [newColumn]: this.transformData(row[oldColumn]),
      }));

      await this.supabase.from(table).upsert(updates);

      offset += batchSize;
    }
  }

  /**
   * 验证数据一致性
   */
  private async verifyDataConsistency(
    table: string,
    oldColumn: string,
    newColumn: string,
    sampleRate = 0.01
  ): Promise<DataConsistency> {
    const totalRows = await this.countRows(table);
    const sampleSize = Math.ceil(totalRows * sampleRate);

    const samples = await this.supabase
      .from(table)
      .select(`id, ${oldColumn}, ${newColumn}`)
      .limit(sampleSize);

    const inconsistencies: DataInconsistency[] = [];

    if (samples.data) {
      samples.data.forEach(row => {
        if (row[oldColumn] !== row[newColumn]) {
          inconsistencies.push({
            rowId: row.id,
            oldValue: row[oldColumn],
            newValue: row[newColumn],
            difference: this.calculateDifference(row[oldColumn], row[newColumn]),
          });
        }
      });
    }

    return {
      isConsistent: inconsistencies.length === 0,
      totalChecked: samples.data?.length || 0,
      inconsistencies,
      consistencyRate: 1 - (inconsistencies.length / sampleSize),
    };
  }
}

// 迁移接口
interface Migration {
  id: string;                    // 迁移ID
  table: string;                 // 表名
  oldColumn: string;             // 旧字段
  newColumn: string;             // 新字段
  shadowTable?: string;          // 影子表
  dropOldColumn?: boolean;       // 是否删除旧字段
}

// 迁移结果
interface MigrationResult {
  migrationId: string;
  status: 'success' | 'failed';
  method: string;                // 迁移方法
  [key: string]: any;
}

// 数据一致性
interface DataConsistency {
  isConsistent: boolean;
  totalChecked: number;
  inconsistencies: DataInconsistency[];
  consistencyRate: number;
}

// 数据不一致性
interface DataInconsistency {
  rowId: string;
  oldValue: any;
  newValue: any;
  difference: any;
}
```

### Requirement: 环境配置管理

系统 **SHALL** 实现多环境配置分离和集中管理，支持从环境变量、配置文件和密钥管理服务（如 AWS Secrets Manager）三种来源加载配置，**MUST** 确保敏感信息（数据库密码、API密钥、加密密钥）仅存储在密钥管理服务中而不提交到代码库，并 **SHALL** 提供配置验证机制，在应用启动时自动检测缺失或无效的配置项。

#### Scenario: 多环境配置分离

**Given** 系统需要在开发、预发布和生产环境中使用不同的配置
**When** 应用在特定环境启动时
**Then** 系统 SHALL 根据环境标识（如 NODE_ENV）加载对应的配置文件（config/development.json、config/production.json）
**And** 系统 SHALL 从环境变量中读取覆盖配置（优先级最高）
**And** 系统 SHALL 从密钥管理服务加载敏感配置（如数据库密码、API密钥）
**And** 系统 MUST 合并三种配置来源，优先级为：环境变量 > 密钥服务 > 配置文件
**And** 系统 SHALL 验证所有必需配置项是否存在（如 supabase.url、deployment.region）
**And** 若缺少必需配置，系统 MUST 抛出错误并阻止应用启动

**需求**：实现环境配置分离，确保开发、测试、预发布和生产环境的配置独立管理。

**配置管理策略**：
```typescript
// 环境配置管理器
export class EnvironmentConfigManager {
  private environments: Map<string, EnvironmentConfig> = new Map();

  /**
   * 加载配置
   */
  async loadConfig(environment: string): Promise<EnvironmentConfig> {
    // 1. 从环境变量加载
    const envConfig = this.loadFromEnvironment(environment);

    // 2. 从配置文件加载
    const fileConfig = await this.loadFromFile(environment);

    // 3. 从密钥管理服务加载
    const secretConfig = await this.loadFromSecretsManager(environment);

    // 4. 合并配置（优先级：环境变量 > 密钥 > 文件）
    const config = this.mergeConfigs(fileConfig, secretConfig, envConfig);

    // 5. 验证配置
    this.validateConfig(config);

    // 6. 缓存配置
    this.environments.set(environment, config);

    return config;
  }

  /**
   * 动态更新配置
   */
  async updateConfig(environment: string, updates: Partial<EnvironmentConfig>): Promise<void> {
    const currentConfig = this.environments.get(environment);
    if (!currentConfig) {
      throw new Error(`Configuration for environment "${environment}" not found`);
    }

    const newConfig = { ...currentConfig, ...updates };

    // 验证配置
    this.validateConfig(newConfig);

    // 更新配置
    this.environments.set(environment, newConfig);

    // 发送配置更新事件
    await this.emitConfigUpdateEvent(environment, updates);
  }

  /**
   * 验证配置
   */
  private validateConfig(config: EnvironmentConfig): void {
    const requiredFields = [
      'supabase.url',
      'supabase.anonKey',
      'deployment.pages.projectName',
      'deployment.region',
    ];

    const missingFields = requiredFields.filter(field => {
      const value = this.getNestedValue(config, field);
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * 获取配置值（支持点分路径）
   */
  getConfigValue(path: string): any {
    const [environment, ...keyParts] = path.split('.');
    const config = this.environments.get(environment);

    if (!config) {
      throw new Error(`Configuration for environment "${environment}" not found`);
    }

    return this.getNestedValue(config, keyParts.join('.'));
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 合并配置
   */
  private mergeConfigs(...configs: EnvironmentConfig[]): EnvironmentConfig {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {} as EnvironmentConfig);
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });

    return result;
  }

  /**
   * 从环境变量加载
   */
  private loadFromEnvironment(environment: string): Partial<EnvironmentConfig> {
    const envVarPrefix = `${environment.toUpperCase()}_`;
    const config: any = {};

    Object.keys(process.env).forEach(key => {
      if (key.startsWith(envVarPrefix)) {
        const configPath = key.replace(envVarPrefix, '').toLowerCase().replace(/_/g, '.');
        this.setNestedValue(config, configPath, process.env[key]);
      }
    });

    return config;
  }

  /**
   * 从配置文件加载
   */
  private async loadFromFile(environment: string): Promise<Partial<EnvironmentConfig>> {
    const configPath = `config/${environment}.json`;

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Configuration file not found: ${configPath}`);
        return {};
      }
      throw error;
    }
  }

  /**
   * 从密钥管理服务加载
   */
  private async loadFromSecretsManager(environment: string): Promise<Partial<EnvironmentConfig>> {
    if (!process.env.ENABLE_SECRETS_MANAGER) {
      return {};
    }

    const secretsManager = new AWS.SecretsManager();
    const secretName = `health-butler/${environment}`;

    try {
      const secret = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
      return JSON.parse(secret.SecretString || '{}');
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        console.warn(`Secret not found: ${secretName}`);
        return {};
      }
      throw error;
    }
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * 发送配置更新事件
   */
  private async emitConfigUpdateEvent(
    environment: string,
    updates: Partial<EnvironmentConfig>
  ): Promise<void> {
    // 通过WebSocket或事件总线发送更新事件
    // 监听配置变化的组件可以响应此事件
  }
}

// 环境配置接口
interface EnvironmentConfig {
  environment: {
    name: string;
    region: string;
    domain: string;
    ssl: {
      enabled: boolean;
      minVersion?: string;
    };
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
  deployment: {
    pages: {
      projectName: string;
    };
    region: string;
  };
}
```

## MODIFIED Requirements

### Requirement: 部署流程重构

系统 **SHALL** 从 Vercel 的自动化部署流程完全迁移到 Cloudflare Pages 的部署机制，**MUST** 将构建流程从 Vercel 自动构建改为本地构建 + Wrangler CLI 部署，**SHALL** 将混合部署模式（SSR + Edge Functions）改为完全静态导出 + Pages Functions，并 **MUST** 更新所有部署脚本、环境变量配置和域名/SSL配置以适配 Cloudflare Pages 平台。

#### Scenario: 从Vercel迁移到Cloudflare Pages

**Given** 现有系统使用 Vercel 平台进行自动化部署
**When** 迁移到 Cloudflare Pages 平台
**Then** 系统 SHALL 将构建命令从 `next build` 改为 `next build && next export` 以生成静态导出
**And** 系统 SHALL 将所有 API Routes（`pages/api/**/*.ts`）迁移到 Pages Functions（`functions/api/**/*.js`）
**And** 系统 SHALL 使用 Wrangler CLI 替代 Vercel CLI 进行部署操作
**And** 系统 MUST 在 Cloudflare Dashboard 手动配置域名和 SSL 证书，而非依赖自动配置
**And** 系统 SHALL 更新环境变量配置，从 Vercel Dashboard 迁移到 Cloudflare Dashboard 或 wrangler.toml
**And** 系统 SHALL 确保部署后的应用完全静态化，无服务器端渲染（SSR）逻辑

**修改需求**：完全重构现有的Vercel部署流程，适配Cloudflare Pages的部署机制。

**部署流程对比**：

```diff
- Vercel部署流程
- 1. Git提交触发
- 2. Vercel自动构建
- 3. Edge Function部署
- 4. 域名自动配置
- 5. SSL证书配置
- 6. 混合部署（SSR + Edge）

+ Cloudflare Pages部署流程
+ 1. Git提交触发
+ 2. 本地构建（npm run build）
+ 3. 静态资源部署到Pages
+ 4. Functions单独部署
+ 5. 手动域名配置
+ 6. SSL证书配置
+ 7. 完全静态部署 + Functions API
```

**部署脚本重构**：
```typescript
// 部署脚本比较

// Vercel部署脚本
// {
//   "scripts": {
//     "dev": "next dev",
//     "build": "next build",
//     "start": "next start"
//   }
// }

// Cloudflare Pages部署脚本
{
  "scripts": {
    // 开发
    "dev": "concurrently \"next dev\" \"wrangler pages dev .next/static\"",

    // 构建
    "build": "npm run build:next && npm run build:functions",
    "build:next": "next build && next export",
    "build:functions": "cd functions && npm install && npm run build",

    // 部署
    "deploy": "npm run build && wrangler pages deploy .next/static",
    "deploy:dev": "npm run build && wrangler pages deploy .next/static --env development",
    "deploy:staging": "npm run build && wrangler pages deploy .next/static --env staging",
    "deploy:prod": "npm run build && wrangler pages deploy .next/static --env production",

    // 预览
    "preview": "wrangler pages dev .next/static",

    // 清理
    "clean": "rm -rf .next functions/dist",
  }
}
```

**构建输出差异**：
```diff
- Vercel构建输出
- .next/
-   ├── server/           # 服务端代码
-   ├── static/           # 静态资源
-   ├── public/           # 公开资源
-   └── *.js              # Edge Functions

+ Cloudflare Pages构建输出
+ .next/
+   ├── static/           # 静态导出（部署到Pages）
+   ├── server/           # 仅用于构建，不部署
+   └── *.js              # 不部署到Pages
+
+ functions/              # 单独部署到Pages Functions
+   ├── api/              # API路由
+   ├── auth/             # 认证函数
+   └── utils/            # 工具函数
```

**环境变量管理变化**：
```diff
- Vercel环境变量管理
- 在Vercel Dashboard配置
- 自动注入到Edge Runtime
- 支持预览环境变量
- 支持分支环境变量

+ Cloudflare Pages环境变量管理
+ 在Cloudflare Dashboard配置
+ 自动注入到Pages Functions
+ 需要手动配置各环境变量
+ 支持wrangler.toml配置
+ 支持命令行注入
```

### Requirement: 无状态部署

系统 **SHALL** 从 Next.js 的服务器端渲染（SSR）和动态路由架构完全迁移到纯静态导出架构，**MUST** 移除所有服务器端状态存储（包括 getServerSideProps、服务器端会话、req对象传递的状态），**SHALL** 将所有动态数据获取逻辑迁移到客户端（使用 React Query 或 SWR），并 **SHALL** 使用 Cloudflare Workers KV 或 Cache API 替代服务器端内存状态存储。

#### Scenario: 移除服务器端状态

**Given** 现有页面使用 getServerSideProps 在服务器端获取数据并渲染
**When** 迁移到静态导出架构
**Then** 系统 SHALL 移除所有 getServerSideProps 函数，改为在客户端使用 useEffect 或 React Query 获取数据
**And** 系统 SHALL 将存储在 NextAuth.js 会话中的服务器端状态迁移到 Supabase Auth JWT 令牌
**And** 系统 SHALL 将所有 Next.js API Routes（`pages/api`）迁移到 Cloudflare Pages Functions（`functions/api`）
**And** 系统 MUST 移除中间件中通过 req 对象传递的状态，改用 Cloudflare KV 或 Cache API 存储临时状态
**And** 系统 SHALL 为客户端数据获取添加加载状态（Loading Spinner）和错误处理逻辑
**And** 系统 SHALL 确保应用可完全静态导出，无任何服务器端渲染依赖

**修改需求**：从Next.js的动态渲染架构迁移到纯静态导出架构，移除所有服务器端状态。

**状态迁移策略**：
```typescript
// 状态类型迁移

// 1. 服务器端Props（getServerSideProps）
// 修改前
export async function getServerSideProps(context) {
  const data = await fetchUserData(context.req.user.id);
  return { props: { data } };
}

// 修改后
// - 在客户端使用useEffect获取数据
// - 使用React Query或SWR管理状态
// - 添加加载状态处理

// 2. 服务器端会话
// 修改前：存储在NextAuth.js会话中
// 修改后：存储在Supabase Auth JWT令牌中

// 3. API路由
// 修改前：Next.js API Routes（pages/api）
// 修改后：Cloudflare Pages Functions（functions/api）

// 4. 中间件状态
// 修改前：存储在req对象中传递
// 修改后：使用Cloudflare Workers KV或Cache API
```

**无状态改造示例**：
```typescript
// 1. 从getServerSideProps迁移到客户端获取

// Before（服务器端渲染）
export default function Dashboard({ userData, initialData }) {
  return (
    <DashboardLayout>
      <UserProfile user={userData} />
      <HealthData data={initialData} />
    </DashboardLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const [userData, initialData] = await Promise.all([
    fetchUserData(session.user.id),
    fetchHealthData(session.user.id),
  ]);

  return {
    props: {
      userData,
      initialData,
    },
  };
}

// After（客户端获取）
export default function Dashboard() {
  const { user, isLoading: userLoading } = useUser();
  const { data: userData, isLoading: dataLoading } = useUserData();
  const { data: healthData, isLoading: healthLoading } = useHealthData();

  if (userLoading || dataLoading || healthLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <UserProfile user={userData} />
      <HealthData data={healthData} />
    </DashboardLayout>
  );
}
```

### Requirement: 依赖管理重构

系统 **SHALL** 完全移除所有 Vercel 特有依赖包，**MUST** 使用 Cloudflare 兼容的替代方案或开源替代品，**SHALL** 移除 @vercel/analytics、@vercel/og、@vercel/blob、@vercel/edge-config、@vercel/postgres 等专属包，并 **SHALL** 更新 Next.js 配置以支持静态导出和 Cloudflare Pages 适配器（@cloudflare/next-on-pages）。

#### Scenario: 移除Vercel特有依赖

**Given** 项目依赖包含 Vercel 专属包（如 @vercel/analytics、@vercel/blob）
**When** 迁移到 Cloudflare Pages 平台
**Then** 系统 SHALL 移除 @vercel/analytics 并替换为 @cloudflare/web-analytics
**And** 系统 SHALL 移除 @vercel/blob 并替换为 Supabase Storage
**And** 系统 SHALL 移除 @vercel/postgres 并替换为 @supabase/supabase-js
**And** 系统 SHALL 移除 next-auth 并替换为 @supabase/auth-helpers-nextjs
**And** 系统 SHALL 移除 @prisma/client 并替换为 Supabase 客户端
**And** 系统 MUST 新增 @cloudflare/next-on-pages、wrangler、@cloudflare/workers-types 等 Cloudflare 适配依赖
**And** 系统 SHALL 更新 next.config.js 配置，启用 `output: 'export'` 和 `images: { unoptimized: true }`

**修改需求**：移除Vercel特有依赖，替换为Cloudflare兼容的替代方案。

**依赖重构**：
```diff
dependencies:
- 移除:
-   @vercel/analytics          → @cloudflare/web-analytics
-   @vercel/og                 → 自定义OG图像生成
-   @vercel/blob               → Supabase Storage
-   @vercel/edge-config        → Cloudflare Workers KV
-   @vercel/postgres           → Supabase PostgreSQL

- 替换:
-   next-auth                 → @supabase/auth-helpers-nextjs
-   @prisma/client            → @supabase/supabase-js
-   next/server               → @cloudflare/next-on-pages

+ 新增:
+   @cloudflare/next-on-pages   # Cloudflare Pages适配器
+   @supabase/supabase-js       # Supabase客户端
+   @supabase/auth-helpers-nextjs # Supabase认证辅助
+   @cloudflare/workers-types   # Cloudflare Workers类型
+   wrangler                    # Cloudflare CLI
+   @cloudflare/web-analytics   # Cloudflare分析
```

**构建配置重构**：
```typescript
// next.config.js 重构

// Before（Vercel优化）
const nextConfig = {
  swcMinify: true,
  compress: true,
  poweredByHeader: false,

  // Vercel特定优化
  experimental: {
    scrollRestoration: true,
    legacyBrowsers: false,
  },

  // Vercel Image Optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['health-butler.vercel.app'],
  },
};

// After（Cloudflare Pages优化）
const nextConfig = {
  output: 'export',              // 静态导出
  trailingSlash: true,

  // Cloudflare Pages适配
  experimental: {
    runtime: 'experimental-edge', // 边缘运行时
  },

  // 图片优化禁用（使用Cloudflare Image Resizing）
  images: {
    unoptimized: true,
    formats: ['image/webp'],
    domains: ['supabase.co'],    // Supabase域名
  },

  // 国际化（可选）
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
  },

  // 生产环境优化
  productionBrowserSourceMaps: false,
};
```

## REMOVED Requirements

### Requirement: 废弃Next.js API Routes

#### Scenario: API架构重组

**移除说明**：完全移除`pages/api`目录下的所有API路由，迁移到`functions/api`。

**移除原因**：
- Next.js静态导出不支持API Routes
- Edge Function大小限制
- 需要更轻量级的API架构
- Cloudflare Pages Functions提供更好的性能

**影响范围**：
- `pages/api/**/*.ts` - 所有API路由文件
- API调用方式需要更新
- 前端API客户端需要重构
- 认证和中间件需要迁移

**迁移步骤**：
1. 创建`functions/api`目录结构
2. 逐个迁移API端点
3. 更新路由处理逻辑
4. 迁移认证中间件
5. 更新错误处理
6. 测试所有API端点
7. 删除`pages/api`目录

### Requirement: 废弃Prisma ORM

#### Scenario: 数据库访问层重构

**移除说明**：移除Prisma ORM，改用Supabase客户端直接访问数据库。

**移除原因**：
- Prisma客户端增加部署包大小（超过1MB限制）
- Supabase客户端更轻量
- Prisma Edge支持有限
- Supabase提供原生PostgreSQL访问

**影响范围**：
- `prisma/schema.prisma` - 数据库schema定义
- `src/lib/db/prisma.ts` - Prisma客户端初始化
- 所有使用Prisma的代码
- 数据库迁移脚本

**替代方案**：
```typescript
// Prisma查询
const users = await prisma.user.findMany({
  where: { isActive: true },
  include: { posts: true },
});

// Supabase查询
const { data: users } = await supabase
  .from('users')
  .select(`*, posts (*)`)
  .eq('is_active', true);
```

### Requirement: 废弃NextAuth.js

#### Scenario: 认证系统迁移

**移除说明**：完全移除NextAuth.js，替换为Supabase Auth。

**移除原因**：
- NextAuth.js增加包大小
- 与Supabase集成度不高
- Supabase Auth提供原生认证
- 简化认证架构

**影响范围**：
- `pages/api/auth/**/*.ts` - 认证API
- `middleware.ts` - 认证中间件
- Session管理
- 社交登录配置
- 自定义认证页面

**迁移清单**：
- [ ] 移除next-auth依赖
- [ ] 移除认证配置
- [ ] 移除自定义适配器
- [ ] 更新环境变量
- [ ] 重构认证页面
- [ ] 迁移会话管理
- [ ] 更新API保护逻辑
- [ ] 测试认证流程

## 部署验证清单

### 部署前检查

**代码质量检查**：
- [ ] 所有测试通过（单元测试、集成测试、E2E测试）
- [ ] 代码覆盖率 > 80%
- [ ] ESLint无错误
- [ ] TypeScript类型检查通过
- [ ] 没有console.log（生产代码）
- [ ] 没有调试代码
- [ ] 性能预算符合要求

**配置验证**：
- [ ] 环境变量配置完成
- [ ] 数据库连接配置正确
- [ ] Supabase配置验证通过
- [ ] Cloudflare Pages配置正确
- [ ] SSL证书有效
- [ ] 域名解析正确

**安全性检查**：
- [ ] Secrets不提交到代码库
- [ ] API密钥使用环境变量
- [ ] 数据库访问权限正确配置
- [ ] CORS配置安全
- [ ] 认证和授权正确配置
- [ ] 安全头部设置正确
- [ ] 依赖没有已知漏洞

**性能检查**：
- [ ] 构建产物优化
- [ ] 代码分割配置正确
- [ ] 图片优化配置正确
- [ ] 缓存策略配置正确
- [ ] CDN配置正确
- [ ] Lighthouse评分 > 90

### 部署过程验证

**构建阶段**：
- [ ] 构建成功
- [ ] 无构建警告
- [ ] 构建产物大小符合要求
- [ ] 静态导出成功
- [ ] Functions构建成功

**部署阶段**：
- [ ] 部署到目标环境
- [ ] 部署日志无错误
- [ ] 部署版本号正确
- [ ] 部署时间符合预期

**验证阶段**：
- [ ] 健康检查通过
- [ ] 所有页面可访问
- [ ] API响应正常
- [ ] 数据库连接正常
- [ ] 认证流程正常
- [ ] 关键功能正常

### 部署后验证

**监控验证**：
- [ ] 应用监控数据正常
- [ ] 错误率 < 1%
- [ ] 响应时间 < 200ms
- [ ] 缓存命中率 > 85%
- [ ] 日志收集正常
- [ ] 告警系统正常

**业务验证**：
- [ ] 用户可正常访问
- [ ] 用户数据完整
- [ ] 业务流程正常
- [ ] 支付流程正常（如适用）
- [ ] 邮件发送正常
- [ ] 第三方服务集成正常

这个部署规范确保了Cloudflare Pages + Supabase混合架构的部署流程规范化、自动化和可验证，实现了零停机部署、回滚能力和生产环境稳定性。所有部署操作都必须按照这个规范执行，确保系统的可靠性和可维护性。