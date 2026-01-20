import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "../../../app/api/notifications/push/route";

jest.mock("../../../lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const prismaMock = {
  notificationPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

describe("/api/notifications/push", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns saved subscriptions", async () => {
    prismaMock.notificationPreference.findUnique.mockResolvedValue({
      pushToken: JSON.stringify([
        {
          endpoint: "https://example.com/push/1",
          keys: { p256dh: "key", auth: "auth" },
        },
      ]),
      pushEnabled: true,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/notifications/push?memberId=member-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscriptions).toHaveLength(1);
    expect(data.pushEnabled).toBe(true);
  });

  it("stores new subscription on POST", async () => {
    prismaMock.notificationPreference.findUnique.mockResolvedValue({
      pushToken: null,
    });
    prismaMock.notificationPreference.upsert.mockResolvedValue({});

    const request = new NextRequest("http://localhost:3000/api/notifications/push", {
      method: "POST",
      body: JSON.stringify({
        memberId: "member-1",
        subscription: {
          endpoint: "https://example.com/push/1",
          keys: { p256dh: "key", auth: "auth" },
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: "member-1" },
        update: expect.objectContaining({ pushEnabled: true }),
        create: expect.objectContaining({ pushEnabled: true }),
      })
    );
    expect(data.subscriptions).toHaveLength(1);
  });

  it("removes subscription on DELETE", async () => {
    prismaMock.notificationPreference.findUnique.mockResolvedValue({
      pushToken: JSON.stringify([
        {
          endpoint: "https://example.com/push/1",
          keys: { p256dh: "key", auth: "auth" },
        },
      ]),
    });
    prismaMock.notificationPreference.upsert.mockResolvedValue({});

    const request = new NextRequest("http://localhost:3000/api/notifications/push", {
      method: "DELETE",
      body: JSON.stringify({
        memberId: "member-1",
        endpoint: "https://example.com/push/1",
      }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pushEnabled).toBe(false);
    expect(data.subscriptions).toHaveLength(0);
  });
});
