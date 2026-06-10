'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::article.article', ({ strapi }) => ({
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    const entity = await strapi.db.query('api::article.article').findOne({
      where: { slug, publishedAt: { $notNull: true } },
      populate: { coverImage: true },
    });
    if (!entity) return ctx.notFound('Article not found');
    return this.transformResponse(entity);
  },
}));
