-- RPC Function: update_recipe_favorite_count
-- Description: Atomically update recipe favorite count after favorite/unfavorite operations
-- Dependencies: Tables - recipes, recipe_favorites
-- Returns: JSON with success status and updated favorite count
-- Security: DEFINER with search_path protection
-- Performance: Simple aggregation query, no locks needed (eventual consistency acceptable)

-- Drop old version if exists (parameter type may have changed)
DROP FUNCTION IF EXISTS update_recipe_favorite_count(UUID);
DROP FUNCTION IF EXISTS update_recipe_favorite_count(TEXT);

CREATE OR REPLACE FUNCTION update_recipe_favorite_count(
  p_recipe_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_favorite_count INTEGER;
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

  -- Count current favorites
  SELECT COUNT(*) INTO v_favorite_count
  FROM recipe_favorites
  WHERE "recipeId" = p_recipe_id;

  -- Update recipe favorite count
  -- Note: No FOR UPDATE needed here as eventual consistency is acceptable
  -- for derived metrics. Even if two favorites happen simultaneously,
  -- the count will eventually be correct.
  UPDATE recipes
  SET
    "favoriteCount" = v_favorite_count,
    "updatedAt" = NOW()
  WHERE id = p_recipe_id;

  RETURN json_build_object(
    'success', true,
    'favoriteCount', v_favorite_count
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
GRANT EXECUTE ON FUNCTION update_recipe_favorite_count(TEXT) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION update_recipe_favorite_count IS
'Atomically updates the favorite count for a recipe by counting recipe_favorites records.
Called after favorite/unfavorite operations. Uses eventual consistency model - no locking required.';
