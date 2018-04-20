'use strict';

const ParentRouter = require('./ParentRouter');
const urlService = require('../url');

const controllers = require('./controllers');
const middlewares = require('./middlewares');

class RSSRouter extends ParentRouter {
    constructor() {
        super('RSSRouter');

        this.route = '/rss/';
        this._registerRoutes();
    }

    _registerRoutes() {
        this.mountRoute(this.route, controllers.rss);

        // REGISTER: pagination
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlService.utils.urlJoin(this.route, ':page(\\d+)'), controllers.rss);

        // REGISTER: redirect rule
        this.mountRoute('/feed/', (req, res) => {
            return urlService.utils.redirect301(
                res,
                urlService.utils.urlJoin(urlService.utils.getSubdir(), req.baseUrl, this.route)
            );
        });
    }
}

module.exports = RSSRouter;
