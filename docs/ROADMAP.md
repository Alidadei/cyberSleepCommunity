# 统一进度清单（ROADMAP）

> 唯一的 todo 汇总页。每做完/决定一件事就回这里更新状态。
> 状态标记：`[x]` 完成 · `[ ]` 待办 · `[~]` 进行中 · `[–]` 暂缓/冻结
> 细节看各专档：`docs/deploy-guide.md`（域名托管）、`docs/supabase-quickstart.md`（数据后端试用）、
> `docs/cloudbase-migration.md`（备选迁移）、根目录 `待改进.md`（功能 bug 清单）、`docs/AGENT_HANDOFF.md`（接手指南）。

## 一、上线清单（当前阻塞项，需站主手动）

- [ ] 启用 GitHub Pages：仓库 Settings → Pages → `Deploy from a branch` → `main` + 根目录，得 `https://alidadei.github.io/cyberSleepCommunity/`
- [ ] 浏览器真实冒烟：发布一条 → 打分 → 刷新后榜单持久（当前走 Supabase 云端）
- [ ] 手机 4G/5G 复测 Supabase 境外延迟：<800ms 留用；1–2s 勉强；>2s 或常超时 → 切 CloudBase（判定标准见 quickstart）
- [ ] SQL Editor 清理测试脏行：`delete from public.community_picks where id = 8888888888000;`
- [ ] 上线一周后查看 Supabase 用量（免费档 130 万行内，够用）
- [ ] 定稿 `SITE.primaryOrigin`：主站 = GH Pages 时**留空**即可（canonical 自动取当前域含子路径）；启用 CloudBase 主站时改填其首页完整地址

## 二、数据后端状态机

- [x] Supabase 项目（新加坡区）建表：`docs/supabase-schema.sql`（表 + GRANT + RLS，已在 SQL Editor 执行）
- [x] 官方 Supabase 读写打通（publishable key 双头，冒烟 SELECT/INSERT/PATCH 通过）
- [x] 双后端代码就绪：`SupabaseStore` 按 url 自动判别官方 Supabase / CloudBase(PG)，测试覆盖
- [~] **试用观察期**：Supabase 境外延迟对全国① ② ③ ④受众是否可接受
- [–] CloudBase(PG 模式) 迁移：触发条件 = 上述延迟不可接受；流程见 `docs/cloudbase-migration.md`（含资源点成本监控、回滚）；v1.2 建表已含 `recommend_count` 列，迁移时需先执行 ALTER（见 `docs/supabase-schema.sql` 末尾）
- [x] 迁移前提代码（匿名登录换 token、`/v1/rdb/rest/` 路径）已在 v1.0 双后端里做完

## 三、域名与托管状态机

- [x] 决策（2026-09-10）：**GitHub Pages 为主（暂）**，CloudBase 备选
- [x] 单文件双域兼容：站内零绝对自引用，canonical/og 支持 `SITE.primaryOrigin`，留空=当前域（含子路径）
- [ ] GitHub Pages 启用（见上面上线清单）
- [–] CloudBase 静态托管：触发条件 = 数据后端定 CloudBase 或 GH 境外访问不可接受；默认域免费，自定义域名需购域名+ICP 备案
- [–] 自定义域名（远期）：建议等数据后端/主站都定了再一起做
- [x] 已知取舍：`localStorage` 按域隔离（语言、样例评分不互通）——真数据在云端不受影响，勿当 bug 修

## 四、功能路线

- [x] 本轮修复（2026-09-10）：v0.1 六个条目 + v1.2 三个 bug，见根目录 `待改进.md`（图标/文案/榜单页导航/汉堡/入场滚动/面板对比度/提交停留当前页/同内容合并+推荐次数/汉堡不可见）
- [x] 数据库维护自动化：UNIQUE 约束防重复 + 前端 load 去重兜底 + 数据去重 SQL（`docs/dedup-community-picks.sql`），`supabase-maintenance` skill 沉淀维护操作
- [~] **匿名画像（P2 第一步）**：榜单页顶部画像卡（昵称/年龄 60后-00后/性别/学历，全部选填，提示「仅作统计研究使用」，匿名 uid `csc_uid` + `csc_profile`）。表 `docs/user_profiles.sql` **待站主 SQL Editor 建表**
- [ ] 用户行为流水 `user_actions`（提交/打分事件 → 画像聚合视图 `user_profile` → 前端「为我推荐」）
- [–] P3 远期：AI 推荐（需 Edge Function 中转，避免前端暴露 key，等站点有人用再上）

## 五、工程纪律（每次改动后执行）

- 测试必须绿：`node tests/dom-test.mjs`（UI 行为 77 断言）+ `node tests/store-backend-test.mjs`（双后端 16 断言）
- 铁律：单文件零依赖，`Store.load()` 异步需 `await`；测试桩不支持 `document.querySelector`
- 提交前自查：`git status` 只含预期文件；**不提交任何密钥**（publishable/anon key 除外，本就公开）
- 本页有新决策/新完成项时随手更新