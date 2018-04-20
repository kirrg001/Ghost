'use strict';

const _ = require('lodash'),
    debug = require('ghost-ignition').debug('services:routing:controllers:rss'),
    url = require('url'),
    common = require('../../../lib/common'),
    security = require('../../../lib/security'),
    settingsCache = require('../../settings/cache'),
    rssService = require('../../rss'),
    helpers = require('../helpers');

// @TODO: is this the right logic? Where should this live?!
function getBaseUrlForRSSReq(originalUrl, pageParam) {
    return url.parse(originalUrl).pathname.replace(new RegExp('/' + pageParam + '/$'), '/');
}

// @TODO: is this really correct? Should we be using meta data title?
function getTitle(relatedData) {
    relatedData = relatedData || {};
    var titleStart = _.get(relatedData, 'author[0].name') || _.get(relatedData, 'tag[0].name') || '';

    titleStart += titleStart ? ' - ' : '';
    return titleStart + settingsCache.get('title');
}

// @TODO: the collection controller does almost the same
module.exports = function rssContoller(req, res, next) {
    debug('rssController');

    const pathOptions = {
        page: req.params.page !== undefined ? req.params.page : 1,
        slug: req.params.slug ? security.string.safe(req.params.slug) : undefined
    };

    // Base URL needs to be the URL for the feed without pagination:
    const baseUrl = getBaseUrlForRSSReq(req.originalUrl, pathOptions.page);

    return helpers.fetchData(pathOptions, res.locals.routingType)
        .then(function formatResult(result) {
            var response = _.pick(result, ['posts', 'meta']);

            response.title = getTitle(result.data);
            response.description = settingsCache.get('description');

            return response;
        })
        .then(function (data) {
            // If page is greater than number of pages we have, go straight to 404
            if (pathOptions.page > data.meta.pagination.pages) {
                return next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.pageNotFound')}));
            }

            // Render call - to a special RSS renderer
            return rssService.render(res, baseUrl, data);
        })
        .catch(helpers.handleError(next));
};
