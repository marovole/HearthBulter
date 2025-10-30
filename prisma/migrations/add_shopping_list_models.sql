-- Migration: Add Shopping List Models
-- Description: Adds ShoppingList and ShoppingItem tables for the shopping list feature
-- Date: 2025-10-30

-- Create enum for shopping list status
DO $$ BEGIN
    CREATE TYPE "ListStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS "shopping_lists" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "budget" DOUBLE PRECISION,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "status" "ListStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- Create shopping_items table
CREATE TABLE IF NOT EXISTS "shopping_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "estimatedPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id")
);

-- Create indexes for shopping_lists
CREATE INDEX IF NOT EXISTS "shopping_lists_planId_idx" ON "shopping_lists"("planId");

-- Create indexes for shopping_items
CREATE INDEX IF NOT EXISTS "shopping_items_listId_idx" ON "shopping_items"("listId");
CREATE INDEX IF NOT EXISTS "shopping_items_foodId_idx" ON "shopping_items"("foodId");
CREATE INDEX IF NOT EXISTS "shopping_items_category_idx" ON "shopping_items"("category");

-- Add foreign key constraints
ALTER TABLE "shopping_lists" 
    ADD CONSTRAINT "shopping_lists_planId_fkey" 
    FOREIGN KEY ("planId") 
    REFERENCES "meal_plans"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE "shopping_items" 
    ADD CONSTRAINT "shopping_items_listId_fkey" 
    FOREIGN KEY ("listId") 
    REFERENCES "shopping_lists"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE "shopping_items" 
    ADD CONSTRAINT "shopping_items_foodId_fkey" 
    FOREIGN KEY ("foodId") 
    REFERENCES "foods"("id") 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE;

-- Add comments
COMMENT ON TABLE "shopping_lists" IS '购物清单表';
COMMENT ON TABLE "shopping_items" IS '购物清单项目表';
COMMENT ON COLUMN "shopping_lists"."planId" IS '关联的食谱计划ID';
COMMENT ON COLUMN "shopping_lists"."budget" IS '预算（元）';
COMMENT ON COLUMN "shopping_lists"."estimatedCost" IS '估算成本（元）';
COMMENT ON COLUMN "shopping_lists"."actualCost" IS '实际花费（元）';
COMMENT ON COLUMN "shopping_lists"."status" IS '清单状态：待采购/采购中/已完成';
COMMENT ON COLUMN "shopping_items"."amount" IS '食材重量（克）';
COMMENT ON COLUMN "shopping_items"."category" IS '食材分类（冗余字段，便于查询）';
COMMENT ON COLUMN "shopping_items"."purchased" IS '是否已购买';
COMMENT ON COLUMN "shopping_items"."estimatedPrice" IS '估算价格（元）';

