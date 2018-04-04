'use strict';

const _ = require('lodash');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const apps = require('../../apps');
const common = require('../../lib/common');
const settingsCache = require('../settings/cache');

/**
 * @temporary
 *
 * This is not designed yet. This is all temporary.
 */
class Channel extends EventEmitter {
    constructor(obj) {
        super();

        this.route = _.defaults(obj.route, {value: null, extensions: {}});
        this.config = obj.config;
        this.isEnabled = true;
        this.registerRoute = true;
    }

    isGreedy() {
        return false;
    }

    getRoute() {
        return this.route;
    }

    getPermalinks() {
        return false;
    }

    getType() {
        return this.config.type;
    }

    getFilter() {
        return this.config.apiOptions && this.config.apiOptions.filter;
    }

    toString() {
        return `Type: ${this.getType()}, Route: ${this.getRoute().value}`;
    }
}

class Collection extends Channel {
    constructor(obj) {
        super(obj);

        this.permalinks = _.defaults(obj.permalinks, {value: null, extensions: {}});

        this.route.extensions.rss = {
            route: 'rss/',
            enabled: true,
            redirect: false
        };

        this.route.extensions.pagination = {
            route: 'page/\\d+/',
            enabled: true,
            redirect: false
        };

        this.permalinks.extensions.amp = {
            route: 'amp/',
            enabled: apps.amp.app.isEnabled,
            redirect: true
        };

        this.permalinks.getValue = () => {
            /**
             * @deprecated Remove in Ghost 2.0
             */
            if (this.permalinks.value.match(/settings\.permalinks/)) {
                const value = this.permalinks.value.replace(/\/{settings\.permalinks}\//, settingsCache.get('permalinks'));
                return path.join(this.route.value, value);
            }

            return path.join(this.route.value, this.permalinks.value);
        };

        this.listeners();
        common.events.emit('channel.created', this);
    }

    getPermalinks() {
        return this.permalinks;
    }

    listeners() {
        /**
         * @deprecated Remove in Ghost 2.0
         */
        if (this.getPermalinks() && this.getPermalinks().value.match(/settings\.permalinks/)) {
            common.events.on('settings.permalinks.edited', () => {
                this.emit('updated');
            });
        }

        apps.amp.app.addListener('disabled', () => {
            this.getPermalinks().extensions.amp.enabled = false;
        });

        apps.amp.app.addListener('enabled', () => {
            this.getPermalinks().extensions.amp.enabled = true;
        });
    }

    toString() {
        return `Type: ${this.getType()}, Route: ${this.getRoute().value}, Permalinks: ${this.getPermalinks().value}`;
    }
}

class Taxonomy extends Channel {
    constructor(obj) {
        super(obj);

        this.registerRoute = false;
        this.permalinks = {value: '/:slug/', extensions: {}};

        this.permalinks.extensions.pagination = {
            route: 'page/\\d+/',
            enabled: true,
            redirect: false
        };

        this.permalinks.extensions.rss = {
            route: 'rss/',
            enabled: true,
            redirect: false
        };

        this.permalinks.getValue = () => {
            return path.join(this.route.value, this.permalinks.value);
        };

        common.events.emit('channel.created', this);
    }

    getPermalinks() {
        return this.permalinks;
    }

    toString() {
        return `Type: ${this.getType()}, Route: ${this.getRoute().value}, Permalinks: ${this.getPermalinks().value}`;
    }
}

class App extends Channel {
    constructor(obj) {
        super(obj);

        this.isEnabled = this.config.app.isEnabled;
        this.listeners();

        common.events.emit('channel.created', this);
    }

    listeners() {
        this.config.app.addListener('disabled', () => {
            this.isEnabled = false;
            this.emit('disabled');
        });

        this.config.app.addListener('enabled', () => {
            this.isEnabled = true;
            this.emit('enabled');
        });
    }
}

class StaticPages extends Channel {
    constructor(obj) {
        super(obj);

        this.registerRoute = false;
        this.permalinks = {value: '/:slug/', extensions: {}};

        this.permalinks.getValue = () => {
            return path.join(this.route.value, this.permalinks.value);
        };

        common.events.emit('channel.created', this);
    }

    getPermalinks() {
        return this.permalinks;
    }
}

const staticPages = new StaticPages({
    route: {
        value: '/'
    },
    config: {
        type: 'pages',
        apiOptions: {
            filter: 'status:published'
        }
    }
});

const collection1 = new Collection({
    route: {
        value: '/'
    },
    permalinks: {
        value: '/{settings.permalinks}/'
    },
    config: {
        type: 'posts',
        apiOptions: {
            filter: 'visibility:public+status:published+featured:false'
        }
    }
});

const collection2 = new Collection({
    route: {
        value: '/podcast/'
    },
    permalinks: {
        value: '/:slug/'
    },
    config: {
        type: 'posts',
        apiOptions: {
            filter: 'featured:true'
        }
    }
});

const app1 = new App({
    route: {
        value: '/private/'
    },
    config: {
        type: 'others',
        app: apps.privateBlogging.app
    }
});

const app2 = new App({
    route: {
        value: '/subscribe/'
    },
    config: {
        type: 'others',
        app: apps.subscribers.app
    }
});

const taxonomy1 = new Taxonomy({
    route: {
        value: '/author/'
    },
    config: {
        type: 'users',
        apiOptions: {}
    }
});

const taxonomy2 = new Taxonomy({
    route: {
        value: '/tag/'
    },
    config: {
        type: 'tags',
        apiOptions: {}
    }
});
