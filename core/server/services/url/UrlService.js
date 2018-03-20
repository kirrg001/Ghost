'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    _debug = require('ghost-ignition').debug._base,
    debug = _debug('ghost:services:url:*'),
    common = require('../../lib/common'),
    UrlGenerator = require('./UrlGenerator'),
    localUtils = require('./utils');

class UrlService {
    constructor() {
        this.utils = localUtils;
        this.ready = true;
        this.finished = false;
        this.urlGenerators = [];
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
     */
    listeners() {
        common.events.on('route.added', (entry) => {
            const urlGenerator = new UrlGenerator(entry);
            this.urlGenerators.push(urlGenerator);
            urlGenerator.init();
        });
    }

    hasUrl(url) {
        debug('hasUrl');

        return new Promise((resolve, reject) => {
            let urlFound = false;

            this.urlGenerators.every((urlGenerator) => {
                if (urlGenerator.hasUrl(url)) {
                    urlFound = true;

                    // break!
                    return false;
                }

                return true;
            });

            if (urlFound) {
                debug('url exists');
                return resolve();
            }

            // wait and try again
            if (!this.finished) {
                return setTimeout(() => {
                    return this.hasUrl(url)
                        .then(resolve)
                        .catch(reject);
                }, 50);
            }

            return reject(new Error('url not found'));
        });
    }
}

module.exports = UrlService;
