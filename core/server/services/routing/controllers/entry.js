'use strict';

const debug = require('ghost-ignition').debug('services:routing:controllers:entry'),
    urlService = require('../../url'),
    filters = require('../../../filters'),
    helpers = require('../helpers');

/**
 * @TODO:
 *   - use `filter` for `findOne`?
 *   - always execute `next` until no router want's to serve and 404's
 */
module.exports = function entryController(req, res, next) {
    debug('entryController', res.locals.routingType);

    return helpers.postLookup(req.path, res.locals.routingType)
        .then(function then(lookup) {
            // Format data 1
            const post = lookup ? lookup.post : false;

            if (!post) {
                return next();
            }

            // CASE: postlookup can detect options for example /edit, unknown options get ignored and end in 404
            if (lookup.isUnknownOption) {
                return next();
            }

            // CASE: last param is of url is /edit, redirect to admin
            if (lookup.isEditURL) {
                debug('redirect. is edit url');
                return urlService.utils.redirectToAdmin(302, res, '#/editor/' + post.id);
            }

            // CASE: check if type of router owns this resource
            if (urlService.getResource(post.url).config.type !== res.locals.routingType.type) {
                return next();
            }

            // CASE: permalink is not valid anymore, we redirect him permanently to the correct one
            if (post.url !== req.originalUrl) {
                debug('redirect');
                return urlService.utils.redirect301(res, post.url);
            }

            helpers.secure(req, post);

            filters.doFilter('prePostsRender', post, res.locals)
                .then(helpers.renderEntry(req, res));
        })
        .catch(helpers.handleError(next));
};
