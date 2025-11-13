-- ============================================================================
-- 双写验证框架数据库表
-- ============================================================================
-- 描述: 支持 Prisma 到 Supabase 迁移期间的双写验证
-- 创建时间: 2025-11-13
-- ============================================================================

-- 安全保护: 设置 search_path
SET search_path TO public, pg_temp;

-- ============================================================================
-- 1. dual_write_config 表 - Feature Flag 配置
-- ============================================================================

CREATE TABLE IF NOT EXISTS dual_write_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_dual_write_config_updated_at
  ON dual_write_config(updated_at DESC);

-- 注释
COMMENT ON TABLE dual_write_config IS '双写验证框架的 Feature Flag 配置表';
COMMENT ON COLUMN dual_write_config.key IS '配置键(唯一)';
COMMENT ON COLUMN dual_write_config.value IS '配置值(JSONB格式)';
COMMENT ON COLUMN dual_write_config.updated_at IS '最后更新时间';

-- 初始化默认配置
INSERT INTO dual_write_config (key, value, updated_at)
VALUES (
  'dual_write_feature_flags',
  jsonb_build_object(
    'enableDualWrite', false,
    'enableSupabasePrimary', false
  ),
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. dual_write_diffs 表 - Diff 记录
-- ============================================================================

CREATE TABLE IF NOT EXISTS dual_write_diffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_endpoint TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB,
  request_id TEXT,
  prisma_result JSONB,
  supabase_result JSONB,
  diff JSONB,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_dual_write_diffs_api_endpoint
  ON dual_write_diffs(api_endpoint);

CREATE INDEX IF NOT EXISTS idx_dual_write_diffs_severity
  ON dual_write_diffs(severity);

CREATE INDEX IF NOT EXISTS idx_dual_write_diffs_created_at
  ON dual_write_diffs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dual_write_diffs_composite
  ON dual_write_diffs(api_endpoint, severity, created_at DESC);

-- 注释
COMMENT ON TABLE dual_write_diffs IS '双写验证框架的 Diff 记录表';
COMMENT ON COLUMN dual_write_diffs.id IS '记录ID';
COMMENT ON COLUMN dual_write_diffs.api_endpoint IS 'API 端点名称';
COMMENT ON COLUMN dual_write_diffs.operation IS '操作类型(create/update/delete/findById等)';
COMMENT ON COLUMN dual_write_diffs.payload IS '请求 payload';
COMMENT ON COLUMN dual_write_diffs.request_id IS '请求 ID(可选,用于关联)';
COMMENT ON COLUMN dual_write_diffs.prisma_result IS 'Prisma 执行结果';
COMMENT ON COLUMN dual_write_diffs.supabase_result IS 'Supabase 执行结果';
COMMENT ON COLUMN dual_write_diffs.diff IS 'JSON Patch 格式的差异';
COMMENT ON COLUMN dual_write_diffs.severity IS '严重性(info/warning/error)';
COMMENT ON COLUMN dual_write_diffs.created_at IS '创建时间';

-- ============================================================================
-- 3. RLS 策略（暂不启用，仅管理员访问）
-- ============================================================================

-- ALTER TABLE dual_write_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dual_write_diffs ENABLE ROW LEVEL SECURITY;

-- 仅管理员可访问
-- CREATE POLICY "Only admins can access dual_write_config" ON dual_write_config
--   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- CREATE POLICY "Only admins can access dual_write_diffs" ON dual_write_diffs
--   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 4. 辅助函数 - 获取 Diff 统计
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dual_write_stats(
  p_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SET search_path TO public, pg_temp;

  SELECT jsonb_build_object(
    'total_diffs', COUNT(*),
    'errors', COUNT(*) FILTER (WHERE severity = 'error'),
    'warnings', COUNT(*) FILTER (WHERE severity = 'warning'),
    'infos', COUNT(*) FILTER (WHERE severity = 'info'),
    'by_endpoint', (
      SELECT jsonb_object_agg(
        api_endpoint,
        jsonb_build_object(
          'total', COUNT(*),
          'errors', COUNT(*) FILTER (WHERE severity = 'error'),
          'warnings', COUNT(*) FILTER (WHERE severity = 'warning')
        )
      )
      FROM dual_write_diffs
      WHERE created_at >= NOW() - INTERVAL '1 day' * p_days
      GROUP BY api_endpoint
    ),
    'date_range', jsonb_build_object(
      'from', NOW() - INTERVAL '1 day' * p_days,
      'to', NOW()
    )
  ) INTO v_result
  FROM dual_write_diffs
  WHERE created_at >= NOW() - INTERVAL '1 day' * p_days;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_dual_write_stats IS '获取双写验证统计信息(最近N天)';

-- ============================================================================
-- 5. 清理旧记录函数
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_dual_write_diffs(
  p_keep_days INT DEFAULT 30
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INT;
BEGIN
  SET search_path TO public, pg_temp;

  DELETE FROM dual_write_diffs
  WHERE created_at < NOW() - INTERVAL '1 day' * p_keep_days
    AND severity = 'info';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_dual_write_diffs IS '清理旧的 info 级别 diff 记录(保留 warning/error)';

-- ============================================================================
-- 完成
-- ============================================================================
