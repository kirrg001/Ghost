'use strict';

const debug = require('ghost-ignition').debug('services:routing:static-pages-router');
const ParentRouter = require('./ParentRouter');
const controllers = require('./controllers');
const common = require('../../lib/common');

class StaticPagesRouter extends ParentRouter {
    constructor() {
        super('StaticPagesRouter');

        this.permalinks = {
            value: '/:slug/'
        };

        this.filter = 'page:true';

        this.permalinks.getValue = () => {
            return this.permalinks.value;
        };

        debug(this.permalinks);

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use((req, res, next) => {
            res.locals.routingType = {
                filter: this.filter,
                permalinks: this.permalinks.getValue(),
                type: this.getType(),
                context: ['page']
            };

            res._route = {
                type: 'entry'
            };

            next();
        });

        // REGISTER: e.g. /tag/:slug/
        this.mountRoute(this.permalinks.getValue(), controllers.entry);

        common.events.emit('routingType.created', this);
    }

    getFilter() {
        return this.filter;
    }

    getPermalinks() {
        return this.permalinks;
    }

    getType() {
        return 'pages';
    }
}

module.exports = StaticPagesRouter;
