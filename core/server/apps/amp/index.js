'use strict';

const EventEmitter = require('events').EventEmitter,
    router = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),
    urlService = require('../../services/url'),

    // Dirty requires
    common = require('../../lib/common'),
    config = require('../../config'),
    settingsCache = require('../../services/settings/cache');

function ampRouter(req, res) {
    if (settingsCache.get('amp') === true) {
        return router.apply(this, arguments);
    } else {
        var redirectUrl = req.originalUrl.replace(/amp\/$/, '');
        urlService.utils.redirect301(res, redirectUrl);
    }
}

class App extends EventEmitter {
    constructor() {
        super();
        this.listeners();

        this.isEnabled = settingsCache.get('amp');
    }

    listeners() {
        common.events.on('settings.amp.edited', () => {
            if (this.isEnabled && !settingsCache.get('amp')) {
                this.isEnabled = false;
                this.emit('disabled');
            }

            if (!this.isEnabled && settingsCache.get('amp')) {
                this.isEnabled = true;
                this.emit('enabled');
            }
        });
    }
}

module.exports = {
    activate: function activate(ghost) {
        var ampRoute = '*/' + config.get('routeKeywords').amp + '/';

        ghost.routeService.registerRouter(ampRoute, ampRouter);

        registerHelpers(ghost);
    },
    app: new App()
};
