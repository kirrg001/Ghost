'use strict';

const _  = require('lodash'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function TagsMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(TagsMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(TagsMapGenerator.prototype, {
    // @TODO: We could influence this with meta information
    getPriorityForDatum: function () {
        return 0.6;
    }
});

module.exports = TagsMapGenerator;
