/**
 * Supabase 预算 Repository 实现
 *
 * 基于 Supabase PostgreSQL 实现预算管理系统的数据访问层，
 * 提供预算 CRUD、支出记录、使用率聚合、预警管理等功能。
 *
 * @module supabase-budget-repository
 */

import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { BudgetRepository } from '../interfaces/budget-repository';
import type {
  BudgetAlertDTO,
  BudgetCreateDTO,
  BudgetDTO,
  BudgetStatusDTO,
  BudgetUpdateDTO,
  SpendingCreateDTO,
  SpendingDTO,
  SpendingFilterDTO,
} from '../types/budget';
import type { PaginatedResult, PaginationInput } from '../types/common';

type BudgetRow = Database['public']['Tables']['budgets']['Row'];
type BudgetInsert = Database['public']['Tables']['budgets']['Insert'];
type BudgetUpdate = Database['public']['Tables']['budgets']['Update'];
type SpendingRow = Database['public']['Tables']['spendings']['Row'];
type SpendingInsert = Database['public']['Tables']['spendings']['Insert'];
type BudgetAlertRow = Database['public']['Tables']['budget_alerts']['Row'];
type BudgetAlertInsert = Database['public']['Tables']['budget_alerts']['Insert'];

/**
 * Supabase 预算 Repository 实现
 *
 * 特性：
 * - 预算使用率实时聚合
 * - 分类支出统计
 * - 预警自动触发
 * - 软删除支持
 */
export class SupabaseBudgetRepository implements BudgetRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = '[SupabaseBudgetRepository]';

  constructor(client: SupabaseClient<Database> = SupabaseClientManager.getInstance()) {
    this.client = client;
  }

  /**
   * 创建预算
   */
  async createBudget(payload: BudgetCreateDTO): Promise<BudgetDTO> {
    const insertPayload = this.mapBudgetDtoToInsert(payload);
    const { data, error } = await this.client
      .from('budgets')
      .insert(insertPayload as any)
      .select('*')
      .single();

    if (error) this.handleError('createBudget', error);
    return this.mapBudgetRow(data!);
  }

  /**
   * 更新预算
   */
  async updateBudget(id: string, payload: BudgetUpdateDTO): Promise<BudgetDTO> {
    const updatePayload = this.mapBudgetDtoToUpdate(payload);
    const { data, error } = await this.client
      .from('budgets')
      // @ts-ignore - Supabase types don't correctly infer budgets table update type
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) this.handleError('updateBudget', error);
    return this.mapBudgetRow(data!);
  }

  /**
   * 获取预算详情
   */
  async getBudgetById(id: string): Promise<BudgetDTO | null> {
    const { data, error } = await this.client.from('budgets').select('*').eq('id', id).maybeSingle();
    if (error && error.code !== 'PGRST116') this.handleError('getBudgetById', error);
    return data ? this.mapBudgetRow(data) : null;
  }

  /**
   * 查询成员的预算列表
   */
  async listBudgets(
    memberId: string,
    filter?: { status?: BudgetDTO['status'] },
    pagination?: PaginationInput
  ): Promise<PaginatedResult<BudgetDTO>> {
    let query = this.client
      .from('budgets')
      .select('*', { count: 'exact' })
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (filter?.status) query = query.eq('status', filter.status);
    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) this.handleError('listBudgets', error);

    const items = (data || []).map((row) => this.mapBudgetRow(row));
    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < (count ?? 0) : false,
    };
  }

  /**
   * 记录支出
   */
  async recordSpending(payload: SpendingCreateDTO): Promise<SpendingDTO> {
    const insertPayload = this.mapSpendingDtoToInsert(payload);
    const { data, error } = await this.client
      .from('spendings')
      .insert(insertPayload as any)
      .select('*')
      .single();
    if (error) this.handleError('recordSpending', error);
    return this.mapSpendingRow(data!);
  }

  /**
   * 查询支出记录
   */
  async listSpendings(
    filter: SpendingFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<SpendingDTO>> {
    let query = this.client
      .from('spendings')
      .select('*', { count: 'exact' })
      .eq('budget_id', filter.budgetId)
      .order('purchase_date', { ascending: false });

    if (filter.category) query = query.eq('category', filter.category);
    if (filter.range?.start) query = query.gte('purchase_date', filter.range.start.toISOString());
    if (filter.range?.end) query = query.lte('purchase_date', filter.range.end.toISOString());
    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) this.handleError('listSpendings', error);

    const items = (data || []).map((row) => this.mapSpendingRow(row));
    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < (count ?? 0) : false,
    };
  }

  /**
   * 聚合预算使用情况
   */
  async aggregateBudgetUsage(budgetId: string): Promise<{
    usedAmount: number;
    remainingAmount: number;
    usagePercentage: number;
  }> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) throw new Error(`Budget ${budgetId} not found`);

    const { data, error } = await this.client.from('spendings').select('amount').eq('budget_id', budgetId);
    if (error) this.handleError('aggregateBudgetUsage', error);

    const usedAmount = (data || []).reduce((sum, row) => sum + ((row as any).amount ?? 0), 0);
    const remainingAmount = Math.max(0, budget.totalAmount - usedAmount);
    const usagePercentage = budget.totalAmount > 0 ? (usedAmount / budget.totalAmount) * 100 : 0;

    return { usedAmount, remainingAmount, usagePercentage };
  }

  /**
   * 创建预算预警
   */
  async createBudgetAlert(alert: BudgetAlertDTO): Promise<void> {
    const alertInsert: BudgetAlertInsert = {
      budget_id: alert.budgetId,
      type: alert.type,
      threshold: alert.threshold,
      current_value: alert.currentValue,
      message: alert.message,
      category: alert.category ?? null,
      status: alert.status,
      created_at: alert.createdAt.toISOString(),
    };
    const { error } = await this.client.from('budget_alerts').insert(alertInsert as any);
    if (error) this.handleError('createBudgetAlert', error);
  }

  /**
   * 查询活跃预警
   */
  async listActiveAlerts(budgetId: string): Promise<BudgetAlertDTO[]> {
    const { data, error } = await this.client
      .from('budget_alerts')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });
    if (error) this.handleError('listActiveAlerts', error);
    return (data || []).map((row) => this.mapBudgetAlertRow(row));
  }

  /**
   * 获取预算状态快照
   *
   * 整合预算信息、使用率、预警、分类支出等
   */
  async getBudgetStatus(budgetId: string): Promise<BudgetStatusDTO> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) throw new Error(`Budget ${budgetId} not found`);

    const [usage, alerts, spendings] = await Promise.all([
      this.aggregateBudgetUsage(budgetId),
      this.listActiveAlerts(budgetId),
      this.client.from('spendings').select('*').eq('budget_id', budgetId),
    ]);

    if (spendings.error) this.handleError('getBudgetStatus:spendings', spendings.error);

    const totalDays = Math.ceil((budget.endDate.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(1, Math.ceil((Date.now() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24)));

    const dailyAverage = usage.usedAmount / elapsedDays;
    const projectedSpend = dailyAverage * totalDays;
    const categoryUsage = this.calculateCategoryUsage(budget, spendings.data || []);

    return {
      budget: {
        ...budget,
        usedAmount: usage.usedAmount,
        remainingAmount: usage.remainingAmount,
        usagePercentage: usage.usagePercentage,
      },
      dailyAverage,
      projectedSpend,
      daysRemaining: Math.max(0, totalDays - elapsedDays),
      alerts,
      categoryUsage,
    };
  }

  /**
   * 软删除预算
   */
  async softDeleteBudget(id: string): Promise<void> {
    const updatePayload: BudgetUpdate = {
      deleted_at: new Date().toISOString(),
      status: 'CANCELLED',
    };
    const { error } = await this.client
      .from('budgets')
      // @ts-ignore - Supabase types don't correctly infer budgets table update type
      .update(updatePayload)
      .eq('id', id);
    if (error) this.handleError('softDeleteBudget', error);
  }

  /**
   * 计算分类支出统计
   */
  private calculateCategoryUsage(budget: BudgetDTO, spendings: SpendingRow[]) {
    const usage: BudgetStatusDTO['categoryUsage'] = {};
    const categories = Object.keys(budget.categoryBudgets ?? {});

    for (const category of categories) {
      const categoryBudget = budget.categoryBudgets![category as keyof typeof budget.categoryBudgets] ?? 0;
      const categorySpent = spendings
        .filter((s) => s.category === category)
        .reduce((sum, row) => sum + (row.amount ?? 0), 0);
      usage[category as keyof typeof usage] = {
        budget: categoryBudget,
        used: categorySpent,
        remaining: Math.max(0, categoryBudget - categorySpent),
        percentage: categoryBudget > 0 ? (categorySpent / categoryBudget) * 100 : 0,
      };
    }

    return usage;
  }

  /**
   * 数据映射：BudgetCreateDTO → BudgetInsert
   */
  private mapBudgetDtoToInsert(dto: BudgetCreateDTO): BudgetInsert {
    return {
      member_id: dto.memberId,
      name: dto.name,
      period: dto.period,
      start_date: dto.startDate.toISOString(),
      end_date: dto.endDate.toISOString(),
      total_amount: dto.totalAmount,
      vegetable_budget: dto.categoryBudgets?.VEGETABLES ?? null,
      meat_budget: dto.categoryBudgets?.PROTEIN ?? null,
      fruit_budget: dto.categoryBudgets?.FRUITS ?? null,
      grain_budget: dto.categoryBudgets?.GRAINS ?? null,
      seafood_budget: dto.categoryBudgets?.SEAFOOD ?? null,
      dairy_budget: dto.categoryBudgets?.DAIRY ?? null,
      oils_budget: dto.categoryBudgets?.OILS ?? null,
      snacks_budget: dto.categoryBudgets?.SNACKS ?? null,
      beverages_budget: dto.categoryBudgets?.BEVERAGES ?? null,
      other_budget: dto.categoryBudgets?.OTHER ?? null,
      alert_threshold_80: dto.alertThreshold80,
      alert_threshold_100: dto.alertThreshold100,
      alert_threshold_110: dto.alertThreshold110,
    };
  }

  /**
   * 数据映射：BudgetUpdateDTO → BudgetUpdate
   */
  private mapBudgetDtoToUpdate(dto: BudgetUpdateDTO): BudgetUpdate {
    const update: BudgetUpdate = {};

    if (dto.memberId) update.member_id = dto.memberId;
    if (dto.name) update.name = dto.name;
    if (dto.period) update.period = dto.period;
    if (dto.startDate) update.start_date = dto.startDate.toISOString();
    if (dto.endDate) update.end_date = dto.endDate.toISOString();
    if (dto.totalAmount !== undefined) update.total_amount = dto.totalAmount;
    if (dto.status) update.status = dto.status;

    if (dto.categoryBudgets) {
      update.vegetable_budget = dto.categoryBudgets.VEGETABLES ?? null;
      update.meat_budget = dto.categoryBudgets.PROTEIN ?? null;
      update.fruit_budget = dto.categoryBudgets.FRUITS ?? null;
      update.grain_budget = dto.categoryBudgets.GRAINS ?? null;
      update.seafood_budget = dto.categoryBudgets.SEAFOOD ?? null;
      update.dairy_budget = dto.categoryBudgets.DAIRY ?? null;
      update.oils_budget = dto.categoryBudgets.OILS ?? null;
      update.snacks_budget = dto.categoryBudgets.SNACKS ?? null;
      update.beverages_budget = dto.categoryBudgets.BEVERAGES ?? null;
      update.other_budget = dto.categoryBudgets.OTHER ?? null;
    }

    if (dto.alertThreshold80 !== undefined) update.alert_threshold_80 = dto.alertThreshold80;
    if (dto.alertThreshold100 !== undefined) update.alert_threshold_100 = dto.alertThreshold100;
    if (dto.alertThreshold110 !== undefined) update.alert_threshold_110 = dto.alertThreshold110;

    return update;
  }

  /**
   * 数据映射：BudgetRow → BudgetDTO
   */
  private mapBudgetRow(row: BudgetRow): BudgetDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      name: row.name,
      period: row.period as BudgetDTO['period'],
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      totalAmount: row.total_amount,
      usedAmount: row.used_amount ?? 0,
      remainingAmount: row.remaining_amount ?? 0,
      usagePercentage: row.usage_percentage ?? 0,
      status: row.status as BudgetDTO['status'],
      alertThreshold80: row.alert_threshold_80 ?? true,
      alertThreshold100: row.alert_threshold_100 ?? true,
      alertThreshold110: row.alert_threshold_110 ?? true,
      createdAt: new Date(row.created_at),
      categoryBudgets: {
        VEGETABLES: row.vegetable_budget ?? 0,
        FRUITS: row.fruit_budget ?? 0,
        GRAINS: row.grain_budget ?? 0,
        PROTEIN: row.meat_budget ?? 0,
        SEAFOOD: row.seafood_budget ?? 0,
        DAIRY: row.dairy_budget ?? 0,
        OILS: row.oils_budget ?? 0,
        SNACKS: row.snacks_budget ?? 0,
        BEVERAGES: row.beverages_budget ?? 0,
        OTHER: row.other_budget ?? 0,
      },
    };
  }

  /**
   * 数据映射：SpendingCreateDTO → SpendingInsert
   */
  private mapSpendingDtoToInsert(dto: SpendingCreateDTO): SpendingInsert {
    return {
      budget_id: dto.budgetId,
      amount: dto.amount,
      category: dto.category,
      description: dto.description ?? null,
      transaction_id: dto.transactionId ?? null,
      platform: dto.platform ?? null,
      items: dto.items ?? null,
      purchase_date: (dto.purchaseDate ?? new Date()).toISOString(),
    };
  }

  /**
   * 数据映射：SpendingRow → SpendingDTO
   */
  private mapSpendingRow(row: SpendingRow): SpendingDTO {
    return {
      id: row.id,
      budgetId: row.budget_id,
      amount: row.amount ?? 0,
      category: row.category as SpendingDTO['category'],
      description: row.description ?? undefined,
      transactionId: row.transaction_id ?? undefined,
      platform: row.platform ?? undefined,
      items: (row.items as SpendingDTO['items']) ?? undefined,
      purchaseDate: new Date(row.purchase_date),
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 数据映射：BudgetAlertRow → BudgetAlertDTO
   */
  private mapBudgetAlertRow(row: BudgetAlertRow): BudgetAlertDTO {
    return {
      id: row.id,
      budgetId: row.budget_id,
      type: row.type as BudgetAlertDTO['type'],
      threshold: row.threshold,
      currentValue: row.current_value,
      message: row.message,
      category: (row.category as BudgetAlertDTO['category']) ?? undefined,
      status: row.status as BudgetAlertDTO['status'],
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? 'Unknown Supabase error';
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`BudgetRepository.${operation} failed: ${message}`);
  }
}
