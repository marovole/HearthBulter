import { NeonClientManager, keysToCamelCase, keysToSnakeCase, toSnakeCase } from "./neon-client";

type WhereClause = Record<string, unknown>;
type OrderByClause = Record<string, "asc" | "desc">;

interface FindManyArgs {
  where?: WhereClause;
  orderBy?: OrderByClause | OrderByClause[];
  take?: number;
  skip?: number;
  select?: Record<string, boolean>;
  include?: Record<string, boolean | object>;
}

interface FindUniqueArgs {
  where: WhereClause;
  select?: Record<string, boolean>;
  include?: Record<string, boolean | object>;
}

interface CreateArgs {
  data: Record<string, unknown>;
  select?: Record<string, boolean>;
  include?: Record<string, boolean | object>;
}

interface UpdateArgs {
  where: WhereClause;
  data: Record<string, unknown>;
  select?: Record<string, boolean>;
  include?: Record<string, boolean | object>;
}

interface DeleteArgs {
  where: WhereClause;
}

interface CountArgs {
  where?: WhereClause;
}

function buildWhereClause(
  where: WhereClause | undefined,
  startIndex: number = 1
): { sql: string; params: unknown[]; nextIndex: number } {
  if (!where || Object.keys(where).length === 0) {
    return { sql: "", params: [], nextIndex: startIndex };
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startIndex;

  for (const [key, value] of Object.entries(where)) {
    const snakeKey = toSnakeCase(key);

    if (value === null) {
      conditions.push(`${snakeKey} IS NULL`);
    } else if (value === undefined) {
      continue;
    } else if (typeof value === "object" && value !== null) {
      const op = value as Record<string, unknown>;
      if ("equals" in op) {
        conditions.push(`${snakeKey} = $${paramIndex}`);
        params.push(op.equals);
        paramIndex++;
      } else if ("not" in op) {
        conditions.push(`${snakeKey} != $${paramIndex}`);
        params.push(op.not);
        paramIndex++;
      } else if ("in" in op && Array.isArray(op.in)) {
        const placeholders = op.in.map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`${snakeKey} IN (${placeholders})`);
        params.push(...(op.in as unknown[]));
      } else if ("notIn" in op && Array.isArray(op.notIn)) {
        const placeholders = (op.notIn as unknown[]).map(() => `$${paramIndex++}`).join(", ");
        conditions.push(`${snakeKey} NOT IN (${placeholders})`);
        params.push(...(op.notIn as unknown[]));
      } else if ("contains" in op) {
        conditions.push(`${snakeKey} ILIKE $${paramIndex}`);
        params.push(`%${op.contains}%`);
        paramIndex++;
      } else if ("startsWith" in op) {
        conditions.push(`${snakeKey} ILIKE $${paramIndex}`);
        params.push(`${op.startsWith}%`);
        paramIndex++;
      } else if ("endsWith" in op) {
        conditions.push(`${snakeKey} ILIKE $${paramIndex}`);
        params.push(`%${op.endsWith}`);
        paramIndex++;
      } else if ("gt" in op) {
        conditions.push(`${snakeKey} > $${paramIndex}`);
        params.push(op.gt);
        paramIndex++;
      } else if ("gte" in op) {
        conditions.push(`${snakeKey} >= $${paramIndex}`);
        params.push(op.gte);
        paramIndex++;
      } else if ("lt" in op) {
        conditions.push(`${snakeKey} < $${paramIndex}`);
        params.push(op.lt);
        paramIndex++;
      } else if ("lte" in op) {
        conditions.push(`${snakeKey} <= $${paramIndex}`);
        params.push(op.lte);
        paramIndex++;
      } else {
        conditions.push(`${snakeKey} = $${paramIndex}`);
        params.push(JSON.stringify(value));
        paramIndex++;
      }
    } else {
      conditions.push(`${snakeKey} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    nextIndex: paramIndex,
  };
}

function buildOrderByClause(orderBy: OrderByClause | OrderByClause[] | undefined): string {
  if (!orderBy) return "";

  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const clauses = orders
    .map((order) => {
      const entry = Object.entries(order)[0];
      if (!entry) return "";
      const [key, direction] = entry;
      return `${toSnakeCase(key)} ${direction.toUpperCase()}`;
    })
    .filter(Boolean);

  return clauses.length > 0 ? `ORDER BY ${clauses.join(", ")}` : "";
}

class NeonModelAdapter {
  constructor(private tableName: string) {}

  async findUnique<T>(args: FindUniqueArgs): Promise<T | null> {
    const { sql: whereClause, params } = buildWhereClause(args.where);
    const query = `SELECT * FROM ${this.tableName} ${whereClause} LIMIT 1`;

    const results = await NeonClientManager.query<T>(query, params);
    return results.length > 0 ? keysToCamelCase<T>(results[0]) : null;
  }

  async findFirst<T>(args?: FindManyArgs): Promise<T | null> {
    const { sql: whereClause, params, nextIndex } = buildWhereClause(args?.where);
    const orderByClause = buildOrderByClause(args?.orderBy);

    let query = `SELECT * FROM ${this.tableName} ${whereClause} ${orderByClause}`;

    if (args?.skip) {
      query += ` OFFSET $${nextIndex}`;
      params.push(args.skip);
    }

    query += " LIMIT 1";

    const results = await NeonClientManager.query<T>(query, params);
    return results.length > 0 ? keysToCamelCase<T>(results[0]) : null;
  }

  async findMany<T>(args?: FindManyArgs): Promise<T[]> {
    const { sql: whereClause, params, nextIndex } = buildWhereClause(args?.where);
    const orderByClause = buildOrderByClause(args?.orderBy);

    let query = `SELECT * FROM ${this.tableName} ${whereClause} ${orderByClause}`;
    let currentIndex = nextIndex;

    if (args?.take) {
      query += ` LIMIT $${currentIndex}`;
      params.push(args.take);
      currentIndex++;
    }

    if (args?.skip) {
      query += ` OFFSET $${currentIndex}`;
      params.push(args.skip);
    }

    const results = await NeonClientManager.query<T>(query, params);
    return keysToCamelCase<T[]>(results);
  }

  async create<T>(args: CreateArgs): Promise<T> {
    const snakeData = keysToSnakeCase<Record<string, unknown>>(args.data);
    const keys = Object.keys(snakeData);
    const values = Object.values(snakeData);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const query = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`;

    const results = await NeonClientManager.query<T>(query, values);
    return keysToCamelCase<T>(results[0]);
  }

  async createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }> {
    if (args.data.length === 0) return { count: 0 };

    const snakeDataArray = args.data.map((d) => keysToSnakeCase<Record<string, unknown>>(d));
    const firstRow = snakeDataArray[0];
    if (!firstRow) return { count: 0 };
    const keys = Object.keys(firstRow);
    const allValues: unknown[] = [];
    const valueRows: string[] = [];

    let paramIndex = 1;
    for (const row of snakeDataArray) {
      const placeholders = keys.map(() => `$${paramIndex++}`).join(", ");
      valueRows.push(`(${placeholders})`);
      allValues.push(...Object.values(row));
    }

    const query = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES ${valueRows.join(", ")}`;

    await NeonClientManager.query(query, allValues);
    return { count: args.data.length };
  }

  async update<T>(args: UpdateArgs): Promise<T> {
    const snakeData = keysToSnakeCase<Record<string, unknown>>(args.data);
    const keys = Object.keys(snakeData);
    const values = Object.values(snakeData);

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const { sql: whereClause, params: whereParams } = buildWhereClause(args.where, keys.length + 1);

    const query = `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() ${whereClause} RETURNING *`;

    const results = await NeonClientManager.query<T>(query, [...values, ...whereParams]);
    return keysToCamelCase<T>(results[0]);
  }

  async updateMany(args: {
    where?: WhereClause;
    data: Record<string, unknown>;
  }): Promise<{ count: number }> {
    const snakeData = keysToSnakeCase<Record<string, unknown>>(args.data);
    const keys = Object.keys(snakeData);
    const values = Object.values(snakeData);

    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const { sql: whereClause, params: whereParams } = buildWhereClause(args.where, keys.length + 1);

    const query = `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() ${whereClause}`;

    await NeonClientManager.query(query, [...values, ...whereParams]);
    return { count: 1 };
  }

  async delete<T>(args: DeleteArgs): Promise<T> {
    const { sql: whereClause, params } = buildWhereClause(args.where);
    const query = `DELETE FROM ${this.tableName} ${whereClause} RETURNING *`;

    const results = await NeonClientManager.query<T>(query, params);
    return keysToCamelCase<T>(results[0]);
  }

  async deleteMany(args?: { where?: WhereClause }): Promise<{ count: number }> {
    const { sql: whereClause, params } = buildWhereClause(args?.where);
    const query = `DELETE FROM ${this.tableName} ${whereClause}`;

    await NeonClientManager.query(query, params);
    return { count: 1 };
  }

  async count(args?: CountArgs): Promise<number> {
    const { sql: whereClause, params } = buildWhereClause(args?.where);
    const query = `SELECT COUNT(*)::int as count FROM ${this.tableName} ${whereClause}`;

    const results = await NeonClientManager.query<{ count: number }>(query, params);
    return results[0]?.count ?? 0;
  }

  async upsert<T>(args: {
    where: WhereClause;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<T> {
    const existing = await this.findUnique<T>({ where: args.where });
    if (existing) {
      return this.update<T>({ where: args.where, data: args.update });
    }
    return this.create<T>({ data: args.create });
  }
}

export class NeonAdapter {
  user = new NeonModelAdapter("users");
  family = new NeonModelAdapter("families");
  familyMember = new NeonModelAdapter("family_members");
  familyInvitation = new NeonModelAdapter("family_invitations");
  healthGoal = new NeonModelAdapter("health_goals");
  allergy = new NeonModelAdapter("allergies");
  dietaryPreference = new NeonModelAdapter("dietary_preferences");
  healthData = new NeonModelAdapter("health_data");
  healthReminder = new NeonModelAdapter("health_reminders");
  mealPlan = new NeonModelAdapter("meal_plans");
  medicalReport = new NeonModelAdapter("medical_reports");
  medicalIndicator = new NeonModelAdapter("medical_indicators");
  mealLog = new NeonModelAdapter("meal_logs");
  mealLogFood = new NeonModelAdapter("meal_log_foods");
  foodPhoto = new NeonModelAdapter("food_photos");
  trackingStreak = new NeonModelAdapter("tracking_streaks");
  quickTemplate = new NeonModelAdapter("quick_templates");
  templateFood = new NeonModelAdapter("template_foods");
  dailyNutritionTarget = new NeonModelAdapter("daily_nutrition_targets");
  auxiliaryTracking = new NeonModelAdapter("auxiliary_trackings");
  healthReport = new NeonModelAdapter("health_reports");
  healthScore = new NeonModelAdapter("health_scores");
  trendData = new NeonModelAdapter("trend_data");
  healthAnomaly = new NeonModelAdapter("health_anomalies");
  aiAdvice = new NeonModelAdapter("ai_advices");
  aiConversation = new NeonModelAdapter("ai_conversations");
  promptTemplate = new NeonModelAdapter("prompt_templates");
  userConsent = new NeonModelAdapter("user_consents");
  budget = new NeonModelAdapter("budgets");
  spending = new NeonModelAdapter("spendings");
  priceHistory = new NeonModelAdapter("price_histories");
  savingsRecommendation = new NeonModelAdapter("savings_recommendations");
  budgetAlert = new NeonModelAdapter("budget_alerts");
  platformAccount = new NeonModelAdapter("platform_accounts");
  order = new NeonModelAdapter("orders");
  platformProduct = new NeonModelAdapter("platform_products");
  userPreference = new NeonModelAdapter("user_preferences");
  food = new NeonModelAdapter("foods");
  meal = new NeonModelAdapter("meals");
  mealIngredient = new NeonModelAdapter("meal_ingredients");
  shoppingList = new NeonModelAdapter("shopping_lists");
  shoppingListShare = new NeonModelAdapter("shopping_list_shares");
  shoppingItem = new NeonModelAdapter("shopping_items");
  recipe = new NeonModelAdapter("recipes");
  recipeIngredient = new NeonModelAdapter("recipe_ingredients");
  recipeInstruction = new NeonModelAdapter("recipe_instructions");
  recipeRating = new NeonModelAdapter("recipe_ratings");
  recipeFavorite = new NeonModelAdapter("recipe_favorites");
  recipeView = new NeonModelAdapter("recipe_views");
  ingredientSubstitution = new NeonModelAdapter("ingredient_substitutions");
  task = new NeonModelAdapter("tasks");
  activity = new NeonModelAdapter("activities");
  comment = new NeonModelAdapter("comments");
  familyGoal = new NeonModelAdapter("family_goals");
  sharedContent = new NeonModelAdapter("shared_contents");
  shareTracking = new NeonModelAdapter("share_tracking");
  achievement = new NeonModelAdapter("achievements");
  leaderboardEntry = new NeonModelAdapter("leaderboard_entries");
  communityPost = new NeonModelAdapter("community_posts");
  communityComment = new NeonModelAdapter("community_comments");
  notification = new NeonModelAdapter("notifications");
  notificationPreference = new NeonModelAdapter("notification_preferences");
  notificationTemplate = new NeonModelAdapter("notification_templates");
  notificationLog = new NeonModelAdapter("notification_logs");
  inventoryItem = new NeonModelAdapter("inventory_items");
  inventoryUsage = new NeonModelAdapter("inventory_usages");
  wasteLog = new NeonModelAdapter("waste_logs");
  deviceConnection = new NeonModelAdapter("device_connections");

  async $queryRaw<T>(query: string, params?: unknown[]): Promise<T[]> {
    return NeonClientManager.query<T>(query, params);
  }

  async $executeRaw(query: string, params?: unknown[]): Promise<number> {
    await NeonClientManager.query(query, params);
    return 1;
  }

  async $connect(): Promise<void> {
    const sql = NeonClientManager.getInstance();
    await sql`SELECT 1`;
  }

  async $disconnect(): Promise<void> {}
}

export const neonAdapter = new NeonAdapter();
export const prisma = neonAdapter;
export const db = neonAdapter;

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await neonAdapter.$connect();
    console.log("✅ Neon 数据库连接成功");
    return true;
  } catch (error) {
    console.error("❌ Neon 数据库连接失败:", error);
    return false;
  }
}

export async function ensureDatabaseConnection(): Promise<void> {
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    throw new Error("Failed to connect to Neon database");
  }
}

export { NeonClientManager as SupabaseClientManager };
