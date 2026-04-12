const mockConvexQuery = jest.fn();

jest.mock("@/lib/convex-client", () => ({
  api: {
    members: {
      getById: "members.getById",
      getByClerkInFamily: "members.getByClerkInFamily",
      listByClerkId: "members.listByClerkId",
    },
    families: {
      getById: "families.getById",
    },
    users: {
      getById: "users.getById",
    },
  },
  convexClient: {
    query: (...args: any[]) => mockConvexQuery(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import {
  requireAdmin,
  requireFamilyAccess,
  requireFamilyMembership,
} from "@/lib/middleware/authorization";

describe("authorization middleware (Convex)", () => {
  beforeEach(() => {
    mockConvexQuery.mockReset();
  });

  it("同家庭成员可通过 requireFamilyMembership", async () => {
    mockConvexQuery
      .mockResolvedValueOnce({ _id: "m1", familyId: "f1", userId: "u-target" })
      .mockResolvedValueOnce({ _id: "f1", creatorId: "u-owner" })
      .mockResolvedValueOnce({ _id: "m-self", familyId: "f1", userId: "u-self", role: "MEMBER" });

    const result = await requireFamilyMembership("clerk-1", "member-1");

    expect(result.authorized).toBe(true);
  });

  it("requireFamilyAccess 在非家庭成员时拒绝", async () => {
    mockConvexQuery.mockResolvedValueOnce(null);

    const result = await requireFamilyAccess("clerk-1", "family-1");

    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("无权访问此家庭");
  });

  it("requireAdmin 在存在 ADMIN 成员角色时放行", async () => {
    mockConvexQuery.mockResolvedValueOnce([{ _id: "m-admin", role: "ADMIN", userId: "u-admin" }]);

    const result = await requireAdmin("clerk-admin");

    expect(result.authorized).toBe(true);
  });
});
