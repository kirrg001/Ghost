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
    constructor(entry, queue, resources, urls) {
        this.entry = entry;
        this.queue = queue;
        this.urls = urls;
        this.resources = resources;
        this.uid = Math.random().toString(36).substring(7);

        debug('constructor', this.entry.config.type, this.entry.route);

        if (this.entry.config.apiOptions && this.entry.config.apiOptions.filter) {
            this.matchFilter = getMatchFilter(this.entry.config.apiOptions.filter);
            debug(this.matchFilter);
        }

        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.entry.route.permalink && this.entry.route.permalink.value.match(/settings\.permalinks/)) {
            common.events.on('settings.permalinks.edited', () => {
                const myUrls = this.urls.getByUid(this.uid);

                myUrls.forEach((url) => {
                    const resource = this.urls.getUrl(url).resource;
                    this.urls.removeUrl(url);

                    resource.free();
                    const newUrl = this.generateUrl(resource);

                    this.urls.add({
                        url: newUrl,
                        uid: this.uid,
                        extensions: this.entry.route.permalink.extensions
                    }, resource);
                });
            });
        }
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
            debug('on init', this.entry.config.type, this.entry.route);

            try {
                this.urls.add({
                    url: this.entry.route.parent,
                    uid: this.uid,
                    extensions: this.entry.route.extensions
                }, this.resources.create(this.entry.config.type, {}));
            } catch (err) {
                debug('Ignore. Detected url collision.', this.entry.route.parent);
                return Promise.resolve();
            }

            if (!this.entry.route.permalink) {
                debug('no permalink');
                return Promise.resolve();
            }

            // get the resources of my type e.g. posts.
            const resources = this.resources.getAll(this.entry.config.type);

            _.each(resources, (resource) => {
                const url = this.generateUrl(resource);

                if (resource.isTaken()) {
                    return;
                }

                // CASE: route has no custom filter, it will own the resource for sure
                if (!this.matchFilter) {
                    this.urls.add({
                        url: url,
                        uid: this.uid,
                        extensions: this.entry.route.permalink.extensions
                    }, resource);

                    this.resourceListeners(resource);
                    return;
                }

                // CASE: find out if my filter matches the resource
                if (jsonpath.query(resource, this.matchFilter).length) {
                    this.urls.add({
                        url: url,
                        uid: this.uid,
                        extensions: this.entry.route.permalink.extensions
                    }, resource);

                    this.resourceListeners(resource);
                }
            });

            return Promise.resolve();
        });

        this.queue.register({
            event: 'added'
        }, (event) => {
            const resource = this.resources.getByIdAndType(this.entry.config.type, event.id);

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
                    uid: this.uid,
                    extensions: this.entry.route.permalink.extensions
                }, resource);

                this.resourceListeners(resource);
            } else if (jsonpath.query(resource, this.matchFilter).length) {
                this.urls.add({
                    url: url,
                    uid: this.uid,
                    extensions: this.entry.route.permalink.extensions
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
        let url = this.entry.route.permalink.value;

        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (url.match(/settings\.permalinks/)) {
            if (this.entry.config.type === 'posts' && resource.data.page) {
                url = url.replace(/\/{settings\.permalinks}\//, '/:slug/');
            } else {
                url = url.replace(/\/{settings\.permalinks}\//, settingsCache.get('permalinks'));
            }
        }

        return this.replacepermalink(url, resource);
    }

    /**
     * @TODO: only regenerate url if...
     */
    resourceListeners(resource) {
        const onUpdate = (updatedResource) => {
            this.urls.removeByResource(this.uid, updatedResource);
            updatedResource.free();

            const url = this.generateUrl(updatedResource);

            if (!this.matchFilter) {
                this.urls.add({
                    url: url,
                    uid: this.uid,
                    extensions: this.entry.route.permalink.extensions
                }, updatedResource);
                return;
            }

            // CASE: data has changed, does the resource still match my filter?
            // if yes, unset url to be able to re-add url (only do if slug changed, not implemented)
            // if no, other url generator need to know
            if (jsonpath.query(updatedResource, this.matchFilter).length) {
                this.urls.add({
                    url: url,
                    uid: this.uid,
                    extensions: this.entry.route.permalink.extensions
                }, updatedResource);
            } else {
                debug('free, this is not mine anymore', updatedResource.data.id);
                this.resources.free(this.entry.config.type, updatedResource);
            }
        };

        const onRemoved = (removedResource) => {
            this.urls.removeByResource(this.uid, removedResource);
        };

        resource.removeAllListeners();
        resource.addListener('updated', onUpdate.bind(this));
        resource.addListener('removed', onRemoved.bind(this));
    }
}

module.exports = UrlGenerator;
