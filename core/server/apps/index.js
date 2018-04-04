'use strict';

module.exports = {
    get amp() {
        return require('./amp');
    },

    get subscribers() {
        return require('./subscribers');
    },

    get privateBlogging() {
        return require('./private-blogging');
    }
};
