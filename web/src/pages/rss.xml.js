import rss from '@astrojs/rss';
import { getAllArticles, getGlobalSettings } from '@lib/cms';

export async function GET(context) {
  const [settings, articles] = await Promise.all([getGlobalSettings(), getAllArticles()]);
  return rss({
    title: settings.siteName || '星云代理',
    description: settings.defaultSeoDescription || settings.siteTagline || '',
    site: context.site,
    items: (articles || []).map((a) => ({
      title: a.title,
      pubDate: new Date(a.publishedAt || a.createdAt),
      description: a.excerpt || '',
      link: `/blog/${a.slug}`,
    })),
  });
}
