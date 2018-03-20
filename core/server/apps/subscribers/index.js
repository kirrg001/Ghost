'use strict';

const EventEmitter = require('events').EventEmitter,
    router = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),

    // Dirty requires
    common = require('../../lib/common'),
    config = require('../../config'),
    labs = require('../../services/labs');

class App extends EventEmitter {
    constructor() {
        super();
        this.listeners();

        this.isEnabled = labs.isSet('subscribers');
    }

    listeners() {
        common.events.on('settings.labs.edited', () => {
            if (this.isEnabled && !labs.isSet('subscribers')) {
                this.isEnabled = false;
                this.emit('disabled');
            }

            if (!this.isEnabled && labs.isSet('subscribers')) {
                this.isEnabled = true;
                this.emit('enabled');
            }
        });
    }
}

module.exports = {
    activate: function activate(ghost) {
        var subscribeRoute = '/' + config.get('routeKeywords').subscribe + '/';
        // TODO, how to do all this only if the Subscribers flag is set?!
        registerHelpers(ghost);

        ghost.routeService.registerRouter(subscribeRoute, function labsEnabledRouter(req, res, next) {
            if (labs.isSet('subscribers') === true) {
                return router.apply(this, arguments);
            }

            next();
        });
    },

    app: new App()
};
