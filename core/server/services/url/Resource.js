'use strict';

const _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    common = require('../../lib/common');

class Resource extends EventEmitter {
    constructor(type, obj) {
        super();

        this.data = {};
        this.config = {
            type: type,
            url: null
        };

        Object.assign(this.data, obj);
    }

    mine(url) {
        if (!this.config.url) {
            this.config.url = url;
        } else {
            throw new common.errors.InternalServerError({
                message: 'Resource is already taken.'
            });
        }
    }

    getType() {
        return this.config.type;
    }

    getUrl() {
        return this.config.url;
    }

    unsetUrl() {
        this.config.url = null;
    }

    update(obj, options) {
        options = options || {};

        const keys = Object.keys(this.data);
        Object.assign(this.data, _.pick(obj, keys));

        if (options.noEvent) {
            return;
        }

        this.emit('updated', this);
    }

    remove() {
        this.emit('removed', this);
    }

    isTaken() {
        return this.config.url !== null;
    }
}

module.exports = Resource;
