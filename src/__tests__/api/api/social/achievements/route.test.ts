/**
 * api/social/achievements/route.ts API 测试
 * 社交成就API测试
 */

import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { GET, POST } from "@/app/api/social/achievements/route";
import { auth } from "@/lib/auth";
import { achievementSystem } from "@/lib/services/social/achievement-system";
import { prisma } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/services/social/achievement-system", () => ({
  achievementSystem: {
    getAvailableAchievements: jest.fn(),
    unlockAchievement: jest.fn(),
  },
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    familyMember: {
      findFirst: jest.fn(),
    },
    achievement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockAvailableAchievements = [
  {
    type: "HEALTH_SCORE_90",
    name: "健康达人",
    description: "健康评分达到90分",
    icon: "💯",
    color: "#10b981",
    rarity: "RARE",
    points: 100,
    conditions: ["健康评分 >= 90"],
    checkFunction: jest.fn(),
  },
  {
    type: "SHARE_10_TIMES",
    name: "分享大师",
    description: "分享内容10次",
    icon: "📤",
    color: "#3b82f6",
    rarity: "UNCOMMON",
    points: 50,
    conditions: ["分享次数 >= 10"],
    checkFunction: jest.fn(),
  },
];

const mockUserAchievements = [
  {
    id: "achievement-1",
    type: "HEALTH_SCORE_90",
    name: "健康达人",
    description: "健康评分达到90分",
    icon: "💯",
    color: "#10b981",
    rarity: "RARE",
    points: 100,
    unlockedAt: new Date("2024-01-01"),
    member: {
      id: "member-1",
      name: "测试用户",
      avatar: null,
    },
  },
  {
    id: "achievement-2",
    type: "SHARE_5_TIMES",
    name: "分享新手",
    description: "分享内容5次",
    icon: "📤",
    color: "#8b5cf6",
    rarity: "COMMON",
    points: 25,
    unlockedAt: new Date("2024-01-02"),
    member: {
      id: "member-1",
      name: "测试用户",
      avatar: null,
    },
  },
];

describe("/api/social/achievements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_CODES = "ADMIN123";
  });

  describe("Authentication", () => {
    it("GET: should return 401 when user is not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/social/achievements");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("未授权访问");
    });

    it("POST: should return 401 when user is not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/social/achievements", {
        method: "POST",
        body: JSON.stringify({
          memberId: "member-1",
          type: "TEST_ACHIEVEMENT",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("未授权访问");
    });
  });

  describe("GET - Available Achievements", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (achievementSystem.getAvailableAchievements as jest.Mock).mockReturnValue(
        mockAvailableAchievements
      );
    });

    it("should return all available achievements", async () => {
      const request = new NextRequest("http://localhost:3000/api/social/achievements?all=true");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.achievements).toHaveLength(2);
      expect(data.data.achievements[0].type).toBe("HEALTH_SCORE_90");
      expect(data.data.achievements[0].isUnlocked).toBe(false);
    });
  });

  describe("GET - User Achievements", () => {
    const mockStats = {
      total: 2,
      totalPoints: 125,
      byRarity: {
        BRONZE: 0,
        SILVER: 0,
        GOLD: 0,
        PLATINUM: 0,
        DIAMOND: 0,
        COMMON: 1,
        UNCOMMON: 0,
        RARE: 1,
        EPIC: 0,
        LEGENDARY: 0,
      },
      byType: { HEALTH_SCORE_90: 1, SHARE_5_TIMES: 1 },
      recentUnlocks: expect.any(Array),
    };

    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (prisma.achievement.findMany as jest.Mock).mockResolvedValue(mockUserAchievements);
    });

    it("should return user achievements", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/social/achievements?memberId=member-1"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.achievements).toEqual(mockUserAchievements);
      expect(data.data.stats.total).toBe(2);
      expect(data.data.stats.totalPoints).toBe(125);
    });

    it("should filter by type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/social/achievements?memberId=member-1&type=HEALTH_SCORE_90"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.achievement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "HEALTH_SCORE_90" }),
        })
      );
    });

    it("should filter by rarity", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/social/achievements?memberId=member-1&rarity=RARE"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.achievement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rarity: "RARE" }),
        })
      );
    });
  });

  describe("POST - Manual Unlock Achievement", () => {
    const mockAchievement = {
      id: "achievement-3",
      type: "TEST_ACHIEVEMENT",
      name: "手动解锁",
      description: "管理员手动解锁",
      icon: "🏆",
      color: "#f59e0b",
      rarity: "RARE",
      points: 100,
      unlockedAt: new Date("2024-01-03"),
      memberId: "member-1",
    };

    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (achievementSystem.unlockAchievement as jest.Mock).mockResolvedValue(mockAchievement);
    });

    it("should unlock achievement with admin permission", async () => {
      const request = new NextRequest("http://localhost:3000/api/social/achievements", {
        method: "POST",
        body: JSON.stringify({
          memberId: "member-1",
          type: "TEST_ACHIEVEMENT",
          reason: "测试手动解锁",
          adminCode: "ADMIN123",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.achievement).toEqual(mockAchievement);
      expect(data.data.message).toBe("成就解锁成功");
    });

    it("should return 403 for invalid admin code", async () => {
      const request = new NextRequest("http://localhost:3000/api/social/achievements", {
        method: "POST",
        body: JSON.stringify({
          memberId: "member-1",
          type: "TEST_ACHIEVEMENT",
          adminCode: "INVALID_CODE",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("无管理员权限");
    });

    it("should return 409 when achievement already unlocked", async () => {
      (prisma.achievement.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-achievement",
      });

      const request = new NextRequest("http://localhost:3000/api/social/achievements", {
        method: "POST",
        body: JSON.stringify({
          memberId: "member-1",
          type: "HEALTH_SCORE_90",
          adminCode: "ADMIN123",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("该成就已经解锁");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    });

    it("GET: should handle service errors gracefully", async () => {
      (prisma.achievement.findMany as jest.Mock).mockRejectedValue(new Error("Service error"));

      const request = new NextRequest(
        "http://localhost:3000/api/social/achievements?memberId=member-1"
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("服务器内部错误");
    });

    it("POST: should handle service errors gracefully", async () => {
      (achievementSystem.unlockAchievement as jest.Mock).mockRejectedValue(
        new Error("Unlock failed")
      );

      const request = new NextRequest("http://localhost:3000/api/social/achievements", {
        method: "POST",
        body: JSON.stringify({
          memberId: "member-1",
          type: "TEST_ACHIEVEMENT",
          adminCode: "ADMIN123",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Unlock failed");
    });
  });
});
