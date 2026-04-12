const mockConvexQuery = jest.fn();

jest.mock("@/lib/convex-client", () => ({
  api: {
    members: {
      getById: "members.getById",
      getByClerkInFamily: "members.getByClerkInFamily",
    },
    families: {
      getById: "families.getById",
    },
  },
  convexClient: {
    query: (...args: any[]) => mockConvexQuery(...args),
  },
}));

import { verifyMemberAccess } from "@/lib/utils/member-access";

describe("member-access (Convex)", () => {
  beforeEach(() => {
    mockConvexQuery.mockReset();
  });

  it("成员不存在时返回无权限", async () => {
    mockConvexQuery.mockResolvedValueOnce(null);

    const result = await verifyMemberAccess("member-1", "clerk-1");

    expect(result).toEqual({ hasAccess: false, member: null });
  });

  it("同家庭管理员可访问成员", async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        _id: "member-1",
        familyId: "family-1",
        userId: "user-target",
        role: "MEMBER",
        name: "目标成员",
        gender: "OTHER",
        birthDate: Date.now(),
      })
      .mockResolvedValueOnce({
        _id: "family-1",
        creatorId: "user-owner",
      })
      .mockResolvedValueOnce({
        _id: "member-admin",
        familyId: "family-1",
        userId: "user-admin",
        role: "ADMIN",
      });

    const result = await verifyMemberAccess("member-1", "clerk-admin");

    expect(result.hasAccess).toBe(true);
    expect(result.member?.id).toBe("member-1");
  });

  it("非管理员且非本人无权限", async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        _id: "member-1",
        familyId: "family-1",
        userId: "user-target",
        role: "MEMBER",
        name: "目标成员",
        gender: "OTHER",
        birthDate: Date.now(),
      })
      .mockResolvedValueOnce({
        _id: "family-1",
        creatorId: "user-owner",
      })
      .mockResolvedValueOnce({
        _id: "member-other",
        familyId: "family-1",
        userId: "user-other",
        role: "MEMBER",
      });

    const result = await verifyMemberAccess("member-1", "clerk-other");

    expect(result.hasAccess).toBe(false);
    expect(result.member?.id).toBe("member-1");
  });
});
