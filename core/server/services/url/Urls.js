'use strict';

const _ = require('lodash');
const debug = require('ghost-ignition').debug('services:url:urls');
const common = require('../../lib/common');

/**
 * Keeps track of all urls.
 */
class Urls {
    constructor() {
        this.urls = {};
    }

    add(options, resource) {
        const url = options.url;
        const urlGenerator = options.urlGenerator;

        // ignore url e.g. null
        if (!url) {
            return;
        }

        if (this.urls[url]) {
            throw new Error('Url is taken.');
        }

        debug('cache', url);
        resource.take();

        this.urls[url] = {
            urlGenerator: urlGenerator,
            resource: resource
        };

        common.events.emit('url.added', resource);
    }

    hasUrl(url) {
        // CASE: direct match, yippi
        if (this.urls[url]) {
            return {
                found: true
            };
        }

        let toReturn = {
            found: false
        };

        // CASE: extensions are not registered as official url, they can be enabled/disabled.
        Object.keys(this.urls).every((existingUrl) => {
            const response = this.urls[existingUrl].urlGenerator.is(url, existingUrl);

            if (response.found) {
                toReturn.found = true;

                if (response.disabled) {
                    toReturn.disabled = true;
                    toReturn.redirect = response.redirect;
                    toReturn.redirectUrl = url.replace(new RegExp(response.extension), '');
                }

                return false;
            }
            return true;
        });

        return toReturn;
    }

    /**
     * Get all urls by `uid`.
     */
    getUrlsByUid(uid) {
        return _.reduce(Object.keys(this.urls), (toReturn, key) => {
            if (this.urls[key].urlGenerator.uid === uid) {
                toReturn.push(key);
            }

            return toReturn;
        }, []);
    }

    getUrl(url) {
        return this.urls[url];
    }

    removeUrl(url) {
        debug('removed', url);
        delete this.urls[url];
    }

    removeByResource(uid, resource) {
        const urls = this.getUrlsByUid(uid);

        urls.every((url) => {
            if (this.urls[url].resource === resource) {
                debug('remove', url);
                delete this.urls[url];
                return false;
            }

            return true;
        });
    }
}

module.exports = Urls;
