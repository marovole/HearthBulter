/**
 * Neon Adapter Mock for Testing
 *
 * Mocks src/lib/db/neon-adapter.ts exports
 * Provides the same API structure as production code
 */

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

export const mockPrisma = {
  user: createMockMethods(),
  family: createMockMethods(),
  familyMember: createMockMethods(),
  familyInvitation: createMockMethods(),

  healthData: createMockMethods(),
  healthGoal: createMockMethods(),
  healthReport: createMockMethods(),
  healthScore: createMockMethods(),
  healthAnomaly: createMockMethods(),
  medicalReport: createMockMethods(),

  deviceConnection: createMockMethods(),

  notification: createMockMethods(),
  notificationPreference: createMockMethods(),
  notificationLog: createMockMethods(),

  sharedContent: createMockMethods(),
  achievement: createMockMethods(),
  leaderboardEntry: createMockMethods(),

  inventoryItem: createMockMethods(),
  inventoryUsage: createMockMethods(),

  recipe: createMockMethods(),
  meal: createMockMethods(),
  mealPlan: createMockMethods(),
  mealLog: createMockMethods(),
  food: createMockMethods(),

  shoppingList: createMockMethods(),
  shoppingItem: createMockMethods(),
  budget: createMockMethods(),

  aiConversation: createMockMethods(),
  aiAdvice: createMockMethods(),

  $transaction: jest.fn((callback) => {
    if (typeof callback === "function") {
      return callback(mockPrisma);
    }
    return Promise.all(callback);
  }),

  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

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
