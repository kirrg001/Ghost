'use strict';

const debug = require('ghost-ignition').debug('services:routing:collection-router');
const common = require('../../lib/common');
const security = require('../../lib/security');
const settingsCache = require('../settings/cache');
const urlService = require('../url');
const ParentRouter = require('./ParentRouter');

const controllers = require('./controllers');
const middlewares = require('./middlewares');
const RSSRouter = require('./RSSRouter');

class CollectionRouter extends ParentRouter {
    constructor(route, object) {
        super('Collection');

        // NOTE: parent route e.g. /, /podcast/
        this.route = {
            value: route
        };

        // yaml file accepts {slug} notation, we understand :slug
        // @TODO: move to yaml parser
        if (object.route.match(/{.*}/)) {
            object.route = object.route.replace(/{(\w+)}/g, ':$1');
        }

        this.permalinks = {
            originalValue: object.route,
            value: object.route
        };

        this.templates = object.template || [];

        this.filter = object.filter || 'page:false';

        this.identifier = security.identifier.uid(10);

        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.permalinks.originalValue.match(/globals\.permalinks/)) {
            this.permalinks.originalValue = '/{settings.permalinks}/';
            this.permalinks.value = settingsCache.get('permalinks');
        }

        this.permalinks.getValue = (options) => {
            options = options || {};

            if (options.withUrlOptions) {
                return urlService.utils.urlJoin(this.permalinks.value, '/:options(edit)?/');
            }

            return this.permalinks.value;
        };

        debug(this.route, this.permalinks);

        this._registerRoutes();
        this._listeners();
    }

    _registerRoutes() {
        this.router().use((req, res, next) => {
            res.locals.routingType = {
                filter: this.filter,
                permalinks: this.permalinks.getValue({withUrlOptions: true}),
                type: this.getType(),
                context: ['home'],
                frontPageTemplate: 'home',
                identifier: this.identifier
            };

            res._route = {
                type: 'custom',
                templateName: this.templates[0],
                defaultTemplate: this.templates[1]
            };

            next();
        });

        // REGISTER: collection route e.g. /, /podcast/
        this.mountRoute(this.route.value, controllers.collection);

        // REGISTER: enable pagination by default
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlService.utils.urlJoin(this.route.value, 'page', ':page(\\d+)'), controllers.collection);

        // REGISTER: enable rss by default
        this.mountRouter(this.route.value, new RSSRouter().router());

        this.router().use((req, res, next) => {
            res.locals.routingType.context = ['post'];
            res._route.type = 'entry';
            next();
        });

        // REGISTER: permalinks e.g. /:slug/, /podcast/:slug
        this.mountRoute(this.permalinks.getValue({withUrlOptions: true}), controllers.entry);

        common.events.emit('routingType.created', this);
    }

    _listeners() {
        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.getPermalinks() && this.getPermalinks().originalValue.match(/settings\.permalinks/)) {
            common.events.on('settings.permalinks.edited', () => {
                this.unmountRoute(this.permalinks.getValue({withUrlOptions: true}));

                this.permalinks.value = settingsCache.get('permalinks');
                this.mountRoute(this.permalinks.getValue({withUrlOptions: true}), controllers.entry);
                this.emit('updated');
            });
        }
    }

    getFilter() {
        return this.filter;
    }

    getPermalinks() {
        return this.permalinks;
    }

    getType() {
        return 'posts';
    }
}

module.exports = CollectionRouter;
