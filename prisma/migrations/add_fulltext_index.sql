-- PostgreSQL全文搜索索引迁移
-- 为foods表添加全文搜索索引，支持中英文搜索

-- 创建全文搜索索引
-- 使用 'simple' 配置，支持中英文混合搜索
CREATE INDEX IF NOT EXISTS idx_foods_fulltext_search 
ON foods 
USING GIN (
  to_tsvector('simple', 
    COALESCE(name, '') || ' ' || 
    COALESCE(name_en, '') || ' ' || 
    COALESCE(aliases, '[]')
  )
);

-- 创建函数以支持全文搜索查询
CREATE OR REPLACE FUNCTION search_foods(search_query TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  name_en TEXT,
  aliases TEXT,
  calories FLOAT,
  protein FLOAT,
  carbs FLOAT,
  fat FLOAT,
  category TEXT,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.name_en,
    f.aliases,
    f.calories,
    f.protein,
    f.carbs,
    f.fat,
    f.category::TEXT,
    f.source::TEXT
  FROM foods f
  WHERE 
    to_tsvector('simple', 
      COALESCE(f.name, '') || ' ' || 
      COALESCE(f.name_en, '') || ' ' || 
      COALESCE(f.aliases, '[]')
    ) @@ to_tsquery('simple', search_query)
    OR f.name ILIKE '%' || search_query || '%'
    OR f.name_en ILIKE '%' || search_query || '%'
    OR f.aliases ILIKE '%' || search_query || '%'
  ORDER BY 
    CASE 
      WHEN f.name ILIKE search_query || '%' THEN 1
      WHEN f.name ILIKE '%' || search_query || '%' THEN 2
      ELSE 3
    END,
    f.name
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON INDEX idx_foods_fulltext_search IS '全文搜索索引，支持食物名称中英文搜索';
COMMENT ON FUNCTION search_foods IS '全文搜索函数，支持中英文混合查询';

