'use strict';

const ParentRouter = require('./ParentRouter');
const urlService = require('../url');
const controllers = require('./controllers');

class PreviewRouter extends ParentRouter {
    constructor() {
        super('PreviewRouter');

        this.route = '/p/';

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use((req, res, next) => {
            res._route = {
                type: 'entry'
            };

            next();
        });

        this.mountRoute(urlService.utils.urlJoin(this.route, ':uuid', ':options?'), controllers.preview);
    }
}

module.exports = PreviewRouter;
