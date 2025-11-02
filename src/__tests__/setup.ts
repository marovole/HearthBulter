import React from 'react';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
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
    return '/dashboard';
  },
}));

// Mock Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: function ResponsiveContainer({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'responsive-container' }, children);
  },
  LineChart: function LineChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'line-chart' }, children);
  },
  Line: function Line() {
    return React.createElement('div', { 'data-testid': 'line' });
  },
  XAxis: function XAxis() {
    return React.createElement('div', { 'data-testid': 'x-axis' });
  },
  YAxis: function YAxis() {
    return React.createElement('div', { 'data-testid': 'y-axis' });
  },
  CartesianGrid: function CartesianGrid() {
    return React.createElement('div', { 'data-testid': 'cartesian-grid' });
  },
  Tooltip: function Tooltip() {
    return React.createElement('div', { 'data-testid': 'tooltip' });
  },
  Legend: function Legend() {
    return React.createElement('div', { 'data-testid': 'legend' });
  },
  AreaChart: function AreaChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'area-chart' }, children);
  },
  Area: function Area() {
    return React.createElement('div', { 'data-testid': 'area' });
  },
  PieChart: function PieChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'pie-chart' }, children);
  },
  Pie: function Pie() {
    return React.createElement('div', { 'data-testid': 'pie' });
  },
  Cell: function Cell() {
    return React.createElement('div', { 'data-testid': 'cell' });
  },
  BarChart: function BarChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'bar-chart' }, children);
  },
  Bar: function Bar() {
    return React.createElement('div', { 'data-testid': 'bar' });
  },
  RadarChart: function RadarChart({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'radar-chart' }, children);
  },
  PolarGrid: function PolarGrid() {
    return React.createElement('div', { 'data-testid': 'polar-grid' });
  },
  PolarAngleAxis: function PolarAngleAxis() {
    return React.createElement('div', { 'data-testid': 'polar-angle-axis' });
  },
  PolarRadiusAxis: function PolarRadiusAxis() {
    return React.createElement('div', { 'data-testid': 'polar-radius-axis' });
  },
  Radar: function Radar() {
    return React.createElement('div', { 'data-testid': 'radar' });
  },
}));

// Mock fetch
global.fetch = jest.fn();

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
Object.defineProperty(window, 'Touch', {
  writable: true,
  value: class Touch {
    constructor(public identifier: number, public clientX: number, public clientY: number) {}
  },
});

Object.defineProperty(window, 'TouchList', {
  writable: true,
  value: class TouchList {
    public length: number = 0;
    public item: (index: number) => null;
    public [Symbol.iterator]: () => IterableIterator<Touch> = function() {
      return {
        next: () => ({ done: true, value: undefined }),
      };
    };
  },
});

Object.defineProperty(window, 'TouchEvent', {
  writable: true,
  value: class TouchEvent {
    public targetTouches: TouchList = new TouchList();
    public touches: TouchList = new TouchList();
    public changedTouches: TouchList = new TouchList();
    
    constructor(type: string, eventInitDict?: TouchEventInit) {
      if (eventInitDict?.targetTouches) {
        this.targetTouches = eventInitDict.targetTouches as TouchList;
      }
      if (eventInitDict?.touches) {
        this.touches = eventInitDict.touches as TouchList;
      }
      if (eventInitDict?.changedTouches) {
        this.changedTouches = eventInitDict.changedTouches as TouchList;
      }
    }
  },
});

// Mock Prisma Client to prevent browser environment issues
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    mealLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    food: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    healthMetrics: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quickTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    device: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    family: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    familyMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  })),
}));

// Mock the db index file that exports prisma instance
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' }),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    mealLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-meal-id' }),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    food: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-food-id' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    healthMetrics: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-metrics-id' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quickTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-template-id' }),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    device: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-device-id' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    family: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-family-id', name: 'Test Family' }),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    familyMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-member-id', name: 'Test Member' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({
        id: 'test-notification-id',
        userId: 'test-user-id',
        type: 'meal_reminder',
        title: 'Test Notification',
        content: 'Test content',
        channels: ['push'],
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    nutritionGoal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-goal-id' }),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    scheduledNotification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'test-scheduled-id' }),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation((callback) => callback()),
    $aggregate: jest.fn().mockResolvedValue({}),
  },
}));

// Mock Next.js Request and Response objects
global.Request = class MockRequest {
  constructor(input: string | RequestInfo, init?: RequestInit) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
    this.body = init?.body;
  }
  url: string;
  method: string;
  headers: Headers;
  body?: BodyInit;
  json: () => Promise<any> = jest.fn();
  text: () => Promise<string> = jest.fn();
};

global.Response = class MockResponse {
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

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMmJ5dGVzLWxvbmc='; // base64 encoded

// Mock rate limiter
jest.mock('@/lib/services/ai/rate-limiter', () => ({
  RateLimiter: jest.fn().mockImplementation(() => ({
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
      retryAfter: null
    }),
    isAllowed: jest.fn().mockResolvedValue(true),
    getRemainingRequests: jest.fn().mockResolvedValue(10),
    clearAll: jest.fn(),
    isAllowedSync: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockReturnValue({ totalRequests: 0, blockedRequests: 0 }),
    getUserStats: jest.fn().mockReturnValue({ totalRequests: 0, blockedRequests: 0 }),
    getStatsByTimeRange: jest.fn().mockReturnValue({ totalRequests: 0, blockedRequests: 0 }),
    cleanup: jest.fn(),
    updateConfig: jest.fn(),
    hasUserData: jest.fn().mockReturnValue(false),
    getMemoryUsage: jest.fn().mockReturnValue({
      activeUsers: 0,
      totalEntries: 0,
      memoryBytes: 0
    }),
    setGlobalLimit: jest.fn(),
    setUserTier: jest.fn(),
    getCircuitBreakerStatus: jest.fn().mockReturnValue({ open: false }),
  })),
  rateLimiter: {
    isAllowed: jest.fn().mockResolvedValue(true),
    getRemainingRequests: jest.fn().mockResolvedValue(10),
    clearAll: jest.fn(),
  },
}));

// Mock device sync service
jest.mock('@/lib/services/device-sync-service', () => ({
  syncDeviceData: jest.fn().mockResolvedValue({ synced: true }),
  validateDeviceData: jest.fn().mockResolvedValue({ isValid: true }),
  parseDeviceData: jest.fn().mockResolvedValue({ parsed: true }),
}));

// Mock performance testing utilities
jest.mock('@/lib/performance/performance-testing', () => ({
  performanceTestManager: {
    runTest: jest.fn().mockResolvedValue('test-id'),
    getTestStatus: jest.fn().mockReturnValue({ status: 'completed' }),
    generateBenchmark: jest.fn().mockReturnValue({ name: 'test-benchmark' }),
  },
}));

// Mock tracking services
jest.mock('@/lib/services/tracking/meal-tracker', () => ({
  mealTracker: {
    logMeal: jest.fn().mockResolvedValue({ id: 'test-meal-log-id', loggedAt: new Date() }),
    updateMeal: jest.fn().mockResolvedValue({ id: 'test-meal-log-id' }),
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
jest.mock('@/lib/services/ai/conversation-manager', () => ({
  conversationManager: {
    createSession: jest.fn().mockResolvedValue({ sessionId: 'test-session-id' }),
    getSession: jest.fn().mockResolvedValue({ sessionId: 'test-session-id', messages: [] }),
    updateSession: jest.fn().mockResolvedValue({ sessionId: 'test-session-id' }),
    deleteSession: jest.fn().mockResolvedValue(true),
    clearAllSessions: jest.fn().mockResolvedValue(true),
    addMessage: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    getMessages: jest.fn().mockResolvedValue([]),
    generateResponse: jest.fn().mockResolvedValue({ response: 'Test AI response' }),
  },
}));

// Mock notification services
jest.mock('@/lib/services/notification/notification-manager', () => ({
  notificationManager: {
    createNotification: jest.fn().mockResolvedValue({ id: 'test-notification-id' }),
    sendNotification: jest.fn().mockResolvedValue({ sent: true }),
    updateNotification: jest.fn().mockResolvedValue({ id: 'test-notification-id' }),
    deleteNotification: jest.fn().mockResolvedValue(true),
    getNotifications: jest.fn().mockResolvedValue([]),
    markAsRead: jest.fn().mockResolvedValue(true),
    scheduleNotification: jest.fn().mockResolvedValue({ id: 'test-scheduled-id' }),
  },
}));

// Mock USDA service
jest.mock('@/lib/services/usda-service', () => ({
  USDAService: jest.fn().mockImplementation(() => ({
    searchFoods: jest.fn().mockResolvedValue({
      foods: [
        {
          fdcId: 123456,
          description: 'Test Food',
          dataType: 'Foundation',
          foodNutrients: [
            { nutrientId: 1008, nutrientName: 'Energy', unitName: 'kcal', value: 100 },
            { nutrientId: 1003, nutrientName: 'Protein', unitName: 'g', value: 10 },
            { nutrientId: 1005, nutrientName: 'Carbohydrate', unitName: 'g', value: 20 },
            { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'g', value: 5 },
          ],
        },
      ],
      totalPages: 1,
      currentPage: 1,
    }),
    getFoodDetails: jest.fn().mockResolvedValue({
      fdcId: 123456,
      description: 'Test Food',
      ingredients: 'Test ingredients',
      foodNutrients: [],
    }),
  })),
}));

// Mock JWT services
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-token'),
  })),
  jwtVerify: jest.fn().mockResolvedValue({
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    iat: Date.now() / 1000,
    exp: (Date.now() + 3600000) / 1000,
  }),
}));

// Mock bcrypt - only if package is installed
try {
  require.resolve('bcrypt');
  jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true),
    genSalt: jest.fn().mockResolvedValue('salt'),
  }));
} catch (e) {
  // bcrypt not installed, skip mock
}

// Mock nodemailer - only if package is installed
try {
  require.resolve('nodemailer');
  jest.mock('nodemailer', () => ({
    createTransporter: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn().mockResolvedValue(true),
    }),
  }));
} catch (e) {
  // nodemailer not installed, skip mock
}

// Mock AWS SDK - only if package is installed
try {
  require.resolve('aws-sdk');
  jest.mock('aws-sdk', () => ({
    S3: jest.fn().mockImplementation(() => ({
      upload: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Location: 'test-file-url' }),
      }),
      deleteObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    })),
    SQS: jest.fn().mockImplementation(() => ({
      sendMessage: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
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
  require.resolve('redis');
  jest.mock('redis', () => ({
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

jest.mock('@/lib/services/tracking/template-manager', () => ({
  templateManager: {
    createTemplate: jest.fn().mockResolvedValue({ id: 'test-template-id' }),
    updateTemplate: jest.fn().mockResolvedValue({ id: 'test-template-id' }),
    deleteTemplate: jest.fn().mockResolvedValue(true),
    getTemplate: jest.fn().mockResolvedValue({ id: 'test-template-id' }),
    getTemplates: jest.fn().mockResolvedValue([]),
    applyTemplate: jest.fn().mockResolvedValue({ id: 'test-meal-log-id' }),
  },
}));

jest.mock('@/lib/services/tracking/deviation-analyzer', () => ({
  deviationAnalyzer: {
    analyzeDeviations: jest.fn().mockResolvedValue({
      totalDeviations: 0,
      deviationScore: 0,
      recommendations: [],
    }),
    getDeviationTrends: jest.fn().mockResolvedValue([]),
    generateDeviationReport: jest.fn().mockResolvedValue({
      report: 'Test deviation report',
    }),
  },
}));

// Mock console methods in tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    // Suppress Prisma Client browser warnings in tests
    if (
      typeof args[0] === 'string' &&
      args[0].includes('PrismaClient is unable to run in browser')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    // Suppress environment variable warnings in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('可选环境变量警告') || args[0].includes('REDIS_URL'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.log = (...args: any[]) => {
    // Suppress environment validation messages in tests
    if (
      typeof args[0] === 'string' &&
      args[0].includes('✅ 环境变量验证通过')
    ) {
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
