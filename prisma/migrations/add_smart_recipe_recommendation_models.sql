-- Migration: Add Smart Recipe Recommendation Models
-- Description: Adds database tables and relationships for the smart recipe recommendation system
-- Created: 2025-10-31

-- Add new enums
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "RecipeCategory" AS ENUM ('MAIN_DISH', 'SIDE_DISH', 'SOUP', 'SALAD', 'DESSERT', 'SNACK', 'BREAKFAST', 'BEVERAGE', 'SAUCE', 'OTHER');
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED');
CREATE TYPE "CostLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "SubstitutionType" AS ENUM ('ALLERGY', 'STOCK_OUT', 'BUDGET', 'PREFERENCE', 'NUTRITION', 'SEASONAL');
CREATE TYPE "SpiceLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME');
CREATE TYPE "SweetnessLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'EXTREME');
CREATE TYPE "SaltinessLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');

-- Create recipes table
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
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
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "seasons" TEXT NOT NULL DEFAULT '[]',
    "estimatedCost" DOUBLE PRECISION,
    "costLevel" "CostLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- Create recipe_ingredients table
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "isSubstitutable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- Create recipe_instructions table
CREATE TABLE "recipe_instructions" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "timer" INTEGER,
    "temperature" INTEGER,

    CONSTRAINT "recipe_instructions_pkey" PRIMARY KEY ("id")
);

-- Create recipe_ratings table
CREATE TABLE "recipe_ratings" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recipe_ratings_pkey" PRIMARY KEY ("id")
);

-- Create recipe_favorites table
CREATE TABLE "recipe_favorites" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "favoritedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "recipe_favorites_pkey" PRIMARY KEY ("id")
);

-- Create recipe_views table
CREATE TABLE "recipe_views" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewDuration" INTEGER,
    "source" TEXT,

    CONSTRAINT "recipe_views_pkey" PRIMARY KEY ("id")
);

-- Create ingredient_substitutions table
CREATE TABLE "ingredient_substitutions" (
    "id" TEXT NOT NULL,
    "originalIngredientId" TEXT NOT NULL,
    "substituteFoodId" TEXT NOT NULL,
    "substitutionType" "SubstitutionType" NOT NULL,
    "reason" TEXT,
    "nutritionDelta" JSONB,
    "costDelta" DOUBLE PRECISION,
    "tasteSimilarity" DOUBLE PRECISION,
    "conditions" TEXT NOT NULL DEFAULT '[]',
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ingredient_substitutions_pkey" PRIMARY KEY ("id")
);

-- Create user_preferences table
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
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
    "isLowCarb" BOOLEAN NOT NULL DEFAULT false,
    "isLowFat" BOOLEAN NOT NULL DEFAULT false,
    "isHighProtein" BOOLEAN NOT NULL DEFAULT false,
    "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isGlutenFree" BOOLEAN NOT NULL DEFAULT false,
    "isDairyFree" BOOLEAN NOT NULL DEFAULT false,
    "enableRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "recommendationWeight" JSONB,
    "learnedPreferences" JSONB NOT NULL DEFAULT '{}',
    "preferenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAnalyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- Create indexes for recipes table
CREATE INDEX "recipes_category_idx" ON "recipes"("category");
CREATE INDEX "recipes_difficulty_idx" ON "recipes"("difficulty");
CREATE INDEX "recipes_status_idx" ON "recipes"("status");
CREATE INDEX "recipes_averageRating_idx" ON "recipes"("averageRating");
CREATE INDEX "recipes_viewCount_idx" ON "recipes"("viewCount");
CREATE INDEX "recipes_createdAt_idx" ON "recipes"("createdAt");

-- Create indexes for recipe_ingredients table
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");
CREATE INDEX "recipe_ingredients_foodId_idx" ON "recipe_ingredients"("foodId");

-- Create indexes for recipe_instructions table
CREATE UNIQUE INDEX "recipe_instructions_recipeId_stepNumber_key" ON "recipe_instructions"("recipeId", "stepNumber");
CREATE INDEX "recipe_instructions_recipeId_idx" ON "recipe_instructions"("recipeId");

-- Create indexes for recipe_ratings table
CREATE UNIQUE INDEX "recipe_ratings_recipeId_memberId_key" ON "recipe_ratings"("recipeId", "memberId");
CREATE INDEX "recipe_ratings_recipeId_idx" ON "recipe_ratings"("recipeId");
CREATE INDEX "recipe_ratings_memberId_idx" ON "recipe_ratings"("memberId");
CREATE INDEX "recipe_ratings_rating_idx" ON "recipe_ratings"("rating");
CREATE INDEX "recipe_ratings_ratedAt_idx" ON "recipe_ratings"("ratedAt");

-- Create indexes for recipe_favorites table
CREATE UNIQUE INDEX "recipe_favorites_recipeId_memberId_key" ON "recipe_favorites"("recipeId", "memberId");
CREATE INDEX "recipe_favorites_recipeId_idx" ON "recipe_favorites"("recipeId");
CREATE INDEX "recipe_favorites_memberId_idx" ON "recipe_favorites"("memberId");
CREATE INDEX "recipe_favorites_favoritedAt_idx" ON "recipe_favorites"("favoritedAt");

-- Create indexes for recipe_views table
CREATE INDEX "recipe_views_recipeId_idx" ON "recipe_views"("recipeId");
CREATE INDEX "recipe_views_memberId_idx" ON "recipe_views"("memberId");
CREATE INDEX "recipe_views_viewedAt_idx" ON "recipe_views"("viewedAt");

-- Create indexes for ingredient_substitutions table
CREATE INDEX "ingredient_substitutions_originalIngredientId_idx" ON "ingredient_substitutions"("originalIngredientId");
CREATE INDEX "ingredient_substitutions_substituteFoodId_idx" ON "ingredient_substitutions"("substituteFoodId");
CREATE INDEX "ingredient_substitutions_substitutionType_idx" ON "ingredient_substitutions"("substitutionType");

-- Create indexes for user_preferences table
CREATE UNIQUE INDEX "user_preferences_memberId_key" ON "user_preferences"("memberId");
CREATE INDEX "user_preferences_memberId_idx" ON "user_preferences"("memberId");
CREATE INDEX "user_preferences_dietType_idx" ON "user_preferences"("dietType");
CREATE INDEX "user_preferences_costLevel_idx" ON "user_preferences"("costLevel");

-- Add foreign key constraints
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON UPDATE CASCADE;

ALTER TABLE "recipe_instructions" ADD CONSTRAINT "recipe_instructions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ratings" ADD CONSTRAINT "recipe_ratings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_views" ADD CONSTRAINT "recipe_views_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_views" ADD CONSTRAINT "recipe_views_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ingredient_substitutions" ADD CONSTRAINT "ingredient_substitutions_originalIngredientId_fkey" FOREIGN KEY ("originalIngredientId") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredient_substitutions" ADD CONSTRAINT "ingredient_substitutions_substituteFoodId_fkey" FOREIGN KEY ("substituteFoodId") REFERENCES "foods"("id") ON UPDATE CASCADE;

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
