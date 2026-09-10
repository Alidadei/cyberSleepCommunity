# Supabase 快速启用指南（当前数据后端）

> 决策（2026-09-10）：数据后端先用官方 Supabase 免费档试跑，观察境内延迟能否接受；
> 若不行再按 `docs/cloudbase-migration.md` 切腾讯云 CloudBase(PG 模式)。
> 域名方案独立（GitHub Pages 主 + CloudBase 备），见 `docs/deploy-guide.md`；统一进度见 `docs/ROADMAP.md`。

## 一、开通步骤（约 10 分钟）

1. 注册 [supabase.com](https://supabase.com)，New project：
   - 地域选 **Singapore**（离国内最近的免费可用区）
   - 设定数据库密码并妥善保存
2. Dashboard → **SQL Editor** → 粘贴 `docs/supabase-schema.sql` 全文 → Run。
   （建表 + RLS 策略；Supabase 默认对 `public` schema 新表自动授权 anon 角色，
   因此 RLS 策略就是唯一权限门，无需另写 GRANT。）
3. **Settings → API**，记下两个值：
   - **Project URL**：形如 `https://xxxx.supabase.co`
   - **anon public key**：形如 `eyJhbGciOi...`（公开凭据，可放心留在前端）
4. 填入 `index.html` 顶部：

```js
const SUPABASE = { url: 'https://xxxx.supabase.co', anonKey: 'eyJhbGciOi...' };
```

两值填齐即自动启用 `SupabaseStore`（离线/清空两值则回落本机 `LocalStore`）。

## 二、验证与延迟初测

1. 浏览器打开站点，F12 → Network：
   - 应见 `GET .../rest/v1/community_picks?...` 返回 200
   - 记下该请求耗时（DOMContentLoaded 后首屏榜单）
2. 分别用 **电脑宽带 / 手机移动 4G/5G** 各测一次，粗标准：
   - 单请求 < 800ms 可接受；1~2s 勉强；> 2s 或经常超时 → 切 CloudBase
3. 发布一条推荐 + 打一颗星，确认表内数据变化（Table Editor 看 `community_picks`）。

> 测试期间改动只在 `SUPABASE` 两行，不回滚即可放心测；
> 决定换 CloudBase 时按迁移文档改这两行 + 建表 SQL。

## 三、红线提醒

- **不要**把 `service_role` / API Key 填进前端（它是绕过 RLS 的管理员凭据）
- 测试出现 401：十有八九 RLS 策略没跑成功（重跑 SQL）或填错了 anon key