module.exports = {
    get server() {
        return require('./server');
    },

    get constants() {
        return require('./constants');
    },

    get API() {
        return require('../../API');
    }
};
