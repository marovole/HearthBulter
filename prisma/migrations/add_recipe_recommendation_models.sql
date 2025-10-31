-- 添加食谱推荐系统相关模型
-- RecipeRating - 食谱评分表
CREATE TABLE IF NOT EXISTS "RecipeRating" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "review" TEXT,
  "helpfulCount" INTEGER DEFAULT 0,
  "isRecommended" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecipeRating_pkey" PRIMARY KEY ("id")
);

-- RecipeFavorite - 食谱收藏表
CREATE TABLE IF NOT EXISTS "RecipeFavorite" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "folderName" TEXT DEFAULT '默认收藏夹',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecipeFavorite_pkey" PRIMARY KEY ("id")
);

-- UserPreference - 用户偏好表
CREATE TABLE IF NOT EXISTS "UserPreference" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "dietType" TEXT,
  "isVegetarian" BOOLEAN DEFAULT false,
  "isVegan" BOOLEAN DEFAULT false,
  "isLowCarb" BOOLEAN DEFAULT false,
  "isLowFat" BOOLEAN DEFAULT false,
  "isHighProtein" BOOLEAN DEFAULT false,
  "preferredCuisines" TEXT,
  "preferredIngredients" TEXT,
  "avoidedIngredients" TEXT,
  "allergies" TEXT,
  "spiceLevel" TEXT DEFAULT 'MEDIUM',
  "cookingSkillLevel" TEXT DEFAULT 'MEDIUM',
  "maxCookTime" INTEGER,
  "costLevel" TEXT DEFAULT 'MEDIUM',
  "preferredMealTypes" TEXT,
  "nutritionGoals" TEXT,
  "calorieTarget" INTEGER,
  "proteinTarget" DOUBLE PRECISION,
  "carbsTarget" DOUBLE PRECISION,
  "fatTarget" DOUBLE PRECISION,
  "learnedPreferences" TEXT,
  "preferenceScore" DOUBLE PRECISION DEFAULT 0,
  "lastCalculatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- RecipeView - 食谱浏览历史表
CREATE TABLE IF NOT EXISTS "RecipeView" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "viewDuration" INTEGER DEFAULT 0,
  "viewSource" TEXT,
  "isCompleted" BOOLEAN DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "deviceType" TEXT,
  "sessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecipeView_pkey" PRIMARY KEY ("id")
);

-- IngredientSubstitution - 食材替换记录表
CREATE TABLE IF NOT EXISTS "IngredientSubstitution" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "originalIngredientId" TEXT NOT NULL,
  "substitutedIngredientId" TEXT NOT NULL,
  "substitutionReason" TEXT,
  "quantityRatio" DOUBLE PRECISION DEFAULT 1.0,
  "qualityImpact" TEXT,
  "isSuccessful" BOOLEAN,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IngredientSubstitution_pkey" PRIMARY KEY ("id")
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "RecipeRating_recipeId_idx" ON "RecipeRating"("recipeId");
CREATE INDEX IF NOT EXISTS "RecipeRating_memberId_idx" ON "RecipeRating"("memberId");
CREATE INDEX IF NOT EXISTS "RecipeRating_rating_idx" ON "RecipeRating"("rating");

CREATE INDEX IF NOT EXISTS "RecipeFavorite_recipeId_idx" ON "RecipeFavorite"("recipeId");
CREATE INDEX IF NOT EXISTS "RecipeFavorite_memberId_idx" ON "RecipeFavorite"("memberId");
CREATE INDEX IF NOT EXISTS "RecipeFavorite_folderName_idx" ON "RecipeFavorite"("folderName");

CREATE INDEX IF NOT EXISTS "UserPreference_memberId_idx" ON "UserPreference"("memberId");
CREATE INDEX IF NOT EXISTS "UserPreference_dietType_idx" ON "UserPreference"("dietType");

CREATE INDEX IF NOT EXISTS "RecipeView_recipeId_idx" ON "RecipeView"("recipeId");
CREATE INDEX IF NOT EXISTS "RecipeView_memberId_idx" ON "RecipeView"("memberId");
CREATE INDEX IF NOT EXISTS "RecipeView_createdAt_idx" ON "RecipeView"("createdAt");

CREATE INDEX IF NOT EXISTS "IngredientSubstitution_recipeId_idx" ON "IngredientSubstitution"("recipeId");
CREATE INDEX IF NOT EXISTS "IngredientSubstitution_memberId_idx" ON "IngredientSubstitution"("memberId");
CREATE INDEX IF NOT EXISTS "IngredientSubstitution_originalIngredientId_idx" ON "IngredientSubstitution"("originalIngredientId");

-- 添加唯一约束防止重复评分
CREATE UNIQUE INDEX IF NOT EXISTS "RecipeRating_recipeId_memberId_key" ON "RecipeRating"("recipeId", "memberId");

-- 添加唯一约束防止重复收藏
CREATE UNIQUE INDEX IF NOT EXISTS "RecipeFavorite_recipeId_memberId_key" ON "RecipeFavorite"("recipeId", "memberId");

-- 添加唯一约束防止重复偏好记录
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_memberId_key" ON "UserPreference"("memberId");
