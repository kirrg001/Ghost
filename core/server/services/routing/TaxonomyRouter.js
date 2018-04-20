'use strict';

const debug = require('ghost-ignition').debug('services:routing:taxonomy-router');
const common = require('../../lib/common');
const security = require('../../lib/security');
const ParentRouter = require('./ParentRouter');
const RSSRouter = require('./RSSRouter');
const urlService = require('../url');
const controllers = require('./controllers');
const middlewares = require('./middlewares');

/* eslint-disable */
const knownTaxonomies = {
    tag: {
        filter: "tags:'%s'+tags.visibility:public",
        data: {
            type: 'read',
            resource: 'tags',
            options: {
                slug: '%s',
                visibility: 'public'
            }
        },
        editRedirect: '#/settings/tags/:slug/'
    },
    author: {
        filter: "authors:'%s'",
        data: {
            type: 'read',
            resource: 'users',
            options: {
                slug: '%s',
                visibility: 'public'
            }
        },
        editRedirect: '#/team/:slug/'
    }
};
/* eslint-enable */

class TaxonomyRouter extends ParentRouter {
    constructor(key, permalinks) {
        super('Taxonomy');

        this.taxonomyKey = key;

        // yaml file accepts {slug} notation, we understand :slug
        // @TODO: move to yaml parser
        if (permalinks.match(/{.*}/)) {
            permalinks = permalinks.replace(/{(\w+)}/g, ':$1');
        }

        this.permalinks = {
            value: permalinks
        };

        this.permalinks.getValue = () => {
            return this.permalinks.value;
        };

        this.identifier = security.identifier.uid(10);

        debug(this.permalinks);

        this._registerRoutes();
    }

    _registerRoutes() {
        this.router().use((req, res, next) => {
            res.locals.routingType = {
                permalinks: this.permalinks.getValue(),
                data: {[this.taxonomyKey]: knownTaxonomies[this.taxonomyKey].data},
                filter: knownTaxonomies[this.taxonomyKey].filter,
                type: this.getType(),
                context: [this.taxonomyKey],
                slugTemplate: true,
                identifier: this.identifier
            };

            res._route = {
                type: 'collection'
            };

            next();
        });

        // REGISTER: enable rss by default
        this.mountRouter(this.permalinks.getValue(), new RSSRouter().router());

        // REGISTER: e.g. /tag/:slug/
        this.mountRoute(this.permalinks.getValue(), controllers.collection);

        // REGISTER: enable pagination for each taxonomy by default
        this.router().param('page', middlewares.pageParam);
        this.mountRoute(urlService.utils.urlJoin(this.permalinks.value, 'page', ':page(\\d+)'), controllers.collection);

        this.mountRoute(urlService.utils.urlJoin(this.permalinks.value, 'edit'), (req, res) => {
            urlService.utils.redirectToAdmin(302, res, knownTaxonomies[this.taxonomyKey].editRedirect.replace(':slug', req.params.slug));
        });

        common.events.emit('routingType.created', this);
    }

    getFilter() {
        return this.filter;
    }

    getPermalinks() {
        return this.permalinks;
    }

    getType() {
        return knownTaxonomies[this.taxonomyKey].data.resource;
    }
}

module.exports = TaxonomyRouter;
