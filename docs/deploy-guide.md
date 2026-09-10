# 部署与域名指南：CloudBase 静态托管为主 + GitHub Pages 兜底

> 决策（2026-09-10）：站点是单文件零依赖，没有任何构建产物——`index.html` 即全部。
> 域名策略：**CloudBase 静态托管为主（国内快、可绑自定义域名）**，
> **GitHub Pages 为兜底（海外/主站维护时可开）**。

## 一、为什么双线

| | GitHub Pages | CloudBase 静态托管 |
|---|---|---|
| 国内访问 | 不稳（github.io 常被墙/抽风） | 上海节点，快且稳 |
| 自定义域名 | 支持 CNAME/A 记录 | 支持，大陆节点需 ICP 备案 |
| 免费 | 无限 | 免费体验版含静态托管 |
| 海外访问 | 快 | 可访问（腾讯 CDN 海外节点），默认域名无 SLA |
| 运维 | 零 | 控制台/CLI 上传 |

双线的意义：主站（CloudBase）挂掉时，把兜底入口切给 GitHub Pages——内容唯一（一个 `index.html`），互不牵连。

## 二、CloudBase 静态托管部署（主）

1. 已在 `docs/cloudbase-migration.md` 步骤里创建的免费体验环境（上海）。
2. 控制台 → **静态网站托管** → 上传 `index.html`（若 `assets/` 有图一并上传到对应目录）。
3. 得到默认域名 `https://<envId>-<hash>.tcloudbaseapp.com`，即可访问。
4. 想要自己的域名（可选）：
   - 买域名（腾讯云/阿里云）→ CloudBase 静态托管「自定义域名」绑定
   - 大陆节点需 **ICP 备案**（免费，约 1–2 周；备案期间可先用默认域名）
   - 海外加速可选套 EdgeOne，非必须

## 三、GitHub Pages 兜底

1. 仓库 Settings → **Pages** → Source 选 `Deploy from a branch` → `main` + 根目录。
2. 发布后地址 `https://<user>.github.io/cyberSleepCommunity/`。
3. （可选）在仓库根加 `CNAME` 文件并到域名商加记录，让 GitHub Pages 也走同一域名做 CDN 级兜底——此时建议 CloudBase 走 A 记录、Pages 走 CNAME 的 `www`，避免抢解析。

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

- 站点可加一行提示：「主站维护中，请访问备站 <GitHub Pages 地址>」（暂不做，按需再加）。