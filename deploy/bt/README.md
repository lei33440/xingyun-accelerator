# 宝塔面板一键部署（推荐国内 VPS）

适合你已经在用宝塔、或打算装宝塔的场景。所有 nginx 站点、SSL、PM2 进程都通过宝塔 UI 管理。

## 1. 宝塔环境准备（一次性，约 5 分钟）

### 1.1 安装宝塔

SSH 进 VPS 后执行（**CentOS**）：

```bash
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec
```

（**Ubuntu/Debian**）：

```bash
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

装完会显示面板地址 + 用户名 + 密码。**先记下来**。

### 1.2 装必要软件

浏览器进宝塔 → **软件商店** → 装：
- **Nginx 1.22+**（推荐 1.24）
- **PM2 管理器 5.x**
- （可选）**PHP 7.4**、**MySQL 5.7**（项目本身不用，但宝塔模板站点会要求）

进 **PM2 管理器 → 设置 → Node 版本** → 切到 **v20.18.0**（或 20.x 最新 LTS）。

### 1.3 创两个占位站点

宝塔 → **网站** → **添加站点**：

| 域名 | 备注 | 数据库 | PHP |
|---|---|---|---|
| `example.com` | 前台 | 不创建 | 纯静态 |
| `cms-9f3a2b.example.com` | Strapi 后台 | 不创建 | 纯静态 |

> 不用勾"创建数据库"和"创建 FTP"。这两个站点只用来占位 / 申请 SSL，**真正的服务由我们脚本部署**。

### 1.4 DNS 解析

在你的域名服务商（阿里云/腾讯云/Cloudflare）：

| 主机记录 | 类型 | 记录值 | 备注 |
|---|---|---|---|
| `@` | A | 服务器 IP | |
| `www` | A 或 CNAME → `@` | | |
| `cms-9f3a2b` | A | 服务器 IP | |

## 2. 一键部署

```bash
ssh root@你的服务器IP
cd /www/wwwroot
git clone <你的仓库地址> proxy-ip
cd proxy-ip
sudo bash deploy/install-bt.sh
```

脚本会：
- 把前台构建产物（`web/dist`）部署到 `/www/wwwroot/example.com`
- 把 Strapi 源码部署到 `/www/wwwroot/cms-9f3a2b.example.com/app`
- 在 PM2 里启动 Strapi（宝塔 PM2 管理器会看到 `cms` 进程）
- 安装每日凌晨 3:13 的 SQLite + dist 备份 cron

**按提示输入**：
- 域名：`example.com`
- CMS 子域前缀：`cms-9f3a2b`
- 管理员邮箱：你的邮箱（SSL 申请用）

## 3. 配宝塔的反向代理

> 这一步**必须**手动在宝塔 UI 做，因为宝塔会重新生成自己的 nginx 配置骨架。

### 3.1 前台站点 `example.com`

宝塔 → **网站** → `example.com` → **设置** → **配置文件**

把宝塔默认生成的内容**整个替换**成 [web.conf.snippet](web.conf.snippet) 的内容（外加宝塔自己加的 listen / server_name 块，你不要动）。

### 3.2 后台站点 `cms-9f3a2b.example.com`

宝塔 → **网站** → `cms-9f3a2b.example.com` → **设置** → **配置文件**

替换成 [cms.conf.snippet](cms.conf.snippet) 的内容。关键是这一段：

```nginx
location / {
    proxy_pass http://127.0.0.1:1337;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

点 **保存**。

### 3.3 申请 SSL

宝塔 → **网站** → 任意站点 → **SSL** → **Let's Encrypt** → 勾选两个域名 → **申请**。

打开 **强制 HTTPS** 开关。

## 4. 首次启动 Strapi

打开 `https://cms-9f3a2b.example.com/admin`，注册第一个管理员账号。

然后：

**4.1 创建只读 API token**

Settings → API Tokens → Create new API Token
- Name: `web-read`
- Type: **Read-only**
- Duration: **Unlimited**
- 复制 access key

**4.2 写到两个 .env**

SSH 上去：

```bash
# 写到 Strapi
echo 'STRAPI_READ_TOKEN=刚才复制的key' >> /www/wwwroot/cms-9f3a2b.example.com/app/.env
pm2 reload cms   # 在 PM2 管理器点重载也行

# 写到前台（前台构建时用）
# 但前台构建产物已经部署好了！要让它用上 token，重新 build：
cd /www/wwwroot/proxy-ip
CMS_BASE_URL="https://cms-9f3a2b.example.com" \
WEB_SITE_URL="https://example.com" \
CMS_READ_TOKEN="刚才复制的key" \
  npm --prefix web run build
# 把新产物重新拷到宝塔站点目录：
rm -rf /www/wwwroot/example.com/*
cp -r web/dist/. /www/wwwroot/example.com/
```

**4.3 创建 revalidation webhook**

Settings → Webhooks → Create new
- Name: `revalidate`
- URL: `https://cms-9f3a2b.example.com/api/revalidate`
- Headers: `x-revalidate-secret: <REVALIDATE_SECRET from cms/.env>`
- Events: 勾全部 entry 事件

## 5. 之后日常维护

| 任务 | 在哪做 |
|---|---|
| 拉新代码重新部署 | SSH 跑 `bash /www/wwwroot/proxy-ip/deploy/update-bt.sh` |
| 看 Strapi 实时日志 | 宝塔 → PM2 管理器 → 选 `cms` → **日志** |
| 重启 Strapi | 宝塔 → PM2 管理器 → 选 `cms` → **重启** |
| 编辑 nginx 配置 | 宝塔 → 网站 → 站点 → 设置 → 配置文件 |
| 重载 nginx | 宝塔 → 软件商店 → Nginx → **重载配置** |
| 申请 / 续期 SSL | 宝塔 → 网站 → 站点 → SSL |
| 看站点访问日志 | 宝塔 → 网站 → 站点 → 日志 |
| 备份恢复 | 宝塔 → 文件 → 上传 / 下载 |
| 防火墙规则 | 宝塔 → 安全 → 系统防火墙 |

## 6. 常见坑

### 6.1 PM2 找不到

宝塔的 PM2 路径是 `/www/server/nodejs/bin/pm2`，不是 `pm2`。我们的脚本已经自动处理。

如果还是找不到：

```bash
# 用宝塔的 Node 重新装一次
/www/server/nodejs/bin/npm install -g pm2
ln -sf /www/server/nodejs/bin/pm2 /usr/local/bin/pm2
```

### 6.2 Strapi 启动后 502

宝塔 nginx 没重载，或者反向代理没配。`pm2 logs cms` 看 Strapi 有没有真的在监听 1337。

### 6.3 SSL 申请失败

宝塔 → 站点 → SSL → 切换到 **DNS 验证**而不是文件验证；或者在 Cloudflare 关掉橙色云代理（用 DNS only 灰云）后再申请。

### 6.4 80 端口被占

`netstat -tlnp | grep 80`。常见冲突：Apache、IIS、IIS Admin Service。宝塔装前先 `apt remove apache2`。

## 7. 与纯净版（install.sh）的区别

| | install.sh（纯净）| install-bt.sh（宝塔）|
|---|---|---|
| 进程管理 | 自己的 pm2 守护 | 宝塔 PM2 管理器（UI 可看）|
| Nginx 配置 | 写 `/etc/nginx/sites-available/` | **写到宝塔站点配置**（在宝塔 UI 改）|
| SSL | certbot 自动签 | 宝塔 UI 一键申请（更方便）|
| 防火墙 | 自己的 ufw 脚本 | 宝塔面板的防火墙 UI |
| 数据库 | 项目自带 SQLite | 项目自带 SQLite |
| 适合 | 极简、自动化、CI/CD 部署 | 喜欢 UI 管理、国内服务器 |

**两个脚本是互斥的**，选一个用。
