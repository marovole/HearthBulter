const mockConvexQuery = jest.fn();
const mockConvexMutation = jest.fn();

jest.mock("@/lib/convex-client", () => ({
  api: {
    health: {
      getMetrics: "health.getMetrics",
      listHealthRemindersByMember: "health.listHealthRemindersByMember",
      upsertHealthReminder: "health.upsertHealthReminder",
    },
  },
  convexClient: {
    query: (...args: any[]) => mockConvexQuery(...args),
    mutation: (...args: any[]) => mockConvexMutation(...args),
  },
}));

import { updateStreakDays } from "@/lib/utils/streak";

describe("updateStreakDays (Convex)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConvexQuery.mockReset();
    mockConvexMutation.mockReset();
  });

  it("今日无数据时不更新提醒", async () => {
    mockConvexQuery.mockResolvedValueOnce([]);

    await updateStreakDays("member-1");

    expect(mockConvexMutation).not.toHaveBeenCalled();
  });

  it("今日有数据且昨日有数据时 streak +1", async () => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    mockConvexQuery
      .mockResolvedValueOnce([{ _id: "h1", measuredAt: now, memberId: "member-1" }])
      .mockResolvedValueOnce([
        {
          _id: "r1",
          memberId: "member-1",
          reminderType: "DAILY",
          enabled: true,
          hour: 9,
          minute: 0,
          daysOfWeek: [1, 2, 3],
          message: "test",
          streakDays: 2,
        },
      ])
      .mockResolvedValueOnce([
        { _id: "h-y", measuredAt: today.getTime() - 1, memberId: "member-1" },
      ]);

    await updateStreakDays("member-1");

    expect(mockConvexMutation).toHaveBeenCalledWith(
      "health.upsertHealthReminder",
      expect.objectContaining({
        memberId: "member-1",
        reminderType: "DAILY",
        enabled: true,
      })
    );
  });
});
