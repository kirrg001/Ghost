'use strict';

const _ = require('lodash'),
    common = require('../../../lib/common'),
    IndexMapGenerator = require('./index-generator'),
    PagesMapGenerator = require('./page-generator'),
    PostsMapGenerator = require('./post-generator'),
    UsersMapGenerator = require('./user-generator'),
    TagsMapGenerator  = require('./tag-generator');

let SiteMapManager;

SiteMapManager = function (opts) {
    opts = opts || {};

    this.pages = opts.pages || this.createPagesGenerator(opts);
    this.posts = opts.posts || this.createPostsGenerator(opts);

    // @TODO: fix
    this.users = this.authors = opts.authors || this.createUsersGenerator(opts);
    this.tags = opts.tags || this.createTagsGenerator(opts);

    this.index = opts.index || this.createIndexGenerator(opts);

    common.events.on('url.added', (obj) => {
        this[obj.resource.config.type].addOrUpdateUrl(obj.url, obj.resource.data);
    });

    common.events.on('url.removed', (obj) => {
        this[obj.resource.config.type].removeUrl(obj.url, obj.resource.data);
    });
};

_.extend(SiteMapManager.prototype, {
    createIndexGenerator: function () {
        return new IndexMapGenerator(_.pick(this, 'pages', 'posts', 'authors', 'tags'));
    },

    createPagesGenerator: function (opts) {
        return new PagesMapGenerator(opts);
    },

    createPostsGenerator: function (opts) {
        return new PostsMapGenerator(opts);
    },

    createUsersGenerator: function (opts) {
        return new UsersMapGenerator(opts);
    },

    createTagsGenerator: function (opts) {
        return new TagsMapGenerator(opts);
    },

    getIndexXml: function () {
        return this.index.getIndexXml();
    },

    getSiteMapXml: function (type) {
        return this[type].siteMapContent;
    }
});

module.exports = SiteMapManager;
