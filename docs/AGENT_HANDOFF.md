# AGENT_HANDOFF · cyberSleepCommunity 接手开发指南

> 写给下一个接手本项目的 ZCode agent。读完这一篇即可开工，不需要问用户任何背景问题。

## 0. 一句话定位

「赛博睡眠社区 cyberSleep」是安卓 APP **「睡眠站台」**（`R:\Code\MY project\guangnaozhong\fossify-clock`，GitHub: Alidadei/MySleep，GPL-3.0）的姊妹网站：一个**专门收藏让人犯困内容**的平台。用户可以不装 APP，直接在网站上推荐犯困内容、打分；装了 APP 也能做同样的事。**两边共享同一套数据契约**（`docs/DATA_CONTRACT.md`）。

用户身份：中国大陆个人开发者，**当前预算为 0**，产品哲学：无广告、无算法推荐、真实分享者社区。交流用简体中文。

## 1. 当前状态（P0，已完成）

```
cyberSleepCommunity/
├── index.html                  # 完整可用的单文件站（零依赖，直接浏览器打开即可用）
├── docs/
│   ├── DATA_CONTRACT.md        # ★ 两端共同的数据契约（字段/类型/排序/红线）
│   ├── adguard-rules.json      # ★ 反广告词表唯一权威来源（三处同步）
│   └── AGENT_HANDOFF.md        # 本文件
└── README.md
```

- P0 存储是 localStorage（key: `csc_community_picks`），数据**只在用户浏览器本机**
- 内置精选 13 条 = APP `assets/relax_picks.json` 的同款 B 站直达链接，改任何一边要同步另一边
- 「导出/导入 JSON」是 P0 的数据搬运通道（与 APP 的 Gson JSON 字段一致可直接互导）

## 2. 铁律（改代码前必读）

1. **改任何数据结构，先改 `docs/DATA_CONTRACT.md` 并升版本号**，然后三处同步：网站 `index.html` 的 `Store`/`AdGuard`、APP 端 `RelaxStore.kt`/`AdGuard.kt`、`adguard-rules.json` 词表。
2. **网站保持零依赖单文件**（index.html 内联 CSS/JS）。不要引入 React/Vue/npm 构建链——用户明确偏好零依赖、可直接部署 GitHub Pages 的形态。P1 需要 Supabase 时用原生 `fetch` 调 REST，不要装 SDK。
3. **绝不引入广告、追踪器、Cookie 横幅**。产品定位是"真实分享者社区"。
4. APP 端 `CommunityPick.id` 是 `Long`（时间戳）——网站必须用 `number`；改 UUID 需两端同时动（契约 §1）。
5. 排序规则（平均分→评分数→addedAt）两端必须一致，APP 端在 `RelaxFragment.populateSection()`。
6. 中文 UI；用户手机是浅色模式，但网站当前是深色星光系（与 APP 品牌一致），如果做浅色主题需问用户。

## 3. 下一步路线（按优先级）

### P1：两端数据实时互通（核心目标，0 预算可行）
1. 注册 Supabase 免费项目（supabase.com，0 元，500MB 库 / 5 万 MAU）
2. 建表 `community_picks`（列 = 契约 §1 字段；`ratings` 建议 int[] 列，anon 角色开 select/insert/update）
3. 网站端：`index.html` 已预留 `SupabaseStore` 占位注释——实现同 `Store` 接口（load/save/add/rate），用原生 fetch 调 `{SUPABASE_URL}/rest/v1/community_picks`，key 放 `config.js`（记得 config.js 不进 git 或用 公开 anon key——anon key 本来就是公开的，靠 RLS 管权限）
4. APP 端：`RelaxStore.kt` 的 `getCommunityPicks/addCommunityPick/rateCommunityPick` 是预留换源点（文件头注释已写明"backend lands → swap point"），加 `RemoteStore.kt` 用 `HttpURLConnection` 调同一 REST 地址；建议加个设置开关"社区云同步"
5. P1 上线后通知用户：P0 的 localStorage 数据用「导入 JSON」迁移

### P2：体验增强（互通跑通后再做）
- 匿名昵称（localStorage 生成"未寝人####"，与 APP 的 `NightTalk.SleepProfile` 同款逻辑）
- 按 URL 去重提示（当前 P0 允许重复）
- 打分改为星星控件而非 prompt()
- APP ↔ 网站"同款内容"标识（同一 URL 在两端都出现过时显示 🤝）

### P3（远期，需用户决策）
- 睡眠画像互通（契约新增 user 段）
- 与 APP「寻找张怀民」联动：网站留言墙（APP 端 P1 留言墙上线后）

## 4. 部署

- GitHub Pages：仓库 Settings → Pages → Deploy from branch `main` / root（若尚未开启）。站点即 `https://alidadei.github.io/cyberSleepCommunity/`（仓库名大小写敏感）
- 纯静态，无构建步骤，push 即部署（Pages 构建约 1 分钟）
- 自定义域名/CDN：用户暂不需要，别主动加

## 5. APP 端速查（跨项目协作时）

- 代码：`R:\Code\MY project\guangnaozhong\fossify-clock`（独立 git 仓库，GitHub: Alidadei/MySleep）
- 构建命令、便携工具链位置、版本号位置：见该仓库 `FORK_NOTES.md` 的「构建」章节
- 助眠相关文件：`helpers/RelaxStore.kt`（收藏+社区数据）、`helpers/PicksRepository.kt`（精选源）、`helpers/AdGuard.kt`、`helpers/InsomniaTypes.kt`、`helpers/LinkParser.kt`、`fragments/RelaxFragment.kt`（全部 UI）
- APP 有 Robolectric 测试（`./gradlew :app:testFossDebugUnitTest`），动 RelaxStore 前先跑通再动

## 6. 已知取舍（不要"修复"它们）

- `prompt()` 打分框很朴素——是有意保持零依赖，P2 才换
- 内置精选写死在两个文件里——P1 接 Supabase 后精选也入表，才消除双写
- 没有账号系统——P1 靠 Supabase anon key + RLS，P3 才考虑登录
