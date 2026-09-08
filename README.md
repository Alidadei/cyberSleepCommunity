# 赛博睡眠社区 cyberSleep 🌙

**专门收藏让人犯困内容的平台网站**——安卓光闹钟应用 [睡眠站台](https://github.com/Alidadei/MySleep) 的姊妹项目。

在这里你可以：

- 🔗 **推荐**助眠内容（白噪音、有声书、助眠视频……B 站直达链接为主，国内免翻墙）
- ⭐ 给内容打分（1–5，按"助眠效果"），好内容自然浮上来
- 🏷️ 按**失眠类型**找对症内容：焦虑型 / 兴奋型 / 生理型 / 噪音干扰型
- 🚫 广告卖货内容会被自动拦下（与 APP 同一套 AdGuard 规则，词表开源）

不装 APP 也能用；装了 APP 也一样用。两端共享同一份[数据契约](docs/DATA_CONTRACT.md)。

## 使用

纯静态单文件网站，零依赖、无账号、无追踪：

- **在线**：GitHub Pages（Settings → Pages 开启 main 分支即可）
- **本地**：直接双击 `index.html` 就能用，数据存在浏览器里
- **搬家**：底部「导出数据 JSON / 导入数据 JSON」

## 给开发者 / AI agent

- [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md) —— 与 APP 端对齐的数据契约（字段、类型、排序、红线）
- [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md) —— 接手开发指南（当前状态、铁律、P1 路线）
- [docs/adguard-rules.json](docs/adguard-rules.json) —— 反广告词表唯一权威来源

## 路线

| 阶段 | 状态 | 说明 |
|---|---|---|
| P0 本机版 | ✅ 当前 | localStorage 存储，导出/导入 JSON 搬运 |
| P1 云端互通 | 规划中 | Supabase 免费档，网站与 APP 实时共享数据 |
| P2 体验增强 | 规划中 | 匿名昵称、去重、星星打分控件 |
| P3 社区深化 | 远期 | 与 APP「寻找张怀民」联动留言墙 |

## 许可

与 APP 同源理念，代码开源。数据版权归分享者所有。
