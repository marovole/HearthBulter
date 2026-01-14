import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Shared validators
const softDelete = {
  deletedAt: v.optional(v.number()),
};

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

export default defineSchema({
  // ==================== Users & Families ====================
  users: defineTable({
    email: v.string(),
    emailVerified: v.optional(v.number()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  families: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
    creatorId: v.id("users"),
    ...softDelete,
    ...timestamps,
  })
    .index("by_creator", ["creatorId"])
    .index("by_invite_code", ["inviteCode"]),

  familyMembers: defineTable({
    name: v.string(),
    gender: v.union(v.literal("MALE"), v.literal("FEMALE"), v.literal("OTHER")),
    birthDate: v.number(),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    avatar: v.optional(v.string()),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
    role: v.union(v.literal("ADMIN"), v.literal("MEMBER"), v.literal("GUEST")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_family", ["familyId"])
    .index("by_user", ["userId"])
    .index("by_family_active", ["familyId", "deletedAt"]),

  // ==================== Health Data ====================
  healthData: defineTable({
    memberId: v.id("familyMembers"),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    measuredAt: v.number(),
    source: v.string(),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_date", ["memberId", "measuredAt"]),

  healthGoals: defineTable({
    memberId: v.id("familyMembers"),
    goalType: v.string(),
    targetValue: v.number(),
    currentValue: v.number(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    status: v.string(),
    ...softDelete,
    ...timestamps,
  }).index("by_member", ["memberId"]),

  // ==================== Foods & Inventory ====================
  foods: defineTable({
    name: v.string(),
    nameEn: v.optional(v.string()),
    aliases: v.array(v.string()),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    category: v.string(),
    tags: v.array(v.string()),
    source: v.union(
      v.literal("USDA"),
      v.literal("LOCAL"),
      v.literal("USER_SUBMITTED"),
    ),
    verified: v.boolean(),
    ...timestamps,
  })
    .index("by_category", ["category"])
    .index("by_name", ["name"])
    .searchIndex("search_foods", { searchField: "name" }),

  inventoryItems: defineTable({
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.number(),
    unit: v.string(),
    originalQuantity: v.number(),
    purchaseDate: v.number(),
    purchasePrice: v.optional(v.number()), // in cents/fen
    purchaseSource: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    productionDate: v.optional(v.number()),
    storageLocation: v.string(),
    storageNotes: v.optional(v.string()),
    minStockThreshold: v.optional(v.number()),
    status: v.string(),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
    packageInfo: v.optional(v.string()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_food", ["foodId"])
    .index("by_expiry", ["expiryDate"])
    .index("by_member_status", ["memberId", "status"]),

  // ==================== Budget ====================
  budgets: defineTable({
    memberId: v.id("familyMembers"),
    name: v.string(),
    totalAmount: v.number(),
    usedAmount: v.number(),
    period: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    ...softDelete,
    ...timestamps,
  }).index("by_member", ["memberId"]),

  // ==================== Meal Plans ====================
  mealPlans: defineTable({
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    goalType: v.string(),
    targetCalories: v.number(),
    status: v.string(),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_date", ["startDate", "endDate"]),

  meals: defineTable({
    planId: v.id("mealPlans"),
    date: v.number(),
    mealType: v.union(
      v.literal("BREAKFAST"),
      v.literal("LUNCH"),
      v.literal("DINNER"),
      v.literal("SNACK"),
    ),
    recipeId: v.optional(v.id("recipes")),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    ...timestamps,
  })
    .index("by_plan", ["planId"])
    .index("by_plan_date", ["planId", "date"]),

  // ==================== Recipes ====================
  recipes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    cuisine: v.optional(v.string()),
    difficulty: v.union(
      v.literal("EASY"),
      v.literal("MEDIUM"),
      v.literal("HARD"),
    ),
    prepTime: v.number(),
    cookTime: v.number(),
    servings: v.number(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    imageUrl: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    isPublic: v.boolean(),
    creatorId: v.optional(v.id("users")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_category", ["category"])
    .searchIndex("search_recipes", { searchField: "name" }),

  // ==================== Tasks & Activities ====================
  tasks: defineTable({
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    assigneeId: v.optional(v.id("familyMembers")),
    creatorId: v.id("familyMembers"),
    status: v.union(
      v.literal("TODO"),
      v.literal("IN_PROGRESS"),
      v.literal("DONE"),
    ),
    priority: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
    dueDate: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_family", ["familyId"])
    .index("by_assignee", ["assigneeId"]),

  activities: defineTable({
    familyId: v.id("families"),
    memberId: v.optional(v.id("familyMembers")),
    type: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ...timestamps,
  })
    .index("by_family", ["familyId"])
    .index("by_member", ["memberId"]),
});
