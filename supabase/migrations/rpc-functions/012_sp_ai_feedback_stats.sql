/**
 * RPC Function: sp_ai_feedback_stats
 *
 * 聚合 AI 建议的反馈统计数据，避免客户端遍历 JSONB 数组
 *
 * 使用 jsonb_array_elements 展开 ai_advice.feedback 数组，
 * 计算总数、平均评分、评分分布、Top 5 分类、按类型统计等
 *
 * @param p_member_id - 成员 ID
 * @param p_advice_type - 可选的建议类型过滤（如 HEALTH_ANALYSIS, RECIPE_OPTIMIZATION）
 * @param p_days_ago - 统计时间范围（默认 30 天）
 * @returns 单行统计数据
 */
CREATE OR REPLACE FUNCTION sp_ai_feedback_stats(
  p_member_id uuid,
  p_advice_type text DEFAULT NULL,
  p_days_ago int DEFAULT 30
)
RETURNS TABLE (
  total_feedback bigint,
  average_rating numeric,
  rating_distribution jsonb,
  top_categories jsonb,
  by_type jsonb,
  period_days int
)
LANGUAGE sql
STABLE
AS $$
WITH recent_advice AS (
  -- 获取最近 N 天的 AI 建议记录（有反馈的）
  SELECT id, type, feedback
  FROM ai_advice
  WHERE member_id = p_member_id
    AND feedback IS NOT NULL
    AND jsonb_array_length(feedback) > 0
    AND updated_at >= now() - (p_days_ago || ' days')::interval
    AND (p_advice_type IS NULL OR type = p_advice_type)
),
feedback_rows AS (
  -- 展开 JSONB 数组，每条反馈变成一行
  SELECT
    a.id AS advice_id,
    a.type,
    jsonb_array_elements(a.feedback) AS entry
  FROM recent_advice a
),
normalized AS (
  -- 提取反馈字段
  SELECT
    advice_id,
    type,
    (entry ->> 'rating')::numeric AS rating,
    entry ->> 'rating' AS rating_text,
    entry -> 'categories' AS categories
  FROM feedback_rows
),
stats AS (
  -- 计算总数和平均评分
  SELECT
    count(*) AS total_count,
    avg(rating) AS avg_rating
  FROM normalized
),
rating_distribution AS (
  -- 计算评分分布（1-5 星）
  SELECT
    count(*) FILTER (WHERE rating_text = '1') AS rating_1,
    count(*) FILTER (WHERE rating_text = '2') AS rating_2,
    count(*) FILTER (WHERE rating_text = '3') AS rating_3,
    count(*) FILTER (WHERE rating_text = '4') AS rating_4,
    count(*) FILTER (WHERE rating_text = '5') AS rating_5
  FROM normalized
),
category_counts AS (
  -- 计算 Top 5 反馈分类
  SELECT category, count
  FROM (
    SELECT
      cat AS category,
      count(*) AS count
    FROM normalized,
      LATERAL jsonb_array_elements_text(coalesce(categories, '[]'::jsonb)) AS cat
    WHERE char_length(trim(coalesce(cat, ''))) > 0
    GROUP BY cat
    ORDER BY count DESC
    LIMIT 5
  ) ranked
),
type_counts AS (
  -- 按建议类型统计
  SELECT
    type,
    count(*) AS count,
    avg(rating) AS avg_rating
  FROM normalized
  GROUP BY type
)
-- 返回单行聚合结果
SELECT
  coalesce(stats.total_count, 0) AS total_feedback,
  coalesce(stats.avg_rating, 0) AS average_rating,
  jsonb_build_object(
    '1', coalesce(rd.rating_1, 0),
    '2', coalesce(rd.rating_2, 0),
    '3', coalesce(rd.rating_3, 0),
    '4', coalesce(rd.rating_4, 0),
    '5', coalesce(rd.rating_5, 0)
  ) AS rating_distribution,
  coalesce(
    (SELECT jsonb_agg(jsonb_build_object('category', category, 'count', count)) FROM category_counts),
    '[]'::jsonb
  ) AS top_categories,
  coalesce(
    (
      SELECT jsonb_object_agg(
        type,
        jsonb_build_object(
          'count', count,
          'avgRating', round(avg_rating::numeric, 2)
        )
      )
      FROM type_counts
    ),
    '{}'::jsonb
  ) AS by_type,
  p_days_ago AS period_days
FROM stats
CROSS JOIN rating_distribution rd;
$$;

-- 添加注释
COMMENT ON FUNCTION sp_ai_feedback_stats IS '聚合 AI 建议的反馈统计数据（总数、平均评分、评分分布、Top 5 分类、按类型统计）';
