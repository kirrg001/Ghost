'use strict';

module.exports = {
    get postLookup() {
        return require('./post-lookup');
    },

    get fetchData() {
        return require('./fetch-data');
    },

    get renderCollection() {
        return require('./render-collection');
    },

    get renderEntry() {
        return require('./render-entry');
    },

    get renderer() {
        return require('./renderer');
    },

    get templates() {
        return require('./templates');
    },

    get secure() {
        return require('./secure');
    },

    get handleError() {
        return require('./error');
    }
};
