/**
 * 双写装饰器
 *
 * 提供 Repository 层的双写验证功能，支持：
 * - Prisma + Supabase 双写
 * - 主库/影子库切换
 * - 结果比对和告警
 * - 错误处理和回滚
 *
 * @module dual-write-decorator
 */

import type { FeatureFlagManager, FeatureFlags } from './feature-flags';
import type { ResultVerifier } from './result-verifier';

/**
 * 双写装饰器配置
 */
export interface DualWriteConfig {
  /** Feature Flag 管理器 */
  featureFlagManager: FeatureFlagManager;
  /** Result Verifier */
  verifier: ResultVerifier;
  /** API 端点名称（用于记录） */
  apiEndpoint: string;
}

/**
 * 仅在 Supabase 实现的方法白名单
 *
 * 这些方法使用 Supabase RPC 函数，无法在 Prisma 中实现
 * 当双写启用时，这些方法会跳过 Prisma 调用，只执行 Supabase 侧
 */
const SUPABASE_ONLY_METHODS = new Set([
  'recordSpending', // 使用 record_spending_tx RPC 函数
  // 未来如果有其他 RPC-only 方法，在此添加
]);

/**
 * 双写装饰器
 *
 * 装饰任意 Repository 接口，提供双写验证能力
 *
 * 工作模式：
 * 1. 单写模式（双写关闭）：根据 Feature Flag 选择主库
 * 2. 双写模式：同时写入 Prisma 和 Supabase，主库结果返回
 * 3. 影子读模式：主库返回，同时读取影子库进行比对
 * 4. Supabase-only 模式：某些方法只在 Supabase 实现（RPC 函数）
 *
 * @template T - Repository 接口类型
 */
export class DualWriteDecorator<T extends object> {
  private flags: FeatureFlags | null = null;
  private flagsPromise: Promise<FeatureFlags> | null = null;

  constructor(
    private prismaRepo: T | null,
    private supabaseRepo: T,
    private config: DualWriteConfig
  ) {}

  /**
   * 获取 Feature Flags
   *
   * 使用 promise 缓存避免并发请求重复查询
   */
  private async getFlags(): Promise<FeatureFlags> {
    if (this.flags) {
      return this.flags;
    }

    if (!this.flagsPromise) {
      this.flagsPromise = this.config.featureFlagManager.getFlags();
    }

    this.flags = await this.flagsPromise;
    this.flagsPromise = null;

    return this.flags;
  }

  /**
   * 装饰方法
   *
   * 根据 Feature Flags 执行单写或双写逻辑
   *
   * @param methodName - 方法名称
   * @param args - 方法参数
   * @returns 执行结果
   */
  async decorateMethod<R>(methodName: string, ...args: any[]): Promise<R> {
    const flags = await this.getFlags();

    // Supabase-only 方法：直接调用 Supabase 实现，跳过 Prisma
    // 这些方法使用 RPC 函数，Prisma 无法实现
    if (SUPABASE_ONLY_METHODS.has(methodName)) {
      const method = (this.supabaseRepo as any)[methodName];
      if (!method) {
        throw new Error(`Method ${methodName} not found in Supabase repository`);
      }
      return method.apply(this.supabaseRepo, args) as Promise<R>;
    }

    // 单写模式
    if (!flags.enableDualWrite) {
      return this.singleWrite<R>(methodName, flags.enableSupabasePrimary, args);
    }

    // 双写模式
    if (methodName.startsWith('create') || methodName.startsWith('update') || methodName.startsWith('delete')) {
      return this.dualWrite<R>(methodName, flags.enableSupabasePrimary, args);
    }

    // 读操作：影子读模式
    return this.shadowRead<R>(methodName, flags.enableSupabasePrimary, args);
  }

  /**
   * 单写模式
   *
   * 根据 Feature Flag 选择主库
   *
   * @param methodName - 方法名称
   * @param useSupabase - 是否使用 Supabase 作为主库
   * @param args - 方法参数
   * @returns 执行结果
   */
  private async singleWrite<R>(
    methodName: string,
    useSupabase: boolean,
    args: any[]
  ): Promise<R> {
    const repo = useSupabase ? this.supabaseRepo : this.prismaRepo;

    if (!repo) {
      throw new Error(`Repository not available for single write mode`);
    }

    const method = (repo as any)[methodName];

    if (typeof method !== 'function') {
      throw new Error(`Method ${methodName} not found on repository`);
    }

    return method.apply(repo, args);
  }

  /**
   * 双写模式
   *
   * 同时写入 Prisma 和 Supabase，返回主库结果
   *
   * @param methodName - 方法名称
   * @param useSupabase - 是否使用 Supabase 作为主库
   * @param args - 方法参数
   * @returns 主库执行结果
   */
  private async dualWrite<R>(
    methodName: string,
    useSupabase: boolean,
    args: any[]
  ): Promise<R> {
    if (!this.prismaRepo) {
      // Prisma Repository 不可用，降级为单写
      console.warn('[DualWrite] Prisma repo not available, falling back to single write');
      return this.singleWrite<R>(methodName, useSupabase, args);
    }

    const prismaMethod = (this.prismaRepo as any)[methodName];
    const supabaseMethod = (this.supabaseRepo as any)[methodName];

    if (typeof prismaMethod !== 'function' || typeof supabaseMethod !== 'function') {
      throw new Error(`Method ${methodName} not found on one or both repositories`);
    }

    // 并发执行双写
    const [prismaResult, supabaseResult] = await Promise.allSettled([
      prismaMethod.apply(this.prismaRepo, args),
      supabaseMethod.apply(this.supabaseRepo, args),
    ]);

    // 记录 diff（异步，不阻塞主流程）
    this.config.verifier
      .recordDiff({
        apiEndpoint: this.config.apiEndpoint,
        operation: methodName,
        payload: args[0], // 通常第一个参数是输入数据
        prismaResult,
        supabaseResult,
        timestamp: new Date().toISOString(),
      })
      .catch((err) => {
        console.error('[DualWrite] Failed to record diff:', err);
      });

    // 处理错误
    if (prismaResult.status === 'rejected') {
      console.error('[DualWrite] Prisma write failed:', prismaResult.reason);

      // 如果 Supabase 成功但 Prisma 失败，需要回滚 Supabase
      if (supabaseResult.status === 'fulfilled') {
        await this.compensateSupabaseWrite(methodName, supabaseResult.value);
      }

      throw prismaResult.reason;
    }

    if (supabaseResult.status === 'rejected') {
      console.error('[DualWrite] Supabase write failed:', supabaseResult.reason);

      // Supabase 失败，记录告警但不抛出错误（Prisma 为主）
      await this.config.verifier.recordAlert({
        severity: 'warning',
        message: `Supabase write failed during dual write: ${methodName}`,
        error: supabaseResult.reason,
      });
    }

    // 返回主库结果
    const primaryResult = useSupabase ? supabaseResult : prismaResult;

    if (primaryResult.status === 'rejected') {
      throw primaryResult.reason;
    }

    return primaryResult.value;
  }

  /**
   * 影子读模式
   *
   * 主库返回，同时读取影子库进行比对
   *
   * @param methodName - 方法名称
   * @param useSupabase - 是否使用 Supabase 作为主库
   * @param args - 方法参数
   * @returns 主库执行结果
   */
  private async shadowRead<R>(
    methodName: string,
    useSupabase: boolean,
    args: any[]
  ): Promise<R> {
    const primaryRepo = useSupabase ? this.supabaseRepo : this.prismaRepo;
    const shadowRepo = useSupabase ? this.prismaRepo : this.supabaseRepo;

    if (!primaryRepo) {
      throw new Error(`Primary repository not available`);
    }

    const primaryMethod = (primaryRepo as any)[methodName];

    if (typeof primaryMethod !== 'function') {
      throw new Error(`Method ${methodName} not found on primary repository`);
    }

    // 执行主库查询
    const primaryPromise = primaryMethod.apply(primaryRepo, args);

    // 如果影子库可用，同时执行影子库查询
    let shadowPromise: Promise<R> | null = null;

    if (shadowRepo) {
      const shadowMethod = (shadowRepo as any)[methodName];

      if (typeof shadowMethod === 'function') {
        shadowPromise = shadowMethod.apply(shadowRepo, args);
      }
    }

    // 等待主库结果
    const primaryResult = await primaryPromise;

    // 异步比对影子库结果（不阻塞主流程）
    if (shadowPromise) {
      Promise.allSettled([Promise.resolve(primaryResult), shadowPromise])
        .then(([primary, shadow]) => {
          this.config.verifier
            .recordDiff({
              apiEndpoint: this.config.apiEndpoint,
              operation: methodName,
              payload: args[0],
              primaryResult: primary.status === 'fulfilled' ? primary.value : null,
              shadowResult: shadow.status === 'fulfilled' ? shadow.value : null,
              timestamp: new Date().toISOString(),
            })
            .catch((err) => {
              console.error('[DualWrite] Failed to record shadow read diff:', err);
            });
        })
        .catch((err) => {
          console.error('[DualWrite] Shadow read comparison failed:', err);
        });
    }

    return primaryResult;
  }

  /**
   * 补偿 Supabase 写入
   *
   * 当 Prisma 失败但 Supabase 成功时，回滚 Supabase 的写入
   *
   * @param methodName - 方法名称
   * @param supabaseValue - Supabase 写入的值
   */
  private async compensateSupabaseWrite(methodName: string, supabaseValue: any): Promise<void> {
    try {
      // 如果是 create 操作，尝试删除
      if (methodName.startsWith('create') && supabaseValue && supabaseValue.id) {
        const deleteMethod = (this.supabaseRepo as any).delete;

        if (typeof deleteMethod === 'function') {
          await deleteMethod.call(this.supabaseRepo, supabaseValue.id);
          console.log('[DualWrite] Compensated Supabase write:', supabaseValue.id);
        }
      }

      // TODO: 处理 update/delete 的补偿逻辑
    } catch (err) {
      console.error('[DualWrite] Failed to compensate Supabase write:', err);

      // 记录补偿失败的告警
      await this.config.verifier.recordAlert({
        severity: 'error',
        message: `Failed to compensate Supabase write: ${methodName}`,
        error: err,
      });
    }
  }
}

/**
 * 便捷函数：创建双写装饰器
 *
 * @param prismaRepo - Prisma Repository（可选）
 * @param supabaseRepo - Supabase Repository
 * @param config - 双写配置
 * @returns 双写装饰器实例
 */
export function createDualWriteDecorator<T extends object>(
  prismaRepo: T | null,
  supabaseRepo: T,
  config: DualWriteConfig
): DualWriteDecorator<T> {
  return new DualWriteDecorator(prismaRepo, supabaseRepo, config);
}
