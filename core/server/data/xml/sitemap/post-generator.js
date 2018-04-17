'use strict;';

const _ = require('lodash'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function PostMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(PostMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(PostMapGenerator.prototype, {
    getPriorityForDatum: function (post) {
        // give a slightly higher priority to featured posts
        return post.featured ? 0.9 : 0.8;
    }
});

module.exports = PostMapGenerator;
