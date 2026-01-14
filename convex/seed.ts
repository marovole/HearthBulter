import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed the database with initial test data.
 */
export const seedDatabase = mutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding database...");

    // 1. Clear existing data (optional, but good for fresh start)
    // In a real project you might want to check if data exists first.

    // 2. Create a test user
    const userId = await ctx.db.insert("users", {
      email: "test@example.com",
      name: "测试用户",
      role: "ADMIN",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Create a test family
    const familyId = await ctx.db.insert("families", {
      name: "温馨小家",
      description: "健康生活，从家开始",
      creatorId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 4. Create family members
    const member1Id = await ctx.db.insert("familyMembers", {
      name: "爸爸",
      gender: "MALE",
      birthDate: new Date("1980-01-01").getTime(),
      familyId: familyId,
      userId: userId,
      role: "ADMIN",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const member2Id = await ctx.db.insert("familyMembers", {
      name: "妈妈",
      gender: "FEMALE",
      birthDate: new Date("1982-05-20").getTime(),
      familyId: familyId,
      role: "MEMBER",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 5. Add some health data
    await ctx.db.insert("healthData", {
      memberId: member1Id,
      weight: 75.5,
      heartRate: 72,
      measuredAt: Date.now(),
      source: "MANUAL",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 6. Add some foods
    const foodId = await ctx.db.insert("foods", {
      name: "苹果",
      aliases: ["Apple"],
      calories: 52,
      protein: 0.3,
      carbs: 14,
      fat: 0.2,
      category: "FRUIT",
      tags: ["Healthy", "Fiber"],
      source: "LOCAL",
      verified: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 7. Add inventory items
    await ctx.db.insert("inventoryItems", {
      memberId: member1Id,
      foodId: foodId,
      quantity: 5,
      unit: "个",
      originalQuantity: 10,
      purchaseDate: Date.now(),
      storageLocation: "冰箱",
      status: "FRESH",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, message: "Database seeded successfully" };
  },
});
