'use strict';

/**
 * Strapi webhook -> trigger the static host to rebuild / purge cache.
 * Configure in Strapi admin:
 *   Settings -> Webhooks -> Create new webhook
 *     Name:        revalidate-web
 *     URL:         http://<cms-host>:1337/api/revalidate
 *     Headers:     x-revalidate-secret: <REVALIDATE_SECRET>
 *     Events:      entry.create, entry.update, entry.publish, entry.unpublish, entry.delete
 */
module.exports = {
  async revalidate(ctx) {
    const expected = process.env.REVALIDATE_SECRET;
    const provided = ctx.request.headers['x-revalidate-secret'];
    if (!expected || provided !== expected) {
      return ctx.unauthorized('Invalid revalidate secret');
    }

    const { event, model } = ctx.request.body || {};
    if (!['article', 'pricing-plan', 'global-setting'].includes(model)) {
      return ctx.badRequest(`Ignored model: ${model}`);
    }

    try {
      const { execFile } = require('node:child_process');
      const path = require('node:path');
      const script = path.join(
        strapi.dirs.app.root,
        '..',
        '..',
        'scripts',
        'revalidate.mjs',
      );
      execFile('node', [script, event, model], (err, stdout) => {
        if (err) strapi.log.error(`[revalidate] ${err.message}`);
        else strapi.log.info(`[revalidate] ${stdout}`);
      });
    } catch (e) {
      strapi.log.error(`[revalidate] spawn failed: ${e.message}`);
    }

    ctx.body = { ok: true, event, model };
  },
};
