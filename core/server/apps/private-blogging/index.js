'use strict';

const EventEmitter = require('events').EventEmitter,
    config = require('../../config'),
    settingsCache = require('../../services/settings/cache'),
    urlService = require('../../services/url'),
    common = require('../../lib/common'),
    middleware = require('./lib/middleware'),
    router = require('./lib/router'),
    registerHelpers = require('./lib/helpers');

const checkSubdir = function checkSubdir() {
    var paths;

    if (urlService.utils.getSubdir()) {
        paths = urlService.utils.getSubdir().split('/');

        if (paths.pop() === config.get('routeKeywords').private) {
            common.logging.error(new common.errors.GhostError({
                message: common.i18n.t('errors.config.urlCannotContainPrivateSubdir.error'),
                context: common.i18n.t('errors.config.urlCannotContainPrivateSubdir.description'),
                help: common.i18n.t('errors.config.urlCannotContainPrivateSubdir.help')
            }));

            // @TODO: why
            process.exit(0);
        }
    }
};

class App extends EventEmitter {
    constructor() {
        super();
        this.listeners();

        this.isEnabled = settingsCache.get('is_private');
    }

    listeners() {
        common.events.on('settings.is_private.edited', () => {
            if (this.isEnabled && !settingsCache.get('is_private')) {
                this.isEnabled = false;
                this.emit('disabled');
            }

            if (!this.isEnabled && settingsCache.get('is_private')) {
                this.isEnabled = true;
                this.emit('enabled');
            }
        });
    }
}

module.exports = {
    activate: function activate(ghost) {
        var privateRoute = '/' + config.get('routeKeywords').private + '/';

        checkSubdir();

        ghost.routeService.registerRouter(privateRoute, router);

        registerHelpers(ghost);
    },

    setupMiddleware: function setupMiddleware(siteApp) {
        siteApp.use(middleware.checkIsPrivate);
        siteApp.use(middleware.filterPrivateRoutes);
    },

    app: new App()
};
