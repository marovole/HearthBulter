-- RPC Function: calculate_social_stats
-- Description: Aggregate social sharing statistics with period-based filtering and platform breakdown
-- Dependencies: shared_content, share_tracking (tables)
-- Security: SECURITY DEFINER with search_path protection
-- Performance: Time range indexing, event type filtering, daily trend aggregation
--
-- Called by: /api/social/stats (src/app/api/social/stats/route.ts:31-114)
-- Design doc: openspec/changes/add-cloudflare-supabase-hybrid-architecture/design.md
--
-- Returns: JSONB object with structure:
--   {
--     "period": "7d|30d|90d|1y",
--     "platform": "optional platform filter",
--     "totals": { shares, views, clicks, conversions },
--     "platformBreakdown": { "iOS": {...}, "Android": {...} },
--     "daily": [{ date, shares, views, clicks, conversions }],
--     "generatedAt": "ISO 8601 timestamp"
--   }

-- Drop old versions if parameter types changed
DROP FUNCTION IF EXISTS calculate_social_stats(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION calculate_social_stats(
  p_member_id UUID,
  p_period TEXT DEFAULT '30d',
  p_platform TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_interval INTERVAL;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ := NOW();
  v_result JSONB;
BEGIN
  -- ==================== 参数验证 ====================

  IF p_member_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MISSING_MEMBER_ID',
      'message', 'member_id 是必需参数'
    );
  END IF;

  -- 验证并转换 period 参数
  CASE p_period
    WHEN '7d' THEN
      v_interval := INTERVAL '7 days';
    WHEN '30d' THEN
      v_interval := INTERVAL '30 days';
    WHEN '90d' THEN
      v_interval := INTERVAL '90 days';
    WHEN '1y' THEN
      v_interval := INTERVAL '365 days';
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INVALID_PERIOD',
        'message', 'period 必须是: 7d, 30d, 90d, 1y',
        'provided', p_period
      );
  END CASE;

  v_start_date := v_end_date - v_interval;

  -- ==================== 聚合查询 ====================

  -- 使用多个 CTE 提高可读性,单次查询返回所有数据
  WITH content_tokens AS (
    -- 第一步: 获取用户的分享内容 tokens
    -- 注意: 不按 created_at 过滤 share token,只过滤 member_id 和 platform
    -- 原因: 即使是很久以前创建的 share token,只要在查询期间产生事件,都应被统计
    -- 这避免了系统性低估长期分享的统计数据
    SELECT
      sc.share_token,
      sc.platform,
      sc.created_at
    FROM shared_content sc
    WHERE sc.member_id = p_member_id
      AND sc.deleted_at IS NULL
      -- 可选过滤: platform
      AND (p_platform IS NULL OR sc.platform = p_platform)
  ),
  tracking_events AS (
    -- 第二步: 获取时间范围内的所有跟踪事件
    SELECT
      st.event_type,
      st.created_at,
      ct.platform
    FROM share_tracking st
    INNER JOIN content_tokens ct ON st.share_token = ct.share_token
    WHERE st.created_at BETWEEN v_start_date AND v_end_date
  ),
  event_totals AS (
    -- 第三步: 按事件类型汇总总数
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'SHARE') AS shares,
      COUNT(*) FILTER (WHERE event_type = 'VIEW') AS views,
      COUNT(*) FILTER (WHERE event_type = 'CLICK') AS clicks,
      COUNT(*) FILTER (WHERE event_type = 'CONVERSION') AS conversions
    FROM tracking_events
  ),
  platform_breakdown AS (
    -- 第四步: 按平台分组统计
    SELECT
      COALESCE(platform, 'UNKNOWN') AS platform,
      COUNT(*) FILTER (WHERE event_type = 'SHARE') AS shares,
      COUNT(*) FILTER (WHERE event_type = 'VIEW') AS views,
      COUNT(*) FILTER (WHERE event_type = 'CLICK') AS clicks,
      COUNT(*) FILTER (WHERE event_type = 'CONVERSION') AS conversions
    FROM tracking_events
    GROUP BY platform
  ),
  daily_trend AS (
    -- 第五步: 按日期聚合趋势数据
    -- 使用 date_trunc 截断到天,提高查询效率
    SELECT
      date_trunc('day', created_at)::date AS day,
      COUNT(*) FILTER (WHERE event_type = 'SHARE') AS shares,
      COUNT(*) FILTER (WHERE event_type = 'VIEW') AS views,
      COUNT(*) FILTER (WHERE event_type = 'CLICK') AS clicks,
      COUNT(*) FILTER (WHERE event_type = 'CONVERSION') AS conversions
    FROM tracking_events
    GROUP BY day
    ORDER BY day DESC
  )
  -- 第六步: 聚合所有结果为单个 JSONB
  SELECT jsonb_build_object(
    'period', p_period,
    'platform', p_platform,
    -- 总计指标
    'totals', jsonb_build_object(
      'shares', COALESCE(et.shares, 0),
      'views', COALESCE(et.views, 0),
      'clicks', COALESCE(et.clicks, 0),
      'conversions', COALESCE(et.conversions, 0),
      -- 计算转化率(避免除零)
      'conversionRate', CASE
        WHEN COALESCE(et.views, 0) > 0
        THEN ROUND((COALESCE(et.conversions, 0)::NUMERIC / et.views * 100), 2)
        ELSE 0
      END,
      -- 计算点击率
      'clickThroughRate', CASE
        WHEN COALESCE(et.views, 0) > 0
        THEN ROUND((COALESCE(et.clicks, 0)::NUMERIC / et.views * 100), 2)
        ELSE 0
      END
    ),
    -- 平台分布统计
    'platformBreakdown', COALESCE(
      (
        SELECT jsonb_object_agg(
          pb.platform,
          jsonb_build_object(
            'shares', pb.shares,
            'views', pb.views,
            'clicks', pb.clicks,
            'conversions', pb.conversions,
            'conversionRate', CASE
              WHEN pb.views > 0
              THEN ROUND((pb.conversions::NUMERIC / pb.views * 100), 2)
              ELSE 0
            END
          )
        )
        FROM platform_breakdown pb
      ),
      '{}'::jsonb
    ),
    -- 每日趋势数据(按日期降序)
    'daily', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'date', to_char(dt.day, 'YYYY-MM-DD'),
            'shares', dt.shares,
            'views', dt.views,
            'clicks', dt.clicks,
            'conversions', dt.conversions
          )
          ORDER BY dt.day DESC
        )
        FROM daily_trend dt
      ),
      '[]'::jsonb
    ),
    'generatedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) INTO v_result
  FROM event_totals et;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- 返回标准化错误格式
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', '计算社交统计失败: ' || SQLERRM,
      'code', SQLSTATE,
      'generatedAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
END;
$$;

-- ==================== 性能优化 ====================

-- 为 shared_content 查询添加复合索引
-- 按 created_at 降序索引,匹配时间范围查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shared_content_member_created_deleted
  ON shared_content(member_id, created_at DESC, deleted_at)
  WHERE deleted_at IS NULL;

-- 为 share_tracking 查询添加复合索引
-- share_token + created_at 组合索引加速 JOIN 和时间过滤
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_share_tracking_token_created_type
  ON share_tracking(share_token, created_at DESC, event_type);

-- ==================== 物化视图建议 ====================

-- 对于高频查询场景,可以创建物化视图缓存每日统计:
--
-- CREATE MATERIALIZED VIEW social_stats_daily AS
-- SELECT
--   member_id,
--   platform,
--   date_trunc('day', st.created_at)::date AS stat_date,
--   COUNT(*) FILTER (WHERE event_type = 'SHARE') AS shares,
--   COUNT(*) FILTER (WHERE event_type = 'VIEW') AS views,
--   COUNT(*) FILTER (WHERE event_type = 'CLICK') AS clicks,
--   COUNT(*) FILTER (WHERE event_type = 'CONVERSION') AS conversions
-- FROM share_tracking st
-- JOIN shared_content sc ON st.share_token = sc.share_token
-- WHERE sc.deleted_at IS NULL
-- GROUP BY member_id, platform, stat_date;
--
-- -- 每小时刷新
-- CREATE OR REPLACE FUNCTION refresh_social_stats_mv()
-- RETURNS void LANGUAGE plpgsql AS $$
-- BEGIN
--   REFRESH MATERIALIZED VIEW CONCURRENTLY social_stats_daily;
-- END;
-- $$;
--
-- -- 使用 pg_cron 定时刷新
-- SELECT cron.schedule('refresh-social-stats', '0 * * * *', 'SELECT refresh_social_stats_mv();');

-- ==================== 权限和文档 ====================

-- 授予认证用户执行权限
GRANT EXECUTE ON FUNCTION calculate_social_stats(UUID, TEXT, TEXT) TO authenticated;

-- 添加函数文档
COMMENT ON FUNCTION calculate_social_stats IS
'计算社交分享统计数据(优化版)
- 性能优化: 单次 DB 往返,复合索引加速查询
- 支持时间区间: 7d, 30d, 90d, 1y
- 支持平台过滤: 可选 platform 参数
- 返回指标: 总计(shares/views/clicks/conversions)、转化率、点击率
- 平台分布: 按平台统计各项指标
- 每日趋势: 按日期聚合(降序排列)
- 缓存建议: 适合使用 Cloudflare KV 缓存(TTL 3600s)或物化视图
- 使用场景: Stage 5 (Social/Analytics) 迁移
- 调用方: /api/social/stats
- 优化建议: 对于大数据量(>100万事件),建议使用物化视图预计算';
