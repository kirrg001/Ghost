'use strict';

const common = require('../../../lib/common/index'),
    urlService = require('../../url/index');

module.exports = function handlePageParam(req, res, next, page) {
    // routeKeywords.page: 'page'
    const pageRegex = new RegExp('/page/(.*)?/'),
        rssRegex = new RegExp('/rss/(.*)?/');

    page = parseInt(page, 10);

    if (page === 1) {
        // Page 1 is an alias, do a permanent 301 redirect
        if (rssRegex.test(req.url)) {
            return urlService.utils.redirect301(res, req.originalUrl.replace(rssRegex, '/rss/'));
        } else {
            return urlService.utils.redirect301(res, req.originalUrl.replace(pageRegex, '/'));
        }
    } else if (page < 1 || isNaN(page)) {
        // Nothing less than 1 is a valid page number, go straight to a 404
        return next(new common.errors.NotFoundError({
            message: common.i18n.t('errors.errors.pageNotFound')
        }));
    } else {
        // Set req.params.page to the already parsed number, and continue
        req.params.page = page;
        return next();
    }
};
