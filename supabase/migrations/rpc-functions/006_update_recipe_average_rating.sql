-- RPC Function: update_recipe_average_rating
-- Description: Atomically update recipe average rating and rating count after rating operations
-- Dependencies: Tables - recipes, recipe_ratings
-- Returns: JSON with success status, updated average rating, and rating count
-- Security: DEFINER with search_path protection
-- Performance: Simple aggregation query, no locks needed (eventual consistency acceptable)

-- Drop old version if exists (parameter type may have changed)
DROP FUNCTION IF EXISTS update_recipe_average_rating(UUID);
DROP FUNCTION IF EXISTS update_recipe_average_rating(TEXT);

CREATE OR REPLACE FUNCTION update_recipe_average_rating(
  p_recipe_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_average_rating NUMERIC;
  v_rating_count INTEGER;
  v_recipe_exists BOOLEAN;
BEGIN
  -- Validate that recipe exists
  SELECT EXISTS(
    SELECT 1 FROM recipes
    WHERE id = p_recipe_id
  ) INTO v_recipe_exists;

  IF NOT v_recipe_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'RECIPE_NOT_FOUND',
      'message', '食谱不存在或已被删除'
    );
  END IF;

  -- Calculate average rating and count
  -- Note: AVG() returns NULL if no rows, so we use COALESCE
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_average_rating, v_rating_count
  FROM recipe_ratings
  WHERE "recipeId" = p_recipe_id;

  -- Update recipe with new rating statistics
  -- Note: No FOR UPDATE needed here as eventual consistency is acceptable
  -- for derived metrics. The aggregation is atomic and will reflect the
  -- current state at the time of execution.
  UPDATE recipes
  SET
    "averageRating" = v_average_rating,
    "ratingCount" = v_rating_count,
    "updatedAt" = NOW()
  WHERE id = p_recipe_id;

  RETURN json_build_object(
    'success', true,
    'averageRating', v_average_rating,
    'ratingCount', v_rating_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_recipe_average_rating(TEXT) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION update_recipe_average_rating IS
'Atomically updates the average rating and rating count for a recipe by aggregating recipe_ratings records.
Called after rating operations (create/update/delete). Uses eventual consistency model - no locking required.';
