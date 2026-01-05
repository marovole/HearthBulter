import { prisma } from "./database-optimization";
import { logger } from "@/lib/logging/structured-logger";
import { securityAudit } from "@/lib/security/security-audit";

// 索引类型
export enum IndexType {
  BTREE = "btree",
  HASH = "hash",
  GIST = "gist",
  GIN = "gin",
  BRIN = "brin",
}

// 索引配置
interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  type: IndexType;
  unique?: boolean;
  partial?: string; // WHERE条件
  include?: string[]; // 覆盖索引
  description?: string;
  priority: "high" | "medium" | "low";
}

// 索引统计
interface IndexStats {
  name: string;
  table: string;
  size: number;
  tuples: number;
  scans: number;
  tuplesRead: number;
  lastUsed?: Date;
  usage: number; // 使用率 (0-100)
  efficiency: "high" | "medium" | "low";
}

// 查询分析结果
interface QueryAnalysis {
  query: string;
  recommendedIndexes: IndexDefinition[];
  missingIndexes: string[];
  existingIndexesUsed: string[];
  estimatedCost: number;
  optimizationScore: number; // 0-100
}

/**
 * 数据库索引优化器
 */
export class IndexOptimizer {
  private static instance: IndexOptimizer;
  private indexDefinitions: Map<string, IndexDefinition> = new Map();
  private indexStats: Map<string, IndexStats> = new Map();

  private constructor() {
    this.loadIndexDefinitions();
    this.startPeriodicAnalysis();
  }

  static getInstance(): IndexOptimizer {
    if (!IndexOptimizer.instance) {
      IndexOptimizer.instance = new IndexOptimizer();
    }
    return IndexOptimizer.instance;
  }

  /**
   * 加载索引定义
   */
  private loadIndexDefinitions(): void {
    // 定义关键索引
    const indexes: IndexDefinition[] = [
      // 用户表索引
      {
        name: "idx_users_email",
        table: "users",
        columns: ["email"],
        type: IndexType.BTREE,
        unique: true,
        description: "用户邮箱唯一索引",
        priority: "high",
      },
      {
        name: "idx_users_created_at",
        table: "users",
        columns: ["createdAt"],
        type: IndexType.BTREE,
        description: "用户创建时间索引",
        priority: "medium",
      },
      {
        name: "idx_users_status",
        table: "users",
        columns: ["status"],
        type: IndexType.BTREE,
        description: "用户状态索引",
        priority: "medium",
      },
      {
        name: "idx_users_composite",
        table: "users",
        columns: ["status", "createdAt"],
        type: IndexType.BTREE,
        description: "用户状态和创建时间复合索引",
        priority: "medium",
      },

      // 食物表索引
      {
        name: "idx_foods_name",
        table: "foods",
        columns: ["name"],
        type: IndexType.BTREE,
        description: "食物名称索引",
        priority: "high",
      },
      {
        name: "idx_foods_name_en",
        table: "foods",
        columns: ["nameEn"],
        type: IndexType.BTREE,
        description: "食物英文名称索引",
        priority: "high",
      },
      {
        name: "idx_foods_category",
        table: "foods",
        columns: ["category"],
        type: IndexType.BTREE,
        description: "食物分类索引",
        priority: "medium",
      },
      {
        name: "idx_foods_search",
        table: "foods",
        columns: ["name", "nameEn", "category"],
        type: IndexType.GIN,
        description: "食物搜索全文索引",
        priority: "high",
      },
      {
        name: "idx_foods_calories",
        table: "foods",
        columns: ["calories"],
        type: IndexType.BTREE,
        description: "食物卡路里索引",
        priority: "medium",
      },
      {
        name: "idx_foods_composite_search",
        table: "foods",
        columns: ["category", "calories"],
        type: IndexType.BTREE,
        description: "食物分类和卡路里复合索引",
        priority: "medium",
      },

      // 用户饮食记录索引
      {
        name: "idx_user_meals_user_date",
        table: "userMeals",
        columns: ["userId", "mealDate"],
        type: IndexType.BTREE,
        description: "用户饮食记录的用户ID和日期复合索引",
        priority: "high",
      },
      {
        name: "idx_user_meals_meal_type",
        table: "userMeals",
        columns: ["mealType"],
        type: IndexType.BTREE,
        description: "饮食记录类型索引",
        priority: "medium",
      },
      {
        name: "idx_user_meals_composite",
        table: "userMeals",
        columns: ["userId", "mealDate", "mealType"],
        type: IndexType.BTREE,
        description: "用户饮食记录复合索引",
        priority: "high",
      },

      // 营养目标索引
      {
        name: "idx_nutrition_goals_user",
        table: "nutritionGoals",
        columns: ["userId"],
        type: IndexType.BTREE,
        description: "营养目标用户索引",
        priority: "high",
      },
      {
        name: "idx_nutrition_goals_date",
        table: "nutritionGoals",
        columns: ["startDate", "endDate"],
        type: IndexType.BTREE,
        description: "营养目标日期索引",
        priority: "medium",
      },
    ];

    indexes.forEach((index) => {
      this.indexDefinitions.set(index.name, index);
    });

    logger.info("索引定义已加载", {
      type: "database",
      component: "index_optimizer",
      totalIndexes: indexes.length,
    });
  }

  /**
   * 启动定期分析
   */
  private startPeriodicAnalysis(): void {
    // 每小时分析一次索引使用情况
    setInterval(
      async () => {
        await this.analyzeIndexUsage();
      },
      60 * 60 * 1000,
    );

    // 每天检查一次索引建议
    setInterval(
      async () => {
        await this.checkIndexRecommendations();
      },
      24 * 60 * 60 * 1000,
    );
  }

  /**
   * 分析索引使用情况
   */
  private async analyzeIndexUsage(): Promise<void> {
    try {
      const query = `
        SELECT
          schemaname,
          tablename,
          indexname,
          num_tuples as tuples,
          size,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
      `;

      const results = await prisma.$queryRawUnsafe<any[]>(query);

      for (const result of results) {
        const stats: IndexStats = {
          name: result.indexname,
          table: result.tablename,
          size: result.size,
          tuples: result.tuples,
          scans: result.scans || 0,
          tuplesRead: result.tuples_read || 0,
          usage: 0,
          efficiency: this.calculateEfficiency(result),
        };

        // 计算使用率
        if (stats.tuples > 0) {
          stats.usage = Math.min(100, (stats.scans / stats.tuples) * 100);
        }

        this.indexStats.set(stats.name, stats);
      }

      logger.debug("索引使用情况分析完成", {
        type: "database",
        component: "index_optimizer",
        analyzedIndexes: results.length,
      });
    } catch (error) {
      logger.error("索引使用情况分析失败", error as Error, {
        type: "database",
        component: "index_optimizer",
      });
    }
  }

  /**
   * 计算索引效率
   */
  private calculateEfficiency(indexStats: any): "high" | "medium" | "low" {
    const scans = indexStats.idx_scan || 0;
    const tuplesRead = indexStats.idx_tup_read || 0;
    const tuplesFetched = indexStats.idx_tup_fetch || 0;

    if (scans === 0) return "low";

    const efficiency = tuplesFetched > 0 ? tuplesRead / tuplesFetched : 0;

    if (efficiency < 0.1) return "high"; // 读取的数据很少，效率高
    if (efficiency < 0.5) return "medium"; // 中等效率
    return "low"; // 读取了大量数据，效率低
  }

  /**
   * 检查索引建议
   */
  private async checkIndexRecommendations(): Promise<void> {
    try {
      // 查找未使用的索引
      const unusedIndexes = Array.from(this.indexStats.values()).filter(
        (stats) => stats.scans === 0 && stats.efficiency === "low",
      );

      if (unusedIndexes.length > 0) {
        logger.info("发现未使用的索引", {
          type: "database",
          component: "index_optimizer",
          unusedIndexes: unusedIndexes.map((idx) => idx.name),
        });

        securityAudit.logSuspiciousActivity(
          "数据库索引优化建议",
          `发现 ${unusedIndexes.length} 个未使用的索引，建议删除以提升性能`,
          "low",
          {
            unusedIndexes: unusedIndexes.map((idx) => ({
              name: idx.name,
              table: idx.table,
              size: idx.size,
            })),
          },
        );
      }

      // 查找低效索引
      const inefficientIndexes = Array.from(this.indexStats.values()).filter(
        (stats) => stats.efficiency === "low" && stats.scans > 0,
      );

      if (inefficientIndexes.length > 0) {
        logger.info("发现低效索引", {
          type: "database",
          component: "index_optimizer",
          inefficientIndexes: inefficientIndexes.map((idx) => idx.name),
        });
      }
    } catch (error) {
      logger.error("索引建议检查失败", error as Error, {
        type: "database",
        component: "index_optimizer",
      });
    }
  }

  /**
   * 创建索引
   */
  async createIndex(indexDefinition: IndexDefinition): Promise<void> {
    try {
      const { name, table, columns, type, unique, partial, include } =
        indexDefinition;

      let sql = `CREATE ${unique ? "UNIQUE " : ""}INDEX "${name}" ON "${table}" `;

      // 添加索引类型
      switch (type) {
        case IndexType.BTREE:
          sql += "USING btree ";
          break;
        case IndexType.HASH:
          sql += "USING hash ";
          break;
        case IndexType.GIST:
          sql += "USING gist ";
          break;
        case IndexType.GIN:
          sql += "USING gin ";
          break;
        case IndexType.BRIN:
          sql += "USING brin ";
          break;
      }

      // 添加列
      if (type === IndexType.GIN) {
        // GIN索引用于全文搜索
        sql += `((to_tsvector('english', ${columns.map((col) => `"${col}"`).join(" || ")})))`;
      } else {
        sql += `(${columns.map((col) => `"${col}"`).join(", ")})`;
      }

      // 添加包含列（覆盖索引）
      if (include && include.length > 0) {
        sql += ` INCLUDE (${include.map((col) => `"${col}"`).join(", ")})`;
      }

      // 添加部分索引条件
      if (partial) {
        sql += ` WHERE ${partial}`;
      }

      await prisma.$executeRawUnsafe(sql);

      // 更新索引定义
      this.indexDefinitions.set(name, indexDefinition);

      logger.info("索引创建成功", {
        type: "database",
        component: "index_optimizer",
        index: name,
        table,
        columns,
        type,
        sql,
      });
    } catch (error) {
      logger.error("索引创建失败", error as Error, {
        type: "database",
        component: "index_optimizer",
        index: indexDefinition.name,
      });

      throw error;
    }
  }

  /**
   * 删除索引
   */
  async dropIndex(indexName: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${indexName}"`);

      this.indexDefinitions.delete(indexName);
      this.indexStats.delete(indexName);

      logger.info("索引删除成功", {
        type: "database",
        component: "index_optimizer",
        index: indexName,
      });
    } catch (error) {
      logger.error("索引删除失败", error as Error, {
        type: "database",
        component: "index_optimizer",
        index: indexName,
      });

      throw error;
    }
  }

  /**
   * 重建索引
   */
  async rebuildIndex(indexName: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`REINDEX INDEX "${indexName}"`);

      logger.info("索引重建成功", {
        type: "database",
        component: "index_optimizer",
        index: indexName,
      });
    } catch (error) {
      logger.error("索引重建失败", error as Error, {
        type: "database",
        component: "index_optimizer",
        index: indexName,
      });

      throw error;
    }
  }

  /**
   * 分析查询并推荐索引
   */
  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    try {
      // 使用EXPLAIN ANALYZE分析查询
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await prisma.$queryRawUnsafe<any[]>(explainQuery);

      const plan = result[0]["QUERY PLAN"][0];
      const executionPlan = plan.Plan;

      // 分析执行计划并推荐索引
      const recommendedIndexes =
        this.generateIndexRecommendations(executionPlan);
      const existingIndexesUsed = this.extractUsedIndexes(executionPlan);
      const missingIndexes = this.findMissingIndexes(executionPlan);

      const analysis: QueryAnalysis = {
        query,
        recommendedIndexes,
        missingIndexes,
        existingIndexesUsed,
        estimatedCost: plan["Execution Time"] || 0,
        optimizationScore: this.calculateOptimizationScore(plan),
      };

      logger.debug("查询分析完成", {
        type: "database",
        component: "index_optimizer",
        queryHash: this.hashQuery(query),
        cost: analysis.estimatedCost,
        score: analysis.optimizationScore,
        recommendations: recommendedIndexes.length,
      });

      return analysis;
    } catch (error) {
      logger.error("查询分析失败", error as Error, {
        type: "database",
        component: "index_optimizer",
        query: query.substring(0, 100),
      });

      throw error;
    }
  }

  /**
   * 生成索引推荐
   */
  private generateIndexRecommendations(plan: any): IndexDefinition[] {
    const recommendations: IndexDefinition[] = [];

    // 分析顺序扫描
    if (plan["Node Type"] === "Seq Scan") {
      const relation = plan["Relation Name"];
      recommendations.push({
        name: `idx_${relation}_auto_${Date.now()}`,
        table: relation,
        columns: ["id"], // 默认推荐ID索引
        type: IndexType.BTREE,
        description: `自动生成的索引建议 - 避免${relation}表的顺序扫描`,
        priority: "high",
      });
    }

    // 分析嵌套循环连接
    if (plan["Node Type"] === "Nested Loop") {
      // 分析连接条件并推荐复合索引
      // 这里可以实现更复杂的逻辑
    }

    return recommendations;
  }

  /**
   * 提取已使用的索引
   */
  private extractUsedIndexes(plan: any): string[] {
    const indexes: string[] = [];

    if (
      plan["Node Type"] === "Index Scan" ||
      plan["Node Type"] === "Index Only Scan"
    ) {
      indexes.push(plan["Index Name"]);
    }

    // 递归检查子计划
    if (plan.Plans) {
      for (const subPlan of plan.Plans) {
        indexes.push(...this.extractUsedIndexes(subPlan));
      }
    }

    return indexes;
  }

  /**
   * 查找缺失的索引
   */
  private findMissingIndexes(plan: any): string[] {
    // 实现缺失索引检测逻辑
    return [];
  }

  /**
   * 计算优化分数
   */
  private calculateOptimizationScore(plan: any): number {
    let score = 100;

    // 根据执行时间扣分
    const executionTime = plan["Execution Time"] || 0;
    if (executionTime > 1000) score -= 30;
    else if (executionTime > 500) score -= 15;
    else if (executionTime > 100) score -= 5;

    // 根据计划类型扣分
    if (plan["Node Type"] === "Seq Scan") score -= 20;
    if (plan["Node Type"] === "Nested Loop") score -= 10;

    return Math.max(0, score);
  }

  /**
   * 哈希查询
   */
  private hashQuery(query: string): string {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(query).digest("hex").substring(0, 8);
  }

  /**
   * 获取索引统计
   */
  getIndexStats(): IndexStats[] {
    return Array.from(this.indexStats.values());
  }

  /**
   * 获取索引定义
   */
  getIndexDefinitions(): IndexDefinition[] {
    return Array.from(this.indexDefinitions.values());
  }

  /**
   * 获取优化建议
   */
  async getOptimizationRecommendations(): Promise<{
    unusedIndexes: IndexStats[];
    inefficientIndexes: IndexStats[];
    missingIndexes: IndexDefinition[];
  }> {
    await this.analyzeIndexUsage();

    const unusedIndexes = Array.from(this.indexStats.values()).filter(
      (stats) => stats.scans === 0 && stats.efficiency === "low",
    );

    const inefficientIndexes = Array.from(this.indexStats.values()).filter(
      (stats) => stats.efficiency === "low" && stats.scans > 0,
    );

    // 这里可以实现缺失索引检测
    const missingIndexes: IndexDefinition[] = [];

    return {
      unusedIndexes,
      inefficientIndexes,
      missingIndexes,
    };
  }
}

// 创建单例实例
export const indexOptimizer = IndexOptimizer.getInstance();

export default indexOptimizer;
