-- cyberSleepCommunity · Supabase 建表脚本（P1 数据互通）
--
-- 用法：
--   1. supabase.com 注册（免费档 0 元）→ New project
--   2. Dashboard → SQL Editor → 粘贴本文件全部内容 → Run
--   3. 把 Project Settings → API 里的 Project URL 和 anon public key
--      填进 index.html 顶部的 SUPABASE = { url, anonKey }，两值填齐即启用云端
--
-- 字段 = docs/DATA_CONTRACT.md §1 CommunityPick，一字不改。
-- 列名必须与 JSON 字段完全一致（REST 接口按 JSON key 映射列名），
-- addedAt 含大写字母因此加引号。

create table if not exists community_picks (
  id        bigint primary key,          -- epoch 毫秒，与 APP CommunityPick.id (Long) 一致
  title     text    not null,            -- 上限 80 字符（契约 §7，APP LinkParser 截断值）
  url       text    not null,            -- http(s) 链接
  type      text,                        -- anxiety/excitement/physical/noise 或 null
  ratings   int[]   not null default '{}',  -- 每项 1–5，打分=读回追加后整体 PATCH
  "addedAt" bigint  not null             -- epoch 毫秒
);

-- 无账号社区：anon 角色即可读/写，权限全靠这几条策略（契约 §6 既定做法）
alter table community_picks enable row level security;

create policy "anon select" on community_picks
  for select to anon using (true);

create policy "anon insert" on community_picks
  for insert to anon with check (true);

create policy "anon update" on community_picks
  for update to anon using (true) with check (true);

-- 已知限制（有意取舍，P3 再收紧）：
-- anon update 不限制列，任何人可以覆盖任意行的 ratings 数组（并发打分互相覆盖）。
-- 社区规模小、内容无敏感数据，先接受；后续可拆 ratings 子表 + insert-only 策略。
