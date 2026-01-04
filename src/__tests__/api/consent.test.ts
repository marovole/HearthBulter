/**
 * AI Consent API 测试
 */

import { POST, GET } from "@/app/api/ai/consent/route";

// Mock Prisma for consent storage
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
        aiConsent: false,
        aiConsentTimestamp: new Date(),
      }),
      update: jest.fn().mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
        aiConsent: true,
        aiConsentTimestamp: new Date(),
      }),
      upsert: jest.fn().mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
        aiConsent: true,
        aiConsentTimestamp: new Date(),
      }),
    },
    userConsent: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "consent-1",
        userId: "test-user-id",
        consentType: "ai_health_analysis",
        granted: true,
        timestamp: new Date(),
      }),
      update: jest.fn().mockResolvedValue({
        id: "consent-1",
        userId: "test-user-id",
        consentType: "ai_health_analysis",
        granted: true,
        timestamp: new Date(),
      }),
      upsert: jest.fn().mockResolvedValue({
        id: "consent-1",
        userId: "test-user-id",
        consentType: "ai_health_analysis",
        granted: true,
        timestamp: new Date(),
      }),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

// Mock authentication
jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "test@example.com",
    },
  }),
}));

describe("/api/ai/consent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should grant AI consent successfully", async () => {
      const requestBody = {
        consentId: "ai_health_analysis",
        action: "grant",
        context: "user_initiated",
      };
      const request = new Request("http://localhost:3000/api/ai/consent", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("granted", true);
      expect(data).toHaveProperty("consent");
      expect(data).toHaveProperty("message");
    });

    it("should request AI consent successfully", async () => {
      const requestBody = {
        consentId: "ai_health_analysis",
        action: "request",
        context: "user_initiated",
      };
      const request = new Request("http://localhost:3000/api/ai/consent", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("granted");
      expect(data).toHaveProperty("consent");
      expect(data).toHaveProperty("consentType");
    });

    it("should handle missing consent ID", async () => {
      const requestBody = { action: "grant" }; // Missing consentId
      const request = new Request("http://localhost:3000/api/ai/consent", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
    });

    it("should handle invalid action", async () => {
      const requestBody = {
        consentId: "ai_health_analysis",
        action: "invalid_action",
      };
      const request = new Request("http://localhost:3000/api/ai/consent", {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
    });
  });

  describe("GET", () => {
    it("should retrieve all consent statuses", async () => {
      const request = new Request("http://localhost:3000/api/ai/consent");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("consents");
      expect(Array.isArray(data.consents)).toBe(true);
    });

    it("should retrieve specific consent status by ID", async () => {
      const request = new Request(
        "http://localhost:3000/api/ai/consent?consentId=ai_health_analysis",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("consentId", "ai_health_analysis");
      expect(data).toHaveProperty("hasConsent");
      expect(data).toHaveProperty("consentType");
    });
  });
});
