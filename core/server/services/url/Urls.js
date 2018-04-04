'use strict';

const _ = require('lodash');
const debug = require('ghost-ignition').debug('services:url:urls');

/**
 * This is a tree of url nodes.
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
    }

    hasUrl(url) {
        // CASE: direct match
        if (this.urls[url]) {
            return {
                found: true
            };
        }

        let toReturn = {
            found: false
        };

        Object.keys(this.urls).every((existingUrl) => {
            const response = this.urls[existingUrl].urlGenerator.isValid(url, existingUrl);

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

    getByUid(uid) {
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
        delete this.urls[url];
    }

    removeByResource(uid, resource) {
        const urls = this.getByUid(uid);

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
