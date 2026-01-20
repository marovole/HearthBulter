# HearthBulter Product Completion Roadmap

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all critical unfinished features in HearthBulter to reach production-ready status.

**Architecture:** Service-oriented Next.js 14 app with Prisma/Supabase backend, Clerk auth, and AI integration. Each task follows TDD principles with atomic commits.

**Tech Stack:** Next.js 14, TypeScript, Prisma, Supabase, Clerk, Jest, Playwright, Firebase Cloud Messaging

---

## Phase 1: Critical Infrastructure (Week 1)

### Task 1: Fix Jest Test Environment

**Priority:** P0 - Blocks all quality verification

**Problem:** Tests fail with `ReferenceError: jest is not defined` and `Do not import @jest/globals outside of Jest test environment`

**Files:**

- Modify: `jest.config.js`
- Modify: `jest.setup.js`
- Create: `.env.test`
- Test: `src/__tests__/services/nutrition-calculator.test.ts` (verification)

**Step 1: Read current Jest configuration**

```bash
cat jest.config.js
```

**Step 2: Create proper `.env.test` file**

```env
# Database (use test schema or mock)
DATABASE_URL="postgresql://test:test@localhost:5432/hearthbutler_test"

# Supabase Test Keys
NEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="test-anon-key"
SUPABASE_SERVICE_KEY="test-service-key"

# Clerk Test Keys
CLERK_SECRET_KEY="test-clerk-secret"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"

# AI (mock in tests)
OPENAI_API_KEY="sk-test-xxx"

# Feature flags for tests
NODE_ENV="test"
```

**Step 3: Update `jest.config.js` for proper globals injection**

```javascript
/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
  // Inject globals properly
  injectGlobals: true,
  // Don't require explicit @jest/globals import
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
};

module.exports = config;
```

**Step 4: Update `jest.setup.js` for proper mocking**

```javascript
// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_KEY = "test-service-key";

// Mock Supabase client
jest.mock("@/lib/db/supabase-clients", () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Mock Clerk
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(() => ({ userId: "test-user-id" })),
  currentUser: jest.fn(() => ({
    id: "test-user-id",
    email: "test@example.com",
  })),
}));
```

**Step 5: Run single test to verify fix**

```bash
npx jest src/__tests__/services/nutrition-calculator.test.ts --verbose
```

Expected: Tests should run (pass or fail on actual logic, not environment errors)

**Step 6: Run full test suite**

```bash
pnpm test
```

Expected: Environment errors resolved; actual test logic can now be verified

**Step 7: Commit**

```bash
git add jest.config.js jest.setup.js .env.test tsconfig.jest.json
git commit -m "fix(tests): resolve Jest environment configuration issues"
```

---

### Task 2: Add ENCRYPTION_KEY to Environment

**Priority:** P1 - Security configuration gap

**Files:**

- Modify: `.env.example`
- Modify: `src/lib/env-validator.ts` (if needed)

**Step 1: Read current `.env.example`**

```bash
cat .env.example
```

**Step 2: Add ENCRYPTION_KEY to `.env.example`**

Add to the Security section:

```env
# ===================
# Security
# ===================
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-here
```

**Step 3: Update env-validator.ts if ENCRYPTION_KEY is not validated**

Check if validation exists:

```bash
grep -n "ENCRYPTION_KEY" src/lib/env-validator.ts
```

If missing, add validation:

```typescript
// In the validation function
if (process.env.NODE_ENV === "production") {
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    errors.push("ENCRYPTION_KEY must be at least 32 characters in production");
  }
}
```

**Step 4: Commit**

```bash
git add .env.example src/lib/env-validator.ts
git commit -m "config: add ENCRYPTION_KEY to environment template and validation"
```

---

### Task 3: Implement Firebase Cloud Messaging Push Notifications

**Priority:** P0 - Core user notification feature

**Files:**

- Create: `src/lib/services/notification/push-provider.ts`
- Modify: `src/lib/services/notification/notification-manager.ts`
- Create: `public/firebase-messaging-sw.js`
- Modify: `.env.example` (add FCM keys)
- Test: `src/__tests__/services/push-notification.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/services/push-notification.test.ts`:

```typescript
import { PushNotificationProvider } from "@/lib/services/notification/push-provider";

describe("PushNotificationProvider", () => {
  it("should send push notification successfully", async () => {
    const provider = new PushNotificationProvider();
    const result = await provider.send({
      token: "valid-fcm-token",
      title: "Test Notification",
      body: "This is a test",
      data: { type: "test" },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it("should handle invalid token gracefully", async () => {
    const provider = new PushNotificationProvider();
    const result = await provider.send({
      token: "invalid-token",
      title: "Test",
      body: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/services/push-notification.test.ts -v
```

Expected: FAIL with "Cannot find module '@/lib/services/notification/push-provider'"

**Step 3: Add FCM environment variables to `.env.example`**

```env
# ===================
# Firebase Cloud Messaging
# ===================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
```

**Step 4: Create `src/lib/services/notification/push-provider.ts`**

```typescript
import admin from "firebase-admin";

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class PushNotificationProvider {
  async send(payload: PushNotificationPayload): Promise<PushResult> {
    try {
      const message: admin.messaging.Message = {
        token: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        webpush: {
          fcmOptions: {
            link: process.env.NEXT_PUBLIC_APP_URL || "https://hearthbutler.com",
          },
        },
      };

      const messageId = await admin.messaging().send(message);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error("[PushNotificationProvider] Failed to send:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendBatch(payloads: PushNotificationPayload[]): Promise<PushResult[]> {
    const results = await Promise.allSettled(
      payloads.map((payload) => this.send(payload)),
    );

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : { success: false, error: "Promise rejected" },
    );
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      return true;
    } catch (error) {
      console.error(
        "[PushNotificationProvider] Topic subscription failed:",
        error,
      );
      return false;
    }
  }
}

// Export singleton instance
export const pushProvider = new PushNotificationProvider();
```

**Step 5: Update `notification-manager.ts` to use real push provider**

Find the TODO comment and replace:

```typescript
// Before (placeholder):
// TODO: integrate actual push provider (Firebase/OneSignal)
// await this.mockPushSend(notification);

// After (real implementation):
import { pushProvider } from './push-provider';

// In the sendPush method:
async sendPush(notification: Notification): Promise<DeliveryResult> {
  const pushToken = await this.getUserPushToken(notification.userId);

  if (!pushToken) {
    return { success: false, channel: 'push', error: 'No push token registered' };
  }

  const result = await pushProvider.send({
    token: pushToken,
    title: notification.title,
    body: notification.body,
    data: {
      notificationId: notification.id,
      type: notification.type,
    },
  });

  return {
    success: result.success,
    channel: 'push',
    messageId: result.messageId,
    error: result.error,
  };
}
```

**Step 6: Create service worker `public/firebase-messaging-sw.js`**

```javascript
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  projectId: self.FIREBASE_PROJECT_ID,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload,
  );

  const notificationTitle = payload.notification?.title || "HearthBulter";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

**Step 7: Run tests**

```bash
npx jest src/__tests__/services/push-notification.test.ts -v
```

Expected: Tests should pass (with mocked Firebase)

**Step 8: Commit**

```bash
git add src/lib/services/notification/push-provider.ts \
        src/lib/services/notification/notification-manager.ts \
        public/firebase-messaging-sw.js \
        .env.example \
        src/__tests__/services/push-notification.test.ts
git commit -m "feat(notifications): implement Firebase Cloud Messaging push notifications"
```

---

## Phase 2: Device Integration (Week 2)

### Task 4: Implement Apple HealthKit Real Integration

**Priority:** P1 - Core health data sync feature

**Files:**

- Modify: `src/lib/services/healthkit-service.ts`
- Create: `src/lib/services/health/healthkit-bridge.ts`
- Test: `src/__tests__/services/healthkit-service.test.ts`

**Step 1: Write the failing test**

```typescript
import { HealthKitService } from "@/lib/services/healthkit-service";

describe("HealthKitService", () => {
  it("should fetch real steps data when available", async () => {
    const service = new HealthKitService();
    const result = await service.getStepsData({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-07"),
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    // Should NOT be mock data
    expect(result.source).not.toBe("mock");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/services/healthkit-service.test.ts -v
```

Expected: FAIL (currently returns mock data with `source: 'mock'`)

**Step 3: Implement HealthKit bridge for web (Capacitor/React Native bridge pattern)**

Create `src/lib/services/health/healthkit-bridge.ts`:

```typescript
/**
 * HealthKit Bridge
 *
 * This module provides a bridge to native HealthKit on iOS.
 * On web, it uses a Capacitor plugin or falls back gracefully.
 *
 * For mobile apps: Install @nicknisi/capacitor-healthkit
 * For web-only: Returns unavailable status
 */

export interface HealthKitAvailability {
  available: boolean;
  reason?: "web-only" | "permission-denied" | "not-ios";
}

export interface HealthKitDataPoint {
  date: Date;
  value: number;
  unit: string;
  source: string;
}

export class HealthKitBridge {
  private static instance: HealthKitBridge;
  private isNativeAvailable = false;

  private constructor() {
    this.checkNativeAvailability();
  }

  static getInstance(): HealthKitBridge {
    if (!HealthKitBridge.instance) {
      HealthKitBridge.instance = new HealthKitBridge();
    }
    return HealthKitBridge.instance;
  }

  private async checkNativeAvailability(): Promise<void> {
    // Check if running in Capacitor/native context
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      try {
        const { HealthKit } = await import("@nicknisi/capacitor-healthkit");
        const result = await HealthKit.isAvailable();
        this.isNativeAvailable = result.available;
      } catch {
        this.isNativeAvailable = false;
      }
    }
  }

  async getAvailability(): Promise<HealthKitAvailability> {
    if (typeof window === "undefined") {
      return { available: false, reason: "web-only" };
    }

    if (!(window as any).Capacitor) {
      return { available: false, reason: "web-only" };
    }

    return { available: this.isNativeAvailable };
  }

  async requestAuthorization(permissions: string[]): Promise<boolean> {
    const availability = await this.getAvailability();
    if (!availability.available) {
      console.warn("[HealthKitBridge] Not available:", availability.reason);
      return false;
    }

    try {
      const { HealthKit } = await import("@nicknisi/capacitor-healthkit");
      const result = await HealthKit.requestAuthorization({
        read: permissions,
        write: [],
      });
      return result.authorized;
    } catch (error) {
      console.error("[HealthKitBridge] Authorization failed:", error);
      return false;
    }
  }

  async querySteps(
    startDate: Date,
    endDate: Date,
  ): Promise<HealthKitDataPoint[]> {
    const availability = await this.getAvailability();
    if (!availability.available) {
      throw new Error(`HealthKit not available: ${availability.reason}`);
    }

    try {
      const { HealthKit } = await import("@nicknisi/capacitor-healthkit");
      const result = await HealthKit.queryHKitSampleType({
        sampleName: "stepCount",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      return result.data.map((item: any) => ({
        date: new Date(item.startDate),
        value: item.value,
        unit: "steps",
        source: item.sourceName || "HealthKit",
      }));
    } catch (error) {
      console.error("[HealthKitBridge] Query failed:", error);
      throw error;
    }
  }

  // Similar methods for heartRate, sleep, weight, etc.
}

export const healthKitBridge = HealthKitBridge.getInstance();
```

**Step 4: Update `healthkit-service.ts` to use bridge with fallback**

```typescript
import { healthKitBridge, HealthKitDataPoint } from "./health/healthkit-bridge";

export class HealthKitService {
  async getStepsData(options: { startDate: Date; endDate: Date }): Promise<{
    data: HealthKitDataPoint[];
    source: "healthkit" | "mock";
  }> {
    const availability = await healthKitBridge.getAvailability();

    if (availability.available) {
      try {
        const data = await healthKitBridge.querySteps(
          options.startDate,
          options.endDate,
        );
        return { data, source: "healthkit" };
      } catch (error) {
        console.warn(
          "[HealthKitService] Real data fetch failed, using mock:",
          error,
        );
      }
    }

    // Fallback to mock for development/web
    console.info(
      "[HealthKitService] Using mock data (HealthKit not available)",
    );
    return {
      data: this.generateMockStepsData(options.startDate, options.endDate),
      source: "mock",
    };
  }

  private generateMockStepsData(
    startDate: Date,
    endDate: Date,
  ): HealthKitDataPoint[] {
    // Existing mock implementation
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
      value: Math.floor(Math.random() * 8000) + 2000,
      unit: "steps",
      source: "mock",
    }));
  }
}
```

**Step 5: Run tests**

```bash
npx jest src/__tests__/services/healthkit-service.test.ts -v
```

**Step 6: Commit**

```bash
git add src/lib/services/healthkit-service.ts \
        src/lib/services/health/healthkit-bridge.ts \
        src/__tests__/services/healthkit-service.test.ts
git commit -m "feat(health): implement HealthKit bridge with native support and mock fallback"
```

---

### Task 5: Implement Huawei Health Real Integration

**Priority:** P1 - Core health data sync for Huawei users

**Files:**

- Modify: `src/lib/services/huawei-health-service.ts`
- Create: `src/lib/services/health/huawei-bridge.ts`
- Test: `src/__tests__/services/huawei-health-service.test.ts`

**Step 1-6:** Follow same pattern as Task 4, using Huawei Health Kit SDK

```typescript
// Key difference: Huawei uses OAuth + REST API
// See: https://developer.huawei.com/consumer/en/doc/HMSCore-Guides/overview-0000001162311559

export class HuaweiBridge {
  private accessToken: string | null = null;

  async authenticate(authCode: string): Promise<boolean> {
    const response = await fetch(
      "https://oauth-login.cloud.huawei.com/oauth2/v3/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          client_id: process.env.HUAWEI_CLIENT_ID!,
          client_secret: process.env.HUAWEI_CLIENT_SECRET!,
          redirect_uri: process.env.HUAWEI_REDIRECT_URI!,
        }),
      },
    );

    const data = await response.json();
    this.accessToken = data.access_token;
    return !!this.accessToken;
  }

  async querySteps(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
    if (!this.accessToken) {
      throw new Error("Not authenticated with Huawei Health");
    }

    const response = await fetch(
      "https://health-api.cloud.huawei.com/healthkit/v1/sampleSet:polymerize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          polymerizeWith: [
            { dataTypeName: "com.huawei.continuous.steps.delta" },
          ],
          startTime: startDate.getTime(),
          endTime: endDate.getTime(),
          timeUnit: "MILLISECONDS",
        }),
      },
    );

    const data = await response.json();
    return this.parseStepsResponse(data);
  }
}
```

**Commit message:**

```bash
git commit -m "feat(health): implement Huawei Health Kit integration with OAuth flow"
```

---

### Task 6: Implement Food Recognition with GPT-4V

**Priority:** P1 - Replace mock food recognition

**Files:**

- Modify: `src/lib/services/tracking/food-recognition.ts`
- Test: `src/__tests__/services/food-recognition.test.ts`

**Step 1: Write the failing test**

```typescript
import { FoodRecognitionService } from "@/lib/services/tracking/food-recognition";

describe("FoodRecognitionService", () => {
  it("should recognize food from image using AI", async () => {
    const service = new FoodRecognitionService();
    const mockImageBase64 = "data:image/jpeg;base64,/9j/4AAQ..."; // Test image

    const result = await service.recognizeFood(mockImageBase64);

    expect(result.success).toBe(true);
    expect(result.foods.length).toBeGreaterThan(0);
    expect(result.foods[0]).toHaveProperty("name");
    expect(result.foods[0]).toHaveProperty("confidence");
    expect(result.foods[0]).toHaveProperty("estimatedAmount");
  });
});
```

**Step 2: Implement with OpenAI Vision API**

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RecognizedFood {
  name: string;
  nameChinese: string;
  confidence: number;
  estimatedAmount: string;
  estimatedCalories: number;
  category: string;
}

export interface RecognitionResult {
  success: boolean;
  foods: RecognizedFood[];
  rawAnalysis?: string;
  error?: string;
}

export class FoodRecognitionService {
  async recognizeFood(imageBase64: string): Promise<RecognitionResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a food recognition expert. Analyze the image and identify all visible foods.
            Return a JSON array with this structure for each food item:
            {
              "name": "English name",
              "nameChinese": "中文名称",
              "confidence": 0.0-1.0,
              "estimatedAmount": "e.g., 100g, 1 cup, 2 pieces",
              "estimatedCalories": number,
              "category": "vegetable|fruit|grain|protein|dairy|snack|beverage|other"
            }
            Only return the JSON array, no other text.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
              {
                type: "text",
                text: "Identify all foods in this image with estimated amounts and calories.",
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || "[]";
      const foods = JSON.parse(content) as RecognizedFood[];

      return {
        success: true,
        foods,
        rawAnalysis: content,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        "[FoodRecognitionService] Recognition failed:",
        errorMessage,
      );

      return {
        success: false,
        foods: [],
        error: errorMessage,
      };
    }
  }
}
```

**Step 3: Run tests and commit**

```bash
npx jest src/__tests__/services/food-recognition.test.ts -v
git add src/lib/services/tracking/food-recognition.ts src/__tests__/services/food-recognition.test.ts
git commit -m "feat(tracking): implement GPT-4V food recognition replacing mock"
```

---

### Task 7: Clean Up NextAuth Legacy Code

**Priority:** P1 - Reduce confusion and bundle size

**Files:**

- Delete: `src/app/api/auth/[...nextauth]/route.ts` (or keep as redirect)
- Modify: `package.json` (remove next-auth if unused)
- Modify: Documentation referencing NextAuth

**Step 1: Verify NextAuth is not used**

```bash
grep -r "next-auth" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v ".test."
```

**Step 2: If no real usage, update the deprecated route**

Keep `src/app/api/auth/[...nextauth]/route.ts` but make it clearly deprecated:

```typescript
import { NextResponse } from "next/server";

/**
 * @deprecated NextAuth has been replaced by Clerk.
 * This route returns 410 Gone for any remaining integrations.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "NextAuth is deprecated",
      message:
        "This application now uses Clerk for authentication. Please update your integration.",
      migration: "https://clerk.com/docs/migrations/nextauth",
    },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "NextAuth is deprecated" },
    { status: 410 },
  );
}
```

**Step 3: Remove next-auth from package.json if not needed**

```bash
pnpm remove next-auth
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(auth): clean up deprecated NextAuth code after Clerk migration"
```

---

## Phase 3: Feature Completion (Week 3-4)

### Task 8: Implement Barcode Scanning

**Priority:** P2

**Files:**

- Modify: `src/components/inventory/AddInventoryItem.tsx`
- Create: `src/lib/services/barcode/barcode-scanner.ts`
- Create: `src/lib/services/barcode/product-lookup.ts`

**Implementation:** Use `@nicknisi/capacitor-barcode-scanner` for native or `@zxing/browser` for web.

---

### Task 9: Expand E2E Test Coverage

**Priority:** P2

**Files:**

- Create: `tests/e2e/onboarding.spec.ts`
- Create: `tests/e2e/meal-planning.spec.ts`
- Create: `tests/e2e/health-tracking.spec.ts`

**Critical flows to cover:**

1. New user onboarding wizard
2. Create family → Add member → Set health goals
3. Generate meal plan → View nutrition → Add to shopping list
4. Record health data → View trends → AI analysis

---

### Task 10: DI Container Migration

**Priority:** P2 - Architecture improvement

**Files:**

- Modify: `src/lib/container/service-container.ts`
- Modify: All services with `// TODO: 迁移所有使用方` comments

**Pattern:**

```typescript
// Before (singleton export)
export const inventoryTracker = new InventoryTracker();

// After (DI container)
container.register("inventoryTracker", () => new InventoryTracker());
export const getInventoryTracker = () =>
  container.resolve<InventoryTracker>("inventoryTracker");
```

---

## Phase 4: Future Enhancements (Backlog)

### Task 11: Internationalization Framework

**Priority:** P3

**Approach:** Integrate `next-intl` for full i18n support.

### Task 12: Bundle Size Optimization

**Priority:** P3

**Commands:**

```bash
pnpm build:cloudflare
pnpm check-bundle-size
```

---

## Execution Checklist

| #   | Task                        | Phase | Priority | Status |
| --- | --------------------------- | ----- | -------- | ------ |
| 1   | Fix Jest Test Environment   | 1     | P0       | [ ]    |
| 2   | Add ENCRYPTION_KEY          | 1     | P1       | [ ]    |
| 3   | Firebase Push Notifications | 1     | P0       | [ ]    |
| 4   | HealthKit Real Integration  | 2     | P1       | [ ]    |
| 5   | Huawei Health Integration   | 2     | P1       | [ ]    |
| 6   | GPT-4V Food Recognition     | 2     | P1       | [ ]    |
| 7   | NextAuth Cleanup            | 2     | P1       | [ ]    |
| 8   | Barcode Scanning            | 3     | P2       | [ ]    |
| 9   | E2E Test Coverage           | 3     | P2       | [ ]    |
| 10  | DI Container Migration      | 3     | P2       | [ ]    |
| 11  | Internationalization        | 4     | P3       | [ ]    |
| 12  | Bundle Optimization         | 4     | P3       | [ ]    |

---

**End of Plan**
