# 星云加速 — 官网与后台管理系统

> 跨境网络加速器 (VPN / 代理) 产品的官网 + 后台 CMS 一站式代码库。
> 前台面向用户（产品介绍、价格、下载、博客），后台供运营人员管理内容。

[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933)](https://nodejs.org)
[![Astro](https://img.shields.io/badge/Astro-4.x-FF5D01)](https://astro.build)
[![Strapi](https://img.shields.io/badge/Strapi-4.x-4945FF)](https://strapi.io)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 1. 这是什么

一个完整的"代理 IP / 网络加速器"产品官网方案：

```
前台 (公开访问)                          后台 (内部管理)
┌────────────────────┐                  ┌────────────────────┐
│  Astro 静态站点     │  ←  build 时拉取 → │   Strapi CMS       │
│  • 首页            │                  │  • Article 文章     │
│  • /pricing 价格    │                  │  • PricingPlan 套餐 │
│  • /download 下载  │                  │  • ClientDownload  │
│  • /blog 博客      │                  │  • GlobalSettings  │
│  • 404 / rss       │                  │                    │
└────────────────────┘                  └────────────────────┘
       CDN 托管                              私有服务器 / 容器
```

**特点**：
- 前台纯静态，可部署到任何 CDN（Cloudflare Pages、Netlify、Vercel、对象存储）
- 后台使用 Strapi v4，开箱即用的可视化编辑界面 + REST API
- 前后端完全解耦，后台只通过 read-only API token 暴露数据，攻击面最小
- 内容变更支持 webhook 触发前台自动重新部署
- 单 VPS 一键部署脚本（`deploy/install.sh` 或 `deploy/install-bt.sh`）

---

## 2. 快速开始（本地开发）

### 2.1 准备环境

需要安装：
- **Node.js 20.x**（推荐 20.18.0 LTS）
- npm 10.x（Node 自带）
- Git

```bash
node -v   # 应输出 v20.x.x
npm -v
```

> Windows 用户：`better-sqlite3` 需要 C++ 工具链。如果只想先看前台效果，**跳过 Strapi 安装**（前台会自动用 mock 数据）。

### 2.2 克隆 & 装依赖

```bash
git clone <仓库地址> proxy-ip
cd proxy-ip

# 装 Strapi（后端）
npm install

# 装 Astro（前台）
npm --prefix web install
```

### 2.3 启动（两种模式）

#### 模式 A：只跑前台（最快看到效果，不依赖 Strapi）

```bash
# 用 Node 20 启动（前台自带 mock 数据，自动用中文示例）
node start-astro.bat      # Windows
# 或
npx --prefix web astro dev --host 127.0.0.1 --port 4321 --cwd web    # Mac/Linux
```

打开 `http://127.0.0.1:4321`，左下角会显示"开发模式 · 本地模拟数据"——说明前台在用 mock 数据。

#### 模式 B：跑完整的前后端（推荐）

```bash
# 1. 启动 Strapi（首次会要求注册管理员）
npm run cms:dev
# 打开 http://127.0.0.1:1337/admin 注册第一个 admin 用户

# 2. 在 Strapi 后台：Settings → API Tokens → 创建
#    Name: web-read, Type: Read-only, Duration: Unlimited
#    复制 access key

# 3. 把 token 写进两个 .env
cp cms/.env.example cms/.env      # 已有则跳过
cp web/.env.example web/.env      # 已有则跳过
# 编辑 web/.env，把 CMS_READ_TOKEN= 后填上 access key

# 4. 启动前台（会自动用 Strapi 的数据）
node start-astro.bat
```

打开 `http://127.0.0.1:4321` 看效果，后台 `http://127.0.0.1:1337/admin` 改内容。

### 2.4 灌示例数据（可选）

启动 Strapi 后，创建一个 **Full access** token 放在 `cms/.env` 的 `STRAPI_READ_TOKEN`，然后：

```bash
npm run cms:seed
```

会灌入 4 个套餐、5 个客户端下载、3 篇博客、全局设置。

---

## 3. 项目结构

```
.
├── web/                  # 前台：Astro 4 + Tailwind 3 静态站点
│   ├── src/
│   │   ├── pages/        # /, /pricing, /download, /blog, /blog/[slug], 404, rss
│   │   ├── components/   # GlobeVisual, PersonaTabs, SpeedTest, StreamingList, ...
│   │   ├── layouts/      # Base.astro
│   │   ├── lib/          # cms.ts (Strapi 客户端) + mock-cms.ts (本地降级数据)
│   │   └── styles/       # global.css
│   ├── public/           # favicon, robots.txt
│   ├── astro.config.mjs
│   └── package.json
│
├── cms/                  # 后台：Strapi 4 + SQLite
│   ├── config/           # server, database, admin, middlewares
│   ├── src/api/          # article, pricing-plan, global-setting, client-download
│   ├── scripts/seed.mjs  # 示例数据
│   └── package.json
│
├── deploy/               # 服务器一键部署脚本（生产用）
│   ├── install.sh        # 纯净版一键装（CLI 模式）
│   ├── install-bt.sh     # 宝塔面板版一键装
│   ├── update.sh         # 纯净版更新
│   ├── update-bt.sh      # 宝塔版更新
│   ├── revalidate.sh     # 触发 CDN 重新部署
│   ├── backup.sh         # 每天备份 DB + 静态站点
│   ├── rollback.sh       # 一键回滚
│   ├── nginx/            # 纯净版 nginx vhost 模板
│   ├── bt/               # 宝塔版配置片段 + 中文部署文档
│   └── README.md         # 详细部署文档
│
├── scripts/              # 通用工具脚本
│   ├── add-admin.mjs     # 往 SQLite 插入 admin 用户（应急用）
│   ├── bootstrap.mjs     # 登录 + 创 read-only token + 写 .env
│   ├── clean-duplicates.mjs
│   └── seed-accelerator.mjs
│
├── start-astro.bat       # Windows 启动前台
├── start-strapi.bat      # Windows 启动后台
└── package.json          # monorepo 根
```

---

## 4. 内容模型 (Strapi)

| 模型 | 字段 | 说明 |
|---|---|---|
| **Article** | title, slug, excerpt, content (rich), coverImage, category, tags, readingMinutes, seoTitle, seoDescription, seoKeywords | 博客文章 |
| **PricingPlan** | name, subtitle, targetPersona, billingPeriod, price, originalPrice, currency, deviceLimit, trafficAllowance, concurrentSessions, nodeCountries, protocols, streamingUnlocked, features, highlight, badge, trialDays, ctaLabel, ctaLink, order | 订阅套餐 |
| **ClientDownload** | platform (iOS/Android/macOS/Windows/Linux), label, version, fileSize, downloadUrl, storeUrl, qrImage, instructions, highlight, order | 客户端下载链接 |
| **GlobalSettings** | siteName, siteTagline, heroEyebrow, heroHeadline, heroLede, supportEmail, telegramLink, discordInvite, whatsappNumber, wechatId, wechatQrImage, noticeBanner, noticeEnabled, showPricingModule, showBlogModule, showClientDownload, showStreamingList, showSpeedTest, defaultTrialDays, defaultSeoTitle, defaultSeoDescription, footerCopy | 单例：全站公共信息 |

所有字段都可以在 Strapi 后台 → Content Manager → 任一模型里直接编辑。

---

## 5. 公共 API 端点

Strapi v4 默认暴露以下只读端点（生产环境请使用 read-only API token 鉴权）：

| 方法 | 端点 | 用途 |
|---|---|---|
| GET | `/api/global-setting` | 获取全站配置 |
| GET | `/api/articles?sort=publishedAt:desc` | 文章列表（按发布时间倒序） |
| GET | `/api/articles/by-slug/:slug` | 单篇文章 |
| GET | `/api/pricing-plans?sort=order:asc` | 套餐列表 |
| GET | `/api/client-downloads?sort=order:asc` | 客户端下载列表 |
| POST | `/api/revalidate` | 内部 webhook（用 `x-revalidate-secret` 鉴权）|

公共读不需要 token，生产部署时 CMS 也只对内网开放。

---

## 6. 自定义指南

### 6.1 改品牌名、标语、公告条

进 Strapi 后台 → **Global Setting**：
- `siteName`: 站名
- `siteTagline`: 副标题
- `heroHeadline`: 首屏大标题（支持多行，用 `\n` 换行）
- `heroLede`: 首屏说明
- `noticeBanner`: 顶部公告条文字
- `footerCopy`: 页脚版权

### 6.2 改套餐

进 Strapi 后台 → **Pricing Plan** → Create new entry。

建议至少填：`name, subtitle, price, currency, billingPeriod, deviceLimit, features (JSON), ctaLink, order`

`features` 字段存 JSON 数组，例如：
```json
["5 台设备同时在线", "IPLC 专线节点", "流媒体深度解锁"]
```

### 6.3 改客户端下载

进 **Client Download** → 改 `downloadUrl`（直链）、`storeUrl`（App Store/Play 跳转）、`instructions`（安装说明）

### 6.4 发博客

进 **Article** → Create new entry：
- 标题、slug（自动从标题生成）
- 内容支持 Markdown
- `seoTitle` / `seoDescription` 每篇文章独立 SEO 元数据
- 写完点右上角 **Publish** 才能在前台显示

### 6.5 改样式 / 主题色

`web/tailwind.config.mjs` 里的 `colors.ink` 和 `colors.neon` 是主题色：
```js
neon: {
  green: '#22f59e',  // 主题绿（CTA、激活态、链接）
  cyan: '#22d3ee',   // 辅助青
  violet: '#a78bfa', // 辅助紫
  ...
}
```

`web/src/styles/global.css` 里有自定义组件 class（`.card`、`.btn`、`.chip` 等）

---

## 7. 生产部署

### 7.1 单 VPS + Cloudflare（一键脚本）

需要：
- 一台 Ubuntu 22.04 / Debian 12 VPS（$5-10/月）
- 一个域名（DNS 接入 Cloudflare）

```bash
# 在你的服务器上
ssh root@你的服务器IP
git clone <仓库地址> /var/www/proxy-ip
cd /var/www/proxy-ip
sudo bash deploy/install.sh
```

脚本会：
- 装 Node 20、nginx、pm2、ufw
- 生成唯一的 `cms/.env` 密钥
- 编译 Strapi 和 Astro
- 配置 nginx（前台 :80，后台 :1338 仅本地）
- 防火墙只开 22/80/443
- 申请 Let's Encrypt SSL 证书

详细步骤（Cloudflare DNS 配置、Strapi 首次注册、API token 创建）见 [`deploy/README.md`](deploy/README.md)。

### 7.2 宝塔面板（一键脚本，**国内 VPS 推荐**）

如果你习惯宝塔的 UI 界面管理网站 / SSL / 进程：

1. 先装宝塔：<https://www.bt.cn>（CentOS / Ubuntu 都有一键脚本）
2. 宝塔里装 **Nginx** + **PM2 管理器**（PM2 里切换 Node 20）
3. 创两个占位站点（`example.com` 和 `cms-9f3a2b.example.com`）
4. SSH 跑：

   ```bash
   cd /www/wwwroot
   git clone <仓库地址> proxy-ip
   cd proxy-ip
   sudo bash deploy/install-bt.sh
   ```

5. 在宝塔 UI 把 `web.conf.snippet` / `cms.conf.snippet` 粘到对应站点的配置里 → 申请 SSL → 完事

完整步骤 + 截图位置说明见 [`deploy/bt/README.md`](deploy/bt/README.md)。

| | install.sh（纯净）| install-bt.sh（宝塔）|
|---|---|---|
| 进程管理 | 自带 pm2 | 宝塔 PM2 管理器 |
| Nginx 配置 | 命令行写 | 宝塔 UI 改 |
| SSL | certbot 自动 | 宝塔 UI 一键 |
| 防火墙 | ufw 脚本 | 宝塔防火墙 UI |
| 适合 | 海外 / CI/CD / 极客 | 国内 / 喜欢 UI |

### 7.2 Cloudflare Pages（最省心）

- 前台：连接 GitHub → 自动 build → 全球 CDN
- 后台：部署到 Railway / Render / Fly.io（注意免费 tier 重启会清空 SQLite，建议配 Postgres）

### 7.3 Docker

暂无官方镜像。可自行基于两个 `package.json` 写 `Dockerfile`。

---

## 8. 安全设计

| 层面 | 措施 |
|---|---|
| 前台 | 纯静态文件，无 Node runtime，无 DB 连接，无 API 密钥 |
| 后台 | 默认 `HOST=127.0.0.1`，外网无法直接访问；Nginx 反代也只能从本机连 |
| API 鉴权 | 公共 read-only token 写入 `web/.env`，build 时使用；read/write 用 admin JWT |
| CORS | Strapi 只允许 `WEB_ORIGIN` 列出的域名 |
| Webhook | revalidate endpoint 需要 `x-revalidate-secret` 共享密钥 |
| Cloudflare | 前台走代理（橙云，免费 CDN + DDoS）；后台走 DNS only（灰云），用 Zero Trust / IP 白名单限制访问 |
| 防火墙 | ufw 仅开 22/80/443；1337 永不开公网 |
| 密钥 | `openssl rand` 生成的 `APP_KEYS` / `JWT_SECRET` 等，每个部署独立 |

---

## 9. 常见问题

### 9.1 Windows 上 `better-sqlite3` 编译失败

需要装 Visual Studio Build Tools（含 "使用 C++ 的桌面开发"）。或者用 Node 20 即可（Node 24 需要更新版本的预编译包）。

### 9.2 前台改动没生效

前台是 build-time 拉 Strapi 数据。每次 Strapi 内容变更后：
- 开发环境：手动重启 Astro（Ctrl+C 再 `npm run web:dev`）
- 生产环境：跑 `sudo bash deploy/revalidate.sh` 触发重新部署

### 9.3 后台能打开但首页打不开

检查 `web/.env` 的 `CMS_READ_TOKEN` 是否正确、是否过期。Token 在 Strapi → Settings → API Tokens 里。

### 9.4 想关掉某个首页模块

进 Strapi → **Global Setting**，把对应的 `showXxxModule` 开关关掉即可，不用改代码。

### 9.5 部署后 502 Bad Gateway

多半是 Strapi 没起来。`pm2 logs cms` 看错误。最常见是 `cms/.env` 没生成或者端口被占。

### 9.6 迁移到 PostgreSQL

参考 `deploy/README.md` 末尾的迁移章节。

---

## 10. 许可

MIT — 自由用于商业项目，保留版权即可。

---

## 11. 致谢

- [Astro](https://astro.build) — 现代静态站点框架
- [Strapi](https://strapi.io) — 开源 headless CMS
- [Tailwind CSS](https://tailwindcss.com) — 工具类样式
- [Cloudflare](https://cloudflare.com) — CDN + 防护

---

## 12. 路线图

- [ ] 内容变更 → 自动 revalidation webhook（无需手动重启）
- [ ] 客户端订阅链接生成页面
- [ ] 邀请码 / 优惠码系统
- [ ] 多语言（i18n）
- [ ] 实时节点状态 API
- [ ] Stripe / 支付宝 / 微信支付集成

---

**有问题？** 先看 `deploy/README.md` 排查；搞不定就提 Issue，附上报错日志和你的 Node 版本。
