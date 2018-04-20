'use strict';

module.exports = {
    get bootstrap() {
        return require('./bootstrap');
    },

    get appRouter() {
        return require('./AppRouter');
    },

    get helpers() {
        return require('./helpers');
    },

    extendCollection() {

    }
};
