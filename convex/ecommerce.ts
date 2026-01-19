import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const searchProducts = query({
  args: {
    keyword: v.string(),
    platform: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStock: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db.query("platformProducts").collect();

    if (args.platform) {
      products = products.filter((p) => p.platform === args.platform);
    }

    products = products.filter((p) => p.isValid);

    if (args.inStock) {
      products = products.filter((p) => p.isInStock);
    }

    if (args.minPrice !== undefined) {
      products = products.filter((p) => p.price >= args.minPrice!);
    }

    if (args.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= args.maxPrice!);
    }

    const keyword = args.keyword.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword) ||
        p.brand?.toLowerCase().includes(keyword),
    );

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;

    return {
      products: products.slice(offset, offset + limit),
      total: products.length,
      hasMore: products.length > offset + limit,
    };
  },
});

export const getProductById = query({
  args: {
    platform: v.string(),
    platformProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("platformProducts").collect();

    return (
      products.find(
        (p) =>
          p.platform === args.platform &&
          p.platformProductId === args.platformProductId &&
          p.isValid,
      ) || null
    );
  },
});

export const getProductsByFood = query({
  args: {
    foodId: v.id("foods"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const priceHistories = await ctx.db.query("priceHistories").collect();
    const foodPriceHistories = priceHistories.filter(
      (ph) => ph.foodId === args.foodId && ph.isValid,
    );

    const productMap = new Map<string, any>();
    for (const ph of foodPriceHistories) {
      const products = await ctx.db.query("platformProducts").collect();
      const product = products.find(
        (p) =>
          p.platform === ph.platform &&
          p.isValid &&
          p.expiresAt &&
          p.expiresAt > Date.now(),
      );
      if (product) {
        productMap.set(
          `${product.platform}-${product.platformProductId}`,
          product,
        );
      }
    }

    const limit = args.limit ?? 10;
    return Array.from(productMap.values()).slice(0, limit);
  },
});

export const upsertProduct = mutation({
  args: {
    platformProductId: v.string(),
    platform: v.string(),
    sku: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    specification: v.optional(v.any()),
    weight: v.optional(v.number()),
    volume: v.optional(v.number()),
    unit: v.optional(v.string()),
    price: v.number(),
    originalPrice: v.optional(v.number()),
    currency: v.string(),
    priceUnit: v.optional(v.string()),
    stock: v.number(),
    isInStock: v.boolean(),
    stockStatus: v.optional(v.string()),
    salesCount: v.optional(v.number()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    deliveryOptions: v.optional(v.any()),
    deliveryTime: v.optional(v.any()),
    shippingFee: v.optional(v.number()),
    platformData: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("platformProducts").collect();
    const existing = products.find(
      (p) =>
        p.platform === args.platform &&
        p.platformProductId === args.platformProductId,
    );

    const now = Date.now();
    const productData = {
      ...args,
      isValid: true,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, productData);
      return existing._id;
    } else {
      return await ctx.db.insert("platformProducts", {
        ...productData,
        createdAt: now,
      });
    }
  },
});

export const invalidateProduct = mutation({
  args: {
    platform: v.string(),
    platformProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("platformProducts").collect();
    const product = products.find(
      (p) =>
        p.platform === args.platform &&
        p.platformProductId === args.platformProductId,
    );

    if (product) {
      await ctx.db.patch(product._id, {
        isValid: false,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getPriceHistory = query({
  args: {
    foodId: v.id("foods"),
    platform: v.optional(v.string()),
    days: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    let histories = await ctx.db.query("priceHistories").collect();
    histories = histories.filter(
      (ph) =>
        ph.foodId === args.foodId &&
        ph.recordedAt >= startTime &&
        (!args.platform || ph.platform === args.platform),
    );

    const limit = args.limit ?? 100;
    return histories
      .sort((a, b) => b.recordedAt - a.recordedAt)
      .slice(0, limit);
  },
});

export const addPriceHistory = mutation({
  args: {
    foodId: v.id("foods"),
    price: v.number(),
    unitPrice: v.number(),
    unit: v.string(),
    platform: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("priceHistories", {
      ...args,
      isValid: true,
      recordedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getOrCreatePlatformAccount = query({
  args: {
    memberId: v.id("familyMembers"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db.query("platformAccounts").collect();
    return (
      accounts.find(
        (a) => a.memberId === args.memberId && a.platform === args.platform,
      ) || null
    );
  },
});

export const upsertPlatformAccount = mutation({
  args: {
    memberId: v.id("familyMembers"),
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    platformUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db.query("platformAccounts").collect();
    const existing = accounts.find(
      (a) => a.memberId === args.memberId && a.platform === args.platform,
    );

    const now = Date.now();
    const accountData = {
      ...args,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, accountData);
      return existing._id;
    } else {
      return await ctx.db.insert("platformAccounts", {
        ...accountData,
        createdAt: now,
      });
    }
  },
});

export const createOrder = mutation({
  args: {
    memberId: v.id("familyMembers"),
    platform: v.string(),
    platformOrderId: v.string(),
    status: v.string(),
    subtotal: v.number(),
    shippingFee: v.number(),
    discount: v.number(),
    totalAmount: v.number(),
    estimatedDeliveryTime: v.optional(v.string()),
    deliveryAddress: v.optional(v.any()),
    items: v.array(v.any()),
    platformResponse: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ecommerceOrders", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getOrders = query({
  args: {
    memberId: v.id("familyMembers"),
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let orders = await ctx.db.query("ecommerceOrders").collect();
    orders = orders.filter((o) => o.memberId === args.memberId);

    if (args.platform) {
      orders = orders.filter((o) => o.platform === args.platform);
    }

    if (args.status) {
      orders = orders.filter((o) => o.status === args.status);
    }

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;

    return {
      orders: orders.slice(offset, offset + limit),
      total: orders.length,
    };
  },
});

export const getOrderByPlatformId = query({
  args: {
    platform: v.string(),
    platformOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db.query("ecommerceOrders").collect();
    return (
      orders.find(
        (o) =>
          o.platform === args.platform &&
          o.platformOrderId === args.platformOrderId,
      ) || null
    );
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("ecommerceOrders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
