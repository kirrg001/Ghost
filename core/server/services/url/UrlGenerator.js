'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment-timezone'),
    jsonpath = require('jsonpath'),
    debug = require('ghost-ignition').debug('services:url:generator'),
    config = require('../../config'),
    common = require('../../lib/common'),
    settingsCache = require('../settings/cache'),
    getMatchFilter = (filter) => {
        filter = '$[?(' + filter + ')]';
        filter = filter.replace(/(\w+):(\w+)/g, '@.$1 == "$2"');
        filter = filter.replace(/"true"/g, 'true');
        filter = filter.replace(/"false"/g, 'false');
        filter = filter.replace(/"0"/g, '0');
        filter = filter.replace(/"1"/g, '1');
        filter = filter.replace(/\+/g, ' && ');
        return filter;
    };

class UrlGenerator {
    constructor(channel, queue, resources, urls) {
        this.channel = channel;
        this.queue = queue;
        this.urls = urls;
        this.resources = resources;
        this.uid = Math.random().toString(36).substring(7);

        debug('constructor', this.toString());

        if (this.channel.getFilter()) {
            this.matchFilter = getMatchFilter(this.channel.getFilter());
            debug('matching filter', this.matchFilter);
        }

        this.listeners();
    }

    listeners() {
        // NOTE: currently only used if the permalink setting changes and it's used for this url generator.
        this.channel.addListener('updated', () => {
            const myUrls = this.urls.getByUid(this.uid);

            myUrls.forEach((url) => {
                const resource = this.urls.getUrl(url).resource;
                this.urls.removeUrl(url);

                resource.free();
                const newUrl = this.generateUrl(resource);

                this.urls.add({
                    url: newUrl,
                    urlGenerator: this
                }, resource);
            });
        });

        this.channel.addListener('enabled', () => {
            try {
                this.urls.add({
                    url: this.channel.getRoute().value,
                    urlGenerator: this
                }, this.resources.create(this.channel.getType(), {}));
            } catch (err) {
                debug('Ignore. Detected url collision.', this.toString());
            }
        });

        this.channel.addListener('disabled', () => {
            const resource = this.urls.getUrl(this.channel.getRoute().value).resource;
            this.resources.removeResource(this.channel.getType(), resource);
            this.urls.removeUrl(this.channel.getRoute().value);
        });
    }

    toString() {
        return this.channel.toString();
    }

    /**
     * Every UrlGenerator will be notified when the system is ready to generator urls.
     * This depends on having the resources fetched from the database.
     * Each UrlGenerator is waiting in an ordered line.
     */
    init() {
        this.queue.register({
            event: 'init',
            tolerance: 100
        }, () => {
            debug('on init', this.toString());

            // CASE: channel is disabled
            // You can enable/disable channels and you can disable/enable extensions.
            // e.g. disable channel: app
            // e.g. disable extension: amp
            if (!this.channel.isEnabled) {
                debug('is disabled', this.toString());
                return Promise.resolve();
            }

            if (this.channel.mainRoute) {
                try {
                    this.urls.add({
                        url: this.channel.getRoute().value,
                        urlGenerator: this
                    }, this.resources.create(this.channel.getType(), {}));
                } catch (err) {
                    debug('Ignore. Detected url collision.', this.toString());
                    return Promise.resolve();
                }
            }

            if (!this.channel.getPermalinks()) {
                debug('no permalink', this.toString());
                return Promise.resolve();
            }

            // get the resources of my type e.g. posts.
            const resources = this.resources.getAll(this.channel.getType());

            _.each(resources, (resource) => {
                const url = this.generateUrl(resource);

                if (resource.isTaken()) {
                    return;
                }

                // CASE: route has no custom filter, it will own the resource for sure
                if (!this.matchFilter) {
                    this.urls.add({
                        url: url,
                        urlGenerator: this
                    }, resource);

                    this.resourceListeners(resource);
                    return;
                }

                // CASE: find out if my filter matches the resource
                if (jsonpath.query(resource, this.matchFilter).length) {
                    this.urls.add({
                        url: url,
                        urlGenerator: this
                    }, resource);

                    this.resourceListeners(resource);
                }
            });

            return Promise.resolve();
        });

        this.queue.register({
            event: 'added'
        }, (event) => {
            const resource = this.resources.getByIdAndType(this.channel.getType(), event.id);

            if (!resource) {
                return Promise.resolve();
            }

            const url = this.generateUrl(resource);

            if (resource.isTaken()) {
                return Promise.resolve();
            }

            debug('onAdded');

            if (!this.matchFilter) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, resource);

                this.resourceListeners(resource);
            } else if (jsonpath.query(resource, this.matchFilter).length) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, resource);

                this.resourceListeners(resource);
            }

            return Promise.resolve();
        });
    }

    replacepermalink(url, resource) {
        var output = url,
            primaryTagFallback = config.get('routeKeywords').primaryTagFallback,
            publishedAtMoment = moment.tz(resource.data.published_at || Date.now(), settingsCache.get('active_timezone')),
            permalink = {
                year: function () {
                    return publishedAtMoment.format('YYYY');
                },
                month: function () {
                    return publishedAtMoment.format('MM');
                },
                day: function () {
                    return publishedAtMoment.format('DD');
                },
                author: function () {
                    return resource.data.author.slug;
                },
                primary_tag: function () {
                    return resource.data.primary_tag ? resource.data.primary_tag.slug : primaryTagFallback;
                },
                slug: function () {
                    return resource.data.slug;
                },
                id: function () {
                    return resource.data.id;
                }
            };

        // replace tags like :slug or :year with actual values
        output = output.replace(/(:[a-z_]+)/g, function (match) {
            if (_.has(permalink, match.substr(1))) {
                return permalink[match.substr(1)]();
            }
        });

        return output;
    }

    generateUrl(resource) {
        const url = this.channel.getPermalinks().getValue(resource);
        return this.replacepermalink(url, resource);
    }

    resourceListeners(resource) {
        const onUpdate = (updatedResource) => {
            this.urls.removeByResource(this.uid, updatedResource);
            updatedResource.free();

            const url = this.generateUrl(updatedResource);

            if (!this.matchFilter) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, updatedResource);
                return;
            }

            // CASE: data has changed, does the resource still match my filter?
            // if yes, unset url to be able to re-add url (only do if slug changed, not implemented)
            // if no, other url generator need to know
            if (jsonpath.query(updatedResource, this.matchFilter).length) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, updatedResource);
            } else {
                debug('free, this is not mine anymore', updatedResource.data.id);
                this.resources.free(this.channel.getType(), updatedResource);
            }
        };

        const onRemoved = (removedResource) => {
            this.urls.removeByResource(this.uid, removedResource);
        };

        resource.removeAllListeners();
        resource.addListener('updated', onUpdate.bind(this));
        resource.addListener('removed', onRemoved.bind(this));
    }

    /**
     * I know already that this is my url.
     * Is this a main route or a permalink?
     */
    isValid(url, myUrl) {
        let extensions = this.channel.getRoute().extensions;
        let toReturn = {
            found: false
        };

        Object.keys(extensions).every((extension) => {
            const shortUrl = url.replace(new RegExp(extensions[extension].route), '');

            if (shortUrl === myUrl) {
                if (extensions[extension].enabled) {
                    toReturn.found = true;
                } else {
                    toReturn.found = true;
                    toReturn.disabled = true;
                    toReturn.redirect = extensions[extension].redirect;
                    toReturn.extension = extensions[extension].route;
                }

                return false;
            }

            return true;
        });

        if (toReturn.found) {
            return toReturn;
        }

        if (!this.channel.getPermalinks()) {
            return toReturn;
        }

        extensions = this.channel.getPermalinks().extensions;

        Object.keys(extensions).every((extension) => {
            const shortUrl = url.replace(new RegExp(extensions[extension].route), '');

            if (shortUrl === myUrl) {
                if (extensions[extension].enabled) {
                    toReturn.found = true;
                } else {
                    toReturn.found = true;
                    toReturn.disabled = true;
                    toReturn.redirect = extensions[extension].redirect;
                    toReturn.extension = extensions[extension].route;
                }

                return false;
            }

            return true;
        });

        return toReturn;
    }
}

module
    .exports = UrlGenerator;
