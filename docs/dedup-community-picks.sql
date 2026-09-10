-- =====================================================
-- community_picks 去重合并脚本（一次性执行）
-- 功能：同 URL 保留 recommend_count 最大的行，其余删除
-- 权限：需在 SQL Editor 以 postgres 角色执行
-- =====================================================

-- 步骤1：预览重复
SELECT url, count(*) AS cnt, max(recommend_count) AS max_count
FROM community_picks
GROUP BY url
HAVING count(*) > 1;

-- 步骤2：合并推荐次数到保留行（recommend_count 取最大值）
WITH ranked AS (
  SELECT id, url, recommend_count,
         row_number() OVER (PARTITION BY url ORDER BY recommend_count DESC, id ASC) AS rn
  FROM community_picks
)
UPDATE community_picks p
SET recommend_count = r.max_count
FROM (
  SELECT url, max(recommend_count) AS max_count
  FROM ranked
  GROUP BY url
) r
WHERE p.url = r.url
  AND p.id IN (SELECT id FROM ranked WHERE rn = 1);

-- 步骤3：删除多余行（只保留每组 rn=1）
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY url ORDER BY recommend_count DESC, id ASC) AS rn
  FROM community_picks
)
DELETE FROM community_picks
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 步骤4：验证（应无重复）
SELECT url, count(*) AS cnt
FROM community_picks
GROUP BY url
HAVING count(*) > 1;
