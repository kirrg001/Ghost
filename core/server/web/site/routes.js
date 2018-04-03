var debug = require('ghost-ignition').debug('site:routes'),

    common = require('../../lib/common'),
    routeService = require('../../services/route'),
    siteRouter = routeService.siteRouter,

    // Sub Routers
    appRouter = routeService.appRouter,
    channelsService = require('../../services/channels'),

    // Controllers
    controllers = require('../../controllers'),

    // Utils for creating paths
    // @TODO: refactor these away
    config = require('../../config'),
    urlService = require('../../services/url');

module.exports = function siteRoutes() {
    // @TODO move this path out of this file!
    // Note this also exists in api/events.js
    var previewRoute = urlService.utils.urlJoin('/', config.get('routeKeywords').preview, ':uuid', ':options?');

    // Preview - register controller as route
    // Ideal version, as we don't want these paths all over the place
    // previewRoute = new Route('GET /:t_preview/:uuid/:options?', previewController);
    // siteRouter.mountRoute(previewRoute);
    // Orrrrr maybe preview should be an internal App??!
    siteRouter.mountRoute(previewRoute, controllers.preview);

    // Channels - register sub-router
    // The purpose of having a parentRouter for channels, is so that we can load channels from wherever we want:
    // config, settings, apps, etc, and that it will be possible for the router to be reloaded.
    siteRouter.mountRouter(channelsService.router());

    // Apps - register sub-router
    // The purpose of having a parentRouter for apps, is that Apps can register a route whenever they want.
    // Apps cannot yet deregister, it's complex to implement and I don't yet have a clear use-case for this.
    siteRouter.mountRouter(appRouter.router());

    // Default - register entry controller as route
    siteRouter.mountRoute('*', controllers.entry);

    debug('Routes:', routeService.registry.getAll());

    /**
     * @TODO:
     *
     * We will connect the routing service and the url service later.
     * The data is not yet ready and prepared.
     *
     * @TODO:
     *
     * - apps are using the routing service
     * - only trigger the event if the app is enabled
     * - you can enable/disable an app without restarting
     * - also: amp in sitemap https://developers.google.com/search/docs/guides/create-URLs
     * - amp will die, so i would not add this for the first version and simply ignore that
     */
    // The data is later represented in a collection class. Collection class is by default dynamic.
    // @TODO: test /podcast/settings.permalinks
    common.events.emit('route.added', {
        route: {
            parent: '/',
            extensions: ['rss/', 'page/\\d+/'],
            permalink: {
                value: '/{settings.permalinks}/',
                extensions: ['amp/']
            }
        },
        config: {
            type: 'posts',
            apiOptions: {
                filter: 'visibility:public+status:published+page:0+featured:false'
            }
        }
    });

    // The data is later represented in a collection class. Collection class is by default dynamic.
    common.events.emit('route.added', {
        route: {
            parent: '/podcast/',
            extensions: ['rss/', 'page/\\d+/'],
            permalink: {
                value: '/podcast/:slug/',
                extensions: ['amp/']
            }
        },
        config: {
            type: 'posts',
            apiOptions: {
                filter: 'page:1'
            }
        }
    });

    common.events.emit('route.added', {
        route: {
            parent: '/subscribe/',
            extensions: false,
            permalink: false
        },
        config: {
            type: 'others'
        }
    });

    common.events.emit('route.added', {
        route: {
            parent: '/private/',
            extensions: false,
            permalink: false
        },
        config: {
            type: 'others'
        }
    });

    // The data is later represented in a taxonomy class. Taxonomy class is by default dynamic.
    common.events.emit('route.added', {
        route: {
            parent: null,
            extensionss: false,
            permalink: {
                value: '/author/:slug/',
                extensions: ['rss/']
            }
        },
        config: {
            type: 'users',
            apiOptions: {}
        }
    });

    // The data is later represented in a taxonomy class. Taxonomy class is by default dynamic.
    common.events.emit('route.added', {
        route: {
            parent: null,
            permalink: {
                value: '/tag/:slug/',
                extensions: ['rss/']
            },
            extensions: false
        },
        config: {
            type: 'tags',
            apiOptions: {}
        }
    });

    return siteRouter.router();
};
