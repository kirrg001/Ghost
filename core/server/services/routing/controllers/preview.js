'use strict';

const debug = require('ghost-ignition').debug('services:routing:controllers:preview'),
    api = require('../../../api'),
    urlService = require('../../url'),
    filters = require('../../../filters'),
    helpers = require('../helpers');

// This here is a controller.
// The "route" is handled in site/routes.js
module.exports = function previewController(req, res, next) {
    debug('previewController');

    const params = {
        uuid: req.params.uuid,
        status: 'all',
        include: 'authors,tags'
    };

    api.posts.read(params)
        .then(function then(result) {
            const post = result.posts[0];

            if (!post) {
                return next();
            }

            if (req.params.options && req.params.options.toLowerCase() === 'edit') {
            // CASE: last param is of url is /edit, redirect to admin
                return urlService.utils.redirectToAdmin(302, res, '#/editor/' + post.id);
            } else if (req.params.options) {
            // CASE: unknown options param detected. Ignore and end in 404.
                return next();
            }

            if (post.status === 'published') {
                return urlService.utils.redirect301(res, urlService.getUrlByResourceId(post.id));
            }

            helpers.secure(req, post);

            filters.doFilter('prePostsRender', post, res.locals)
                .then(helpers.renderEntry(req, res));
        })
        .catch(helpers.handleError(next));
};
