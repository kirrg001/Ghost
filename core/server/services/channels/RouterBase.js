'use strict';

const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const apps = require('../../apps');
const common = require('../../lib/common');

/**
 * @temporary
 *
 * This is not designed yet. This is all temporary.
 */
class RouterBase extends EventEmitter {
    constructor(obj) {
        super();

        this.route = _.defaults(obj.route, {value: null, extensions: {}});
        this.config = obj.config;
        this.isEnabled = true;
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

class Collection extends RouterBase {
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

        this.listeners();

        common.events.emit('channel.created', this);
    }

    getPermalinks() {
        return this.permalinks;
    }

    listeners() {
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

class Taxonomy extends RouterBase {
    constructor(obj) {
        super(obj);

        this.permalinks = _.defaults(obj.permalinks, {value: null, extensions: {}});

        this.permalinks.extensions.rss = {
            route: 'rss/',
            enabled: true,
            redirect: false
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

class App extends RouterBase {
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
            filter: 'visibility:public+status:published+page:0+featured:false'
        }
    }
});

const collection2 = new Collection({
    route: {
        value: '/podcast/'
    },
    permalinks: {
        value: '/podcast/:slug/'
    },
    config: {
        type: 'posts',
        apiOptions: {
            filter: 'page:1'
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
        value: null
    },
    permalinks: {
        value: '/author/:slug/'
    },
    config: {
        type: 'users',
        apiOptions: {}
    }
});

const taxonomy2 = new Taxonomy({
    route: {
        value: null
    },
    permalinks: {
        value: '/tag/:slug/'
    },
    config: {
        type: 'tags',
        apiOptions: {}
    }
});
