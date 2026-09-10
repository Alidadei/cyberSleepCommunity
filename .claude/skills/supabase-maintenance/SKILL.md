# Skill: supabase-maintenance

## 触发条件

当用户要求以下操作时加载此 skill：
- 加字段 / 改字段类型 / 删字段
- 加索引 / 改索引
- 调整 RLS 策略
- 数据清理（去重、补数据、迁移）
- 查看表结构 / 数据统计
- 任何涉及 Supabase 数据库 schema 变更的操作

## 约束

- `anon` 角色：只能 REST API 读写（受 RLS 限制），不能 DELETE，不能 DDL
- `service_role` / `postgres`：完整权限，但不能通过 REST API 暴露
- 所有 DDL（ALTER TABLE、CREATE INDEX、CREATE POLICY）必须用户在 SQL Editor 手动执行
- 我负责生成 SQL，用户负责执行

## 工作流

### 1. 加字段

```sql
-- 模板：加字段（有默认值，不锁表）
ALTER TABLE {table} ADD COLUMN {column} {type} NOT NULL DEFAULT {default_value};

-- 示例：加 user_agent 列
ALTER TABLE community_picks ADD COLUMN user_agent text NOT NULL DEFAULT '';
```

### 2. 改字段类型

```sql
-- 模板：改类型（注意数据兼容）
ALTER TABLE {table} ALTER COLUMN {column} TYPE {new_type};

-- 示例：recommend_count 从 int 改 bigint
ALTER TABLE community_picks ALTER COLUMN recommend_count TYPE bigint;
```

### 3. 加索引

```sql
-- 模板：加索引
CREATE INDEX IF NOT EXISTS {index_name} ON {table} ({columns});

-- 示例：按 url 查重加速
CREATE INDEX IF NOT EXISTS idx_community_picks_url ON community_picks (url);
```

### 4. RLS 策略

```sql
-- 模板：允许 anon SELECT
CREATE POLICY "{table}_select_anon" ON {table}
  FOR SELECT TO anon USING (true);

-- 模板：允许 anon INSERT
CREATE POLICY "{table}_insert_anon" ON {table}
  FOR INSERT TO anon WITH CHECK (true);

-- 模板：允许 anon UPDATE（受 USING 限制）
CREATE POLICY "{table}_update_anon" ON {table}
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- 注意：anon DELETE 一般不开放，除非有业务需求
```

### 5. 数据清理

```sql
-- 去重模板：同 URL 保留 recommend_count 最大的行
WITH ranked AS (
  SELECT id, url, recommend_count,
         row_number() OVER (PARTITION BY url ORDER BY recommend_count DESC, id ASC) AS rn
  FROM {table}
)
DELETE FROM {table} WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### 6. 查看表结构

```sql
-- 查看列信息
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{table}' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 查看约束
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '{table}'::regclass;
```

### 7. 数据统计

```sql
-- 总行数
SELECT count(*) FROM {table};

-- 按类型统计
SELECT type, count(*) AS cnt, avg(recommend_count) AS avg_rec
FROM community_picks GROUP BY type ORDER BY cnt DESC;

-- 评分分布
SELECT unnest(ratings) AS score, count(*) AS cnt
FROM community_picks
GROUP BY score ORDER BY score;
```

## 当前表结构参考

### community_picks

| 列 | 类型 | 说明 |
|---|---|---|
| id | bigint (PK) | 时间戳 ID |
| title | text | 标题 |
| url | text (UNIQUE) | 链接，不可重复 |
| type | text | 类型 key |
| ratings | int[] | 评分数组 |
| addedAt | bigint | 添加时间戳 |
| recommend_count | int | 推荐次数，默认 1 |

## 纪律

- 不编造 SQL，每个语句都有依据
- DDL 语句一定提醒用户在 SQL Editor 执行
- 改表结构前先查当前结构确认兼容
- 大表改字段注意锁表风险（加 DEFAULT 值可避免）
