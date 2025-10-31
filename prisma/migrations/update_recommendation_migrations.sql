-- Migration: Update recommendation-related database structures
-- Created: 2025-10-31

-- Drop legacy PascalCase tables if they exist
DO $$
BEGIN
  IF to_regclass('"RecipeRating"') IS NOT NULL THEN
    DROP TABLE "RecipeRating";
  END IF;
  IF to_regclass('"RecipeFavorite"') IS NOT NULL THEN
    DROP TABLE "RecipeFavorite";
  END IF;
  IF to_regclass('"RecipeView"') IS NOT NULL THEN
    DROP TABLE "RecipeView";
  END IF;
  IF to_regclass('"IngredientSubstitution"') IS NOT NULL THEN
    DROP TABLE "IngredientSubstitution";
  END IF;
  IF to_regclass('"UserPreference"') IS NOT NULL THEN
    DROP TABLE "UserPreference";
  END IF;
END;
$$;

-- Ensure enums exist
DO $$
BEGIN
  IF to_regtype('"Difficulty"') IS NULL THEN
    CREATE TYPE "Difficulty" AS ENUM ('EASY','MEDIUM','HARD');
  END IF;
  IF to_regtype('"RecipeCategory"') IS NULL THEN
    CREATE TYPE "RecipeCategory" AS ENUM ('MAIN_DISH','SIDE_DISH','SOUP','SALAD','DESSERT','SNACK','BREAKFAST','BEVERAGE','SAUCE','OTHER');
  END IF;
  IF to_regtype('"RecipeStatus"') IS NULL THEN
    CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED','DELETED');
  END IF;
  IF to_regtype('"CostLevel"') IS NULL THEN
    CREATE TYPE "CostLevel" AS ENUM ('LOW','MEDIUM','HIGH');
  END IF;
  IF to_regtype('"SubstitutionType"') IS NULL THEN
    CREATE TYPE "SubstitutionType" AS ENUM ('ALLERGY','STOCK_OUT','BUDGET','PREFERENCE','NUTRITION','SEASONAL');
  END IF;
  IF to_regtype('"SpiceLevel"') IS NULL THEN
    CREATE TYPE "SpiceLevel" AS ENUM ('NONE','LOW','MEDIUM','HIGH','EXTREME');
  END IF;
  IF to_regtype('"SweetnessLevel"') IS NULL THEN
    CREATE TYPE "SweetnessLevel" AS ENUM ('NONE','LOW','MEDIUM','HIGH','EXTREME');
  END IF;
  IF to_regtype('"SaltinessLevel"') IS NULL THEN
    CREATE TYPE "SaltinessLevel" AS ENUM ('LOW','MEDIUM','HIGH','EXTREME');
  END IF;
  IF to_regtype('"DietaryType"') IS NULL THEN
    CREATE TYPE "DietaryType" AS ENUM ('OMNIVORE','VEGETARIAN','VEGAN','PESCETARIAN','KETO','PALEO','MEDITERRANEAN','LOW_FODMAP','CUSTOM');
  END IF;
END;
$$;

-- Create/alter core tables (idempotent defaults)
CREATE TABLE IF NOT EXISTS "recipes" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "cuisine" TEXT,
  "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
  "prepTime" INTEGER NOT NULL,
  "cookTime" INTEGER NOT NULL,
  "totalTime" INTEGER NOT NULL,
  "servings" INTEGER NOT NULL,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "fiber" DOUBLE PRECISION,
  "sugar" DOUBLE PRECISION,
  "sodium" DOUBLE PRECISION,
  "imageUrl" TEXT,
  "images" TEXT NOT NULL DEFAULT '[]',
  "videoUrl" TEXT,
  "category" "RecipeCategory" NOT NULL,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "mealTypes" TEXT NOT NULL DEFAULT '[]',
  "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "favoriteCount" INTEGER NOT NULL DEFAULT 0,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
  "isPublic" BOOLEAN NOT NULL DEFAULT TRUE,
  "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "seasons" TEXT NOT NULL DEFAULT '[]',
  "estimatedCost" DOUBLE PRECISION,
  "costLevel" "CostLevel" NOT NULL DEFAULT 'MEDIUM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

ALTER TABLE "recipes"
  ALTER COLUMN "images" SET DEFAULT '[]',
  ALTER COLUMN "tags" SET DEFAULT '[]',
  ALTER COLUMN "mealTypes" SET DEFAULT '[]',
  ALTER COLUMN "averageRating" SET DEFAULT 0,
  ALTER COLUMN "ratingCount" SET DEFAULT 0,
  ALTER COLUMN "favoriteCount" SET DEFAULT 0,
  ALTER COLUMN "viewCount" SET DEFAULT 0,
  ALTER COLUMN "status" SET DEFAULT 'DRAFT',
  ALTER COLUMN "isPublic" SET DEFAULT TRUE,
  ALTER COLUMN "isVerified" SET DEFAULT FALSE,
  ALTER COLUMN "seasons" SET DEFAULT '[]',
  ALTER COLUMN "costLevel" SET DEFAULT 'MEDIUM';

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "foodId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "notes" TEXT,
  "optional" BOOLEAN NOT NULL DEFAULT FALSE,
  "isSubstitutable" BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE "recipe_ingredients"
  ALTER COLUMN "optional" SET DEFAULT FALSE,
  ALTER COLUMN "isSubstitutable" SET DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS "recipe_instructions" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "stepNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "timer" INTEGER,
  "temperature" INTEGER
);

CREATE TABLE IF NOT EXISTS "recipe_ratings" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isPublic" BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE "recipe_ratings"
  ALTER COLUMN "tags" SET DEFAULT '[]',
  ALTER COLUMN "ratedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "isPublic" SET DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS "recipe_favorites" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "favoritedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT
);

ALTER TABLE "recipe_favorites"
  ALTER COLUMN "favoritedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "recipe_views" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewDuration" INTEGER,
  "source" TEXT
);

ALTER TABLE "recipe_views"
  ALTER COLUMN "viewedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "ingredient_substitutions" (
  "id" TEXT PRIMARY KEY,
  "originalIngredientId" TEXT NOT NULL,
  "substituteFoodId" TEXT NOT NULL,
  "substitutionType" "SubstitutionType" NOT NULL,
  "reason" TEXT,
  "nutritionDelta" JSONB,
  "costDelta" DOUBLE PRECISION,
  "tasteSimilarity" DOUBLE PRECISION,
  "conditions" TEXT NOT NULL DEFAULT '[]',
  "isValid" BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE "ingredient_substitutions"
  ALTER COLUMN "conditions" SET DEFAULT '[]',
  ALTER COLUMN "isValid" SET DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" TEXT PRIMARY KEY,
  "memberId" TEXT NOT NULL,
  "spiceLevel" "SpiceLevel" NOT NULL DEFAULT 'MEDIUM',
  "sweetness" "SweetnessLevel" NOT NULL DEFAULT 'MEDIUM',
  "saltiness" "SaltinessLevel" NOT NULL DEFAULT 'MEDIUM',
  "preferredCuisines" TEXT NOT NULL DEFAULT '[]',
  "avoidedIngredients" TEXT NOT NULL DEFAULT '[]',
  "preferredIngredients" TEXT NOT NULL DEFAULT '[]',
  "maxCookTime" INTEGER,
  "minServings" INTEGER NOT NULL DEFAULT 1,
  "maxServings" INTEGER NOT NULL DEFAULT 10,
  "costLevel" "CostLevel" NOT NULL DEFAULT 'MEDIUM',
  "maxEstimatedCost" DOUBLE PRECISION,
  "dietType" "DietaryType" NOT NULL DEFAULT 'OMNIVORE',
  "isLowCarb" BOOLEAN NOT NULL DEFAULT FALSE,
  "isLowFat" BOOLEAN NOT NULL DEFAULT FALSE,
  "isHighProtein" BOOLEAN NOT NULL DEFAULT FALSE,
  "isVegetarian" BOOLEAN NOT NULL DEFAULT FALSE,
  "isVegan" BOOLEAN NOT NULL DEFAULT FALSE,
  "isGlutenFree" BOOLEAN NOT NULL DEFAULT FALSE,
  "isDairyFree" BOOLEAN NOT NULL DEFAULT FALSE,
  "enableRecommendations" BOOLEAN NOT NULL DEFAULT TRUE,
  "recommendationWeight" JSONB,
  "learnedPreferences" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "preferenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastAnalyzedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "user_preferences"
  ALTER COLUMN "preferredCuisines" SET DEFAULT '[]',
  ALTER COLUMN "avoidedIngredients" SET DEFAULT '[]',
  ALTER COLUMN "preferredIngredients" SET DEFAULT '[]',
  ALTER COLUMN "minServings" SET DEFAULT 1,
  ALTER COLUMN "maxServings" SET DEFAULT 10,
  ALTER COLUMN "costLevel" SET DEFAULT 'MEDIUM',
  ALTER COLUMN "dietType" SET DEFAULT 'OMNIVORE',
  ALTER COLUMN "isLowCarb" SET DEFAULT FALSE,
  ALTER COLUMN "isLowFat" SET DEFAULT FALSE,
  ALTER COLUMN "isHighProtein" SET DEFAULT FALSE,
  ALTER COLUMN "isVegetarian" SET DEFAULT FALSE,
  ALTER COLUMN "isVegan" SET DEFAULT FALSE,
  ALTER COLUMN "isGlutenFree" SET DEFAULT FALSE,
  ALTER COLUMN "isDairyFree" SET DEFAULT FALSE,
  ALTER COLUMN "enableRecommendations" SET DEFAULT TRUE,
  ALTER COLUMN "learnedPreferences" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "preferenceScore" SET DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS "recipes_category_idx" ON "recipes" ("category");
CREATE INDEX IF NOT EXISTS "recipes_difficulty_idx" ON "recipes" ("difficulty");
CREATE INDEX IF NOT EXISTS "recipes_status_idx" ON "recipes" ("status");
CREATE INDEX IF NOT EXISTS "recipes_averageRating_idx" ON "recipes" ("averageRating");
CREATE INDEX IF NOT EXISTS "recipes_viewCount_idx" ON "recipes" ("viewCount");
CREATE INDEX IF NOT EXISTS "recipes_createdAt_idx" ON "recipes" ("createdAt");

CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipeId_idx" ON "recipe_ingredients" ("recipeId");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_foodId_idx" ON "recipe_ingredients" ("foodId");

CREATE UNIQUE INDEX IF NOT EXISTS "recipe_instructions_recipeId_stepNumber_key" ON "recipe_instructions" ("recipeId", "stepNumber");
CREATE INDEX IF NOT EXISTS "recipe_instructions_recipeId_idx" ON "recipe_instructions" ("recipeId");

CREATE UNIQUE INDEX IF NOT EXISTS "recipe_ratings_recipeId_memberId_key" ON "recipe_ratings" ("recipeId", "memberId");
CREATE INDEX IF NOT EXISTS "recipe_ratings_recipeId_idx" ON "recipe_ratings" ("recipeId");
CREATE INDEX IF NOT EXISTS "recipe_ratings_memberId_idx" ON "recipe_ratings" ("memberId");
CREATE INDEX IF NOT EXISTS "recipe_ratings_rating_idx" ON "recipe_ratings" ("rating");
CREATE INDEX IF NOT EXISTS "recipe_ratings_ratedAt_idx" ON "recipe_ratings" ("ratedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "recipe_favorites_recipeId_memberId_key" ON "recipe_favorites" ("recipeId", "memberId");
CREATE INDEX IF NOT EXISTS "recipe_favorites_recipeId_idx" ON "recipe_favorites" ("recipeId");
CREATE INDEX IF NOT EXISTS "recipe_favorites_memberId_idx" ON "recipe_favorites" ("memberId");
CREATE INDEX IF NOT EXISTS "recipe_favorites_favoritedAt_idx" ON "recipe_favorites" ("favoritedAt");

CREATE INDEX IF NOT EXISTS "recipe_views_recipeId_idx" ON "recipe_views" ("recipeId");
CREATE INDEX IF NOT EXISTS "recipe_views_memberId_idx" ON "recipe_views" ("memberId");
CREATE INDEX IF NOT EXISTS "recipe_views_viewedAt_idx" ON "recipe_views" ("viewedAt");

CREATE INDEX IF NOT EXISTS "ingredient_substitutions_originalIngredientId_idx" ON "ingredient_substitutions" ("originalIngredientId");
CREATE INDEX IF NOT EXISTS "ingredient_substitutions_substituteFoodId_idx" ON "ingredient_substitutions" ("substituteFoodId");
CREATE INDEX IF NOT EXISTS "ingredient_substitutions_substitutionType_idx" ON "ingredient_substitutions" ("substitutionType");

CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_memberId_key" ON "user_preferences" ("memberId");
CREATE INDEX IF NOT EXISTS "user_preferences_memberId_idx" ON "user_preferences" ("memberId");
CREATE INDEX IF NOT EXISTS "user_preferences_dietType_idx" ON "user_preferences" ("dietType");
CREATE INDEX IF NOT EXISTS "user_preferences_costLevel_idx" ON "user_preferences" ("costLevel");

-- Foreign keys
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT IF NOT EXISTS "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "recipe_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON UPDATE CASCADE;

ALTER TABLE "recipe_instructions"
  ADD CONSTRAINT IF NOT EXISTS "recipe_instructions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_ratings"
  ADD CONSTRAINT IF NOT EXISTS "recipe_ratings_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "recipe_ratings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_favorites"
  ADD CONSTRAINT IF NOT EXISTS "recipe_favorites_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "recipe_favorites_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_views"
  ADD CONSTRAINT IF NOT EXISTS "recipe_views_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "recipe_views_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ingredient_substitutions"
  ADD CONSTRAINT IF NOT EXISTS "ingredient_substitutions_originalIngredientId_fkey" FOREIGN KEY ("originalIngredientId") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "ingredient_substitutions_substituteFoodId_fkey" FOREIGN KEY ("substituteFoodId") REFERENCES "foods"("id") ON UPDATE CASCADE;

ALTER TABLE "user_preferences"
  ADD CONSTRAINT IF NOT EXISTS "user_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
