'use strict';

const _ = require('lodash');
const debug = require('ghost-ignition').debug('services:url:urls');
const common = require('../../lib/common');

/**
 * Keeps track of all urls.
 * Each resource has exactly one url.
 *
 * Connector for url generator and resources.
 */
class Urls {
    constructor() {
        this.urls = {};
    }

    add(options) {
        const url = options.url;
        const generatorId = options.generatorId;
        const resource = options.resource;

        debug('cache', url);

        if (this.urls[resource.data.id]) {
            throw new common.errors.IncorrectUsageError({
                message: 'This should not happen'
            });
        }

        this.urls[resource.data.id] = {
            url: url,
            generatorId: generatorId,
            resource: resource
        };

        common.events.emit('url.added', {
            url: url,
            resource: resource
        });
    }

    getByResourceId(id) {
        return this.urls[id];
    }

    /**
     * Get all by `uid`.
     */
    getByGeneratorId(generatorId) {
        return _.reduce(Object.keys(this.urls), (toReturn, resourceId) => {
            if (this.urls[resourceId].generatorId === generatorId) {
                toReturn.push(this.urls[resourceId]);
            }

            return toReturn;
        }, []);
    }

    /**
     * @NOTE:
     * It's is in theory possible that:
     *
     *  - resource1 -> /welcome/
     *  - resource2 -> /welcome/
     *
     *  But depending on the routing registration, you will always serve e.g. resource1.
     */
    getByUrl(url) {
        return _.reduce(Object.keys(this.urls), (toReturn, resourceId) => {
            if (this.urls[resourceId].url === url) {
                toReturn.push(this.urls[resourceId]);
            }

            return toReturn;
        }, []);
    }

    removeResourceId(id) {
        debug('removed', this.urls[id].url, this.urls[id].generatorId);

        common.events.emit('url.removed', {
            url: this.urls[id].url,
            resource: this.urls[id].resource
        });

        delete this.urls[id];
    }

    reset() {
        this.urls = {};
    }
}

module.exports = Urls;
