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
            taken: false
        };

        Object.assign(this.data, obj);
    }

    getType() {
        return this.config.type;
    }

    take() {
        if (!this.config.taken) {
            this.config.taken = true;
        } else {
            throw new common.errors.InternalServerError({
                message: 'Resource is already taken.'
            });
        }
    }

    free() {
        this.config.taken = false;
    }

    isTaken() {
        return this.config.taken === true;
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
}

module.exports = Resource;
