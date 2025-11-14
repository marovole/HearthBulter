-- RPC Function: update_device_sync_status
-- Description: Atomically update device sync status with error count tracking
-- Dependencies: device_connections (table)
-- Security: SECURITY DEFINER with search_path protection, row-level locking
-- Performance: Single row update with FOR UPDATE lock to prevent race conditions
--
-- Called by: Device sync jobs, /api/devices endpoints
-- Design doc: tasks.md:98-103
--
-- Returns: JSONB object with structure:
--   {
--     "success": true,
--     "deviceId": "uuid",
--     "status": "PENDING|IN_PROGRESS|SUCCESS|FAILED|DISABLED",
--     "errorCount": 0,
--     "lastSyncAt": "ISO 8601 timestamp"
--   }

-- Drop old versions if parameter types changed
DROP FUNCTION IF EXISTS update_device_sync_status(UUID, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION update_device_sync_status(
  p_device_id UUID,
  p_status TEXT,
  p_error TEXT DEFAULT NULL,
  p_last_sync TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_device_record device_connections%ROWTYPE;
  v_normalized_status TEXT;
  v_new_error_count INT;
BEGIN
  -- ==================== 参数验证 ====================

  IF p_device_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MISSING_DEVICE_ID',
      'message', 'device_id 是必需参数'
    );
  END IF;

  -- 标准化状态值(转大写、去空格)
  v_normalized_status := UPPER(TRIM(COALESCE(p_status, '')));

  -- 验证状态值是否合法
  IF v_normalized_status NOT IN ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'DISABLED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '状态必须是: PENDING, IN_PROGRESS, SUCCESS, FAILED, DISABLED',
      'provided', p_status,
      'allowedValues', jsonb_build_array('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'DISABLED')
    );
  END IF;

  -- ==================== 原子更新 ====================

  -- 使用 FOR UPDATE 行级锁,防止并发更新导致数据不一致
  SELECT * INTO v_device_record
  FROM device_connections
  WHERE id = p_device_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DEVICE_NOT_FOUND',
      'message', '设备连接记录不存在',
      'deviceId', p_device_id
    );
  END IF;

  -- 计算新的错误计数
  -- 规则: FAILED 状态累加错误次数,其他状态重置为 0
  v_new_error_count := CASE
    WHEN v_normalized_status = 'FAILED' THEN
      COALESCE(v_device_record.error_count, 0) + 1
    ELSE
      0
  END;

  -- 更新设备连接记录
  UPDATE device_connections
  SET
    sync_status = v_normalized_status,
    last_sync_at = p_last_sync,
    last_error = CASE
      WHEN v_normalized_status = 'FAILED' THEN p_error
      ELSE NULL  -- 成功时清空错误信息
    END,
    error_count = v_new_error_count,
    updated_at = NOW()
  WHERE id = p_device_id;

  -- ==================== 返回结果 ====================

  RETURN jsonb_build_object(
    'success', true,
    'deviceId', p_device_id,
    'status', v_normalized_status,
    'errorCount', v_new_error_count,
    'lastSyncAt', p_last_sync,
    'lastError', CASE
      WHEN v_normalized_status = 'FAILED' THEN p_error
      ELSE NULL
    END,
    'updatedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 返回标准化错误格式
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', '更新设备同步状态失败: ' || SQLERRM,
      'code', SQLSTATE,
      'deviceId', p_device_id
    );
END;
$$;

-- ==================== 权限和文档 ====================

-- 授予认证用户执行权限
GRANT EXECUTE ON FUNCTION update_device_sync_status(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- 添加函数文档
COMMENT ON FUNCTION update_device_sync_status IS
'原子性更新设备同步状态
- 功能: 更新 device_connections 表的 sync_status、last_sync_at、error_count
- 状态值: PENDING, IN_PROGRESS, SUCCESS, FAILED, DISABLED
- 错误计数: FAILED 状态累加,其他状态重置为 0
- 并发安全: 使用 FOR UPDATE 行级锁防止竞态条件
- 错误清理: 非 FAILED 状态自动清空 last_error 字段
- 使用场景: 设备同步任务状态更新、错误跟踪
- 调用方: 设备同步 workers、/api/devices endpoints';
