'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pricing-plan.pricing-plan');
