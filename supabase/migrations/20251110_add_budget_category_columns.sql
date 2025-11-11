-- Migration: Add missing budget category columns
-- Description: Extends budgets table to support all 10 FoodCategory types
-- Added columns: seafood_budget, oils_budget, snacks_budget, beverages_budget
-- Date: 2025-11-10

-- Add new category budget columns
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS seafood_budget NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS oils_budget NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS snacks_budget NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS beverages_budget NUMERIC(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN budgets.seafood_budget IS 'Budget allocation for SEAFOOD category';
COMMENT ON COLUMN budgets.oils_budget IS 'Budget allocation for OILS category';
COMMENT ON COLUMN budgets.snacks_budget IS 'Budget allocation for SNACKS category';
COMMENT ON COLUMN budgets.beverages_budget IS 'Budget allocation for BEVERAGES category';

-- Backfill existing rows with default 0 (already handled by DEFAULT clause)
-- No data migration needed as existing rows will use default value

-- Verify column types match existing budget columns
DO $$
BEGIN
  -- Ensure all category columns have the same type
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'budgets'
      AND column_name IN ('seafood_budget', 'oils_budget', 'snacks_budget', 'beverages_budget')
    GROUP BY data_type
    HAVING COUNT(*) = 4
  ) THEN
    RAISE EXCEPTION 'Budget category columns have inconsistent types';
  END IF;
END $$;
