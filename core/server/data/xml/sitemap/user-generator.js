'use strict';

const _ = require('lodash'),
    validator = require('validator'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function UserMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(UserMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(UserMapGenerator.prototype, {
    // @TODO: We could influence this with meta information
    getPriorityForDatum: function () {
        return 0.6;
    },

    validateImageUrl: function (imageUrl) {
        return imageUrl && validator.isURL(imageUrl, {protocols: ['http', 'https'], require_protocol: true});
    }
});

module.exports = UserMapGenerator;
