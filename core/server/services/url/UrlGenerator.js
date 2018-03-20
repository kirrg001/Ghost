'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment-timezone'),
    jsonpath = require('jsonpath'),
    path = require('path'),
    debug = require('ghost-ignition').debug('services:url:generator'),
    resources = require('./resources'),
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

/**
 * @TODO: two url generators - on for resource/dynamic routes and one for general routes?
 * @TODO: public fn's vs private fn
 */
class UrlGenerator {
    constructor(entry) {
        this.parent = entry.parent || '';
        this.route = entry.route;
        this.fullUrl = path.join(this.parent, this.route);

        debug('init', this.fullUrl);

        this.type = entry.config.type;
        this.apiOptions = entry.config.apiOptions || {};

        if (this.apiOptions.filter) {
            this.matchFilter = getMatchFilter(this.apiOptions.filter);
            debug(this.matchFilter);
        }

        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.fullUrl.match(/settings\.permalinks/)) {
            common.events.on('settings.permalinks.edited', () => {
                _.each(this.urls, (resource, oldUrl) => {
                    resource.unsetUrl();
                    delete this.urls[oldUrl];
                    this.addUrl(resource);
                });
            });
        }

        // NOTE: each url generator has a cache of it's urls
        this.urls = {};
    }

    init() {
        // CASE: no resource type -> e.g. others
        if (!resources.hasType(this.type)) {
            return;
        }

        resources.onAll(this.type, (resources) => {
            debug('onAll', this.type, this.fullUrl);

            _.map(resources, (resource) => {
                if (!this.matchFilter) {
                    this.addUrl(resource);
                } else if (!resource.isTaken() && jsonpath.query(resource, this.matchFilter).length) {
                    this.addUrl(resource);
                }
            });

            return Promise.resolve();
        });

        resources.onAdded(this.type, (resource) => {
            debug('onAdded');

            if (!this.matchFilter) {
                this.addUrl(resource);
            } else if (!resource.isTaken() && jsonpath.query(resource, this.matchFilter).length) {
                this.addUrl(resource);
            }

            return Promise.resolve();
        });
    }

    // @TODO: we currently can't use the url utils
    // @TODO: if you would define `/:author/` for e.g. author resource, it would crash
    replacePermalinks(url, resource) {
        var output = url,
            primaryTagFallback = config.get('routeKeywords').primaryTagFallback,
            publishedAtMoment = moment.tz(resource.data.published_at || Date.now(), settingsCache.get('active_timezone')),
            permalinks = {
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
            if (_.has(permalinks, match.substr(1))) {
                return permalinks[match.substr(1)]();
            }
        });

        return output;
    }

    generateUrl(resource) {
        let url;

        if (resource) {
            url = this.fullUrl;

            // @TODO: will be removed in Ghost 2.0
            if (url.match(/settings\.permalinks/)) {
                if (this.type === 'posts' && resource.data.page) {
                    url = url.replace(/\/{settings\.permalinks}\//, '/:slug/');
                } else {
                    url = url.replace(/\/{settings\.permalinks}\//, settingsCache.get('permalinks'));
                }
            }

            url = this.replacePermalinks(url, resource);
        } else {
            url = this.route;
        }

        debug('generateUrl', url);

        return url;
    }

    resourceListeners(resource) {
        const onUpdate = (updatedResource) => {
            delete this.urls[updatedResource.getUrl()];
            updatedResource.unsetUrl();

            // CASE: data has changed, does the resource still match my filter?
            // if yes, unset url to be able to re-add url (only do if slug changed, not implemented)
            // if no, other url generator need to know
            if (jsonpath.query(updatedResource, this.matchFilter).length) {
                this.addUrl(updatedResource);
            } else {
                debug('free', updatedResource.data.id);
                resources.free(updatedResource);
            }
        };

        const onRemoved = (removedResource) => {
            delete this.urls[removedResource.getUrl()];
            debug('removed url', removedResource.getUrl());
        };

        resource.removeAllListeners();
        resource.addListener('updated', onUpdate.bind(this));
        resource.addListener('removed', onRemoved.bind(this));
    }

    addUrl(resource) {
        let url = this.generateUrl(resource);

        if (resource) {
            this.resourceListeners(resource);
            this.urls[url] = resource;
            resource.mine(url);
        } else {
            this.urls[url] = null;
        }
    }

    hasUrl(url) {
        return this.urls.hasOwnProperty(url);
    }

    getUrls() {
        return Object.keys(this.urls);
    }
}

module.exports = UrlGenerator;
