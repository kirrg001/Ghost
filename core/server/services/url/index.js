const debug = require('ghost-ignition').debug('services:url:init'),
    config = require('../../config'),
    events = require('../../lib/common/events'),
    UrlService = require('./UrlService'),
    urlService = new UrlService();

module.exports = urlService;

// @TODO we seriously should move this or make it do almost nothing...
module.exports.init = function init() {
    // Temporary config value just in case this causes problems
    // @TODO delete this
    if (config.get('disableUrlService')) {
        return;
    }

    urlService.bind();

    // Hardcoded routes
    // @TODO figure out how to do this from channel or other config
    // @TODO get rid of name concept (for compat with sitemaps)
    UrlService.cacheRoute('/', {name: 'home'});
    // @TODO figure out how to do this from apps
    // @TODO only do this if subscribe is enabled!
    UrlService.cacheRoute('/subscribe/', {});

    // Register a listener for server-start to load all the known urls
    events.on('server:start', function loadAllUrls() {
        debug('URL service, loading all URLS');
        urlService.loadResourceUrls();
    });
};
