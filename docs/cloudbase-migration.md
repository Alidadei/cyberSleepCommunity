# 迁移指南：官方 Supabase → 腾讯云 CloudBase（PG 模式）

> ⚠️ 状态（2026-09-10）：**本方案暂缓**。数据后端当前先用官方 Supabase 免费档试跑
> （见 `docs/supabase-quickstart.md`），观察境内延迟；若延迟不能接受，再按本指南切 CloudBase。
> 域名方案单独走 `docs/deploy-guide.md`（当前 GitHub Pages 主 + CloudBase 备）；统一进度见 `docs/ROADMAP.md`。
>
> 结论：站主与访客均在境内，官方 Supabase 的 `.supabase.co` 域名国内直连不稳，且后续要接入
> 用户画像 + AI 推荐（需要 pgvector 向量检索与中文分词）。腾讯云 CloudBase PG 模式是「Supabase
> 兼容版」——同一 PostgREST 引擎、相同的 GRANT + RLS 双权限模型，RLS 策略 SQL 可零改动复用，
> 且预装 `pgvector`/`vectorscale`、`zhparser`/`pg_jieba`、`tencentdb_ai` 等 AI 相关扩展。
> 本指南把现有 `index.html` 的 `SupabaseStore` 从官方 Supabase 切到 CloudBase。

---

## 一、为什么换

| 项 | 官方 Supabase | CloudBase PG 模式 |
|---|---|---|
| 国内访问 | `.supabase.co` 直连不稳，常需代理 | 上海地域，境内低延迟、可备案合规 |
| 计费 | 美元 + 海外网络 | 人民币计费、腾讯云统一账单 |
| 向量检索（画像/AI） | 需自己开 pgvector | 预装 `pgvector` + `vectorscale`、`tencentdb_ai`、`zhparser` 中文分词 |
| RLS 权限模型 | GRANT（隐式）+ RLS | GRANT + RLS **双层显式**（两者都过才算通过） |
| 免费档 | 500MB DB / 5GB 带宽 | 3000 资源点/月（≈¥3），可用 6 个月可按活动续 |

## 二、差异点速查（迁移动作对照）

| 能力 | 官方 Supabase | CloudBase PG | 迁移动作 |
|---|---|---|---|
| REST 根路径 | `/rest/v1/` | `/v1/rdb/rest/` | 改 base URL |
| 认证端点 | `/auth/v1/...` | `/auth/v1/...`（一致） | 匿名登录拿 `access_token` |
| 域名 | `<proj>.supabase.co` | `<env>.api.tcloudbasegateway.com` | 替换 |
| 客户端鉴权 | `apikey` + `Authorization: Bearer <anonKey>` | `Authorization: Bearer <access_token>`（anonymous 登录签发） | 匿名登录后再发业务请求 |
| RLS 策略 | 自动放行 anon（仅策略一道门） | GRANT（表级）+ RLS（行级）两道门 | **必须补 `GRANT ... TO anon`** |
| Realtime / GraphQL / DB 分支 | 支持 | 不支持 | 本项目只用 REST insert/select，无影响 |
| DDL 通道 | Studio / 直连 | 控制台 SQL 编辑器 / 云 API `ExecutePGSql` | SQL 原样可跑 |

## 三、开通步骤（约 10 分钟）

1. 注册腾讯云账号并完成实名认证，进入 [云开发控制台](https://cloud.tencent.com/product/tcbs)。
2. **新建环境**：地域选 **上海**，数据库类型选 **PostgreSQL**（PG 模式）；
   选择「免费体验版」，每账号限 1 个免费环境，赠送 3000 资源点/月。
3. 环境创建后，记录两个值（后续填进 `index.html`）：
   - **环境 ID**（形如 `pg-xxxx`）
   - **Publishable Key**（前端使用、对应 `anon` 角色，公开无妨）
4. 控制台 SQL 编辑器，粘贴下方 SQL 并执行（建表 + 授权 + RLS）：

```sql
-- ============ CloudBase 版 cyberSleepCommunity 建表（PG 模式） ============
-- 字段与 docs/DATA_CONTRACT.md §1 CommunityPick 一字不改。

create table if not exists public.community_picks (
  id        bigint primary key,          -- epoch 毫秒，与 APP CommunityPick.id (Long) 一致
  title     text    not null,            -- 上限 80 字符（契约 §7）
  url       text    not null,            -- http(s) 链接
  type      text,                        -- anxiety/excitement/physical/noise 或 null
  ratings   int[]   not null default '{}',  -- 每项 1–5，打分 = 读回追加后整体 PATCH
  "addedAt" bigint  not null             -- epoch 毫秒
);

-- 关键差异：CloudBase 是 GRANT（表级）+ RLS（行级）双层，缺一层都拒绝。
-- anon 匿名游客：可读、可写（新增/打分即 PATCH）。
-- 注：id 由客户端填 epoch 毫秒，无序列；若日后改 bigserial 主键，需补
--     grant usage, select on sequence public.community_picks_id_seq to anon;
grant select, insert, update                       on public.community_picks to anon;

alter table public.community_picks enable row level security;

create policy "anon select" on public.community_picks
  for select to anon using (true);

create policy "anon insert" on public.community_picks
  for insert to anon with check (true);

create policy "anon update" on public.community_picks
  for update to anon using (true) with check (true);
```

> 与官方 Supabase 版的差别只有三句 `GRANT`。RLS 策略写法与官方完全一致。
> 已知限制同官方版：anon update 不限列，任何人可覆盖任意行 ratings 数组，P3 再收紧。

## 四、改前端配置（`index.html` 顶部）

```js
// ================= 官方 Supabase 写法 =================
const SUPABASE = {
  url: 'https://<project>.supabase.co',                 // 项目 URL
  anonKey: 'eyJhbGciOi...',                            // anon public key
};

// ================= CloudBase（PG 模式）写法 =================
const SUPABASE = {
  url: 'https://<envId>.api.tcloudbasegateway.com',     // 仅域名根，不带路径
  anonKey: '<Publishable Key>',                        // 控制台 → 环境 → Publishable Key
};
```

填上这两个值，`SupabaseStore` 即自动启用（`Store` 选择云存储）；留空则回落本机 `LocalStore`。
`SupabaseStore` 会根据 url 是否含 `tcloudbasegateway` 自动判别后端：
- CloudBase：先 `POST /auth/v1/signin/anonymously` 换 `access_token`，再访问 `/v1/rdb/rest/community_picks`
- 官方 Supabase：沿用 `apikey` + `Authorization: Bearer <anonKey>`，访问 `/rest/v1/community_picks`

## 五、上线顺序与冒烟验证

1. 先跑本机回归：`node tests/dom-test.mjs`（60 断言全过，SupabaseStore 未激活不受影响）。
2. 填好配置，浏览器打开，F12 网络面板确认：
   - 首次请求为 `POST /auth/v1/signin/anonymously`（拿 token）
   - `GET /v1/rdb/rest/community_picks?...` 返回 200 且 head 无权限错误
3. 发布一条推荐 → 控制台数据库表能刷出该行；再打一颗星 → `ratings` 数组追加。
4. 手机访问同域名（验证境内移动网络直连无代理延迟）。

## 六、资源点成本监控

免费档 3000 点/月，参考用量（小流量社区）：
| 计费项 | 单价 | 估测月耗 |
|---|---|---|
| 数据库容量 | 0.5 点/GB·h | 150MB ≈ 55 点 |
| 数据库调用 | 200 点/万次 | 日 300 次 ≈ 180 点 |
| PG CPU | 342 点/核·h | 共享实例按实际计量，**首周必盯** |
| CDN 流量 | 210 点/GB | 榜单只读 ≈ 60 点 |

注意：免费版有效期 6 个月，到期前一个月可参与社交分享活动 0 元续期 6 个月
（活动截至 2026-12-30）；届时若不续，可视流量决定升个人版（19.9 元/月、4 万点）。

## 七、回滚 / 迁移回官方 Supabase

- **代码**：`SUPABASE` 两值改回官方项目 URL + anon key 即可，无需改业务代码。
- **数据**：CloudBase 控制台把 `community_picks` 导成 SQL/CSV；
  `pg_dump --data-only --no-owner --no-privileges`，再灌入官方 Supabase 空表。

## 八、后续路线（画像 & AI 推荐）

- **画像**：`users` 匿名身份表（`auth` schema，匿名登录即带 `sub`）+ 行为表（浏览/评分/发布），
  RLS 用 `auth.uid()` 圈定本人，参照官方 RLS 写法可零改动复用。
- **向量推荐**：内容打标签（`zhparser`/`pg_jieba` 中文分词）→ `pgvector` 存 embedding →
  `vectorscale` 做 DiskANN 相似检索；`tencentdb_ai` / 云函数集会话编排调国内大模型。