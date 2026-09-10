-- cyberSleepCommunity · 用户画像表（匿名统计研究用）
--
-- 用法：Dashboard → SQL Editor → 粘贴 → Run
-- 与 community_picks 同一套模式：无账号社区，匿名 UUID 即身份，RLS 全开但宽松。
--
-- 字段说明（列名 = JSON 字段，REST 按列名映射）：
--   user_id    本地生成 UUID（csc_uid），主键
--   nickname   匿名昵称（站方会做匿名化脱敏），可空
--   age_group  60s/70s/80s/90s/00s/prefer_not（60后~00后，不填=prefer_not）
--   gender     male/female/prefer_not
--   education  bachelor/master/phd/other/prefer_not
--   createdAt  timestamptz 默认 now()（防手填）
--   updatedAt  显示为 undefined 亦可，仅在 upsert 时覆盖（REST 用 resolution=merge-duplicates）

create table if not exists user_profiles (
  user_id    text primary key,
  nickname   text not null default '',
  age_group  text not null default 'prefer_not',
  gender     text not null default 'prefer_not',
  education  text not null default 'prefer_not',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

grant select, insert, update on public.user_profiles to anon;
alter table user_profiles enable row level security;

create policy "anon select" on user_profiles
  for select to anon using (true);

create policy "anon insert" on user_profiles
  for insert to anon with check (true);

create policy "anon update" on user_profiles
  for update to anon using (true) with check (true);

-- 说明：画像仅用于统计研究，不识别到具体设备；upsert 以 user_id 覆盖，
-- 不提供 DELETE（避免 anon 越权删数据）。如需删除统计请走站方 SQL Editor。