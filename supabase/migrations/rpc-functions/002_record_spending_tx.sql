-- RPC Function: record_spending_tx
-- Description: Atomically record spending and update budget usage
-- Dependencies: None
-- Returns: JSON with spending record and updated budget
-- Security: DEFINER with search_path protection against hijacking

CREATE OR REPLACE FUNCTION record_spending_tx(
  p_budget_id UUID,
  p_amount DECIMAL(10,2),
  p_category TEXT,
  p_description TEXT DEFAULT NULL,
  p_purchase_date TIMESTAMPTZ DEFAULT NOW(),
  p_transaction_id TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_items JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_budget RECORD;
  v_total_spent DECIMAL(10,2);
  v_new_spending spendings%ROWTYPE;
  v_budget_id UUID;
  v_new_usage DECIMAL(10,2);
  v_category_budget DECIMAL(10,2);
  v_category_spent DECIMAL(10,2);
BEGIN
  -- Lock the specified budget and verify it's active and covers the purchase date
  SELECT
    id,
    total_amount,
    period,
    start_date,
    end_date,
    used_amount,
    vegetable_budget,
    meat_budget,
    fruit_budget,
    grain_budget,
    dairy_budget,
    seafood_budget,
    oils_budget,
    snacks_budget,
    beverages_budget,
    other_budget
  INTO v_budget
  FROM budgets
  WHERE id = p_budget_id
    AND status = 'ACTIVE'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'BUDGET_NOT_FOUND',
      'message', '预算不存在或已不活跃'
    );
  END IF;

  -- Verify purchase date is within budget period
  IF p_purchase_date < v_budget.start_date OR p_purchase_date > v_budget.end_date THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATE_OUT_OF_RANGE',
      'message', '支出日期不在预算周期内'
    );
  END IF;

  v_budget_id := v_budget.id;

  -- Use the existing used_amount from budget (already calculated), handle NULL case
  v_total_spent := COALESCE(v_budget.used_amount, 0);

  -- Check if adding this spending would exceed total budget
  v_new_usage := v_total_spent + p_amount;

  IF v_new_usage > v_budget.total_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'BUDGET_EXCEEDED',
      'message', '支出将超出预算',
      'current_usage', v_total_spent,
      'budget_amount', v_budget.total_amount,
      'exceeded_by', v_new_usage - v_budget.total_amount
    );
  END IF;

  -- Check category-specific limits using column-based budgets
  -- Map category to corresponding budget column (use PLURAL enum values)
  v_category_budget := CASE p_category
    WHEN 'VEGETABLES' THEN v_budget.vegetable_budget
    WHEN 'PROTEIN' THEN v_budget.meat_budget  -- PROTEIN maps to meat_budget
    WHEN 'FRUITS' THEN v_budget.fruit_budget
    WHEN 'GRAINS' THEN v_budget.grain_budget
    WHEN 'DAIRY' THEN v_budget.dairy_budget
    WHEN 'SEAFOOD' THEN v_budget.seafood_budget
    WHEN 'OILS' THEN v_budget.oils_budget
    WHEN 'SNACKS' THEN v_budget.snacks_budget
    WHEN 'BEVERAGES' THEN v_budget.beverages_budget
    WHEN 'OTHER' THEN v_budget.other_budget
    ELSE NULL
  END;

  -- If category has a limit, check if it would be exceeded
  IF v_category_budget IS NOT NULL THEN
    -- Get category-specific spending
    SELECT COALESCE(SUM(amount), 0) INTO v_category_spent
    FROM spendings
    WHERE budget_id = v_budget_id
      AND category = p_category
      AND purchase_date >= v_budget.start_date
      AND purchase_date <= v_budget.end_date;

    IF (v_category_spent + p_amount) > v_category_budget THEN
      RETURN json_build_object(
        'success', false,
        'error', 'CATEGORY_LIMIT_EXCEEDED',
        'message', '该类别支出将超出限制',
        'category', p_category,
        'category_spent', v_category_spent,
        'category_limit', v_category_budget,
        'exceeded_by', (v_category_spent + p_amount) - v_category_budget
      );
    END IF;
  END IF;
  
  -- Start transaction
  BEGIN
    -- Insert spending record
    INSERT INTO spendings (
      id,
      budget_id,
      amount,
      category,
      description,
      transaction_id,
      platform,
      items,
      purchase_date,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_budget_id,
      p_amount,
      p_category,
      p_description,
      p_transaction_id,
      p_platform,
      p_items,
      p_purchase_date,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_new_spending;

    -- Update budget used_amount atomically
    UPDATE budgets
    SET
      used_amount = v_new_usage,
      remaining_amount = total_amount - v_new_usage,
      usage_percentage = ROUND((v_new_usage / total_amount * 100), 2),
      updated_at = NOW()
    WHERE id = v_budget_id;

    -- Check if alert threshold is reached and create alert if needed
    -- Only create alert if the corresponding alert threshold setting is enabled
    IF v_new_usage >= v_budget.total_amount * 0.8 THEN
      DECLARE
        v_alert_type TEXT;
        v_threshold NUMERIC;
        v_alert_message TEXT;
        v_should_alert BOOLEAN := FALSE;
      BEGIN
        -- Determine alert type and check if enabled
        IF v_new_usage >= v_budget.total_amount * 1.1 AND v_budget.alert_threshold_110 THEN
          v_alert_type := 'OVER_BUDGET';
          v_threshold := 110;
          v_alert_message := '预算已超支110%';
          v_should_alert := TRUE;
        ELSIF v_new_usage >= v_budget.total_amount AND v_budget.alert_threshold_100 THEN
          v_alert_type := 'BUDGET_REACHED';
          v_threshold := 100;
          v_alert_message := '预算已用完';
          v_should_alert := TRUE;
        ELSIF v_new_usage >= v_budget.total_amount * 0.8 AND v_budget.alert_threshold_80 THEN
          v_alert_type := 'NEAR_LIMIT';
          v_threshold := 80;
          v_alert_message := '预算已使用80%';
          v_should_alert := TRUE;
        END IF;

        -- Insert alert only if enabled and not already exists for this threshold
        IF v_should_alert THEN
          INSERT INTO budget_alerts (
            id,
            budget_id,
            type,
            threshold,
            current_value,
            message,
            status,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            v_budget_id,
            v_alert_type,
            v_threshold,
            v_new_usage,
            v_alert_message,
            'ACTIVE',
            NOW(),
            NOW()
          )
          ON CONFLICT (budget_id, type) DO UPDATE
          SET
            threshold = EXCLUDED.threshold,
            current_value = EXCLUDED.current_value,
            message = EXCLUDED.message,
            updated_at = NOW();
        END IF;
      END;
    END IF;

    -- Return success with data
    RETURN json_build_object(
      'success', true,
      'message', '支出记录成功',
      'data', json_build_object(
        'spending', json_build_object(
          'id', v_new_spending.id,
          'amount', v_new_spending.amount,
          'category', v_new_spending.category,
          'description', v_new_spending.description,
          'purchase_date', v_new_spending.purchase_date,
          'transaction_id', v_new_spending.transaction_id,
          'platform', v_new_spending.platform,
          'items', v_new_spending.items,
          'created_at', v_new_spending.created_at,
          'updated_at', v_new_spending.updated_at
        ),
        'budget', json_build_object(
          'id', v_budget_id,
          'total_amount', v_budget.total_amount,
          'used_amount', v_new_usage,
          'remaining', v_budget.total_amount - v_new_usage,
          'usage_percent', ROUND((v_new_usage / v_budget.total_amount * 100), 2)
        )
      )
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RETURN json_build_object(
      'success', false,
      'error', 'TRANSACTION_FAILED',
      'message', '记录支出失败: ' || SQLERRM
    );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION record_spending_tx TO authenticated;

-- Add comment
COMMENT ON FUNCTION record_spending_tx IS 'Atomically record spending and update budget usage with validation';
