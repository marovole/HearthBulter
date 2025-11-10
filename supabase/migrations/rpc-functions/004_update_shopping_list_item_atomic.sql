-- RPC Function: update_shopping_list_item_atomic
-- Description: Atomically update shopping list item with optimistic locking
-- Dependencies: None
-- Returns: JSON with updated item

CREATE OR REPLACE FUNCTION update_shopping_list_item_atomic(
  p_item_id UUID,
  p_user_id UUID,
  p_updates JSONB,
  p_expected_version INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_item shopping_items%ROWTYPE;
  v_updated_item shopping_items%ROWTYPE;
  v_new_version INTEGER;
BEGIN
  -- Lock and fetch the shopping list item
  SELECT * INTO v_item
  FROM shopping_items
  WHERE id = p_item_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', '购物清单项不存在'
    );
  END IF;
  
  -- Check version if optimistic locking is enabled
  IF p_expected_version IS NOT NULL THEN
    IF v_item.version != p_expected_version THEN
      RETURN json_build_object(
        'success', false,
        'error', '数据已被其他用户更新',
        'current_version', v_item.version,
        'expected_version', p_expected_version
      );
    END IF;
  END IF;
  
  -- Increment version for optimistic locking
  v_new_version := v_item.version + 1;
  
  -- Build update query dynamically based on provided fields
  BEGIN
    IF p_updates ? 'quantity' THEN
      UPDATE shopping_items
      SET 
        quantity = (p_updates->>'quantity')::DECIMAL,
        version = v_new_version,
        updated_at = NOW()
      WHERE id = p_item_id;
    END IF;
    
    IF p_updates ? 'price' THEN
      UPDATE shopping_items
      SET 
        price = (p_updates->>'price')::DECIMAL,
        version = v_new_version,
        updated_at = NOW()
      WHERE id = p_item_id;
    END IF;
    
    IF p_updates ? 'purchased' THEN
      UPDATE shopping_items
      SET 
        purchased = (p_updates->>'purchased')::BOOLEAN,
        version = v_new_version,
        updated_at = NOW()
      WHERE id = p_item_id;
    END IF;
    
    IF p_updates ? 'purchased_at' THEN
      UPDATE shopping_items
      SET 
        purchased_at = (p_updates->>'purchased_at')::TIMESTAMPTZ,
        version = v_new_version,
        updated_at = NOW()
      WHERE id = p_item_id;
    END IF;
    
    IF p_updates ? 'notes' THEN
      UPDATE shopping_items
      SET 
        notes = p_updates->>'notes',
        version = v_new_version,
        updated_at = NOW()
      WHERE id = p_item_id;
    END IF;
    
    -- Return the updated item
    SELECT * INTO v_updated_item
    FROM shopping_items
    WHERE id = p_item_id;
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'message', '购物清单项更新成功',
      'data', json_build_object(
        'item', json_build_object(
          'id', v_updated_item.id,
          'name', v_updated_item.name,
          'quantity', v_updated_item.quantity,
          'price', v_updated_item.price,
          'purchased', v_updated_item.purchased,
          'purchased_at', v_updated_item.purchased_at,
          'notes', v_updated_item.notes,
          'version', v_updated_item.version,
          'updated_at', v_updated_item.updated_at
        )
      )
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Return error
    RETURN json_build_object(
      'success', false,
      'error', '更新购物清单项失败: ' || SQLERRM
    );
  END;
  
EXCEPTION WHEN OTHERS THEN
  -- Handle any other errors
  RETURN json_build_object(
    'success', false,
    'error', '更新失败: ' || SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_shopping_list_item_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_shopping_list_item_atomic IS 'Atomically update shopping list item with optimistic locking';
