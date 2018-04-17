'use strict';

const _  = require('lodash'),
    urlService = require('../../../services/url'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function PageMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);

    this.addOrUpdateUrl(urlService.utils.urlFor('home', true), {slug: 'name'});
}

// Inherit from the base generator class
_.extend(PageMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(PageMapGenerator.prototype, {
    getPriorityForDatum: function (page) {
        // TODO: We could influence this with priority or meta information
        return page && page.name === 'home' ? 1.0 : 0.8;
    }
});

module.exports = PageMapGenerator;
