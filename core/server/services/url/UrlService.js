'use strict';

const Promise = require('bluebird'),
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
        this.finished = false;
        this.urlGenerators = [];

        this.urls = new Urls();
        this.queue = new Queue();
        this.resources = new Resources(this.queue);

        this.listeners();
    }

    listeners() {
        /**
         * The purpose of this event is to notify the url service as soon as a channel get's created.
         */
        common.events.on('channel.created', (channel) => {
            let urlGenerator = new UrlGenerator(channel, this.queue, this.resources, this.urls);
            this.urlGenerators.push(urlGenerator);
            urlGenerator.init();
        });

        /**
         * The queue will notify us if url generation has finished.
         */
        this.queue.addListener('ended', (event) => {
            if (event === 'init') {
                this.finished = true;
            }
        });

        /**
         * The queue will notify us if url generation has started.
         */
        this.queue.addListener('started', (event) => {
            if (event === 'init') {
                this.finished = false;
            }
        });
    }

    hasUrl(url) {
        debug('hasUrl ?', url);

        return new Promise((resolve, reject) => {
            const response = this.urls.hasUrl(url);

            if (response.found) {
                debug(response);
                return resolve(response);
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
