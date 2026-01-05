/**
 * 强类型Mock工厂
 * 提供类型安全的测试Mock对象
 */

import type { Session } from "next-auth";

// ============ Session Mocks ============

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

export interface MockSession extends Session {
  user: MockUser;
  expires: string;
}

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  role: "USER",
  ...overrides,
});

export const createMockSession = (
  overrides?: Partial<MockSession>,
): MockSession => ({
  user: createMockUser(overrides?.user),
  expires: new Date(Date.now() + 86400000).toISOString(),
  ...overrides,
});

export const createMockAuth = () => {
  return jest
    .fn<Promise<MockSession | null>, []>()
    .mockResolvedValue(createMockSession());
};

export const createMockAuthNull = () => {
  return jest.fn<Promise<MockSession | null>, []>().mockResolvedValue(null);
};

// ============ Device Mocks ============

export interface MockDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  platform: string;
  isActive: boolean;
  syncStatus: string;
  lastSyncAt: Date | null;
  connectionDate: Date;
  memberId: string;
  retryCount: number;
  firmwareVersion: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  syncInterval: number;
  permissions: string[];
  dataTypes: string[];
  isAutoSync: boolean;
  disconnectionDate: Date | null;
  lastError: string | null;
  errorCount: number;
}

export interface MockDeviceWithMember extends MockDevice {
  member: {
    id: string;
    name: string;
  };
}

export const createMockDevice = (
  overrides?: Partial<MockDevice>,
): MockDevice => ({
  id: "device-1",
  deviceId: "apple-watch-123",
  deviceName: "Apple Watch",
  deviceType: "SMARTWATCH",
  manufacturer: "Apple",
  model: "Series 8",
  platform: "APPLE_HEALTHKIT",
  isActive: true,
  syncStatus: "SUCCESS",
  lastSyncAt: new Date("2024-01-15"),
  connectionDate: new Date("2024-01-01"),
  memberId: "member-1",
  retryCount: 0,
  firmwareVersion: null,
  accessToken: null,
  refreshToken: null,
  syncInterval: 1800,
  permissions: [],
  dataTypes: [],
  isAutoSync: true,
  disconnectionDate: null,
  lastError: null,
  errorCount: 0,
  ...overrides,
});

export const createMockDeviceWithMember = (
  overrides?: Partial<MockDeviceWithMember>,
): MockDeviceWithMember => ({
  ...createMockDevice(overrides),
  member: {
    id: "member-1",
    name: "张三",
    ...overrides?.member,
  },
});

// ============ Member Mocks ============

export interface MockMember {
  id: string;
  name: string;
  avatar: string | null;
  familyId: string;
  userId: string | null;
}

export const createMockMember = (
  overrides?: Partial<MockMember>,
): MockMember => ({
  id: "member-1",
  name: "张三",
  avatar: null,
  familyId: "family-1",
  userId: "test-user-id",
  ...overrides,
});

// ============ Notification Mocks ============

export const NotificationType = {
  CHECK_IN_REMINDER: "CHECK_IN_REMINDER",
  TASK_NOTIFICATION: "TASK_NOTIFICATION",
  EXPIRY_ALERT: "EXPIRY_ALERT",
  BUDGET_WARNING: "BUDGET_WARNING",
  HEALTH_ALERT: "HEALTH_ALERT",
  GOAL_ACHIEVEMENT: "GOAL_ACHIEVEMENT",
  FAMILY_ACTIVITY: "FAMILY_ACTIVITY",
  SYSTEM_ANNOUNCEMENT: "SYSTEM_ANNOUNCEMENT",
  MARKETING: "MARKETING",
  // 扩展类型用于测试
  HEALTH_REMINDER: "HEALTH_REMINDER",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  SHARE_ACTION: "SHARE_ACTION",
  FAMILY_UPDATE: "FAMILY_UPDATE",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export interface MockNotification {
  id: string;
  memberId: string;
  type: NotificationTypeValue;
  title: string;
  content: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  channels: string[];
  isRead: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  actionText?: string;
}

export const createMockNotification = (
  overrides?: Partial<MockNotification>,
): MockNotification => ({
  id: "notification-1",
  memberId: "member-1",
  type: NotificationType.HEALTH_ALERT,
  title: "测试通知",
  content: "这是一条测试通知",
  priority: "MEDIUM",
  channels: ["IN_APP"],
  isRead: false,
  createdAt: new Date(),
  ...overrides,
});

// ============ Achievement Mocks ============

export interface MockAchievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: string;
  points: number;
  unlockedAt: Date;
  member: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export const createMockAchievement = (
  overrides?: Partial<MockAchievement>,
): MockAchievement => ({
  id: "achievement-1",
  type: "STREAK",
  name: "坚持7天",
  description: "连续打卡7天",
  icon: "🏆",
  color: "gold",
  rarity: "RARE",
  points: 100,
  unlockedAt: new Date(),
  member: {
    id: "member-1",
    name: "张三",
    avatar: null,
  },
  ...overrides,
});

// ============ Sync Result Mocks ============

export interface MockSyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  errors: string[];
  lastSyncDate?: Date;
}

export const createMockSyncResult = (
  overrides?: Partial<MockSyncResult>,
): MockSyncResult => ({
  success: true,
  syncedCount: 1,
  skippedCount: 0,
  errors: [],
  lastSyncDate: new Date(),
  ...overrides,
});

// ============ Query Result Mocks ============

export interface MockQueryResult<T> {
  data: T;
  total: number;
  page: number;
  limit: number;
}

export const createMockQueryResult = <T>(
  data: T,
  overrides?: Partial<MockQueryResult<T>>,
): MockQueryResult<T> => ({
    data,
    total: Array.isArray(data) ? data.length : 1,
    page: 1,
    limit: 10,
    ...overrides,
  });

// ============ Mock Factory Functions ============

export const mockOptimizedQuery = () => ({
  findMany: jest.fn(),
  count: jest.fn(),
});

export const mockPrisma = () => ({
  familyMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  deviceConnection: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  notification: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  achievement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

// ============ Error Mocks ============

export const createMockError = (message: string = "Test error"): Error => {
  return new Error(message);
};

export const createMockDatabaseError = (
  code: string = "P2002",
): Error & { code: string } => {
  const error = new Error("Database error") as Error & { code: string };
  error.code = code;
  return error;
};
