// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.WEB_SITE_URL || 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
  vite: {
    css: {
      postcss: './postcss.config.cjs',
    },
    server: {
      hmr: { overlay: false },
    },
  },
});
