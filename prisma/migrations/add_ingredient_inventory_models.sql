-- Add ingredient inventory management models
-- Generated: 2025-01-31

-- Create storage location enum
CREATE TYPE "StorageLocation" AS ENUM ('REFRIGERATOR', 'FREEZER', 'PANTRY', 'COUNTER', 'CABINET', 'OTHER');

-- Create inventory status enum
CREATE TYPE "InventoryStatus" AS ENUM ('FRESH', 'EXPIRING', 'EXPIRED', 'LOW_STOCK', 'OUT_OF_STOCK');

-- Create waste reason enum
CREATE TYPE "WasteReason" AS ENUM ('EXPIRED', 'SPOILED', 'OVERSTOCK', 'PREFERENCE', 'OTHER');

-- Create inventory items table
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "originalQuantity" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasePrice" DOUBLE PRECISION,
    "purchaseSource" TEXT,
    "expiryDate" TIMESTAMP(3),
    "productionDate" TIMESTAMP(3),
    "daysToExpiry" INTEGER,
    "storageLocation" "StorageLocation" NOT NULL DEFAULT 'PANTRY',
    "storageNotes" TEXT,
    "status" "InventoryStatus" NOT NULL DEFAULT 'FRESH',
    "minStockThreshold" DOUBLE PRECISION,
    "isLowStock" BOOLEAN NOT NULL DEFAULT false,
    "barcode" TEXT,
    "brand" TEXT,
    "packageInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- Create inventory usage table
CREATE TABLE "inventory_usages" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "usedQuantity" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageType" TEXT NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "notes" TEXT,
    "recipeName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_usages_pkey" PRIMARY KEY ("id")
);

-- Create waste logs table
CREATE TABLE "waste_logs" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "wastedQuantity" DOUBLE PRECISION NOT NULL,
    "wasteReason" "WasteReason" NOT NULL,
    "wastedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedCost" DOUBLE PRECISION,
    "notes" TEXT,
    "preventable" BOOLEAN NOT NULL DEFAULT true,
    "preventionTip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for inventory_items
CREATE INDEX "inventory_items_memberId_idx" ON "inventory_items"("memberId");
CREATE INDEX "inventory_items_foodId_idx" ON "inventory_items"("foodId");
CREATE INDEX "inventory_items_memberId_status_idx" ON "inventory_items"("memberId", "status");
CREATE INDEX "inventory_items_expiryDate_idx" ON "inventory_items"("expiryDate");
CREATE INDEX "inventory_items_storageLocation_idx" ON "inventory_items"("storageLocation");
CREATE INDEX "inventory_items_barcode_idx" ON "inventory_items"("barcode");

-- Create indexes for inventory_usages
CREATE INDEX "inventory_usages_inventoryItemId_idx" ON "inventory_usages"("inventoryItemId");
CREATE INDEX "inventory_usages_memberId_idx" ON "inventory_usages"("memberId");
CREATE INDEX "inventory_usages_usedAt_idx" ON "inventory_usages"("usedAt");
CREATE INDEX "inventory_usages_usageType_idx" ON "inventory_usages"("usageType");

-- Create indexes for waste_logs
CREATE INDEX "waste_logs_inventoryItemId_idx" ON "waste_logs"("inventoryItemId");
CREATE INDEX "waste_logs_memberId_idx" ON "waste_logs"("memberId");
CREATE INDEX "waste_logs_wasteReason_idx" ON "waste_logs"("wasteReason");
CREATE INDEX "waste_logs_wastedAt_idx" ON "waste_logs"("wastedAt");

-- Add foreign key constraints
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON UPDATE CASCADE;

ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_usages" ADD CONSTRAINT "inventory_usages_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
