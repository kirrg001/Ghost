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
        const extensions = options.extensions;
        const url = options.url;
        const uid = options.uid;

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
            uid: uid,
            resource: resource,
            extensions: extensions || []
        };
    }

    hasUrl(url) {
        if (this.urls[url]) {
            return true;
        }

        let found = false;

        // CASE: extension?
        Object.keys(this.urls).every((key) => {
            const extensions = this.urls[key].extensions;
            let match = false;

            extensions.every((extension) => {
                const shortUrl = url.replace(new RegExp(extension), '');

                if (key === shortUrl) {
                    match = true;
                    return false;
                }

                return true;
            });

            if (!match) {
                return true;
            }

            found = true;
            return false;
        });

        return found === true;
    }

    getByUid(uid) {
        return _.reduce(Object.keys(this.urls), (toReturn, key) => {
            if (this.urls[key].uid === uid) {
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
