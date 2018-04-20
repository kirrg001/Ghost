'use strict';

const debug = require('ghost-ignition').debug('services:routing:static-pages-router');
const helpers = require('./helpers');
const ParentRouter = require('./ParentRouter');

class StaticRoutesRouter extends ParentRouter {
    constructor(key, template) {
        super('StaticRoutesRouter');

        this.route = key;
        this.template = template;

        debug(this.route, this.template);

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use((req, res, next) => {
            res._route = {
                type: 'custom',
                templateName: this.template,
                defaultTemplate: 'index'
            };

            res.locals.routingType = {
                context: []
            };

            next();
        });

        this.mountRoute(this.route, ((req, res) => {
            debug('StaticRoutesRouter');
            helpers.renderer(req, res, {});
        }));
    }
}

module.exports = StaticRoutesRouter;
