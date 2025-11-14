-- RPC Function: fetch_devices_for_sync
-- Description: Fetch active devices eligible for auto-sync with platform/status breakdown
-- Dependencies: device_connections, family_members (tables)
-- Security: SECURITY DEFINER with search_path protection
-- Performance: Bounded pagination (max 200), platform filter pushdown, summary aggregation
--
-- Called by: /api/devices/sync/all (src/app/api/devices/sync/all/route.ts:30-150)
-- Design doc: openspec/changes/add-cloudflare-supabase-hybrid-architecture/design.md
--
-- Returns: JSONB object with structure:
--   {
--     "devices": [{ id, deviceId, deviceName, platform, memberId, memberName,
--                   syncStatus, lastSyncAt, updatedAt }],
--     "summary": { total, platformBreakdown, statusBreakdown },
--     "pagination": { limit, offset, returned, hasMore },
--     "generatedAt": "ISO 8601 timestamp"
--   }

-- Drop old versions if parameter types changed
DROP FUNCTION IF EXISTS fetch_devices_for_sync(UUID, TEXT[], INT, INT);

CREATE OR REPLACE FUNCTION fetch_devices_for_sync(
  p_member_id UUID DEFAULT NULL,
  p_platforms TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_validated_limit INT;
  v_validated_offset INT;
  v_result JSONB;
BEGIN
  -- ==================== 参数验证 ====================

  -- 限制范围: 1-200 设备/次,防止大查询
  -- Edge Function 超时通常在 50s,200 设备足够覆盖 99% 的使用场景
  v_validated_limit := LEAST(GREATEST(p_limit, 1), 200);
  v_validated_offset := GREATEST(p_offset, 0);

  -- 如果提供了空数组,视为未过滤(NULL)
  IF p_platforms IS NOT NULL AND array_length(p_platforms, 1) = 0 THEN
    p_platforms := NULL;
  END IF;

  -- ==================== 聚合查询 ====================

  -- 使用多个 CTE 提高可读性,单次查询返回所有数据
  -- MATERIALIZED 确保 CTE 只执行一次,后续引用直接读取结果
  WITH filtered_devices AS MATERIALIZED (
    -- 第一步: 过滤符合条件的设备
    SELECT
      dc.id,
      dc.device_id,
      dc.device_name,
      dc.platform,
      dc.member_id,
      dc.sync_status,
      dc.last_sync_at,
      dc.updated_at,
      fm.user_id AS member_user_id,
      fm.family_id AS member_family_id,
      fm.name AS member_name
    FROM device_connections dc
    LEFT JOIN family_members fm
      ON fm.id = dc.member_id
      AND fm.deleted_at IS NULL
    WHERE dc.is_active = TRUE
      AND dc.is_auto_sync = TRUE
      AND dc.sync_status <> 'DISABLED'
      -- 可选过滤: member_id
      AND (p_member_id IS NULL OR dc.member_id = p_member_id)
      -- 可选过滤: platforms (使用 ANY 操作符高效匹配数组)
      AND (p_platforms IS NULL OR dc.platform = ANY(p_platforms))
  ),
  total_count AS (
    -- 第二步: 统计总数(用于分页元数据)
    SELECT COUNT(*) AS total FROM filtered_devices
  ),
  paged_devices AS (
    -- 第三步: 分页
    SELECT *
    FROM filtered_devices
    ORDER BY updated_at DESC NULLS LAST
    LIMIT v_validated_limit
    OFFSET v_validated_offset
  ),
  platform_stats AS (
    -- 第四步: 按平台统计
    SELECT platform, COUNT(*) AS count
    FROM filtered_devices
    WHERE platform IS NOT NULL
    GROUP BY platform
  ),
  status_stats AS (
    -- 第五步: 按同步状态统计
    SELECT sync_status, COUNT(*) AS count
    FROM filtered_devices
    WHERE sync_status IS NOT NULL
    GROUP BY sync_status
  )
  -- 第六步: 聚合所有结果为单个 JSONB
  SELECT jsonb_build_object(
    'devices', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pd.id,
            'deviceId', pd.device_id,
            'deviceName', pd.device_name,
            'platform', pd.platform,
            'memberId', pd.member_id,
            'memberName', pd.member_name,
            'memberUserId', pd.member_user_id,
            'memberFamilyId', pd.member_family_id,
            'syncStatus', pd.sync_status,
            'lastSyncAt', pd.last_sync_at,
            'updatedAt', pd.updated_at
          )
        )
        FROM paged_devices pd
      ),
      '[]'::jsonb
    ),
    'summary', jsonb_build_object(
      'total', (SELECT total FROM total_count),
      -- 平台分布统计 (e.g., {"iOS": 45, "Android": 32, "Web": 8})
      'platformBreakdown', COALESCE(
        (SELECT jsonb_object_agg(platform, count) FROM platform_stats),
        '{}'::jsonb
      ),
      -- 同步状态分布 (e.g., {"SUCCESS": 70, "PENDING": 10, "FAILED": 5})
      'statusBreakdown', COALESCE(
        (SELECT jsonb_object_agg(sync_status, count) FROM status_stats),
        '{}'::jsonb
      )
    ),
    'pagination', jsonb_build_object(
      'limit', v_validated_limit,
      'offset', v_validated_offset,
      'returned', (SELECT COUNT(*) FROM paged_devices),
      'hasMore', (SELECT total FROM total_count) > v_validated_offset + v_validated_limit
    ),
    'generatedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) INTO v_result
  FROM total_count;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- 返回标准化错误格式
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', '查询设备同步列表失败: ' || SQLERRM,
      'code', SQLSTATE,
      'generatedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
END;
$$;

-- ==================== 性能优化 ====================

-- 复合索引: 覆盖常见查询条件
-- WHERE is_active AND is_auto_sync 使用部分索引减少索引大小
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_connections_member_active_platform
  ON device_connections(member_id, is_active, platform, updated_at DESC)
  WHERE is_active = TRUE AND is_auto_sync = TRUE;

-- 为 family_members 关联查询添加索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_family_members_id_deleted
  ON family_members(id, deleted_at)
  WHERE deleted_at IS NULL;

-- ==================== 权限和文档 ====================

-- 授予认证用户执行权限
GRANT EXECUTE ON FUNCTION fetch_devices_for_sync(UUID, TEXT[], INT, INT) TO authenticated;

-- 添加函数文档
COMMENT ON FUNCTION fetch_devices_for_sync IS
'获取待同步设备列表(优化版)
- 性能优化: 单次 DB 往返,复合索引加速查询
- 过滤条件: is_active=true, is_auto_sync=true, sync_status<>DISABLED
- 支持: member_id 过滤、platform 数组过滤、分页
- 返回: 设备列表 + 汇总统计(总数、平台分布、状态分布)
- 限制: 最多返回 200 设备/次,防止超时
- 使用场景: Stage 5 (Devices) 迁移
- 调用方: /api/devices/sync/all
- 缓存建议: 可使用 Cloudflare KV 缓存待同步设备列表(TTL 60s)';
