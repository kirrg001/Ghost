'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment-timezone'),
    jsonpath = require('jsonpath'),
    debug = require('ghost-ignition').debug('services:url:generator'),
    config = require('../../config'),
    settingsCache = require('../settings/cache'),
    /**
     * @TODO: This is a fake version of the upcoming GQL tool.
     * GQL will offer a tool to match a JSON against a filter.
     */
    transformFilter = (filter) => {
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

        // CASE: channels can define custom filters, but not required.
        if (this.channel.getFilter()) {
            this.filter = transformFilter(this.channel.getFilter());
            debug('filter', this.filter);
        }

        this._listeners();
    }

    _listeners() {
        // NOTE: currently only used if the permalink setting changes and it's used for this url generator.
        this.channel.addListener('updated', () => {
            const myUrls = this.urls.getUrlsByUid(this.uid);

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

        /**
         * Channels can be disabled by default, right now only for apps.
         * But they are getting enabled during runtime.
         */
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

        /**
         * Listen on two events:
         *
         * - init: bootstrap or url reset
         * - added: resource was added
         */
        this.queue.register({
            event: 'init',
            tolerance: 100
        }, this._onInit.bind(this));

        this.queue.register({
            event: 'added'
        }, this._onAdded.bind(this));
    }

    _onInit() {
        debug('_onInit', this.toString());

        // CASE: channel is disabled
        // You can enable/disable channels and you can disable/enable extensions.
        // e.g. disable channel: app
        // e.g. disable extension: amp
        if (!this.channel.isEnabled) {
            debug('is disabled', this.toString());
            return Promise.resolve();
        }

        // CASE: a channel can have a base route, but it's not allowed to be served e.g. taxonomies
        if (this.channel.registerRoute) {
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
            if (!this.filter) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, resource);

                this.resourceListeners(resource);
                return;
            }

            // CASE: find out if my filter matches the resource
            if (jsonpath.query(resource, this.filter).length) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, resource);

                this.resourceListeners(resource);
            }
        });

        return Promise.resolve();
    }

    _onAdded(event) {
        const resource = this.resources.getByIdAndType(this.channel.getType(), event.id);

        // @TODO: does this case exist? test it!
        if (!resource) {
            return Promise.resolve();
        }

        if (resource.isTaken()) {
            return Promise.resolve();
        }

        const url = this.generateUrl(resource);
        debug('onAdded');

        // CASE 1: no custom filter, i'll own this resource
        // CASE 2: custom filter, my filter needs to match the resource
        if (!this.filter) {
            this.urls.add({
                url: url,
                urlGenerator: this
            }, resource);

            this.resourceListeners(resource);
        } else if (jsonpath.query(resource, this.filter).length) {
            this.urls.add({
                url: url,
                urlGenerator: this
            }, resource);

            this.resourceListeners(resource);
        }

        return Promise.resolve();
    }

    /**
     * @TODO:
     * This is a copy of `replacePermalink` of our url utility, see ./utils
     * But it has modifications, because the whole url utility doesn't work anymore.
     */
    _replacePermalink(url, resource) {
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
                    return resource.data.primary_author.slug;
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

    toString() {
        return this.channel.toString();
    }

    generateUrl(resource) {
        const url = this.channel.getPermalinks().getValue();
        return this._replacePermalink(url, resource);
    }

    /**
     * I want to know if my resources changes.
     * Register events of resource.
     */
    resourceListeners(resource) {
        const onUpdate = (updatedResource) => {
            this.urls.removeByResource(this.uid, updatedResource);
            updatedResource.free();

            const url = this.generateUrl(updatedResource);

            if (!this.filter) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, updatedResource);
                return;
            }

            // CASE: data has changed, does the resource still match my filter?
            // if yes, unset url to be able to re-add url (only do if slug changed, not implemented)
            // if no, other url generator need to know
            if (jsonpath.query(updatedResource, this.filter).length) {
                this.urls.add({
                    url: url,
                    urlGenerator: this
                }, updatedResource);
            } else {
                debug('free, this is not mine anymore', updatedResource.data.id);

                this.queue.start({
                    event: 'added',
                    action: 'added:' + resource.data.id,
                    eventData: {
                        id: resource.data.id,
                        type: this.channel.getType()
                    }
                });
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
     * You can use this function to figure out if a url looks like a url.
     *
     * e.g.
     *  - /author/ghost/ is my url
     *  - /author/ghost/rss/ is an extension of my url
     */
    is(thisUrl, myUrl) {
        let extensions = this.channel.getRoute().extensions;
        let toReturn = {
            found: false
        };

        Object.keys(extensions).every((extension) => {
            const shortUrl = thisUrl.replace(new RegExp(extensions[extension].route), '');

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
            const shortUrl = thisUrl.replace(new RegExp(extensions[extension].route), '');

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

module.exports = UrlGenerator;
