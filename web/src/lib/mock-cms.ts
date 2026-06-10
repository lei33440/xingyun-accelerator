/**
 * Local-mode CMS. Mimics the Strapi read API used by the public site so
 * you can develop and demo without running Strapi + SQLite.
 *
 * Endpoints mirror /api/{global-setting, articles, articles/by-slug/:slug, pricing-plans, client-downloads}
 * returning the same { data: { id, attributes: {...} } } envelope that Strapi v4 uses.
 *
 * Toggle with the CMS_MODE env var:
 *   CMS_MODE=strapi  -> use real Strapi (default in production)
 *   CMS_MODE=mock    -> use this in-memory store (default in dev when no token)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', '..', '.data');

const seed = () => ({
  global: {
    id: 1,
    attributes: {
      siteName: '星云加速',
      siteTagline: '全球专线网络加速器，让出海更简单。',
      heroEyebrow: '7×24 稳定 · 90+ 国家节点 · 5G 专线',
      heroHeadline: '一键连接全球网络\n让速度与稳定不再二选一',
      heroLede: '面向个人用户、跨境团队与开发者。覆盖 90+ 国家节点，支持 4G/5G 专线、IPLC 专线与 AnyTLS 高匿协议。',
      supportEmail: 'support@xinyunjsq.example',
      telegramLink: 'https://t.me/xinyunjsq_support',
      discordInvite: 'https://discord.gg/xinyunjsq',
      whatsappNumber: '+86-138-0000-0000',
      wechatId: 'xinyunjsq_cs',
      noticeBanner: '🎉 新年活动：年付立减 30%，新用户 1 元体验 3 天。',
      noticeEnabled: true,
      showPricingModule: true,
      showBlogModule: true,
      showClientDownload: true,
      showStreamingList: true,
      showSpeedTest: true,
      defaultTrialDays: 3,
      defaultSeoTitle: '星云加速 — 全球网络加速器 | 个人 · 跨境 · 开发者',
      defaultSeoDescription:
        '覆盖 90+ 国家节点，4G/5G 专线，IPLC 内网专线。一键连接，稳定不掉线。',
      footerCopy: '© 星云加速 · 隐私保护工具，仅供合法跨境办公使用。',
    },
  },
  plans: [
    {
      id: 1,
      attributes: {
        name: '轻量版',
        subtitle: '个人日常浏览、查资料',
        targetPersona: 'Personal',
        billingPeriod: 'Monthly',
        price: 29,
        originalPrice: 39,
        currency: 'CNY',
        deviceLimit: 3,
        trafficAllowance: '无限流量',
        concurrentSessions: '不限制',
        nodeCountries: '美国 · 日本 · 新加坡 · 香港 · 台湾',
        protocols: 'AnyTLS / Shadowsocks / VMess',
        streamingUnlocked: ['YouTube', 'Netflix', 'Disney+', 'ChatGPT', 'GitHub'],
        features: [
          '3 台设备同时在线',
          '90+ 国家节点自由切换',
          '流媒体 4K 流畅播放',
          '7×24 工程师客服',
          '支持 Windows / macOS / iOS / Android',
        ],
        highlight: false,
        badge: null,
        trialDays: 3,
        ctaLabel: '立即订阅',
        ctaLink: 'https://t.me/xinyunjsq_support?text=轻量版',
        order: 1,
      },
    },
    {
      id: 2,
      attributes: {
        name: '标准版',
        subtitle: '高清视频、远程办公、跨境会议',
        targetPersona: 'All',
        billingPeriod: 'Monthly',
        price: 59,
        originalPrice: 79,
        currency: 'CNY',
        deviceLimit: 5,
        trafficAllowance: '无限流量',
        concurrentSessions: '不限制',
        nodeCountries: '90+ 国家 · 含 IPLC 专线节点',
        protocols: 'AnyTLS / IPLC / Shadowsocks / VMess',
        streamingUnlocked: ['YouTube 4K HDR', 'Netflix', 'Disney+', 'HBO', 'Spotify', 'ChatGPT', 'GitHub', 'Telegram'],
        features: [
          '5 台设备同时在线',
          'IPLC 专线节点（游戏 / 视频低延迟）',
          '优先接入，繁忙时段不掉速',
          '流媒体深度解锁（Netflix 区域切换）',
          '独立节点 IP，干净度更高',
          '1 对 1 客服 + 工单 30 分钟响应',
        ],
        highlight: true,
        badge: '最受欢迎',
        trialDays: 3,
        ctaLabel: '立即订阅',
        ctaLink: 'https://t.me/xinyunjsq_support?text=标准版',
        order: 2,
      },
    },
    {
      id: 3,
      attributes: {
        name: '专业版（年付）',
        subtitle: '年付立省 30%，平均 ¥41/月',
        targetPersona: 'All',
        billingPeriod: 'Yearly',
        price: 499,
        originalPrice: 708,
        currency: 'CNY',
        deviceLimit: 5,
        trafficAllowance: '无限流量',
        concurrentSessions: '不限制',
        nodeCountries: '90+ 国家 · 含 IPLC 专线节点',
        protocols: 'AnyTLS / IPLC / Shadowsocks / VMess',
        streamingUnlocked: ['YouTube 4K HDR', 'Netflix', 'Disney+', 'HBO', 'Spotify', 'ChatGPT', 'GitHub', 'Telegram'],
        features: [
          '等同标准版全部权益',
          '年付价 ¥499（相当于 ¥41/月）',
          '锁定价格，本年度不涨价',
          '优先体验新节点、新协议',
          '专属群组 + 月度回访',
        ],
        highlight: false,
        badge: '省 ¥209',
        trialDays: 7,
        ctaLabel: '立即订阅',
        ctaLink: 'https://t.me/xinyunjsq_support?text=年付专业版',
        order: 3,
      },
    },
    {
      id: 4,
      attributes: {
        name: '团队版',
        subtitle: '3-30 人小团队 / 工作室',
        targetPersona: 'Business',
        billingPeriod: 'Monthly',
        price: 199,
        originalPrice: null,
        currency: 'CNY',
        deviceLimit: 30,
        trafficAllowance: '5TB/月 · 超出不限速',
        concurrentSessions: '不限制',
        nodeCountries: '90+ 国家 · 含 IPLC 专线',
        protocols: 'AnyTLS / IPLC / 企业专线',
        streamingUnlocked: ['全平台解锁', '可定制节点'],
        features: [
          '支持 3-30 个成员子账号',
          '中央管理控制台',
          '成员用量可视化',
          '可申请独享节点（按月付）',
          '签订合规协议 / 开票支持',
          'SLA 99.9%',
        ],
        highlight: false,
        badge: '企业首选',
        trialDays: 7,
        ctaLabel: '联系商务',
        ctaLink: 'https://t.me/xinyunjsq_sales?text=团队版',
        order: 4,
      },
    },
  ],
  downloads: [
    {
      id: 1,
      attributes: {
        platform: 'Windows',
        label: 'Windows 10 / 11',
        version: 'v2.4.1',
        fileSize: '32 MB',
        downloadUrl: 'https://dl.xinyunjsq.example/win/XingyunJiasu-Setup-2.4.1.exe',
        instructions: '下载后双击安装，首次启动会自动引导配置。',
        highlight: true,
        order: 1,
      },
    },
    {
      id: 2,
      attributes: {
        platform: 'macOS',
        label: 'macOS 11+ (Apple Silicon / Intel)',
        version: 'v2.4.1',
        fileSize: '28 MB',
        downloadUrl: 'https://dl.xinyunjsq.example/mac/XingyunJiasu-2.4.1.dmg',
        instructions: '下载后拖入 Applications。首次启动需在「系统设置 → 隐私与安全性」中允许。',
        highlight: true,
        order: 2,
      },
    },
    {
      id: 3,
      attributes: {
        platform: 'iOS',
        label: 'iOS 14+',
        version: 'App Store',
        storeUrl: 'https://apps.apple.com/app/xingyun-jiasu',
        instructions: '搜索「星云加速」或扫描下方二维码。',
        order: 3,
      },
    },
    {
      id: 4,
      attributes: {
        platform: 'Android',
        label: 'Android 7+',
        version: 'v2.4.1',
        fileSize: '18 MB',
        downloadUrl: 'https://dl.xinyunjsq.example/android/XingyunJiasu-2.4.1.apk',
        instructions: '下载 APK 安装。Play 商店 / 国内应用市场搜索「星云加速」也可获取。',
        order: 4,
      },
    },
    {
      id: 5,
      attributes: {
        platform: 'Linux',
        label: 'Ubuntu / Debian / Arch',
        version: 'v2.4.1',
        fileSize: '24 MB',
        downloadUrl: 'https://dl.xinyunjsq.example/linux/xingyun-jiasu_2.4.1_amd64.deb',
        instructions: 'Debian/Ubuntu: sudo dpkg -i xingyun-jiasu_2.4.1_amd64.deb',
        order: 5,
      },
    },
  ],
  articles: [
    {
      id: 1,
      attributes: {
        title: '跨境网络加速到底加速的是什么？',
        slug: 'what-is-network-accelerator',
        excerpt: '普通用户最常把"加速器"和"翻墙工具"混为一谈。其实前者解决的是速度与稳定，后者只是其中一种用途。',
        category: '基础科普',
        tags: ['加速器', '入门'],
        readingMinutes: 5,
        publishedAt: '2026-01-15T09:00:00.000Z',
        createdAt: '2026-01-15T09:00:00.000Z',
        coverImage: null,
        seoTitle: '跨境网络加速是什么？和翻墙有什么区别？',
        seoDescription: '了解跨境网络加速的原理、协议与适用人群。',
        seoKeywords: '跨境网络加速,加速器,翻墙',
        content: [
          { type: 'heading', level: 2, children: [{ text: '加速器 ≠ 翻墙工具' }] },
          {
            type: 'paragraph',
            children: [
              {
                text: '严格来说，"加速"指的是通过专线、协议优化和路由选择，让跨境的网络请求更快、更稳；"翻墙"只是其中一个典型场景——除了翻墙，跨境办公、远程协作、海外购物、视频会议、流媒体观看，都属于加速的范畴。',
              },
            ],
          },
          { type: 'heading', level: 2, children: [{ text: '为什么需要加速？' }] },
          {
            type: 'list',
            format: 'unordered',
            children: [
              { children: [{ text: '公共互联网跨境路由绕路严重，丢包率高。' }] },
              { children: [{ text: '晚高峰公共节点拥塞，速度断崖式下降。' }] },
              { children: [{ text: '部分应用（Google / ChatGPT / 视频会议）有连接稳定性问题。' }] },
            ],
          },
          { type: 'heading', level: 2, children: [{ text: '怎么挑一款靠谱的加速器' }] },
          {
            type: 'list',
            format: 'unordered',
            children: [
              { children: [{ text: '节点数量与覆盖国家（不是越多越好，关键看常用区域）。' }] },
              { children: [{ text: '是否提供专线（IPLC / IEPL / 5G 专线比公共中转稳定很多）。' }] },
              { children: [{ text: '协议透明可查（AnyTLS / VMess / Shadowsocks 等）。' }] },
              { children: [{ text: '客户端体验（一键连接 vs 手工配置）。' }] },
              { children: [{ text: '客服响应速度（高峰期断线，30 分钟内能联系上人很重要）。' }] },
            ],
          },
        ],
      },
    },
    {
      id: 2,
      attributes: {
        title: 'IPLC、IEPL、5G 专线到底有什么区别？',
        slug: 'iplc-iepl-5g-dedicated-line',
        excerpt: '选套餐时常见的"专线"字眼背后，到底是哪种技术？为什么差价能到 3 倍？',
        category: '技术分享',
        tags: ['专线', '协议'],
        readingMinutes: 6,
        publishedAt: '2026-01-25T09:00:00.000Z',
        createdAt: '2026-01-25T09:00:00.000Z',
        coverImage: null,
        seoTitle: 'IPLC / IEPL / 5G 专线：跨境加速协议对比',
        seoDescription: '了解不同专线技术的差异、稳定性与价格定位。',
        seoKeywords: 'IPLC,IEPL,5G专线,加速器协议',
        content: [
          { type: 'heading', level: 2, children: [{ text: '一句话解释' }] },
          {
            type: 'paragraph',
            children: [
              { text: '三者都是"不走公共互联网"的专线方案，只是层级和成本不同。' },
            ],
          },
          { type: 'heading', level: 3, children: [{ text: 'IPLC（International Private Leased Circuit）' }] },
          {
            type: 'paragraph',
            children: [
              { text: '国际私用专线，端到端独占，丢包率极低。适合对延迟极其敏感的游戏玩家、交易员。' },
            ],
          },
          { type: 'heading', level: 3, children: [{ text: 'IEPL（International Ethernet Private Line）' }] },
          {
            type: 'paragraph',
            children: [
              { text: '以太网级专线，比 IPLC 便宜一些，企业用得更多。日常办公、视频会议完全够用。' },
            ],
          },
          { type: 'heading', level: 3, children: [{ text: '5G 专线' }] },
          {
            type: 'paragraph',
            children: [
              { text: '基于 5G 移动网络的优化通道，速度快、部署灵活，适合个人手机端用户。' },
            ],
          },
        ],
      },
    },
    {
      id: 3,
      attributes: {
        title: 'Netflix 区域切换为什么有时灵有时不灵？',
        slug: 'netflix-region-unlock-why-flaky',
        excerpt: '很多用户买完加速器发现 Netflix 还是只能看自制剧。本文讲清楚流媒体解锁的原理。',
        category: '实用技巧',
        tags: ['流媒体', 'Netflix'],
        readingMinutes: 4,
        publishedAt: '2026-02-05T09:00:00.000Z',
        createdAt: '2026-02-05T09:00:00.000Z',
        coverImage: null,
        seoTitle: '为什么 Netflix 区域切换有时不灵？',
        seoDescription: '了解流媒体解锁的原理与稳定使用建议。',
        seoKeywords: 'Netflix区域,流媒体解锁,加速器',
        content: [
          { type: 'heading', level: 2, children: [{ text: 'Netflix 是怎么识别你位置的？' }] },
          {
            type: 'paragraph',
            children: [
              { text: 'Netflix 同时检测 IP 归属、DNS 出口、时区与浏览器语言。任何一个对不上，都会"露馅"。' },
            ],
          },
          { type: 'heading', level: 2, children: [{ text: '为什么有时灵有时不灵？' }] },
          {
            type: 'list',
            format: 'unordered',
            children: [
              { children: [{ text: '共享 IP 被太多人用过，Netflix 标记为"可疑"。' }] },
              { children: [{ text: '设备时区没有跟着节点调整。' }] },
              { children: [{ text: '浏览器语言被识别为非目标地区。' }] },
            ],
          },
          { type: 'heading', level: 2, children: [{ text: '稳定解锁的实操建议' }] },
          {
            type: 'list',
            format: 'unordered',
            children: [
              { children: [{ text: '选择"流媒体专用节点"，独立 IP 池。' }] },
              { children: [{ text: '设备时区跟随节点地区调整。' }] },
              { children: [{ text: '浏览器语言切到对应地区（如 ja-JP）。' }] },
              { children: [{ text: '清空 Netflix cookie 或用无痕模式。' }] },
            ],
          },
        ],
      },
    },
  ],
});

let state = null;

async function load() {
  if (state) return state;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, 'mock-cms.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    state = JSON.parse(raw);
  } catch {
    state = seed();
    await fs.writeFile(file, JSON.stringify(state, null, 2));
  }
  return state;
}

async function save() {
  const file = path.join(DATA_DIR, 'mock-cms.json');
  await fs.writeFile(file, JSON.stringify(state, null, 2));
}

export const mockCms = {
  isMock: true,
  async getGlobalSettings() {
    const s = await load();
    return s.global.attributes;
  },
  async getAllArticles() {
    const s = await load();
    return s.articles
      .map((a) => a.attributes)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  },
  async getArticleBySlug(slug) {
    const s = await load();
    const a = s.articles.find((x) => x.attributes.slug === slug);
    return a ? a.attributes : null;
  },
  async getAllPricingPlans() {
    const s = await load();
    return s.plans
      .map((p) => p.attributes)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  async getAllClientDownloads() {
    const s = await load();
    return (s.downloads || [])
      .map((d) => d.attributes)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  async updateGlobal(patch) {
    const s = await load();
    s.global.attributes = { ...s.global.attributes, ...patch };
    await save();
    return s.global.attributes;
  },
  async reset() {
    state = seed();
    await save();
    return state;
  },
};
