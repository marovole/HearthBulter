-- RPC Function: bulk_mark_notifications_read
-- Description: Batch mark notifications as read with optional "mark all" mode
-- Dependencies: notifications (table)
-- Security: SECURITY DEFINER with search_path protection, member_id scope enforcement
-- Performance: Bulk UPDATE with WHERE IN or mark_all filter
--
-- Called by: /api/notifications/read, notification management UI
-- Design doc: tasks.md:98-103
--
-- Returns: JSONB object with structure:
--   {
--     "success": true,
--     "memberId": "uuid",
--     "marked": 42,
--     "timestamp": "ISO 8601 timestamp"
--   }

-- Drop old versions if parameter types changed
DROP FUNCTION IF EXISTS bulk_mark_notifications_read(UUID, UUID[], BOOLEAN);

CREATE OR REPLACE FUNCTION bulk_mark_notifications_read(
  p_member_id UUID,
  p_notification_ids UUID[] DEFAULT NULL,
  p_mark_all BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_affected_count INT;
BEGIN
  -- ==================== 参数验证 ====================

  IF p_member_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MISSING_MEMBER_ID',
      'message', 'member_id 是必需参数'
    );
  END IF;

  -- 验证参数组合:必须提供 notification_ids 或设置 mark_all=true
  IF NOT p_mark_all THEN
    IF p_notification_ids IS NULL OR array_length(p_notification_ids, 1) IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'MISSING_IDENTIFIERS',
        'message', '必须提供 notification_ids 数组或设置 mark_all=true'
      );
    END IF;

    -- 检查数组是否为空
    IF array_length(p_notification_ids, 1) = 0 THEN
      RETURN jsonb_build_object(
        'success', true,
        'memberId', p_member_id,
        'marked', 0,
        'message', '没有提供需要标记的通知 ID',
        'timestamp', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      );
    END IF;
  END IF;

  -- ==================== 批量更新 ====================

  IF p_mark_all THEN
    -- 模式 1: 标记所有未读通知(排除已 DISMISSED 的)
    UPDATE notifications
    SET
      read_at = v_now,
      status = 'READ',
      updated_at = v_now
    WHERE member_id = p_member_id
      AND read_at IS NULL
      AND status <> 'DISMISSED';

  ELSE
    -- 模式 2: 只标记指定 ID 的通知
    -- 使用 ANY 操作符高效匹配数组
    UPDATE notifications
    SET
      read_at = v_now,
      status = 'READ',
      updated_at = v_now
    WHERE member_id = p_member_id
      AND id = ANY(p_notification_ids)
      AND read_at IS NULL;  -- 只更新未读的,避免重复更新

  END IF;

  -- 获取实际影响的行数
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  -- ==================== 返回结果 ====================

  RETURN jsonb_build_object(
    'success', true,
    'memberId', p_member_id,
    'marked', v_affected_count,
    'mode', CASE
      WHEN p_mark_all THEN 'mark_all'
      ELSE 'mark_specific'
    END,
    'providedIds', CASE
      WHEN p_mark_all THEN NULL
      ELSE array_length(p_notification_ids, 1)
    END,
    'timestamp', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 返回标准化错误格式
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', '批量标记通知已读失败: ' || SQLERRM,
      'code', SQLSTATE,
      'memberId', p_member_id
    );
END;
$$;

-- ==================== 性能优化 ====================

-- 为批量更新查询添加复合索引
-- 覆盖 member_id + read_at 的过滤条件
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_member_read_status
  ON notifications(member_id, read_at, status)
  WHERE read_at IS NULL;  -- 部分索引,只索引未读通知

-- ==================== 权限和文档 ====================

-- 授予认证用户执行权限
GRANT EXECUTE ON FUNCTION bulk_mark_notifications_read(UUID, UUID[], BOOLEAN) TO authenticated;

-- 添加函数文档
COMMENT ON FUNCTION bulk_mark_notifications_read IS
'批量标记通知为已读
- 模式 1 (mark_all=true): 标记用户所有未读通知(排除 DISMISSED)
- 模式 2 (mark_all=false): 只标记指定 ID 列表的通知
- 性能: 使用 ANY 操作符高效匹配数组,部分索引加速未读通知查询
- 幂等性: 只更新 read_at IS NULL 的通知,避免重复更新
- 返回: 实际影响的行数(v_affected_count)
- 使用场景: 通知管理、"全部已读"功能
- 调用方: /api/notifications/read, notification UI';
