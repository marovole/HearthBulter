/**
 * Supabase Adapter Mock for Testing
 *
 * 模拟 src/lib/db/supabase-adapter.ts 导出的 supabaseAdapter
 * 提供与生产代码相同的 API 结构
 */

// 创建可复用的 mock 方法生成器
const createMockMethods = () => ({
  findUnique: jest.fn().mockResolvedValue(null),
  findFirst: jest.fn().mockResolvedValue(null),
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  upsert: jest.fn().mockResolvedValue({}),
  count: jest.fn().mockResolvedValue(0),
  groupBy: jest.fn().mockResolvedValue([]),
  aggregate: jest.fn().mockResolvedValue({}),
});

// 导出所有数据库表的 mock
export const mockPrisma = {
  // 用户相关
  user: createMockMethods(),
  family: createMockMethods(),
  familyMember: createMockMethods(),
  familyInvitation: createMockMethods(),

  // 健康数据相关
  healthData: createMockMethods(),
  healthGoal: createMockMethods(),
  healthReport: createMockMethods(),
  healthScore: createMockMethods(),
  healthAnomaly: createMockMethods(),

  // 设备相关
  deviceConnection: createMockMethods(),

  // 通知相关
  notification: createMockMethods(),
  notificationPreference: createMockMethods(),
  notificationLog: createMockMethods(),

  // 社交相关
  sharedContent: createMockMethods(),
  achievement: createMockMethods(),
  leaderboardEntry: createMockMethods(),

  // 库存相关
  inventoryItem: createMockMethods(),
  inventoryUsage: createMockMethods(),

  // 食谱相关
  recipe: createMockMethods(),
  meal: createMockMethods(),
  mealPlan: createMockMethods(),
  food: createMockMethods(),

  // 购物相关
  shoppingList: createMockMethods(),
  shoppingItem: createMockMethods(),
  budget: createMockMethods(),

  // AI 相关
  aiConversation: createMockMethods(),
  aiAdvice: createMockMethods(),

  // 事务支持
  $transaction: jest.fn((callback) => {
    if (typeof callback === "function") {
      return callback(mockPrisma);
    }
    return Promise.all(callback);
  }),

  // 连接管理
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

// 重置所有 mock 的辅助函数
export const resetAllMocks = () => {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === "function" && "mockClear" in method) {
          (method as jest.Mock).mockClear();
        }
      });
    }
  });
};

export default mockPrisma;
