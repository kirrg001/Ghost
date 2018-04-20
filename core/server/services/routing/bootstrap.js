'use strict';

const debug = require('ghost-ignition').debug('services:routing:bootstrap');
const _ = require('lodash');
const settingsService = require('../settings');
const StaticRoutesRouter = require('./StaticRoutesRouter');
const StaticPagesRouter = require('./StaticPagesRouter');
const CollectionRouter = require('./CollectionRouter');
const TaxonomyRouter = require('./TaxonomyRouter');
const PreviewRouter = require('./PreviewRouter');

const siteRouter = require('./SiteRouter');
const appRouter = require('./AppRouter');
const registry = require('./registry');

/**
 * @TODO:
 *   - test templates
 *
 * @TODO:
 *   - is the PreviewRouter an app?
 */
module.exports = function bootstrap() {
    siteRouter.mountRouter(new PreviewRouter().router());

    const dynamicRoutes = settingsService.get('routes');

    _.each(dynamicRoutes.taxonomies, (value, key) => {
        siteRouter.mountRouter(new TaxonomyRouter(key, value).router());
    });

    _.each(dynamicRoutes.routes, (value, key) => {
        siteRouter.mountRouter(new StaticRoutesRouter(key, value).router());
    });

    _.each(dynamicRoutes.collections, (value, key) => {
        siteRouter.mountRouter(new CollectionRouter(key, value).router());
    });

    siteRouter.mountRouter(new StaticPagesRouter().router());
    siteRouter.mountRouter(appRouter.router());

    debug('Routes:', registry.getAll());
    return siteRouter.router();
};
