-- RPC Function: create_inventory_notifications_batch
-- Description: Batch create inventory notifications to avoid duplicates
-- Dependencies: None
-- Returns: JSON with created notification count

CREATE OR REPLACE FUNCTION create_inventory_notifications_batch(
  p_family_id UUID,
  p_notification_type TEXT,
  p_items JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_item JSONB;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_notification_id UUID;
  v_existing_notification RECORD;
  v_notification_data JSONB;
BEGIN
  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_notification_id := gen_random_uuid();
      v_notification_data := jsonb_build_object(
        'item_id', v_item->>'item_id',
        'item_name', v_item->>'item_name',
        'current_quantity', (v_item->>'current_quantity')::DECIMAL,
        'threshold_quantity', (v_item->>'threshold_quantity')::DECIMAL,
        'expiry_date', v_item->>'expiry_date',
        'additional_info', v_item
      );
      
      -- Check if notification already exists for this item
      SELECT id INTO v_existing_notification
      FROM notifications
      WHERE family_id = p_family_id
        AND type = p_notification_type
        AND data->>'item_id' = v_item->>'item_id'
        AND status != 'DISMISSED'
      LIMIT 1;
      
      -- If notification already exists, skip it
      IF FOUND THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- Create new notification
      INSERT INTO notifications (
        id,
        family_id,
        member_id,
        type,
        title,
        message,
        data,
        status,
        priority,
        created_at,
        updated_at
      ) VALUES (
        v_notification_id,
        p_family_id,
        NULL, -- System notification, no specific member
        p_notification_type,
        COALESCE(v_item->>'title', '库存提醒'),
        COALESCE(v_item->>'message', '物品库存不足或即将过期'),
        v_notification_data,
        'PENDING',
        CASE 
          WHEN (v_item->>'priority')::TEXT = 'HIGH' THEN 'HIGH'
          WHEN (v_item->>'priority')::TEXT = 'LOW' THEN 'LOW'
          ELSE 'MEDIUM'
        END,
        NOW(),
        NOW()
      );
      
      v_created_count := v_created_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other items
      v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  -- Return summary
  RETURN json_build_object(
    'success', true,
    'message', '批量通知创建完成',
    'data', json_build_object(
      'total_items', jsonb_array_length(p_items),
      'created_count', v_created_count,
      'skipped_count', v_skipped_count,
      'processed_count', v_created_count + v_skipped_count
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN json_build_object(
    'success', false,
    'error', '批量创建通知失败: ' || SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_inventory_notifications_batch TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_inventory_notifications_batch IS 'Batch create inventory notifications with duplicate prevention';
