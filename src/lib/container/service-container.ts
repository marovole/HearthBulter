/**
 * 服务容器 - 依赖注入核心
 *
 * 提供统一的服务实例管理，支持：
 * - 单例模式
 * - 懒加载
 * - Repository 层抽象
 * - 环境切换（Supabase/Mock）
 *
 * @module service-container
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';

import type { RecommendationRepository } from '@/lib/repositories/interfaces/recommendation-repository';
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification-repository';
import type { AnalyticsRepository } from '@/lib/repositories/interfaces/analytics-repository';
import type { BudgetRepository } from '@/lib/repositories/interfaces/budget-repository';

import { SupabaseRecommendationRepository } from '@/lib/repositories/implementations/supabase-recommendation-repository';
import { SupabaseNotificationRepository } from '@/lib/repositories/implementations/supabase-notification-repository';
import { SupabaseAnalyticsRepository } from '@/lib/repositories/implementations/supabase-analytics-repository';
import { SupabaseBudgetRepository } from '@/lib/repositories/implementations/supabase-budget-repository';

// Service层导入（暂时使用现有实现，后续重构为Repository模式）
import { RecommendationEngine } from '@/lib/services/recommendation/recommendation-engine';
import { NotificationManager } from '@/lib/services/notification/notification-manager';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { BudgetTracker } from '@/lib/services/budget/budget-tracker';
import { BudgetNotificationService } from '@/lib/services/budget/budget-notification-service';
import { TrendAnalyzer } from '@/lib/services/analytics/trend-analyzer';

/**
 * Repository 后端类型
 */
export type RepositoryBackend = 'supabase' | 'mock';

/**
 * Repository 覆盖配置
 *
 * 允许注入自定义 Repository 实现（用于测试）
 */
export interface RepositoryOverrides {
  recommendation?: RecommendationRepository;
  notification?: NotificationRepository;
  analytics?: AnalyticsRepository;
  budget?: BudgetRepository;
}

/**
 * 服务容器配置
 */
export interface ServiceContainerConfig {
  /** Repository 后端类型 */
  repositoryType?: RepositoryBackend;
  /** 自定义 Supabase 客户端 */
  supabaseClient?: SupabaseClient<Database>;
  /** Repository 覆盖（用于测试） */
  repositoryOverrides?: RepositoryOverrides;
}

/**
 * 服务容器类
 *
 * 单例模式管理所有 Repository 实例，
 * 提供懒加载和依赖注入支持
 */
export class ServiceContainer {
  private static readonly GLOBAL_KEY = '__serviceContainerSingleton';
  private readonly config: ServiceContainerConfig;
  private readonly supabaseClient: SupabaseClient<Database>;

  // Repository 实例缓存
  private recommendationRepository?: RecommendationRepository;
  private notificationRepository?: NotificationRepository;
  private analyticsRepository?: AnalyticsRepository;
  private budgetRepository?: BudgetRepository;

  // Service 实例缓存（暂时使用现有实现，后续重构）
  private recommendationEngine?: RecommendationEngine;
  private notificationManager?: NotificationManager;
  private analyticsService?: AnalyticsService;
  private budgetTracker?: BudgetTracker;
  private trendAnalyzer?: TrendAnalyzer;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor(config: ServiceContainerConfig = {}) {
    this.config = config;
    // 延迟加载 SupabaseClientManager 以避免模块顶层执行
    if (config.supabaseClient) {
      this.supabaseClient = config.supabaseClient;
    } else {
      const { SupabaseClientManager } = require('@/lib/db/supabase-adapter');
      this.supabaseClient = SupabaseClientManager.getInstance();
    }
  }

  /**
   * 获取全局单例实例
   *
   * @param config - 配置选项（仅首次调用时生效）
   * @returns 服务容器实例
   */
  static getInstance(config: ServiceContainerConfig = {}): ServiceContainer {
    const globalScope = globalThis as typeof globalThis & {
      [ServiceContainer.GLOBAL_KEY]?: ServiceContainer;
    };

    if (!globalScope[ServiceContainer.GLOBAL_KEY]) {
      globalScope[ServiceContainer.GLOBAL_KEY] = new ServiceContainer(config);
    }

    return globalScope[ServiceContainer.GLOBAL_KEY];
  }

  /**
   * 重置全局单例（主要用于测试）
   */
  static reset(): void {
    const globalScope = globalThis as typeof globalThis & {
      [ServiceContainer.GLOBAL_KEY]?: ServiceContainer;
    };
    delete globalScope[ServiceContainer.GLOBAL_KEY];
  }

  /**
   * 获取推荐 Repository
   */
  getRecommendationRepository(): RecommendationRepository {
    if (this.config.repositoryOverrides?.recommendation) {
      return this.config.repositoryOverrides.recommendation;
    }

    if (!this.recommendationRepository) {
      if (this.config.repositoryType === 'mock') {
        throw new Error('Mock repositories not yet implemented');
      }
      this.recommendationRepository = new SupabaseRecommendationRepository(
        this.supabaseClient,
      );
    }

    return this.recommendationRepository;
  }

  /**
   * 获取通知 Repository
   */
  getNotificationRepository(): NotificationRepository {
    if (this.config.repositoryOverrides?.notification) {
      return this.config.repositoryOverrides.notification;
    }

    if (!this.notificationRepository) {
      if (this.config.repositoryType === 'mock') {
        throw new Error('Mock repositories not yet implemented');
      }
      this.notificationRepository = new SupabaseNotificationRepository(
        this.supabaseClient,
      );
    }

    return this.notificationRepository;
  }

  /**
   * 获取分析 Repository
   */
  getAnalyticsRepository(): AnalyticsRepository {
    if (this.config.repositoryOverrides?.analytics) {
      return this.config.repositoryOverrides.analytics;
    }

    if (!this.analyticsRepository) {
      if (this.config.repositoryType === 'mock') {
        throw new Error('Mock repositories not yet implemented');
      }
      this.analyticsRepository = new SupabaseAnalyticsRepository(
        this.supabaseClient,
      );
    }

    return this.analyticsRepository;
  }

  /**
   * 获取预算 Repository
   */
  getBudgetRepository(): BudgetRepository {
    if (this.config.repositoryOverrides?.budget) {
      return this.config.repositoryOverrides.budget;
    }

    if (!this.budgetRepository) {
      if (this.config.repositoryType === 'mock') {
        throw new Error('Mock repositories not yet implemented');
      }
      this.budgetRepository = new SupabaseBudgetRepository(this.supabaseClient);
    }

    return this.budgetRepository;
  }

  /**
   * 获取推荐引擎服务
   *
   * 已重构为使用RecommendationRepository
   */
  getRecommendationEngine(): RecommendationEngine {
    if (!this.recommendationEngine) {
      this.recommendationEngine = new RecommendationEngine(
        this.getRecommendationRepository(),
      );
    }
    return this.recommendationEngine;
  }

  /**
   * 获取通知管理服务
   *
   * 已重构为使用NotificationRepository
   */
  getNotificationManager(): NotificationManager {
    if (!this.notificationManager) {
      this.notificationManager = new NotificationManager(
        this.getNotificationRepository(),
      );
    }
    return this.notificationManager;
  }

  /**
   * 获取分析服务
   *
   * 已重构为使用AnalyticsRepository
   */
  getAnalyticsService(): AnalyticsService {
    if (!this.analyticsService) {
      this.analyticsService = new AnalyticsService(
        this.getAnalyticsRepository(),
      );
    }
    return this.analyticsService;
  }

  /**
   * 获取预算跟踪服务
   *
   * 使用扁平化依赖注入：
   * 1. 先确保 NotificationManager 已创建
   * 2. 创建 BudgetNotificationService（注入 NotificationManager）
   * 3. 创建 BudgetTracker（注入 BudgetNotificationService）
   */
  getBudgetTracker(): BudgetTracker {
    if (!this.budgetTracker) {
      // 确保 NotificationManager 已创建（扁平化依赖）
      const notificationManager = this.getNotificationManager();

      // 创建 BudgetNotificationService，注入所有依赖
      const budgetNotificationService = new BudgetNotificationService(
        this.getNotificationRepository(),
        this.getBudgetRepository(),
        notificationManager,
      );

      // 创建 BudgetTracker
      this.budgetTracker = new BudgetTracker(
        this.getBudgetRepository(),
        budgetNotificationService,
      );
    }
    return this.budgetTracker;
  }

  /**
   * 获取趋势分析服务
   *
   * 已重构为使用AnalyticsRepository
   */
  getTrendAnalyzer(): TrendAnalyzer {
    if (!this.trendAnalyzer) {
      this.trendAnalyzer = new TrendAnalyzer(this.getAnalyticsRepository());
    }
    return this.trendAnalyzer;
  }
}

/**
 * 便捷函数：创建服务容器（非单例）
 *
 * 注意：通常应使用 getDefaultContainer() 获取单例实例，
 * 此函数仅用于测试场景需要独立容器实例时
 */
export function createServiceContainer(
  config: ServiceContainerConfig = {},
): ServiceContainer {
  // 直接调用 getInstance，不创建新实例
  return ServiceContainer.getInstance(config);
}

/**
 * 便捷函数：获取默认容器
 */
export function getDefaultContainer(): ServiceContainer {
  return ServiceContainer.getInstance();
}

// 导出默认容器实例（向后兼容）
export const container = ServiceContainer.getInstance();

/**
 * 全局类型声明
 */
declare global {
  // eslint-disable-next-line no-var
  var __serviceContainerSingleton: ServiceContainer | undefined;
}
