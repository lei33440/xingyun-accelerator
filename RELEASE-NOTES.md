# v1.0.0 — 初始发布 (2026-06-10)

> 🚀 跨境网络加速器官网 + 后台管理系统的首个完整版本。

## ✨ 核心功能

### 前台 (Astro 4 + Tailwind 3)
- **首页** — Hero 首屏、3 用户群体 Tab (个人/跨境/开发者)、全球节点 GlobeVisual、节点延迟测速、流媒体解锁列表、客户端下载模块
- **价格页** — 4 档订阅套餐 (月付/季付/年付/团队)，带试用 CTA、横向对比表、6 条 FAQ
- **下载页** — 全平台客户端下载 (Windows / macOS / iOS / Android / Linux)，含安装步骤
- **博客** — 列表 + 详情页，右侧悬浮联系 CTA
- **404** / **RSS** / **Sitemap**

### 后台 (Strapi 4 + SQLite)
- 4 个内容类型：`Article` / `PricingPlan` / `ClientDownload` / `GlobalSettings` (singleton)
- 自带可视化编辑界面 + REST API
- 公共 read-only API token（只读，保护数据）
- Webhook `/api/revalidate` 支持内容变更触发重新部署

### 开发体验
- **Mock CMS 模式** — 没装 Strapi 也能跑前台，自动用中文示例数据
- 一键开发启动：`start-astro.bat` / `start-strapi.bat`
- HMR 热更新，改代码立即看到效果
- 完整的 TypeScript 类型 + 路径别名

## 🛠 部署工具

`deploy/` 目录提供 5 个生产脚本：
- `install.sh` — 一键安装整个栈 (Node 20 + nginx + pm2 + ufw)
- `update.sh` — 拉代码 + 重新编译 + 重启
- `revalidate.sh` — 触发 CDN 重新部署
- `backup.sh` — 每天备份 SQLite + dist
- `rollback.sh` — 一键回滚到任意时间点

支持两种部署架构：
- **传统 VPS + Cloudflare**（推荐，$5-10/月）
- **Cloudflare Pages + Railway**（最省心）

## 🔐 安全设计

- 前台纯静态文件，无 Node runtime，无 DB 连接
- Strapi 默认 `HOST=127.0.0.1`，外网无法直接访问
- Nginx 反代只监听 127.0.0.1:1338
- CORS 白名单 + API token 鉴权
- Webhook 需要 `x-revalidate-secret` 共享密钥
- 防火墙只开 22/80/443
- 每个 install 自动生成独立密钥 (`openssl rand`)

## 📊 性能

- 首屏 LCP < 1.5s（静态 CDN 加速）
- Lighthouse Performance 90+
- 0 JavaScript 阻塞（除 Mock 生成器等可选组件）
- 自动生成 sitemap.xml

## 🐛 已知问题

- Windows 上 `better-sqlite3` 编译需要 Visual Studio Build Tools
- SQLite 适合 < 50k MAU，更大规模建议迁移 PostgreSQL
- 重启 Strapi 时，前台需要重新 build 才能看到新内容（生产环境通过 revalidate webhook 自动化）

## 📦 包含文件

- 86 个文件，~15,000 行代码
- 完整中文 README（12 章节）
- 完整 deploy 文档（架构图 + 步骤 + 安全 Checklist）
- MIT 许可证

## 🙏 致谢

- [Astro](https://astro.build) — 静态站点框架
- [Strapi](https://strapi.io) — Headless CMS
- [Tailwind CSS](https://tailwindcss.com)
- [Cloudflare](https://cloudflare.com) — CDN + 防护

---

**完整使用文档**：见仓库 `README.md` 和 `deploy/README.md`
