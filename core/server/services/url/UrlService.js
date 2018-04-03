'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    _debug = require('ghost-ignition').debug._base,
    debug = _debug('ghost:services:url:*'),
    common = require('../../lib/common'),
    UrlGenerator = require('./UrlGenerator'),
    Queue = require('./Queue'),
    Urls = require('./Urls'),
    Resources = require('./Resources'),
    localUtils = require('./utils');

class UrlService {
    constructor() {
        this.utils = localUtils;
        this.finished = true;
        this.urlGenerators = [];

        this.urls = new Urls();
        this.queue = new Queue();
        this.resources = new Resources(this.queue);

        this.listeners();
    }

    /**
     * Happens as soon as the routes are registered in express.
     * Or, you can add routes during the runtime.
     *
     * e.g. imagine we have an interface later. You can add/modify/delete routes.
     * We can add a `updateRoute` fn, it will search for it's url generator and update all the urls.
     * We also need to ensure that e.g. if a filter changes during the runtime, we need to re-ask if the
     * filter matches a resource.
     *
     * We could also order the routes with e.g. `reorderRoutes`, which will change the order of the
     * url generator array and the queue order - need to figure out how to easily change this.
     *
     * There are two types of routes:
     *  - 1. collections (permalink based, need to be generated)
     *  - 2. static routes (e.g. for apps, static home page)
     *
     *  Still, every route is unique.
     *
     *  e.g. you add /subscribe/ and there is a slug subscribe and a permlink /:slug/ which would own the post.
     *  It depends on the order of route registration who owns the URL first.
     */
    listeners() {
        // @TODO: subscribe app can be activated during runtime
        // @TODO: how?
        common.events.on('route.added', (entry) => {
            let urlGenerator = new UrlGenerator(entry, this.queue, this.resources, this.urls);
            this.urlGenerators.push(urlGenerator);
            urlGenerator.init();
        });

        this.queue.addListener('ended', (event) => {
            if (event === 'init') {
                this.finished = true;
            }
        });

        this.queue.addListener('started', (event) => {
            if (event === 'init') {
                this.finished = false;
            }
        });
    }

    hasUrl(url) {
        debug('hasUrl ?', url);

        return new Promise((resolve, reject) => {
            if (this.urls.hasUrl(url)) {
                debug('url exists');
                return resolve();
            }

            if (!this.finished) {
                return setTimeout(() => {
                    return this.hasUrl(url)
                        .then(resolve)
                        .catch(reject);
                }, 100);
            }

            reject(new Error('nope not found'));
        });
    }
}

module.exports = UrlService;
