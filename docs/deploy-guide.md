# 部署与域名指南：GitHub Pages 主（暂）+ CloudBase 备

> 决策（2026-09-10）：站点是单文件零依赖，没有任何构建产物——`index.html` 即全部。
> **决策更新：暂以 GitHub Pages 为主站**（仓库 `Settings → Pages → Deploy from branch: main`，地址
> `https://alidadei.github.io/cyberSleepCommunity/`），免费、零运维、立即可用。
> CloudBase 静态托管暂缓：等数据后端（Supabase 境外延迟测试）定论后再决定要不要开（境内快、可绑自定义域名，但需手动上传 + ICP 备案）。
>
> 统一进度清单见 **docs/ROADMAP.md**（本文件只讲方案）。

## 〇、双域支持的代码实现（已落地）

- 站内**零绝对自引用**：`assets/`、分享文本、导入/导出全部走相对路径或动态 `location`，换域无需改码。
- `index.html` 顶部配置 `const SITE = { primaryOrigin: '' }`：留空时 canonical 自动用「当前域」（含 GH 子路径 `/cyberSleepCommunity/`），
  部署即用；以后切自定义域/CloudBase 时填「主站首页完整地址」，运行时自动注入
  `<link rel="canonical">` + `og:url/og:title/og:description/og:type/og:image`（og:image 用同目录 `assets/shoushu.jpg`）。
- 数据层：云端读写走 Supabase 绝对地址（默认放开 CORS），双域读写同一张 `community_picks`，内容天然互通。
- **已知隔离**：`localStorage` 按域隔离——`csc_lang`（语言）、`csc_sample_ratings`（样例评分）两个域不互通，
  属可接受行为（样例评分本是本地演示数据；真数据在云端不受影响）。

## 一、为什么双线

| | GitHub Pages | CloudBase 静态托管 |
|---|---|---|
| 国内访问 | 不稳（github.io 常被墙/抽风） | 上海节点，快且稳 |
| 自定义域名 | 支持 CNAME/A 记录 | 支持，大陆节点需 ICP 备案 |
| 免费 | 无限 | 免费体验版含静态托管 |
| 海外访问 | 快 | 可访问（腾讯 CDN 海外节点），默认域名无 SLA |
| 运维 | 零 | 控制台/CLI 上传 |

双线的意义：主站（CloudBase）挂掉时，把兜底入口切给 GitHub Pages——内容唯一（一个 `index.html`），互不牵连。

## 二、CloudBase 静态托管（暂缓，备选）

> 当前不做主站。**触发条件**：数据后端定为 CloudBase(PG 模式) 或 GH Pages 境外访问不可接受时再启用。
> 启用流程见 `docs/cloudbase-migration.md`（环境在上海/PG 模式）+ 下方上传步骤。

1. 控制台 → **静态网站托管** → 上传 `index.html`（若 `assets/` 有图一并上传到对应目录）。
2. 得到默认域名 `https://<envId>-<hash>.tcloudbaseapp.com`，即可访问。
3. 想要自己的域名（可选）：
   - 买域名（腾讯云/阿里云）→ CloudBase 静态托管「自定义域名」绑定
   - 大陆节点需 **ICP 备案**（免费，约 1–2 周；备案期间可先用默认域名）
   - 海外加速可选套 EdgeOne，非必须

## 三、GitHub Pages（当前主站）

1. 仓库 Settings → **Pages** → Source 选 `Deploy from a branch` → `main` + 根目录。
2. 发布后地址 `https://alidadei.github.io/cyberSleepCommunity/`。
3. 部署即用：canonical/og 在 `SITE.primaryOrigin` 留空时自动取当前域（含子路径）。
   若以后启用 CloudBase 主站，把 `SITE.primaryOrigin` 填成主站首页完整地址即可，两域不再互判重复内容。
4. （可选）仓库根加 `CNAME` + 域名商记录，把 GitHub Pages 绑到自己的域名。

## 四、内容同步（唯一一份 `index.html`）

站主手动维护即可；若想自动化，加一个 GitHub Action：

```yaml
# .github/workflows/sync-cloudbase.yml（需配置云端部署密钥，见下）
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: TencentCloudBase/cloudbase-action@v2
        with:
          secretId: ${{ secrets.TCB_SECRET_ID }}
          secretKey: ${{ secrets.TCB_SECRET_KEY }}
          envId: ${{ secrets.TCB_ENV_ID }}
          staticWebsite: index.html
```

> 密钥在腾讯云控制台「访问管理→API 密钥管理」新建，仅存入 GitHub Actions secrets，
> 绝不写进仓库文件。此步可选，前期手动上传完全够用。

## 五、访问兜底话术（用户视角）

- 主站（GH Pages）故障时，可临时加一行提示指向备站（CloudBase 默认域，需先部署）——暂不做，按需再加。