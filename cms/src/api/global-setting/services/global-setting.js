'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::global-setting.global-setting');
