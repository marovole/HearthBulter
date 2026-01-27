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
    clerkId: v.string(),
    email: v.string(),
    emailVerified: v.optional(v.number()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  userConsents: defineTable({
    userId: v.id("users"),
    consentId: v.string(),
    granted: v.boolean(),
    context: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_user", ["userId"])
    .index("by_user_consent", ["userId", "consentId"]),

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

  deviceConnections: defineTable({
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
    isActive: v.boolean(),
    isAutoSync: v.boolean(),
    syncStatus: v.string(),
    lastSyncAt: v.optional(v.number()),
    connectionDate: v.optional(v.number()),
    disconnectionDate: v.optional(v.number()),
    errorCount: v.optional(v.number()),
    lastError: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_device", ["deviceId"])
    .index("by_platform", ["platform"])
    .index("by_active", ["isActive"]),

  // ==================== Health Data ====================
  healthData: defineTable({
    memberId: v.id("familyMembers"),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    muscleMass: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    bloodSugar: v.optional(v.number()),
    sleep: v.optional(v.number()),
    exercise: v.optional(v.number()),
    steps: v.optional(v.number()),
    measuredAt: v.number(),
    source: v.string(),
    notes: v.optional(v.string()),
    deviceConnectionId: v.optional(v.id("deviceConnections")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_date", ["memberId", "measuredAt"])
    .index("by_device", ["deviceConnectionId"]),

  healthGoals: defineTable({
    memberId: v.id("familyMembers"),
    goalType: v.string(),
    targetValue: v.number(),
    currentValue: v.number(),
    startWeight: v.optional(v.number()),
    targetWeeks: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    status: v.string(),
    progress: v.optional(v.number()),
    tdee: v.optional(v.number()),
    bmr: v.optional(v.number()),
    activityFactor: v.optional(v.number()),
    carbRatio: v.optional(v.number()),
    proteinRatio: v.optional(v.number()),
    fatRatio: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  }).index("by_member", ["memberId"]),

  allergies: defineTable({
    memberId: v.id("familyMembers"),
    allergenType: v.string(),
    allergenName: v.string(),
    severity: v.string(),
    description: v.optional(v.string()),
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
    source: v.union(v.literal("USDA"), v.literal("LOCAL"), v.literal("USER_SUBMITTED")),
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
    lastUsedAt: v.optional(v.number()),
    usageCount: v.optional(v.number()),
    wasteCount: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_food", ["foodId"])
    .index("by_expiry", ["expiryDate"])
    .index("by_member_status", ["memberId", "status"]),

  inventoryUsages: defineTable({
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    reason: v.string(),
    mealId: v.optional(v.id("meals")),
    recipeId: v.optional(v.id("recipes")),
    notes: v.optional(v.string()),
    usageDate: v.number(),
    ...timestamps,
  })
    .index("by_item", ["inventoryItemId"])
    .index("by_item_date", ["inventoryItemId", "usageDate"]),

  wasteRecords: defineTable({
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    reason: v.string(),
    wasteDate: v.number(),
    notes: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_item", ["inventoryItemId"])
    .index("by_item_date", ["inventoryItemId", "wasteDate"]),

  notifications: defineTable({
    memberId: v.id("familyMembers"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    priority: v.string(),
    channels: v.array(v.string()),
    metadata: v.optional(v.any()),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    dedupKey: v.optional(v.string()),
    batchId: v.optional(v.string()),
    status: v.string(),
    readAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    retryCount: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    deliveryResults: v.optional(v.string()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_status", ["memberId", "status"])
    .index("by_member_read", ["memberId", "readAt"]),

  notificationLogs: defineTable({
    notificationId: v.id("notifications"),
    memberId: v.id("familyMembers"),
    channel: v.string(),
    status: v.string(),
    detail: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_notification", ["notificationId"])
    .index("by_member", ["memberId"]),

  notificationPreferences: defineTable({
    memberId: v.id("familyMembers"),
    channelPreferences: v.optional(v.any()),
    quietHours: v.optional(v.any()),
    mutedTypes: v.optional(v.array(v.string())),
    phoneNumber: v.optional(v.string()),
    wechatOpenId: v.optional(v.string()),
    pushToken: v.optional(v.any()),
    pushEnabled: v.optional(v.boolean()),
    lastUpdatedAt: v.number(),
    ...timestamps,
  }).index("by_member", ["memberId"]),

  scheduledNotifications: defineTable({
    memberId: v.id("familyMembers"),
    notificationId: v.optional(v.id("notifications")),
    payload: v.any(),
    scheduledTime: v.number(),
    status: v.string(),
    retryCount: v.number(),
    ...timestamps,
  })
    .index("by_schedule", ["scheduledTime"])
    .index("by_status", ["status"]),

  notificationTemplates: defineTable({
    type: v.string(),
    titleTemplate: v.string(),
    contentTemplate: v.string(),
    channelTemplates: v.optional(v.any()),
    variables: v.optional(v.any()),
    isActive: v.boolean(),
    version: v.string(),
    defaultChannels: v.optional(v.any()),
    defaultPriority: v.optional(v.string()),
    translations: v.optional(v.any()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    usageCount: v.optional(v.number()),
    lastUsed: v.optional(v.number()),
    ...timestamps,
  }).index("by_type", ["type"]),

  // ==================== Budget ====================
  budgets: defineTable({
    memberId: v.id("familyMembers"),
    name: v.string(),
    totalAmount: v.number(),
    usedAmount: v.number(),
    period: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    status: v.optional(v.string()),
    alertThreshold80: v.optional(v.boolean()),
    alertThreshold100: v.optional(v.boolean()),
    alertThreshold110: v.optional(v.boolean()),
    vegetableBudget: v.optional(v.number()),
    meatBudget: v.optional(v.number()),
    fruitBudget: v.optional(v.number()),
    grainBudget: v.optional(v.number()),
    seafoodBudget: v.optional(v.number()),
    dairyBudget: v.optional(v.number()),
    oilsBudget: v.optional(v.number()),
    snacksBudget: v.optional(v.number()),
    beveragesBudget: v.optional(v.number()),
    otherBudget: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_status", ["memberId", "status"]),

  spendings: defineTable({
    budgetId: v.id("budgets"),
    amount: v.number(),
    description: v.optional(v.string()),
    category: v.string(),
    transactionId: v.optional(v.string()),
    platform: v.optional(v.string()),
    purchaseDate: v.number(),
    items: v.optional(v.any()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_budget", ["budgetId"])
    .index("by_budget_date", ["budgetId", "purchaseDate"]),

  priceHistories: defineTable({
    foodId: v.id("foods"),
    price: v.number(),
    unitPrice: v.number(),
    unit: v.string(),
    platform: v.string(),
    source: v.optional(v.string()),
    isValid: v.boolean(),
    recordedAt: v.number(),
    ...timestamps,
  })
    .index("by_food", ["foodId"])
    .index("by_food_valid", ["foodId", "isValid"])
    .index("by_food_recorded", ["foodId", "recordedAt"]),

  budgetAlerts: defineTable({
    budgetId: v.id("budgets"),
    type: v.string(),
    threshold: v.number(),
    currentValue: v.number(),
    message: v.string(),
    category: v.optional(v.string()),
    status: v.string(),
    ...timestamps,
  })
    .index("by_budget", ["budgetId"])
    .index("by_budget_status", ["budgetId", "status"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    resetAt: v.number(),
    windowMs: v.number(),
    ...timestamps,
  }).index("by_key", ["key"]),

  savingsRecommendations: defineTable({
    memberId: v.id("familyMembers"),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    savings: v.number(),
    originalPrice: v.optional(v.number()),
    discountedPrice: v.optional(v.number()),
    platform: v.optional(v.string()),
    foodItems: v.optional(v.any()),
    validUntil: v.optional(v.number()),
    ...timestamps,
  }).index("by_member", ["memberId"]),

  // ==================== Meal Plans ====================
  mealPlans: defineTable({
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    goalType: v.string(),
    targetCalories: v.number(),
    targetProtein: v.optional(v.number()),
    targetCarbs: v.optional(v.number()),
    targetFat: v.optional(v.number()),
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
      v.literal("SNACK")
    ),
    recipeId: v.optional(v.id("recipes")),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    isFavorite: v.optional(v.boolean()),
    ...timestamps,
  })
    .index("by_plan", ["planId"])
    .index("by_plan_date", ["planId", "date"]),

  mealIngredients: defineTable({
    mealId: v.id("meals"),
    foodId: v.id("foods"),
    amount: v.number(),
    ...timestamps,
  })
    .index("by_meal", ["mealId"])
    .index("by_food", ["foodId"]),

  shoppingLists: defineTable({
    planId: v.id("mealPlans"),
    name: v.string(),
    budget: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    status: v.string(),
    deletedAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_plan", ["planId"])
    .index("by_status", ["status"]),

  shoppingListItems: defineTable({
    shoppingListId: v.id("shoppingLists"),
    foodId: v.id("foods"),
    category: v.string(),
    quantity: v.number(),
    unit: v.string(),
    purchased: v.boolean(),
    notes: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_list", ["shoppingListId"])
    .index("by_food", ["foodId"]),

  shoppingListShares: defineTable({
    listId: v.id("shoppingLists"),
    token: v.string(),
    expiresAt: v.number(),
    createdBy: v.string(),
    viewCount: v.number(),
    lastViewedAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_token", ["token"])
    .index("by_list", ["listId"]),

  sharedContents: defineTable({
    memberId: v.id("familyMembers"),
    contentType: v.string(),
    privacyLevel: v.string(),
    targetId: v.optional(v.string()),
    sharedPlatforms: v.array(v.string()),
    shareToken: v.string(),
    shareUrl: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    status: v.string(),
    expiresAt: v.optional(v.number()),
    allowComment: v.optional(v.boolean()),
    allowLike: v.optional(v.boolean()),
    viewCount: v.number(),
    likeCount: v.number(),
    commentCount: v.number(),
    shareCount: v.number(),
    clickCount: v.number(),
    downloadCount: v.number(),
    conversionCount: v.number(),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_token", ["shareToken"])
    .index("by_status", ["status"]),

  shareTracking: defineTable({
    shareToken: v.string(),
    eventType: v.string(),
    platform: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    referrer: v.optional(v.string()),
    metadata: v.optional(v.any()),
    occurredAt: v.number(),
    ...timestamps,
  })
    .index("by_token", ["shareToken"])
    .index("by_token_occurred", ["shareToken", "occurredAt"])
    .index("by_event", ["eventType"])
    .index("by_occurred", ["occurredAt"]),

  achievements: defineTable({
    memberId: v.id("familyMembers"),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    rarity: v.string(),
    level: v.number(),
    points: v.number(),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    progress: v.number(),
    isUnlocked: v.boolean(),
    unlockedAt: v.optional(v.number()),
    isShared: v.boolean(),
    sharedAt: v.optional(v.number()),
    rewardType: v.optional(v.string()),
    rewardValue: v.optional(v.string()),
    rewardClaimed: v.boolean(),
    metadata: v.optional(v.any()),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_type_level", ["memberId", "type", "level"])
    .index("by_type", ["type"])
    .index("by_rarity", ["rarity"])
    .index("by_unlocked", ["isUnlocked"])
    .index("by_unlocked_at", ["unlockedAt"])
    .index("by_points", ["points"]),

  leaderboardEntries: defineTable({
    memberId: v.id("familyMembers"),
    leaderboardType: v.string(),
    period: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    score: v.number(),
    rank: v.number(),
    previousRank: v.optional(v.number()),
    rankChange: v.optional(v.number()),
    totalParticipants: v.number(),
    percentile: v.optional(v.number()),
    isAnonymous: v.boolean(),
    showRank: v.boolean(),
    metadata: v.optional(v.any()),
    calculatedAt: v.number(),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_type", ["leaderboardType"])
    .index("by_period", ["period"])
    .index("by_rank", ["rank"])
    .index("by_score", ["score"])
    .index("by_calculated", ["calculatedAt"])
    .index("by_member_type_created", ["memberId", "leaderboardType", "createdAt"]),

  // ==================== Recipes ====================
  recipes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    cuisine: v.optional(v.string()),
    difficulty: v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD")),
    prepTime: v.number(),
    cookTime: v.number(),
    totalTime: v.optional(v.number()),
    servings: v.number(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    sodium: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    mealTypes: v.optional(v.array(v.string())),
    averageRating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    favoriteCount: v.optional(v.number()),
    viewCount: v.optional(v.number()),
    status: v.optional(v.string()),
    isPublic: v.boolean(),
    isVerified: v.optional(v.boolean()),
    seasons: v.optional(v.array(v.string())),
    estimatedCost: v.optional(v.number()),
    costLevel: v.optional(v.string()),
    creatorId: v.optional(v.id("users")),
    ...softDelete,
    ...timestamps,
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_rating", ["averageRating"])
    .index("by_views", ["viewCount"])
    .searchIndex("search_recipes", { searchField: "name" }),

  recipeIngredients: defineTable({
    recipeId: v.id("recipes"),
    foodId: v.id("foods"),
    amount: v.number(),
    unit: v.string(),
    notes: v.optional(v.string()),
    optional: v.optional(v.boolean()),
    isSubstitutable: v.optional(v.boolean()),
    ...timestamps,
  })
    .index("by_recipe", ["recipeId"])
    .index("by_food", ["foodId"]),

  recipeInstructions: defineTable({
    recipeId: v.id("recipes"),
    stepNumber: v.number(),
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    timer: v.optional(v.number()),
    temperature: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_recipe", ["recipeId"])
    .index("by_recipe_step", ["recipeId", "stepNumber"]),

  recipeRatings: defineTable({
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    rating: v.number(),
    comment: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ratedAt: v.number(),
    isPublic: v.boolean(),
    ...timestamps,
  })
    .index("by_recipe", ["recipeId"])
    .index("by_member", ["memberId"])
    .index("by_member_recipe", ["memberId", "recipeId"])
    .index("by_rated_at", ["ratedAt"]),

  recipeFavorites: defineTable({
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    favoritedAt: v.number(),
    notes: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_recipe", ["recipeId"])
    .index("by_member", ["memberId"])
    .index("by_member_recipe", ["memberId", "recipeId"])
    .index("by_favorited_at", ["favoritedAt"]),

  recipeViews: defineTable({
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    viewedAt: v.number(),
    viewDuration: v.optional(v.number()),
    source: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_recipe", ["recipeId"])
    .index("by_member", ["memberId"])
    .index("by_member_viewed_at", ["memberId", "viewedAt"])
    .index("by_viewed_at", ["viewedAt"]),

  ingredientSubstitutions: defineTable({
    originalIngredientId: v.id("recipeIngredients"),
    substituteFoodId: v.id("foods"),
    substitutionType: v.string(),
    reason: v.optional(v.string()),
    nutritionDelta: v.optional(v.any()),
    costDelta: v.optional(v.number()),
    tasteSimilarity: v.optional(v.number()),
    conditions: v.optional(v.array(v.string())),
    isValid: v.boolean(),
    ...timestamps,
  })
    .index("by_original", ["originalIngredientId"])
    .index("by_substitute", ["substituteFoodId"])
    .index("by_type", ["substitutionType"]),

  userPreferences: defineTable({
    memberId: v.id("familyMembers"),
    preferredIngredients: v.array(v.string()),
    avoidedIngredients: v.array(v.string()),
    maxCookTime: v.optional(v.number()),
    costLevel: v.string(),
    preferredCuisines: v.array(v.string()),
    recommendationWeights: v.optional(v.any()),
    learnedPreferences: v.optional(v.any()),
    ...timestamps,
  }).index("by_member", ["memberId"]),

  recommendationLogs: defineTable({
    memberId: v.id("familyMembers"),
    recipeId: v.id("recipes"),
    rank: v.number(),
    score: v.number(),
    reasons: v.array(v.string()),
    metadata: v.optional(v.any()),
    generatedAt: v.number(),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_recipe", ["recipeId"])
    .index("by_generated", ["generatedAt"]),

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
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("URGENT")
    ),
    dueDate: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    reminderSent: v.optional(v.boolean()),
    remindedAt: v.optional(v.number()),
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

  // ==================== Ecommerce ====================
  platformProducts: defineTable({
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
    isValid: v.boolean(),
    expiresAt: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_platform_product", ["platform", "platformProductId"])
    .index("by_valid", ["isValid"])
    .index("by_platform_valid", ["platform", "isValid"])
    .index("by_name", ["name"]),

  platformAccounts: defineTable({
    memberId: v.id("familyMembers"),
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    platformUserId: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_platform", ["platform"])
    .index("by_member_platform", ["memberId", "platform"]),

  ecommerceOrders: defineTable({
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
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_platform", ["platform"])
    .index("by_platform_order", ["platform", "platformOrderId"])
    .index("by_status", ["status"]),

  // ==================== Analytics ====================
  healthAnomalies: defineTable({
    memberId: v.id("familyMembers"),
    anomalyType: v.string(),
    severity: v.string(),
    title: v.string(),
    description: v.string(),
    dataType: v.optional(v.string()),
    value: v.number(),
    expectedMin: v.optional(v.number()),
    expectedMax: v.optional(v.number()),
    deviation: v.optional(v.number()),
    status: v.string(),
    detectedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolution: v.optional(v.string()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_status", ["memberId", "status"])
    .index("by_detected_at", ["detectedAt"]),

  dailyNutritionTargets: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    targetCalories: v.number(),
    targetProtein: v.number(),
    targetCarbs: v.number(),
    targetFat: v.number(),
    actualCalories: v.number(),
    actualProtein: v.number(),
    actualCarbs: v.number(),
    actualFat: v.number(),
    caloriesDeviation: v.optional(v.number()),
    proteinDeviation: v.optional(v.number()),
    carbsDeviation: v.optional(v.number()),
    fatDeviation: v.optional(v.number()),
    isCompleted: v.optional(v.boolean()),
    ...softDelete,
    ...timestamps,
  }).index("by_member_date", ["memberId", "date"]),

  auxiliaryTrackings: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    exerciseMinutes: v.optional(v.number()),
    sleepHours: v.optional(v.number()),
    sleepQuality: v.optional(v.string()),
    waterIntake: v.optional(v.number()),
    steps: v.optional(v.number()),
    standingHours: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  }).index("by_member_date", ["memberId", "date"]),

  healthScores: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    overallScore: v.number(),
    nutritionScore: v.number(),
    exerciseScore: v.number(),
    sleepScore: v.number(),
    medicalScore: v.number(),
    grade: v.string(),
    dataCompleteness: v.number(),
    recommendations: v.array(v.string()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_date", ["memberId", "date"]),

  healthReports: defineTable({
    memberId: v.id("familyMembers"),
    reportType: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    title: v.string(),
    summary: v.string(),
    htmlContent: v.string(),
    dataSnapshot: v.string(),
    insights: v.string(),
    overallScore: v.number(),
    status: v.string(),
    shareToken: v.optional(v.string()),
    shareExpiresAt: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_share_token", ["shareToken"]),

  medicalReports: defineTable({
    memberId: v.id("familyMembers"),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    ocrStatus: v.string(),
    ocrText: v.optional(v.union(v.string(), v.null())),
    ocrError: v.optional(v.union(v.string(), v.null())),
    reportDate: v.optional(v.union(v.number(), v.null())),
    institution: v.optional(v.union(v.string(), v.null())),
    reportType: v.optional(v.union(v.string(), v.null())),
    isCorrected: v.optional(v.boolean()),
    correctedAt: v.optional(v.union(v.number(), v.null())),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_status", ["memberId", "ocrStatus"]),

  medicalIndicators: defineTable({
    reportId: v.id("medicalReports"),
    indicatorType: v.string(),
    name: v.string(),
    value: v.number(),
    unit: v.string(),
    referenceRange: v.optional(v.union(v.string(), v.null())),
    isAbnormal: v.boolean(),
    status: v.string(),
    isCorrected: v.optional(v.boolean()),
    originalValue: v.optional(v.number()),
    ...timestamps,
  })
    .index("by_report", ["reportId"])
    .index("by_report_type", ["reportId", "indicatorType"]),

  trackingStreaks: defineTable({
    memberId: v.id("familyMembers"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    totalDays: v.number(),
    lastCheckIn: v.optional(v.number()),
    badges: v.string(),
    ...timestamps,
  }).index("by_member", ["memberId"]),

  mealLogs: defineTable({
    memberId: v.id("familyMembers"),
    date: v.number(),
    mealType: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    sodium: v.optional(v.number()),
    notes: v.optional(v.string()),
    checkedAt: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_date", ["memberId", "date"])
    .index("by_member_type", ["memberId", "mealType"]),

  mealLogFoods: defineTable({
    mealLogId: v.id("mealLogs"),
    foodId: v.id("foods"),
    amount: v.number(),
    ...timestamps,
  })
    .index("by_meal_log", ["mealLogId"])
    .index("by_food", ["foodId"]),

  quickTemplates: defineTable({
    memberId: v.id("familyMembers"),
    name: v.string(),
    description: v.optional(v.string()),
    mealType: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    score: v.number(),
    useCount: v.number(),
    lastUsed: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_type", ["memberId", "mealType"])
    .index("by_score", ["score"]),

  templateFoods: defineTable({
    templateId: v.id("quickTemplates"),
    foodId: v.id("foods"),
    amount: v.number(),
    ...timestamps,
  })
    .index("by_template", ["templateId"])
    .index("by_food", ["foodId"]),

  foodPhotos: defineTable({
    mealLogId: v.id("mealLogs"),
    storageId: v.optional(v.string()),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    recognitionStatus: v.string(),
    recognitionResult: v.optional(v.string()),
    confidence: v.optional(v.number()),
    recognitionError: v.optional(v.string()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_meal_log", ["mealLogId"])
    .index("by_status", ["recognitionStatus"]),

  healthReminders: defineTable({
    memberId: v.id("familyMembers"),
    reminderType: v.string(),
    enabled: v.boolean(),
    hour: v.number(),
    minute: v.number(),
    daysOfWeek: v.array(v.number()),
    message: v.optional(v.string()),
    lastTriggeredAt: v.optional(v.number()),
    streakDays: v.optional(v.number()),
    ...softDelete,
    ...timestamps,
  })
    .index("by_member", ["memberId"])
    .index("by_member_type", ["memberId", "reminderType"]),
});
