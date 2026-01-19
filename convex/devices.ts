import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listConnections = query({
  args: {
    memberIds: v.array(v.id("familyMembers")),
    memberId: v.optional(v.id("familyMembers")),
    platform: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const memberSet = new Set(args.memberIds);
    let connections = await ctx.db.query("deviceConnections").collect();

    connections = connections.filter((connection) =>
      memberSet.has(connection.memberId),
    );

    if (args.memberId) {
      connections = connections.filter(
        (connection) => connection.memberId === args.memberId,
      );
    }

    if (args.platform) {
      connections = connections.filter(
        (connection) => connection.platform === args.platform,
      );
    }

    if (args.isActive !== undefined) {
      connections = connections.filter(
        (connection) => connection.isActive === args.isActive,
      );
    }

    connections.sort((a, b) => {
      const aValue = a.lastSyncAt ?? 0;
      const bValue = b.lastSyncAt ?? 0;
      return bValue - aValue;
    });

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;
    const pageItems = connections.slice(offset, offset + limit);

    const data = await Promise.all(
      pageItems.map(async (connection) => {
        const member = await ctx.db.get(connection.memberId);
        return {
          ...connection,
          member: member
            ? {
                id: member._id,
                name: member.name,
              }
            : null,
        };
      }),
    );

    return {
      data,
      total: connections.length,
    };
  },
});

export const getById = query({
  args: { id: v.id("deviceConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.id);
    if (!connection) return null;

    const member = await ctx.db.get(connection.memberId);

    return {
      ...connection,
      member: member
        ? {
            id: member._id,
            name: member.name,
            userId: member.userId,
            familyId: member.familyId,
          }
        : null,
    };
  },
});

export const getActiveByDeviceId = query({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("deviceConnections")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .collect();

    return connections.find((connection) => connection.isActive) ?? null;
  },
});

export const getActiveByDeviceAndMember = query({
  args: {
    deviceId: v.string(),
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("deviceConnections")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .collect();

    return (
      connections.find(
        (connection) =>
          connection.isActive && connection.memberId === args.memberId,
      ) ?? null
    );
  },
});

export const createConnection = mutation({
  args: {
    memberId: v.id("familyMembers"),
    deviceId: v.string(),
    legacyId: v.optional(v.string()),
    deviceName: v.string(),
    deviceType: v.string(),
    manufacturer: v.string(),
    model: v.optional(v.string()),
    firmwareVersion: v.optional(v.string()),
    platform: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    permissions: v.optional(v.any()),
    dataTypes: v.optional(v.any()),
    syncInterval: v.optional(v.number()),
    syncStatus: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isAutoSync: v.optional(v.boolean()),
    connectionDate: v.optional(v.number()),
    errorCount: v.optional(v.number()),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("deviceConnections", {
      memberId: args.memberId,
      deviceId: args.deviceId,
      legacyId: args.legacyId,
      deviceName: args.deviceName,
      deviceType: args.deviceType,
      manufacturer: args.manufacturer,
      model: args.model,
      firmwareVersion: args.firmwareVersion,
      platform: args.platform,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      permissions: args.permissions,
      dataTypes: args.dataTypes,
      syncInterval: args.syncInterval ?? 1800,
      isActive: args.isActive ?? true,
      isAutoSync: args.isAutoSync ?? true,
      syncStatus: args.syncStatus ?? "PENDING",
      lastSyncAt: args.lastSyncAt,
      connectionDate: args.connectionDate ?? now,
      createdAt: now,
      updatedAt: now,
      errorCount: args.errorCount ?? 0,
      retryCount: args.retryCount ?? 0,
    });
  },
});

export const updateConnection = mutation({
  args: {
    id: v.id("deviceConnections"),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args.patch,
      updatedAt: Date.now(),
    });
  },
});

export const listActiveAutoSync = query({
  args: {},
  handler: async (ctx) => {
    let connections = await ctx.db.query("deviceConnections").collect();

    connections = connections.filter(
      (connection) =>
        connection.isActive &&
        connection.isAutoSync &&
        connection.syncStatus !== "DISABLED",
    );

    const data = await Promise.all(
      connections.map(async (connection) => {
        const member = await ctx.db.get(connection.memberId);
        return {
          ...connection,
          member: member
            ? {
                id: member._id,
                name: member.name,
                userId: member.userId,
              }
            : null,
        };
      }),
    );

    return data;
  },
});
