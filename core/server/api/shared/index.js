module.exports = {
    get headers() {
        return require('./headers');
    },

    get Options() {
        return require('./options');
    },

    get http() {
        return require('./http');
    },

    get functional() {
        return require('./functional');
    }
};
