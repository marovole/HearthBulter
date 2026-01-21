import React from "react";
import "@testing-library/jest-dom";
import { URL, URLSearchParams } from "url";

// Enhanced URL and URLSearchParams polyfills for Jest environment
try {
  // Set up URL constructor if not available or not properly configured
  if (typeof global.URL === "undefined" || !(global.URL as any).prototype) {
    global.URL = URL as any;
    console.debug("✅ URL polyfill applied from Node.js url module");
  }

  // Set up URLSearchParams if not available
  if (typeof global.URLSearchParams === "undefined") {
    global.URLSearchParams = URLSearchParams as any;
    console.debug("✅ URLSearchParams polyfill applied from Node.js url module");
  }

  // Verify URL constructor works correctly
  const testUrl = new global.URL("http://localhost:3000/test");
  if (!testUrl || typeof testUrl.searchParams !== "object") {
    throw new Error("URL constructor verification failed");
  }

  console.debug("✅ URL polyfills verified and working correctly");
} catch (error) {
  console.error("❌ URL polyfill setup failed:", error);
  // Fallback to basic mock if polyfill fails
  global.URL = URL as any;
  global.URLSearchParams = URLSearchParams as any;
}

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/dashboard";
  },
}));

// Mock Recharts
jest.mock("recharts", () => ({
  ResponsiveContainer: function ResponsiveContainer({ children }: { children: React.ReactNode }) {
    return React.createElement("div", { "data-testid": "responsive-container" }, children);
  },
  LineChart: function LineChart({ children }: { children: React.ReactNode }) {
    return React.createElement("div", { "data-testid": "line-chart" }, children);
  },
  Line: function Line() {
    return React.createElement("div", { "data-testid": "line" });
  },
  XAxis: function XAxis() {
    return React.createElement("div", { "data-testid": "x-axis" });
  },
  YAxis: function YAxis() {
    return React.createElement("div", { "data-testid": "y-axis" });
  },
  CartesianGrid: function CartesianGrid() {
    return React.createElement("div", { "data-testid": "cartesian-grid" });
  },
  Tooltip: function Tooltip() {
    return React.createElement("div", { "data-testid": "tooltip" });
  },
  Legend: function Legend() {
    return React.createElement("div", { "data-testid": "legend" });
  },
  AreaChart: function AreaChart({ children }: { children: React.ReactNode }) {
    return React.createElement("div", { "data-testid": "area-chart" }, children);
  },
  Area: function Area() {
    return React.createElement("div", { "data-testid": "area" });
  },
  ReferenceLine: function ReferenceLine() {
    return React.createElement("div", { "data-testid": "reference-line" });
  },
  PieChart: function PieChart({ children }: { children: React.ReactNode }) {
    return React.createElement("div", { "data-testid": "pie-chart" }, children);
  },
  Pie: function Pie() {
    return React.createElement("div", { "data-testid": "pie" });
  },
  Cell: function Cell() {
    return React.createElement("div", { "data-testid": "cell" });
  },
  BarChart: function BarChart({ children }: { children: React.ReactNode }) {
    return React.createElement("div", { "data-testid": "bar-chart" }, children);
  },
  Bar: function Bar() {
    return React.createElement("div", { "data-testid": "bar" });
  },
  RadarChart: function RadarChart({ children }: { children: React.ReactNode }) {
    return React.createElement("div", { "data-testid": "radar-chart" }, children);
  },
  PolarGrid: function PolarGrid() {
    return React.createElement("div", { "data-testid": "polar-grid" });
  },
  PolarAngleAxis: function PolarAngleAxis() {
    return React.createElement("div", { "data-testid": "polar-angle-axis" });
  },
  PolarRadiusAxis: function PolarRadiusAxis() {
    return React.createElement("div", { "data-testid": "polar-radius-axis" });
  },
  Radar: function Radar() {
    return React.createElement("div", { "data-testid": "radar" });
  },
}));

// Mock fetch with complete Response object
(global.fetch as unknown as jest.Mock) = jest.fn(
  (url: string | URL | RequestInfo, init?: RequestInit) => {
    // Default successful response
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      json: async () => ({
        data: [],
        success: true,
      }),
      text: async () => JSON.stringify({ data: [], success: true }),
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      clone: jest.fn(),
      body: null,
      bodyUsed: false,
      redirected: false,
      type: "basic" as ResponseType,
      url: typeof url === "string" ? url : url.toString(),
    } as unknown as Response);
  }
);

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Touch events for gesture testing
Object.defineProperty(window, "Touch", {
  writable: true,
  value: class Touch {
    constructor(
      public identifier: number,
      public clientX: number,
      public clientY: number
    ) {}
  },
});

Object.defineProperty(window, "TouchList", {
  writable: true,
  value: class TouchList {
    public length: number = 0;
    public item: (index: number) => null;
    public [Symbol.iterator]: () => IterableIterator<Touch> = function () {
      const iterator = {
        next: () => ({ done: true, value: undefined }),
        [Symbol.iterator]() {
          return this;
        },
      };
      return iterator as IterableIterator<Touch>;
    };
  },
});

Object.defineProperty(window, "TouchEvent", {
  writable: true,
  value: class TouchEvent {
    public targetTouches: TouchList = new TouchList();
    public touches: TouchList = new TouchList();
    public changedTouches: TouchList = new TouchList();

    constructor(type: string, eventInitDict?: TouchEventInit) {
      if (eventInitDict?.targetTouches) {
        this.targetTouches = eventInitDict.targetTouches as unknown as TouchList;
      }
      if (eventInitDict?.touches) {
        this.touches = eventInitDict.touches as unknown as TouchList;
      }
      if (eventInitDict?.changedTouches) {
        this.changedTouches = eventInitDict.changedTouches as unknown as TouchList;
      }
    }
  },
});

jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    isSignedIn: true,
    user: {
      id: "test-clerk-id",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      fullName: "Test User",
    },
    isLoaded: true,
  }),
  useAuth: () => ({
    isSignedIn: true,
    userId: "test-clerk-id",
    getToken: jest.fn().mockResolvedValue("mock-clerk-token"),
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => React.createElement("div", { "data-testid": "clerk-signin" }),
  SignUp: () => React.createElement("div", { "data-testid": "clerk-signup" }),
  UserButton: () => React.createElement("div", { "data-testid": "clerk-userbutton" }),
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: () => ({
    userId: "test-clerk-id",
    getToken: jest.fn().mockResolvedValue("mock-clerk-token"),
  }),
  currentUser: jest.fn().mockResolvedValue({
    id: "test-clerk-id",
    primaryEmailAddress: { emailAddress: "test@example.com" },
    fullName: "Test User",
    firstName: "Test",
  }),
  clerkClient: {
    users: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
  },
  clerkMiddleware: () => (req: unknown) => req,
  createRouteMatcher: () => jest.fn(),
}));

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn().mockResolvedValue({})),
  ConvexReactClient: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    mutation: jest.fn(),
  })),
}));

// Mock convex-client to avoid NEXT_PUBLIC_CONVEX_URL requirement in tests
jest.mock("@/lib/convex-client", () => {
  const mockConvexClient = {
    query: jest.fn().mockResolvedValue([]),
    mutation: jest.fn().mockResolvedValue({}),
    action: jest.fn().mockResolvedValue({}),
  };
  return {
    getConvexClient: jest.fn().mockReturnValue(mockConvexClient),
    convexClient: mockConvexClient,
    api: new Proxy(
      {},
      {
        get: (_target, prop) =>
          new Proxy(
            {},
            {
              get: (_innerTarget, innerProp) => `${String(prop)}:${String(innerProp)}`,
            }
          ),
      }
    ),
  };
});

jest.mock("convex/react-clerk", () => ({
  ConvexProviderWithClerk: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../convex/_generated/api", () => ({
  api: new Proxy(
    {},
    {
      get: (_target, prop) =>
        new Proxy(
          {},
          {
            get: (_innerTarget, innerProp) => `${String(prop)}:${String(innerProp)}`,
          }
        ),
    }
  ),
}));

jest.mock("@/lib/db", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mockPrisma } = require("./mocks/neon-adapter");
  return {
    prisma: mockPrisma,
    db: mockPrisma,
    neonAdapter: mockPrisma,
    getDB: jest.fn().mockResolvedValue(mockPrisma),
    getPrismaClient: jest.fn().mockResolvedValue(mockPrisma),
    testDatabaseConnection: jest.fn().mockResolvedValue(true),
    ensureDatabaseConnection: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock("@/lib/db/neon-adapter", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mockPrisma } = require("./mocks/neon-adapter");
  return {
    neonAdapter: mockPrisma,
    prisma: mockPrisma,
    db: mockPrisma,
    testDatabaseConnection: jest.fn().mockResolvedValue(true),
    ensureDatabaseConnection: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock Next.js Request and Response objects
const MockRequest = class {
  constructor(input: string | RequestInfo, init?: RequestInit) {
    this.url = typeof input === "string" ? input : input.url;
    this.method = init?.method || "GET";
    this.headers = new Headers(init?.headers);
    this.body = init?.body ?? undefined;
  }
  url: string;
  method: string;
  headers: Headers;
  body?: BodyInit;
  json: () => Promise<any> = jest.fn(function () {
    if (this.body && typeof this.body === "string") {
      try {
        return Promise.resolve(JSON.parse(this.body));
      } catch {
        return Promise.resolve({});
      }
    }
    return Promise.resolve({});
  });
  text: () => Promise<string> = jest.fn(function () {
    return Promise.resolve(this.body?.toString() || "");
  });
};

global.Request = MockRequest as unknown as typeof Request;

const MockResponse = class {
  constructor(body?: BodyInit, init?: ResponseInit) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new Headers(init?.headers);
  }
  body?: BodyInit;
  status: number;
  headers: Headers;
  json: () => Promise<any> = jest.fn();
  text: () => Promise<string> = jest.fn();
};

global.Response = MockResponse as unknown as typeof Response;

// Mock environment variables
process.env.CLERK_SECRET_KEY = "test-secret-for-clerk-auth-min32";
process.env.ENCRYPTION_KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMmJ5dGVzLWxvbmc="; // base64 encoded

// Mock rate limiter
jest.mock("@/lib/services/ai/rate-limiter", () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
      retryAfter: null,
    }),
    isAllowed: jest.fn().mockResolvedValue(true),
    getRemainingRequests: jest.fn().mockResolvedValue(10),
    clearAll: jest.fn(),
    isAllowedSync: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockReturnValue({ totalRequests: 0, blockedRequests: 0 }),
    getUserStats: jest.fn().mockReturnValue({ totalRequests: 0, blockedRequests: 0 }),
    getStatsByTimeRange: jest.fn().mockReturnValue({ totalRequests: 0, blockedRequests: 0 }),
    getGlobalStats: jest.fn().mockReturnValue({
      totalRequests: 0,
      blockedRequests: 0,
      activeUsers: 0,
    }),
    cleanup: jest.fn(),
    updateConfig: jest.fn(),
    hasUserData: jest.fn().mockReturnValue(false),
    getMemoryUsage: jest.fn().mockReturnValue({
      activeUsers: 0,
      totalEntries: 0,
      memoryBytes: 0,
    }),
    setGlobalLimit: jest.fn(),
    setUserTier: jest.fn(),
    getCircuitBreakerStatus: jest.fn().mockReturnValue({ open: false }),
  })),
  rateLimiter: {
    isAllowed: jest.fn().mockResolvedValue(true),
    getRemainingRequests: jest.fn().mockResolvedValue(10),
    clearAll: jest.fn(),
    getGlobalStats: jest.fn().mockReturnValue({
      totalRequests: 0,
      blockedRequests: 0,
      activeUsers: 0,
    }),
  },
}));

jest.mock("@/lib/services/device-sync-service", () =>
  jest.requireActual("@/lib/services/device-sync-service")
);

// Mock performance testing utilities
jest.mock("@/lib/performance/performance-testing", () => ({
  performanceTestManager: {
    runTest: jest.fn().mockResolvedValue("test-id"),
    getTestStatus: jest.fn().mockReturnValue({ status: "completed" }),
    generateBenchmark: jest.fn().mockReturnValue({ name: "test-benchmark" }),
  },
}));

// Mock tracking services
jest.mock("@/lib/services/tracking/meal-tracker", () => ({
  mealTracker: {
    logMeal: jest.fn().mockResolvedValue({ id: "test-meal-log-id", loggedAt: new Date() }),
    updateMeal: jest.fn().mockResolvedValue({ id: "test-meal-log-id" }),
    deleteMeal: jest.fn().mockResolvedValue(true),
    getMealsByDate: jest.fn().mockResolvedValue([]),
    getMealsByDateRange: jest.fn().mockResolvedValue([]),
    getNutritionSummary: jest.fn().mockResolvedValue({
      calories: 500,
      protein: 25,
      carbs: 60,
      fat: 15,
    }),
  },
}));

// Mock AI conversation manager
jest.mock("@/lib/services/ai/conversation-manager", () => ({
  conversationManager: {
    createSession: jest.fn().mockResolvedValue({ sessionId: "test-session-id" }),
    getSession: jest.fn().mockResolvedValue({ sessionId: "test-session-id", messages: [] }),
    updateSession: jest.fn().mockResolvedValue({ sessionId: "test-session-id" }),
    deleteSession: jest.fn().mockResolvedValue(true),
    clearAllSessions: jest.fn().mockResolvedValue(true),
    addMessage: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
    getMessages: jest.fn().mockResolvedValue([]),
    generateResponse: jest.fn().mockResolvedValue({ response: "Test AI response" }),
  },
}));

jest.mock("@/lib/services/notification/notification-manager", () =>
  jest.requireActual("@/lib/services/notification/notification-manager")
);

// Mock USDA service
jest.mock("@/lib/services/usda-service", () => {
  const actual = jest.requireActual("@/lib/services/usda-service");
  return {
    ...actual,
    usdaService: {
      searchFoods: jest.fn().mockResolvedValue({
        currentPage: 1,
        totalPages: 1,
        totalHits: 1,
        foods: [
          {
            fdcId: 123456,
            description: "Chicken breast",
            dataType: "Foundation",
            foodNutrients: [
              {
                nutrientId: 1008,
                nutrientName: "Energy",
                unitName: "kcal",
                value: 165,
              },
              {
                nutrientId: 1003,
                nutrientName: "Protein",
                unitName: "g",
                value: 23,
              },
              {
                nutrientId: 1005,
                nutrientName: "Carbohydrate",
                unitName: "g",
                value: 0,
              },
              {
                nutrientId: 1004,
                nutrientName: "Total lipid (fat)",
                unitName: "g",
                value: 1.2,
              },
            ],
          },
        ],
      }),
      getFoodDetails: jest.fn().mockResolvedValue({
        fdcId: 123456,
        description: "Test Food",
        ingredients: "Test ingredients",
        foodNutrients: [],
      }),
    },
  };
});

jest.mock("@/lib/repositories/notification-repository-singleton", () => {
  const createMockModel = (name: string) => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  });

  const mockPrisma = {
    user: createMockModel("user"),
    notification: createMockModel("notification"),
    familyMember: createMockModel("familyMember"),
  };

  const toNotificationDTO = (record) => ({
    id: record.id,
    memberId: record.memberId ?? record.userId,
    type: record.type,
    title: record.title,
    content: record.content,
    priority: record.priority ?? "MEDIUM",
    status: record.status ?? "SENT",
    channels: record.channels ?? ["PUSH"],
    metadata: record.metadata ?? undefined,
    actionUrl: record.actionUrl ?? undefined,
    actionText: record.actionText ?? undefined,
    dedupKey: record.dedupKey ?? undefined,
    batchId: record.batchId ?? undefined,
    createdAt: record.createdAt ?? new Date(),
    updatedAt: record.updatedAt ?? new Date(),
    readAt: record.readAt ?? (record.read ? new Date() : null),
    scheduledAt: record.scheduledAt ?? null,
    sentAt: record.sentAt ?? null,
  });

  const notificationRepository = {
    createNotification: jest.fn(async (payload) => {
      const record = await mockPrisma.notification.create({
        data: {
          memberId: payload.memberId,
          type: payload.type,
          title: payload.title,
          content: payload.content,
          priority: payload.priority ?? "MEDIUM",
          channels: payload.channels,
          metadata: payload.metadata,
          actionUrl: payload.actionUrl,
          actionText: payload.actionText,
          dedupKey: payload.dedupKey,
          batchId: payload.batchId,
          status: "PENDING",
        },
      });
      return toNotificationDTO({
        ...record,
        memberId: payload.memberId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        channels: payload.channels,
      });
    }),
    getNotificationById: jest.fn(async (id) => {
      const record = await mockPrisma.notification.findUnique({
        where: { id },
      });
      return record ? toNotificationDTO(record) : null;
    }),
    listMemberNotifications: jest.fn(async () => {
      const records = await mockPrisma.notification.findMany();
      return {
        items: records.map(toNotificationDTO),
        total: records.length,
      };
    }),
    updateStatus: jest.fn(async (id, status) => {
      await mockPrisma.notification.update({
        where: { id },
        data: { status },
      });
    }),
    markAsRead: jest.fn(async (notificationId) => {
      await mockPrisma.notification.update({
        where: { id: notificationId },
        data: { read: true, readAt: new Date() },
      });
    }),
    markAllAsRead: jest.fn(async () => 0),
    appendDeliveryLog: jest.fn(async () => {}),
    listPendingNotifications: jest.fn(async () => []),
    createScheduledNotification: jest.fn(async (schedule) => schedule),
    listDueSchedules: jest.fn(async () => []),
    updateScheduleStatus: jest.fn(async () => {}),
    getNotificationPreferences: jest.fn(async () => null),
    upsertNotificationPreferences: jest.fn(async () => {}),
    getNotificationRecipient: jest.fn(async (memberId) => {
      const user = await mockPrisma.user.findUnique({
        where: { id: memberId },
      });
      if (!user) {
        return null;
      }
      const channelPreferences = user.notificationPreferences && {
        EMAIL: user.notificationPreferences.email,
        SMS: user.notificationPreferences.sms,
        WECHAT: user.notificationPreferences.wechat,
        PUSH: user.notificationPreferences.push,
        IN_APP: true,
      };

      return {
        memberId,
        email: user.email,
        phone: user.phone,
        wechatOpenId: user.wechatOpenId,
        pushTokens: user.pushTokens ?? [],
        preferences: channelPreferences ? { channelPreferences } : undefined,
      };
    }),
    deleteNotification: jest.fn(async (notificationId, memberId) => {
      const findManyMock = mockPrisma.notification.findMany as jest.Mock;
      const notifications = await findManyMock();
      const record = notifications.find((n: any) => n?.id === notificationId);
      if (!record || (record.userId && record.userId !== memberId)) {
        throw new Error("Unauthorized");
      }
      await mockPrisma.notification.delete({ where: { id: notificationId } });
    }),
  };

  return {
    getNotificationRepository: () => notificationRepository,
    notificationRepository,
    __mockPrisma: mockPrisma,
  };
});

// Export mockPrisma globally for tests to configure
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __testMockPrisma: any;
}

// Make mockPrisma available globally for test configuration
(global as any).__testMockPrisma = {
  user: {},
  notification: {},
  familyMember: {},
  deviceConnection: {},
  healthData: {},
};

// Mock JWT services (can be bypassed by setting USE_REAL_JOSE=true)
if (process.env.USE_REAL_JOSE !== "true") {
  jest.mock("jose", () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue("mock-jwt-token"),
    })),
    jwtVerify: jest.fn().mockResolvedValue({
      sub: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      iat: Date.now() / 1000,
      exp: (Date.now() + 3600000) / 1000,
    }),
  }));
}

// Mock bcrypt - only if package is installed
try {
  require.resolve("bcrypt");
  jest.mock("bcrypt", () => ({
    hash: jest.fn().mockResolvedValue("hashed-password"),
    compare: jest.fn().mockResolvedValue(true),
    genSalt: jest.fn().mockResolvedValue("salt"),
  }));
} catch (e) {
  // bcrypt not installed, skip mock
}

// Mock nodemailer - only if package is installed
try {
  require.resolve("nodemailer");
  jest.mock("nodemailer", () => ({
    createTransporter: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
      verify: jest.fn().mockResolvedValue(true),
    }),
  }));
} catch (e) {
  // nodemailer not installed, skip mock
}

// Mock AWS SDK - only if package is installed
try {
  require.resolve("aws-sdk");
  jest.mock("aws-sdk", () => ({
    S3: jest.fn().mockImplementation(() => ({
      upload: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Location: "test-file-url" }),
      }),
      deleteObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    })),
    SQS: jest.fn().mockImplementation(() => ({
      sendMessage: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ MessageId: "test-message-id" }),
      }),
      receiveMessage: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Messages: [] }),
      }),
    })),
  }));
} catch (e) {
  // aws-sdk not installed, skip mock
}

// Mock Redis - only if package is installed
try {
  require.resolve("redis");
  jest.mock("redis", () => ({
    createClient: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(true),
      keys: jest.fn().mockResolvedValue([]),
    }),
  }));
} catch (e) {
  // redis not installed, skip mock
}

jest.mock("@/lib/services/tracking/template-manager", () => ({
  templateManager: {
    createTemplate: jest.fn().mockResolvedValue({ id: "test-template-id" }),
    updateTemplate: jest.fn().mockResolvedValue({ id: "test-template-id" }),
    deleteTemplate: jest.fn().mockResolvedValue(true),
    getTemplate: jest.fn().mockResolvedValue({ id: "test-template-id" }),
    getTemplates: jest.fn().mockResolvedValue([]),
    applyTemplate: jest.fn().mockResolvedValue({ id: "test-meal-log-id" }),
  },
}));

jest.mock("@/lib/services/tracking/deviation-analyzer", () => {
  const actual = jest.requireActual("@/lib/services/tracking/deviation-analyzer");
  return {
    ...actual,
    deviationAnalyzer: {
      analyzeDeviations: jest.fn().mockResolvedValue({
        totalDeviations: 0,
        deviationScore: 0,
        recommendations: [],
      }),
      getDeviationTrends: jest.fn().mockResolvedValue([]),
      generateDeviationReport: jest.fn().mockResolvedValue({
        report: "Test deviation report",
      }),
    },
  };
});

// Mock console methods in tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Warning: ReactDOM.render is deprecated")) {
      return;
    }
    // Suppress Prisma Client browser warnings in tests
    if (
      typeof args[0] === "string" &&
      args[0].includes("PrismaClient is unable to run in browser")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    // Suppress environment variable warnings in tests
    if (
      typeof args[0] === "string" &&
      (args[0].includes("可选环境变量警告") || args[0].includes("REDIS_URL"))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.log = (...args: any[]) => {
    // Suppress environment validation messages in tests
    if (typeof args[0] === "string" && args[0].includes("✅ 环境变量验证通过")) {
      return;
    }
    originalLog.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});
