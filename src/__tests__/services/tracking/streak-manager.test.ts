const mockConvexQuery = jest.fn();
const mockConvexMutation = jest.fn();

jest.mock("@/lib/convex-client", () => ({
  api: {
    analytics: {
      getTrackingStreak: "analytics.getTrackingStreak",
      upsertTrackingStreak: "analytics.upsertTrackingStreak",
      listDailyNutritionTargets: "analytics.listDailyNutritionTargets",
      countMealLogs: "analytics.countMealLogs",
    },
    families: {
      listMembers: "families.listMembers",
    },
  },
  convexClient: {
    query: (...args: any[]) => mockConvexQuery(...args),
    mutation: (...args: any[]) => mockConvexMutation(...args),
  },
}));

import {
  BADGES,
  checkAndUnlockBadges,
  getTrackingStreak,
} from "@/lib/services/tracking/streak-manager";

describe("streak-manager (Convex)", () => {
  beforeEach(() => {
    mockConvexQuery.mockReset();
    mockConvexMutation.mockReset();
  });

  it("创建缺失 streak 记录并返回徽章信息", async () => {
    mockConvexQuery.mockResolvedValueOnce(null);

    const result = await getTrackingStreak("member-1");

    expect(mockConvexMutation).toHaveBeenCalledWith("analytics.upsertTrackingStreak", {
      memberId: "member-1",
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      badges: "[]",
    });
    expect(result.badges).toEqual([]);
    expect(result.nextBadge?.id).toBe(BADGES[0].id);
    expect(result.daysUntilNextBadge).toBe(7);
  });

  it("达到门槛时解锁新徽章并回写 badges", async () => {
    mockConvexQuery.mockResolvedValueOnce({
      memberId: "member-1",
      currentStreak: 30,
      longestStreak: 30,
      totalDays: 45,
      lastCheckIn: Date.now(),
      badges: "[]",
    });

    const newBadges = await checkAndUnlockBadges("member-1");

    expect(newBadges.map((badge) => badge.id)).toEqual(["7-days", "30-days"]);
    expect(mockConvexMutation).toHaveBeenCalledWith(
      "analytics.upsertTrackingStreak",
      expect.objectContaining({
        memberId: "member-1",
        currentStreak: 30,
        longestStreak: 30,
        totalDays: 45,
      })
    );
    const payload = mockConvexMutation.mock.calls[0][1];
    expect(JSON.parse(payload.badges)).toEqual(["7-days", "30-days"]);
  });
});
