'use strict';

module.exports = {
    get url() {
        return require('./url');
    },

    get tokens() {
        return require('./tokens');
    },

    get string() {
        return require('./string');
    },

    get identifier() {
        return require('./identifier');
    },

    get password() {
        return require('./password');
    },

    get crypto() {
        return require('./crypto');
    }
};
